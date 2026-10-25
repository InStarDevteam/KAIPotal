import { Router } from 'express';
import { Knex } from 'knex';
import { HttpAuthService, LoggerService } from '@backstage/backend-plugin-api';
import { getPortalContext, requireMembership } from '../services/middleware';
import { setTenantContext } from '../services/context';
import { recordAuditEvent } from '../services/audit';
import {
  emptyDefenseProfile,
  personalActivityCategory,
  validateDefenseProfile,
} from '../services/myProfile';

export const createMyProfileRouter = (deps: {
  db: Knex;
  httpAuth: HttpAuthService;
  logger: LoggerService;
}) => {
  const router = Router();
  const meta = (requestId: string) => ({
    requestId,
    asOf: new Date().toISOString(),
    dataMode: 'live',
    sourceSystem: 'portal',
  });
  router.get('/v1/me/activity', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const data = await deps.db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        // Actor selection is server-owned; arbitrary query parameters never broaden scope.
        const rows = await trx('portal.fc_audit_events')
          .where({ tenant_id: ctx.tenantId, actor_id: ctx.identity.userId })
          .orderBy('occurred_at', 'desc')
          .orderBy('event_id', 'desc')
          .limit(50)
          .select(
            'event_id',
            'action',
            'result',
            'resource_type',
            'resource_id',
            'occurred_at',
          );
        return {
          items: rows.map(row => ({
            id: row.event_id,
            action: row.action,
            result: row.result,
            category: personalActivityCategory(row.action),
            resourceType: row.resource_type,
            resourceId: row.resource_id,
            createdAt: row.occurred_at,
          })),
        };
      });
      return res.json({ data, meta: meta(ctx.requestId) });
    } catch {
      deps.logger.error('my activity read failed', {
        requestId: ctx.requestId,
      });
      return res.status(500).json({
        error: {
          code: 'activity_unavailable',
          message: '내 활동 기록을 불러오지 못했습니다.',
          retryable: true,
          requestId: ctx.requestId,
        },
      });
    }
  });
  router.get('/v1/me/profile', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const data = await deps.db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        const user = await trx('portal.fc_users')
          .where({ user_id: ctx.identity.userId })
          .first('email', 'status');
        const row = await trx('portal.fc_user_profiles')
          .where({ tenant_id: ctx.tenantId, user_id: ctx.identity.userId })
          .first();
        return {
          profile: { ...emptyDefenseProfile(), ...row?.profile },
          version: row?.version ?? 0,
          identity: {
            userId: ctx.identity.userId,
            displayName: ctx.identity.displayName,
            email: user?.email ?? '',
            status: user?.status,
          },
          source: 'self_declared',
          updatedAt: row?.updated_at ?? null,
        };
      });
      return res.json({ data, meta: meta(ctx.requestId) });
    } catch {
      deps.logger.error('my profile read failed', { requestId: ctx.requestId });
      return res.status(500).json({
        error: {
          code: 'profile_unavailable',
          message: '프로필 정보를 불러오지 못했습니다.',
          retryable: true,
          requestId: ctx.requestId,
        },
      });
    }
  });
  router.patch('/v1/me/profile', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    const body = req.body ?? {};
    const profile = validateDefenseProfile(body.profile);
    if (
      !profile ||
      !Number.isSafeInteger(body.expectedVersion) ||
      body.expectedVersion < 0 ||
      Object.keys(body).some(
        key => !['profile', 'expectedVersion'].includes(key),
      )
    ) {
      return res.status(422).json({
        error: {
          code: 'invalid_profile',
          message: '사용자 구분과 군번 등 입력 항목을 확인하세요.',
          requestId: ctx.requestId,
          retryable: false,
        },
      });
    }
    try {
      const result = await deps.db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        // Serialize first inserts and updates for exactly this tenant and actor.
        await trx.raw('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', [
          `profile:${ctx.tenantId}:${ctx.identity.userId}`,
        ]);
        const scope = { tenant_id: ctx.tenantId, user_id: ctx.identity.userId };
        const previous = await trx('portal.fc_user_profiles')
          .where(scope)
          .first();
        if ((previous?.version ?? 0) !== body.expectedVersion) return null;
        const [saved] = await trx('portal.fc_user_profiles')
          .insert({
            ...scope,
            profile: JSON.stringify(profile),
            version: body.expectedVersion + 1,
            updated_at: trx.fn.now(),
          })
          .onConflict(['tenant_id', 'user_id'])
          .merge(['profile', 'version', 'updated_at'])
          .returning(['profile', 'version', 'updated_at']);
        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          action: 'profile.update',
          resourceType: 'user_profile',
          resourceId: ctx.identity.userId,
          result: 'success',
          requestId: ctx.requestId,
          changedFields: Object.keys(profile),
        });
        return {
          profile: saved.profile,
          version: saved.version,
          updatedAt: saved.updated_at,
          source: 'self_declared',
        };
      });
      if (!result)
        return res.status(409).json({
          error: {
            code: 'version_conflict',
            message:
              '다른 화면에서 프로필이 변경되었습니다. 새로고침 후 다시 수정하세요.',
            requestId: ctx.requestId,
            retryable: false,
          },
        });
      return res.json({ data: result, meta: meta(ctx.requestId) });
    } catch {
      deps.logger.error('my profile update failed', {
        requestId: ctx.requestId,
      });
      return res.status(500).json({
        error: {
          code: 'profile_save_failed',
          message: '프로필을 저장하지 못했습니다. 입력 내용은 유지됩니다.',
          retryable: true,
          requestId: ctx.requestId,
        },
      });
    }
  });
  return router;
};
