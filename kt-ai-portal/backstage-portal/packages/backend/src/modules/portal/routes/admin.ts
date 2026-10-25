import { Router, RequestHandler } from 'express';
import { authorizationForUser } from '../services/rbac';
import { Knex } from 'knex';
import { HttpAuthService, LoggerService } from '@backstage/backend-plugin-api';
import { getPortalContext, requirePermission } from '../services/middleware';
import { setTenantContext } from '../services/context';
import { recordAuditEvent } from '../services/audit';

interface AdminRoutesDeps {
  db: Knex;
  httpAuth: HttpAuthService;
  logger: LoggerService;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 사용자·역할 관리 API (P1). 모든 엔드포인트는 requirePermission을 통과한다.
 * 계약 meta 형식은 router.ts의 공통 규약을 따른다.
 */
export const createAdminRouter = (deps: AdminRoutesDeps): Router => {
  const { db } = deps;
  // Express 4는 async rejection을 자동 전달하지 않는다.
  const asyncRoute =
    (handler: RequestHandler): RequestHandler =>
    (req, res, next) => {
      Promise.resolve(handler(req, res, next)).catch(next);
    };
  const router = Router();
  const userManage = requirePermission(deps, 'user.manage');
  const rbacManage = requirePermission(deps, 'rbac.manage');

  const meta = (requestId: string) => ({
    requestId,
    asOf: new Date().toISOString(),
    dataMode: 'live' as const,
    sourceSystem: 'portal',
    connectionState: 'connected' as const,
    freshness: 'fresh' as const,
    nextCursor: null,
  });

  // 기준 데이터 조회 — 인증된 포털 사용자에게 개방(역할 선택 UI 용도)
  router.get(
    '/v1/roles',
    requirePermission(deps, 'portal.view'),
    asyncRoute(async (req, res) => {
      const ctx = getPortalContext(req);
      const roles = await db('portal.fc_roles')
        .select('role_id', 'name', 'scope', 'policy_version')
        .orderBy('role_id');
      res.json({ data: roles, meta: meta(ctx.requestId) });
    }),
  );

  router.get(
    '/v1/permissions',
    requirePermission(deps, 'portal.view'),
    asyncRoute(async (req, res) => {
      const ctx = getPortalContext(req);
      const rows = await db('portal.fc_role_permissions')
        .select('role_id', 'permission_id')
        .orderBy(['role_id', 'permission_id']);
      res.json({ data: rows, meta: meta(ctx.requestId) });
    }),
  );

  // 현재 tenant의 유효 역할 할당 목록 — 역할 회수 화면의 조회 원천.
  router.get(
    '/v1/role-assignments',
    rbacManage,
    asyncRoute(async (req, res) => {
      const ctx = getPortalContext(req);
      const rows = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        return trx('portal.fc_role_assignments as a')
          .join('portal.fc_tenant_memberships as m', join =>
            join
              .on('m.tenant_id', 'a.tenant_id')
              .andOn('m.id', 'a.membership_id'),
          )
          .join('portal.fc_users as u', 'u.user_id', 'm.user_id')
          .leftJoin('portal.fc_users as d', 'd.user_id', 'a.delegated_by')
          .where('a.tenant_id', ctx.tenantId)
          .where(q =>
            q
              .whereNull('a.valid_until')
              .orWhere('a.valid_until', '>', trx.fn.now()),
          )
          .select(
            'a.id',
            'a.membership_id',
            'a.role_id',
            'a.valid_from',
            'a.valid_until',
            'a.reason',
            'a.policy_version',
            'a.created_at',
            'm.user_id',
            'u.display_name',
            'd.display_name as delegated_by_name',
          )
          .orderBy(['a.role_id', 'u.display_name']);
      });
      res.json({ data: rows, meta: meta(ctx.requestId) });
    }),
  );

  router.get(
    '/v1/memberships',
    userManage,
    asyncRoute(async (req, res) => {
      const ctx = getPortalContext(req);
      const rows = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        return trx('portal.fc_tenant_memberships as m')
          .join('portal.fc_users as u', 'u.user_id', 'm.user_id')
          .leftJoin('portal.fc_organizations as o', join =>
            join
              .on('o.tenant_id', 'm.tenant_id')
              .andOn('o.id', 'm.organization_id'),
          )
          .where('m.tenant_id', ctx.tenantId)
          .select(
            'm.id as membership_id',
            'm.status',
            'm.valid_from',
            'm.valid_until',
            'u.user_id',
            'u.display_name',
            'u.email',
            'o.name as organization_name',
          )
          .orderBy('u.display_name');
      });
      res.json({ data: rows, meta: meta(ctx.requestId) });
    }),
  );

  // 역할 할당 — 자기 자신에게의 신규 역할 부여는 금지(권한 상승 통제).
  router.post(
    '/v1/role-assignments',
    rbacManage,
    asyncRoute(async (req, res) => {
      const ctx = getPortalContext(req);
      const { membershipId, roleId, validUntil, reason } = req.body ?? {};

      if (
        !UUID_RE.test(membershipId ?? '') ||
        typeof roleId !== 'string' ||
        typeof reason !== 'string' ||
        !reason.trim() ||
        reason.length > 1000 ||
        (validUntil !== null &&
          validUntil !== undefined &&
          (typeof validUntil !== 'string' ||
            !Number.isFinite(Date.parse(validUntil)) ||
            Date.parse(validUntil) <= Date.now()))
      ) {
        return res.status(422).json({
          error: {
            code: 'invalid_input',
            message:
              '대상 소속, 역할, 변경 사유와 유효한 미래 만료일을 확인하세요.',
            retryable: false,
            requestId: ctx.requestId,
          },
        });
      }

      const result = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);

        const current = await authorizationForUser(
          trx,
          ctx.identity.userId,
          ctx.tenantId,
        );
        if (
          !current.hasTenantMembership ||
          !current.permissions.has('rbac.manage')
        )
          return {
            status: 403,
            code: 'permission_denied',
            message: '역할 관리 권한이 없습니다.',
          };
        const target = await trx('portal.fc_tenant_memberships')
          .where({ tenant_id: ctx.tenantId, id: membershipId })
          .where({ status: 'active' })
          .where('valid_from', '<=', trx.fn.now())
          .where(q =>
            q
              .whereNull('valid_until')
              .orWhere('valid_until', '>', trx.fn.now()),
          )
          .forUpdate()
          .first('id', 'user_id', 'status');
        if (!target) {
          return {
            status: 404,
            code: 'membership_not_found',
            message: '대상 소속이 없습니다.',
          };
        }
        if (target.user_id === ctx.identity.userId) {
          // 자기 역할 상승 금지 — 대리/긴급 처리는 별도 승인 절차로만 허용한다.
          return {
            status: 403,
            code: 'self_assignment_not_allowed',
            message: '본인에게 새 역할을 부여할 수 없습니다.',
          };
        }
        const role = await trx('portal.fc_roles')
          .where({ role_id: roleId })
          .first('role_id', 'scope');
        if (!role) {
          return {
            status: 422,
            code: 'unknown_role',
            message: '알 수 없는 역할입니다.',
          };
        }

        const grants = await trx('portal.fc_role_permissions')
          .where({ role_id: roleId })
          .select('permission_id');
        if (
          (role.scope === 'system' && !current.hasSystemRole) ||
          grants.some(row => !current.permissions.has(row.permission_id))
        ) {
          return {
            status: 403,
            code: 'delegation_exceeds_authority',
            message: '자신의 위임 범위를 넘어서는 역할을 부여할 수 없습니다.',
          };
        }
        const duplicate = await trx('portal.fc_role_assignments')
          .where({
            tenant_id: ctx.tenantId,
            membership_id: membershipId,
            role_id: roleId,
          })
          .where(q =>
            q
              .whereNull('valid_until')
              .orWhere('valid_until', '>', trx.fn.now()),
          )
          .first('id');
        if (duplicate)
          return {
            status: 409,
            code: 'assignment_exists',
            message: '이미 유효한 역할 할당이 있습니다.',
          };
        const [assignment] = await trx('portal.fc_role_assignments')
          .insert({
            tenant_id: ctx.tenantId,
            membership_id: membershipId,
            role_id: roleId,
            valid_until: validUntil ?? null,
            delegated_by: ctx.identity.userId,
            reason: reason ?? null,
          })
          .returning('id');

        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          action: 'rbac.role.assign',
          resourceType: 'role_assignment',
          resourceId: assignment.id,
          result: 'success',
          requestId: ctx.requestId,
          changedFields: ['role_id', 'valid_until', 'reason'],
        });
        return { status: 201, id: assignment.id };
      });

      if (result.status !== 201) {
        return res.status(result.status).json({
          error: {
            code: result.code,
            message: result.message,
            retryable: false,
            requestId: ctx.requestId,
          },
        });
      }
      return res
        .status(201)
        .json({ data: { id: result.id }, meta: meta(ctx.requestId) });
    }),
  );

  // 역할 회수 — 삭제가 아니라 valid_until 설정(이력 보존).
  router.post(
    '/v1/role-assignments/:id/revoke',
    rbacManage,
    asyncRoute(async (req, res) => {
      const ctx = getPortalContext(req);
      const { id } = req.params;
      if (
        !UUID_RE.test(id) ||
        typeof req.body?.reason !== 'string' ||
        !req.body.reason.trim() ||
        req.body.reason.length > 1000
      ) {
        return res.status(422).json({
          error: {
            code: 'invalid_input',
            message: 'id 형식이 올바르지 않습니다.',
            retryable: false,
            requestId: ctx.requestId,
          },
        });
      }

      const result = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        // tenant 단위 잠금으로 동시 회수 시 마지막 유효 관리자를 제거하지 않는다.
        await trx.raw('SELECT pg_advisory_xact_lock(hashtext(?))', [
          ctx.tenantId,
        ]);
        const current = await authorizationForUser(
          trx,
          ctx.identity.userId,
          ctx.tenantId,
        );
        if (
          !current.hasTenantMembership ||
          !current.permissions.has('rbac.manage')
        )
          return { status: 403 as const };
        const target = await trx('portal.fc_role_assignments')
          .where({ tenant_id: ctx.tenantId, id })
          .first('*');
        if (!target) return { status: 404 as const };
        const grants = await trx('portal.fc_role_permissions')
          .where({ role_id: target.role_id })
          .select('permission_id');
        if (grants.some(row => !current.permissions.has(row.permission_id)))
          return { status: 403 as const };
        if (['portal-admin', 'security-manager'].includes(target.role_id)) {
          const other = await trx('portal.fc_role_assignments as ra')
            .join('portal.fc_tenant_memberships as m', join =>
              join
                .on('m.id', 'ra.membership_id')
                .andOn('m.tenant_id', 'ra.tenant_id'),
            )
            .join('portal.fc_users as u', 'u.user_id', 'm.user_id')
            .where({
              'ra.tenant_id': ctx.tenantId,
              'ra.role_id': target.role_id,
              'm.status': 'active',
              'u.status': 'active',
            })
            .whereNot('ra.id', id)
            .where('m.valid_from', '<=', trx.fn.now())
            .where('ra.valid_from', '<=', trx.fn.now())
            .where(q =>
              q
                .whereNull('m.valid_until')
                .orWhere('m.valid_until', '>', trx.fn.now()),
            )
            .where(q =>
              q
                .whereNull('ra.valid_until')
                .orWhere('ra.valid_until', '>', trx.fn.now()),
            )
            .first('ra.id');
          if (!other) return { status: 409 as const };
        }
        const updated = await trx('portal.fc_role_assignments')
          .where({ tenant_id: ctx.tenantId, id })
          .where(q =>
            q
              .whereNull('valid_until')
              .orWhere('valid_until', '>', trx.fn.now()),
          )
          .update({
            valid_until: trx.fn.now(),
            reason: `회수: ${req.body.reason.trim()}`,
          })
          .returning('id');
        if (updated.length === 0) {
          return { status: 404 as const };
        }
        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          action: 'rbac.role.revoke',
          resourceType: 'role_assignment',
          resourceId: id,
          result: 'success',
          requestId: ctx.requestId,
          changedFields: ['valid_until', 'reason'],
        });
        return { status: 200 as const };
      });

      if (result.status !== 200) {
        return res.status(result.status).json({
          error: {
            code: {
              409: 'last_privileged_assignment',
              403: 'permission_denied',
              404: 'assignment_not_found',
            }[result.status],
            message:
              result.status === 409
                ? '마지막 유효 관리자의 역할을 회수할 수 없습니다.'
                : '유효한 할당 또는 회수 권한을 확인하세요.',
            retryable: false,
            requestId: ctx.requestId,
          },
        });
      }
      return res.json({
        data: { id, revoked: true },
        meta: meta(ctx.requestId),
      });
    }),
  );

  router.use((error: Error, _req: any, res: any, _next: any) => {
    const requestId = require('crypto').randomUUID();
    deps.logger.error('portal admin operation failed', {
      requestId,
      errorType: error.name,
    });
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: '요청 처리 중 오류가 발생했습니다.',
        retryable: true,
        requestId,
      },
    });
  });
  return router;
};
