import { randomUUID } from 'crypto';
import { RequestHandler, Router } from 'express';
import { Knex } from 'knex';
import { HttpAuthService, LoggerService } from '@backstage/backend-plugin-api';
import { getPortalContext, requirePermission } from '../services/middleware';
import { setTenantContext } from '../services/context';
import { authorizationForUser } from '../services/rbac';
import { recordAuditEvent } from '../services/audit';
import {
  defaultTenantSettings,
  mergeTenantMenus,
  normalizeTenantBranding,
  tenantMenuDefinitions,
  validBranding,
  validMenus,
} from '../services/tenantSettings';

interface Dependencies {
  db: Knex;
  httpAuth: HttpAuthService;
  logger: LoggerService;
}

const meta = (requestId: string) => ({
  requestId,
  asOf: new Date().toISOString(),
  dataMode: 'live',
  sourceSystem: 'portal',
  connectionState: 'connected',
  freshness: 'fresh',
  nextCursor: null,
});

const errorBody = (requestId: string, code: string, message: string) => ({
  error: { requestId, code, message, retryable: false },
});

const asyncRoute =
  (handler: RequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

const readSettings = async (trx: Knex.Transaction, tenantId: string) => {
  const tenant = await trx('portal.fc_tenants')
    .where({ id: tenantId, status: 'active' })
    .first();
  if (!tenant) throw new Error('tenant_unavailable');
  const current = await trx('portal.fc_tenant_settings')
    .where({ tenant_id: tenantId })
    .first();
  return current
    ? {
        tenantId,
        version: current.version as number,
        branding: normalizeTenantBranding(current.branding),
        menus: mergeTenantMenus(current.menus),
      }
    : defaultTenantSettings(tenant);
};

const categorySql = `CASE
  WHEN e.action LIKE 'authz.%' OR e.action LIKE 'security.%' THEN 'security'
  WHEN e.action LIKE 'client.session.%' OR e.action LIKE 'context.%' OR e.action LIKE 'authn.%' THEN 'access'
  WHEN e.action LIKE 'client.%' THEN 'usage'
  ELSE 'admin' END`;

export const createTenantOperationsRouter = (deps: Dependencies): Router => {
  const { db } = deps;
  const router = Router();
  const portalView = requirePermission(deps, 'portal.view');

  router.get(
    '/v1/tenant-settings',
    portalView,
    asyncRoute(async (req, res) => {
      const ctx = getPortalContext(req);
      const data = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        return readSettings(trx, ctx.tenantId);
      });
      res.json({ data, meta: meta(ctx.requestId) });
    }),
  );

  router.put(
    '/v1/tenant-settings',
    portalView,
    asyncRoute(async (req, res) => {
      const ctx = getPortalContext(req);
      const body = req.body ?? {};
      const expectedVersion = body.expectedVersion ?? body.version;
      if (
        !Number.isSafeInteger(expectedVersion) ||
        expectedVersion < 0 ||
        (body.branding === undefined && body.menus === undefined) ||
        Object.keys(body).some(
          key =>
            !['expectedVersion', 'version', 'branding', 'menus'].includes(key),
        ) ||
        (body.branding !== undefined && !validBranding(body.branding)) ||
        (body.menus !== undefined && !validMenus(body.menus))
      ) {
        return res
          .status(422)
          .json(
            errorBody(
              ctx.requestId,
              'invalid_settings',
              '색상 대비, 로고 주소, 문구 길이와 메뉴 구성을 확인하세요.',
            ),
          );
      }
      const result = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        // Serialize first creation and subsequent updates; stale editors get a conflict.
        await trx.raw('SELECT pg_advisory_xact_lock(hashtext(?))', [
          `tenant-settings:${ctx.tenantId}`,
        ]);
        const authz = await authorizationForUser(
          trx,
          ctx.identity.userId,
          ctx.tenantId,
        );
        const current = await readSettings(trx, ctx.tenantId);
        // Older clients send seven branding fields. Preserve saved appearance
        // fields when omitted rather than silently resetting another editor's design.
        const branding =
          body.branding === undefined
            ? current.branding
            : normalizeTenantBranding({
                ...current.branding,
                ...body.branding,
              });
        const brandingFields =
          body.branding === undefined
            ? []
            : Object.keys(branding).filter(
                key =>
                  branding[key as keyof typeof branding] !==
                  current.branding[key as keyof typeof branding],
              );
        const sorted = (menus: typeof current.menus) =>
          [...menus].sort((a, b) => a.id.localeCompare(b.id));
        const menuChanged =
          body.menus !== undefined &&
          JSON.stringify(
            sorted(body.menus).map(({ id, label, visible, order }) => ({
              id,
              label,
              visible,
              order,
            })),
          ) !==
            JSON.stringify(
              sorted(current.menus).map(({ id, label, visible, order }) => ({
                id,
                label,
                visible,
                order,
              })),
            );
        const canBrand =
          authz.permissions.has('settings.manage') ||
          authz.permissions.has('tenant.manage');
        const canMenu = authz.permissions.has('menu.manage');
        if (
          !authz.hasTenantMembership ||
          (!canBrand && !canMenu) ||
          (brandingFields.length > 0 && !canBrand) ||
          (menuChanged && !canMenu)
        ) {
          await recordAuditEvent(trx, ctx.principal, {
            tenantId: ctx.tenantId,
            actorId: ctx.identity.userId,
            action: 'tenant.settings.update',
            resourceType: 'tenant_settings',
            resourceId: ctx.tenantId,
            result: 'denied',
            reasonCode: 'missing_permission',
            requestId: ctx.requestId,
          });
          return {
            status: 403,
            code: 'permission_denied',
            message: '해당 설정을 변경할 권한이 없습니다.',
          };
        }
        if (current.version !== expectedVersion) {
          return {
            status: 409,
            code: 'version_conflict',
            message:
              '다른 관리자가 설정을 변경했습니다. 새로 불러온 후 다시 저장하세요.',
          };
        }
        if (!brandingFields.length && !menuChanged)
          return { status: 200, data: current };
        const data = {
          tenantId: ctx.tenantId,
          version: current.version + 1,
          branding,
          menus: body.menus ?? current.menus,
        };
        await trx('portal.fc_tenant_settings')
          .insert({
            tenant_id: ctx.tenantId,
            version: data.version,
            branding: JSON.stringify(data.branding),
            menus: JSON.stringify(data.menus),
            updated_by: ctx.identity.userId,
            updated_at: trx.fn.now(),
          })
          .onConflict('tenant_id')
          .merge();
        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          action: 'tenant.settings.update',
          resourceType: 'tenant_settings',
          resourceId: ctx.tenantId,
          resourceVersion: String(data.version),
          result: 'success',
          requestId: ctx.requestId,
          changedFields: [
            ...brandingFields.map(key => `branding.${key}`),
            ...(menuChanged ? ['menus'] : []),
          ],
        });
        return { status: 200, data };
      });
      if (result.status !== 200)
        return res
          .status(result.status)
          .json(errorBody(ctx.requestId, result.code!, result.message!));
      return res.json({ data: result.data, meta: meta(ctx.requestId) });
    }),
  );

  router.post(
    '/v1/activity',
    portalView,
    asyncRoute(async (req, res) => {
      const ctx = getPortalContext(req);
      const body = req.body ?? {};
      const page = tenantMenuDefinitions.find(menu => menu.id === body.pageId);
      if (
        !['page.view', 'session.start', 'session.end'].includes(body.action) ||
        Object.keys(body).some(key => !['action', 'pageId'].includes(key)) ||
        (body.action === 'page.view' && !page) ||
        (body.action !== 'page.view' && body.pageId !== undefined)
      ) {
        return res
          .status(422)
          .json(
            errorBody(
              ctx.requestId,
              'invalid_activity',
              '기록할 활동 정보를 확인하세요.',
            ),
          );
      }
      const accepted = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        if (page) {
          const settings = await readSettings(trx, ctx.tenantId);
          const hasPermission = page.permissions.some(permission =>
            ctx.permissions.has(permission),
          );
          const visible = settings.menus.find(
            (menu: { id: string; visible: boolean }) => menu.id === page.id,
          )?.visible;
          if (!hasPermission || !visible) {
            await recordAuditEvent(trx, ctx.principal, {
              tenantId: ctx.tenantId,
              actorId: ctx.identity.userId,
              action: 'authz.page.view',
              resourceType: 'page',
              resourceId: page.id,
              result: 'denied',
              reasonCode: hasPermission ? 'menu_hidden' : 'missing_permission',
              requestId: ctx.requestId,
            });
            return false;
          }
        }
        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          // Client telemetry proves an authenticated collector request, never a login.
          action: `client.${body.action}`,
          resourceType: page ? 'page' : 'session',
          resourceId: page?.id,
          result: 'success',
          reasonCode: 'client_reported',
          requestId: ctx.requestId,
        });
        return true;
      });
      if (!accepted)
        return res
          .status(403)
          .json(
            errorBody(
              ctx.requestId,
              'permission_denied',
              '해당 화면에 접근할 권한이 없습니다.',
            ),
          );
      return res.status(201).json({
        data: { accepted: true, source: 'client' },
        meta: meta(ctx.requestId),
      });
    }),
  );

  router.get(
    '/v1/audit-events',
    requirePermission(deps, 'audit.view'),
    asyncRoute(async (req, res) => {
      const ctx = getPortalContext(req);
      const isExport = req.query.purpose === 'export';
      const page = Number(req.query.page ?? 1);
      const pageSize = Number(req.query.pageSize ?? (isExport ? 10000 : 50));
      const requestedSnapshot =
        req.query.snapshot === undefined
          ? undefined
          : new Date(String(req.query.snapshot));
      const validString = (value: unknown, max = 160) =>
        value === undefined ||
        (typeof value === 'string' &&
          value.length <= max &&
          Array.from(value).every(character => character.charCodeAt(0) >= 32));
      const dateValue = (value: unknown, end = false): Date | undefined => {
        if (value === undefined) return undefined;
        if (
          typeof value !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)
        )
          return new Date(NaN);
        return new Date(
          value.length === 10
            ? `${value}T${end ? '23:59:59.999' : '00:00:00.000'}Z`
            : value,
        );
      };
      const from = dateValue(req.query.from);
      const to = dateValue(req.query.to, true);
      if (
        !Number.isSafeInteger(page) ||
        page < 1 ||
        page > 1000000 ||
        !Number.isSafeInteger(pageSize) ||
        pageSize < 1 ||
        (isExport ? page !== 1 || pageSize !== 10000 : pageSize > 200) ||
        (requestedSnapshot &&
          (!Number.isFinite(requestedSnapshot.getTime()) ||
            requestedSnapshot.getTime() > Date.now() + 60000)) ||
        (from && !Number.isFinite(from.getTime())) ||
        (to && !Number.isFinite(to.getTime())) ||
        (from && to && from > to) ||
        (req.query.purpose !== undefined && req.query.purpose !== 'export') ||
        !['category', 'result', 'action', 'actor', 'search'].every(key =>
          validString(req.query[key]),
        ) ||
        (req.query.category &&
          !['access', 'usage', 'admin', 'security'].includes(
            String(req.query.category),
          )) ||
        (req.query.result &&
          !['success', 'denied', 'failed'].includes(String(req.query.result)))
      ) {
        return res
          .status(422)
          .json(
            errorBody(
              ctx.requestId,
              'invalid_filters',
              '조회 기간과 검색 조건을 확인하세요.',
            ),
          );
      }
      const data = await db.transaction(async trx => {
        // Rows and summaries share one database snapshot. Export is a single
        // response, so commits arriving between HTTP pages cannot skip rows.
        await trx.raw('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
        await setTenantContext(trx, ctx.tenantId);
        // Use the database clock; app/DB clock skew must not shift an export.
        const clock = await trx.raw('SELECT clock_timestamp() AS snapshot');
        const snapshot = requestedSnapshot ?? new Date(clock.rows[0].snapshot);
        if (snapshot > new Date(clock.rows[0].snapshot)) {
          return { invalidSnapshot: true as const };
        }
        const base = trx('portal.fc_audit_events as e')
          .leftJoin('portal.fc_users as u', 'u.user_id', 'e.actor_id')
          .where('e.tenant_id', ctx.tenantId)
          .where('e.occurred_at', '<=', snapshot);
        if (from) base.where('e.occurred_at', '>=', from);
        if (to) base.where('e.occurred_at', '<=', to);
        if (req.query.category)
          base.whereRaw(`(${categorySql}) = ?`, [String(req.query.category)]);
        if (req.query.result) base.where('e.result', String(req.query.result));
        if (req.query.action) base.where('e.action', String(req.query.action));
        const pattern = (value: unknown) =>
          `%${String(value).replace(/[\\%_]/g, '\\$&')}%`;
        if (req.query.actor)
          base.where(q =>
            q
              .whereILike('u.display_name', pattern(req.query.actor))
              .orWhereRaw('e.actor_id::text = ?', [String(req.query.actor)]),
          );
        if (req.query.search)
          base.where(q => {
            for (const column of [
              'u.display_name',
              'e.action',
              'e.resource_type',
              'e.resource_id',
              'e.reason_code',
              'e.request_id',
            ]) {
              q.orWhereILike(column, pattern(req.query.search));
            }
          });
        const stats = await base
          .clone()
          .select(
            trx.raw(`COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE e.result = 'success')::int AS success,
        COUNT(*) FILTER (WHERE e.result = 'denied')::int AS denied,
        COUNT(*) FILTER (WHERE e.result = 'failed')::int AS failed,
        COUNT(DISTINCT e.actor_id)::int AS "uniqueActors"`),
          )
          .first();
        const categories = await base
          .clone()
          .select(
            trx.raw(`(${categorySql}) AS category, COUNT(*)::int AS count`),
          )
          .groupByRaw(categorySql);
        const rows = await base
          .clone()
          .select(
            'e.*',
            'u.display_name as actor_name',
            trx.raw(`(${categorySql}) AS category`),
          )
          .orderBy([
            { column: 'e.occurred_at', order: 'desc' },
            { column: 'e.event_id', order: 'desc' },
          ])
          .limit(isExport ? 10001 : pageSize)
          .offset((page - 1) * pageSize);
        if (isExport && rows.length > 10000) {
          await recordAuditEvent(trx, ctx.principal, {
            tenantId: ctx.tenantId,
            actorId: ctx.identity.userId,
            action: 'audit.history.export',
            resourceType: 'audit_history',
            resourceId: ctx.tenantId,
            result: 'denied',
            reasonCode: 'export_limit_exceeded',
            requestId: ctx.requestId,
          });
          return { exportLimitExceeded: true as const };
        }
        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          action: isExport ? 'audit.history.export' : 'audit.history.read',
          resourceType: 'audit_history',
          resourceId: ctx.tenantId,
          result: 'success',
          requestId: ctx.requestId,
        });
        return {
          items: rows.map(row => ({
            id: row.event_id,
            tenantId: row.tenant_id,
            actorId: row.actor_id,
            actorName:
              row.actor_name ??
              (row.actor_type === 'system' ? '시스템' : '알 수 없음'),
            actorType: row.actor_type,
            action: row.action,
            category: row.category,
            source: row.action.startsWith('client.') ? 'client' : 'server',
            resourceType: row.resource_type,
            resourceId: row.resource_id,
            resourceVersion: row.resource_version,
            result: row.result,
            reasonCode: row.reason_code,
            requestId: row.request_id,
            changedFields: row.changed_fields ?? [],
            createdAt: row.occurred_at,
            recordedAt: row.recorded_at,
          })),
          pagination: {
            page,
            pageSize,
            total: stats.total,
            totalPages: Math.ceil(stats.total / pageSize),
            snapshot: snapshot.toISOString(),
          },
          summary: {
            ...stats,
            byCategory: Object.fromEntries(
              ['access', 'usage', 'admin', 'security'].map(category => [
                category,
                categories.find(row => row.category === category)?.count ?? 0,
              ]),
            ),
          },
        };
      });
      if ('invalidSnapshot' in data)
        return res
          .status(422)
          .json(
            errorBody(
              ctx.requestId,
              'invalid_filters',
              '조회 시점을 확인하세요.',
            ),
          );
      if ('exportLimitExceeded' in data)
        return res
          .status(422)
          .json(
            errorBody(
              ctx.requestId,
              'export_limit_exceeded',
              '내보내기는 최대 10,000건까지 가능합니다. 조회 기간이나 검색 조건을 좁혀 주세요.',
            ),
          );
      return res.json({ data, meta: meta(ctx.requestId) });
    }),
  );

  router.use((error: Error, req: any, res: any, _next: any) => {
    const requestId = req.portalContext?.requestId ?? randomUUID();
    deps.logger.error('portal tenant operation failed', {
      requestId,
      errorType: error.name,
    });
    res
      .status(500)
      .json(
        errorBody(
          requestId,
          'internal_error',
          '요청 처리 중 오류가 발생했습니다.',
        ),
      );
  });
  return router;
};
