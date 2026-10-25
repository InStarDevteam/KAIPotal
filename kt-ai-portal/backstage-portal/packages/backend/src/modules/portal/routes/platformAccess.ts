import { randomUUID } from 'crypto';
import { Router, RequestHandler } from 'express';
import { Knex } from 'knex';
import { HttpAuthService, LoggerService } from '@backstage/backend-plugin-api';
import { getPortalContext, requirePermission } from '../services/middleware';
import { setTenantContext } from '../services/context';
import { authorizationForUser } from '../services/rbac';
import { recordAuditEvent } from '../services/audit';
import {
  defaultPlatformPolicy,
  defaultPlatformPreferences,
  PlatformAccessPolicy,
  platformAccessDecision,
  validPlatformPolicy,
  validPlatformPreferences,
  PLATFORM_IDS,
  PlatformId,
} from '../services/platformAccess';

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
});
const readPolicy = async (
  trx: Knex.Transaction,
  tenantId: string,
): Promise<PlatformAccessPolicy> => {
  const row = await trx('portal.fc_platform_access')
    .where({ tenant_id: tenantId })
    .first();
  return row
    ? {
        version: row.version,
        platforms: row.platforms,
        userGrants: row.user_grants,
      }
    : defaultPlatformPolicy();
};
export const createPlatformAccessRouter = (deps: Dependencies): Router => {
  const router = Router();
  const asyncRoute =
    (fn: RequestHandler): RequestHandler =>
    (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  const reject = (
    res: any,
    requestId: string,
    status: number,
    code: string,
    message: string,
  ) =>
    res
      .status(status)
      .json({ error: { requestId, code, message, retryable: false } });
  router.get(
    '/v1/platform-access',
    requirePermission(deps, 'portal.view'),
    asyncRoute(async (req, res) => {
      const ctx = getPortalContext(req);
      const data = await deps.db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        const policy = await readPolicy(trx, ctx.tenantId);
        if (!ctx.permissions.has('tenant.manage'))
          policy.userGrants = Object.prototype.hasOwnProperty.call(
            policy.userGrants,
            ctx.identity.userId,
          )
            ? { [ctx.identity.userId]: policy.userGrants[ctx.identity.userId] }
            : {};
        const row = await trx('portal.fc_portal_preferences')
          .where({ tenant_id: ctx.tenantId, user_id: ctx.identity.userId })
          .first();
        return {
          policy,
          preferences: row?.preferences ?? defaultPlatformPreferences(),
        };
      });
      res.json({ data, meta: meta(ctx.requestId) });
    }),
  );
  router.get(
    '/v1/platform-access/members',
    requirePermission(deps, 'tenant.manage'),
    asyncRoute(async (req, res) => {
      const ctx = getPortalContext(req);
      const data = await deps.db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        const members = await trx('portal.fc_tenant_memberships as m')
          .join('portal.fc_users as u', 'u.user_id', 'm.user_id')
          .where({
            'm.tenant_id': ctx.tenantId,
            'm.status': 'active',
            'u.status': 'active',
          })
          .where('m.valid_from', '<=', trx.fn.now())
          .where(q =>
            q
              .whereNull('m.valid_until')
              .orWhere('m.valid_until', '>', trx.fn.now()),
          )
          .select(
            'm.id as membershipId',
            'u.user_id as id',
            'u.display_name as name',
          );
        const assignments = await trx('portal.fc_role_assignments')
          .where('tenant_id', ctx.tenantId)
          .where('valid_from', '<=', trx.fn.now())
          .where(q =>
            q
              .whereNull('valid_until')
              .orWhere('valid_until', '>', trx.fn.now()),
          )
          .select('membership_id', 'role_id');
        return members.map(m => ({
          ...m,
          roles: assignments
            .filter(a => a.membership_id === m.membershipId)
            .map(a => a.role_id),
        }));
      });
      res.json({ data, meta: meta(ctx.requestId) });
    }),
  );
  router.put(
    '/v1/platform-access/policy',
    requirePermission(deps, 'tenant.manage'),
    asyncRoute(async (req, res) => {
      const ctx = getPortalContext(req);
      if (!validPlatformPolicy(req.body))
        return reject(
          res,
          ctx.requestId,
          422,
          'invalid_policy',
          '플랫폼 주소, 역할과 접근 설정을 확인하세요.',
        );
      const next: PlatformAccessPolicy = req.body;
      const result = await deps.db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        await trx.raw('SELECT pg_advisory_xact_lock(hashtext(?))', [
          `platform-access:${ctx.tenantId}`,
        ]);
        const authz = await authorizationForUser(
          trx,
          ctx.identity.userId,
          ctx.tenantId,
        );
        if (
          !authz.hasTenantMembership ||
          !authz.permissions.has('tenant.manage')
        )
          return { status: 403, message: '테넌트 설정 변경 권한이 없습니다.' };
        const current = await readPolicy(trx, ctx.tenantId);
        if (current.version !== next.version)
          return {
            status: 409,
            message: '다른 관리자가 설정을 변경했습니다. 다시 불러오세요.',
          };
        const ids = Object.keys(next.userGrants);
        if (ids.length) {
          const members = await trx('portal.fc_tenant_memberships')
            .where({ tenant_id: ctx.tenantId, status: 'active' })
            .whereIn('user_id', ids)
            .distinct('user_id');
          if (members.length !== ids.length)
            return {
              status: 422,
              message: '해당 테넌트 소속 사용자만 설정할 수 있습니다.',
            };
        }
        const saved = { ...next, version: current.version + 1 };
        await trx('portal.fc_platform_access')
          .insert({
            tenant_id: ctx.tenantId,
            version: saved.version,
            platforms: JSON.stringify(saved.platforms),
            user_grants: JSON.stringify(saved.userGrants),
            updated_by: ctx.identity.userId,
            updated_at: trx.fn.now(),
          })
          .onConflict('tenant_id')
          .merge();
        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          action: 'platform.policy.update',
          resourceType: 'platform_access',
          resourceId: ctx.tenantId,
          resourceVersion: String(saved.version),
          result: 'success',
          requestId: ctx.requestId,
          changedFields: ['platforms', 'userGrants'],
        });
        return { status: 200, data: saved };
      });
      if (result.status !== 200)
        return reject(
          res,
          ctx.requestId,
          result.status,
          'policy_update_rejected',
          result.message!,
        );
      return res.json({ data: result.data, meta: meta(ctx.requestId) });
    }),
  );
  router.put(
    '/v1/preferences',
    requirePermission(deps, 'portal.view'),
    asyncRoute(async (req, res) => {
      const ctx = getPortalContext(req);
      if (!validPlatformPreferences(req.body))
        return reject(
          res,
          ctx.requestId,
          422,
          'invalid_preferences',
          '디자인, 글자 크기와 플랫폼 바로가기 설정을 확인하세요.',
        );
      await deps.db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        await trx('portal.fc_portal_preferences')
          .insert({
            tenant_id: ctx.tenantId,
            user_id: ctx.identity.userId,
            preferences: JSON.stringify(req.body),
            updated_at: trx.fn.now(),
          })
          .onConflict(['tenant_id', 'user_id'])
          .merge();
      });
      return res.json({ data: req.body, meta: meta(ctx.requestId) });
    }),
  );
  router.post(
    '/v1/platforms/:id/launch',
    requirePermission(deps, 'portal.view'),
    asyncRoute(async (req, res) => {
      const ctx = getPortalContext(req);
      if (!PLATFORM_IDS.includes(req.params.id as PlatformId))
        return reject(
          res,
          ctx.requestId,
          404,
          'platform_not_found',
          '알 수 없는 플랫폼입니다.',
        );
      const result = await deps.db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        const authz = await authorizationForUser(
          trx,
          ctx.identity.userId,
          ctx.tenantId,
        );
        const policy = await readPolicy(trx, ctx.tenantId);
        const platform = policy.platforms.find(p => p.id === req.params.id)!;
        const access = platformAccessDecision(
          platform,
          policy.userGrants,
          ctx.identity.userId,
          authz.roles,
        );
        if (
          !authz.hasTenantMembership ||
          !authz.permissions.has('portal.view')
        ) {
          access.canAccess = false;
          access.reason = 'no_active_membership';
        }
        let auditResult: 'denied' | 'success' | 'failed' = 'denied';
        if (access.canAccess)
          auditResult = platform.href ? 'success' : 'failed';
        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          action: 'platform.launch',
          resourceType: 'platform',
          resourceId: platform.id,
          result: auditResult,
          reasonCode:
            access.reason ||
            (platform.href ? 'handoff_issued' : 'endpoint_unconfigured'),
          requestId: ctx.requestId,
        });
        return { ...access, href: platform.href || null };
      });
      if (!result.canAccess)
        return reject(
          res,
          ctx.requestId,
          403,
          result.reason,
          '이 플랫폼에 접근할 권한이 없습니다. 소속 관리자에게 문의하세요.',
        );
      return res.json({
        data: { href: result.href },
        meta: meta(ctx.requestId),
      });
    }),
  );
  router.use((error: Error, req: any, res: any, _next: any) => {
    const requestId = req.portalContext?.requestId || randomUUID();
    deps.logger.error('platform access operation failed', {
      requestId,
      errorType: error.name,
    });
    reject(
      res,
      requestId,
      500,
      'internal_error',
      '플랫폼 설정을 처리하지 못했습니다.',
    );
  });
  return router;
};
