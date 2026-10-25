import { Router } from 'express';
import { Knex } from 'knex';
import { HttpAuthService, LoggerService } from '@backstage/backend-plugin-api';
import { getPortalContext, requireMembership } from '../services/middleware';
import { setTenantContext } from '../services/context';
import { recordAuditEvent } from '../services/audit';
import {
  applyCreditTransaction,
  createCreditRequest,
  CREDIT_OWNER_TYPES,
  CREDIT_REQUEST_TYPES,
  CREDIT_TRANSACTION_TYPES,
  CreditOwnerType,
  CreditRequestType,
  CreditTransactionType,
  decideCreditRequest,
  getCreditUsageTrend,
  reconcileCreditAccount,
} from '../services/credits';

interface RouterDeps {
  db: Knex;
  httpAuth: HttpAuthService;
  logger: LoggerService;
}

const meta = (requestId: string) => ({
  requestId,
  asOf: new Date().toISOString(),
  dataMode: 'live' as const,
  sourceSystem: 'portal',
  collectionCycleSec: 30,
  staleAfterSec: 120,
});

const errorBody = (
  code: string,
  message: string,
  requestId: string,
  retryable = false,
) => ({ error: { code, message, retryable, requestId } });

const CREDIT_STATUS_CODE: Record<string, number> = {
  not_found: 404,
  invalid_amount: 422,
  invalid_input: 422,
  invalid_state: 409,
  insufficient_balance: 409,
  version_conflict: 409,
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const canViewOwner = (
  permissions: Set<string>,
  viewerUserId: string,
  ownerType: CreditOwnerType,
  ownerId: string,
): boolean =>
  permissions.has('credit.view') ||
  (ownerType === 'user' && ownerId === viewerUserId);

export const createCreditsRouter = ({ db, httpAuth, logger }: RouterDeps) => {
  const router = Router();
  const deps = { db, httpAuth, logger };

  router.get('/v1/credits/products', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const products = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        return trx('portal.fc_credit_product')
          .orderBy('code', 'asc')
          .orderBy('valid_from', 'desc')
          .select('*');
      });
      return res.json({ data: { items: products }, meta: meta(ctx.requestId) });
    } catch (e) {
      logger.error(`credit products error: ${(e as Error).message}`, {
        requestId: ctx.requestId,
      });
      return res
        .status(500)
        .json(errorBody('internal_error', '상품 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.get('/v1/credits/usage/trend', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    const ownerType = req.query.owner_type as CreditOwnerType;
    const ownerId = (req.query.owner_id ?? '').toString();
    if (
      !CREDIT_OWNER_TYPES.includes(ownerType) ||
      !UUID_PATTERN.test(ownerId) ||
      !canViewOwner(ctx.permissions, ctx.identity.userId, ownerType, ownerId)
    ) {
      return res
        .status(403)
        .json(errorBody('permission_denied', '사용량 추이를 조회할 권한이 없습니다.', ctx.requestId));
    }
    try {
      const trend = await db.transaction(async trx =>
        getCreditUsageTrend(
          trx,
          ctx.tenantId,
          ownerType,
          ownerId,
          req.query.from as string | undefined,
          req.query.to as string | undefined,
        ),
      );
      return res.json({ data: trend, meta: meta(ctx.requestId) });
    } catch (e) {
      logger.error(`credit usage trend error: ${(e as Error).message}`, {
        requestId: ctx.requestId,
      });
      return res
        .status(500)
        .json(errorBody('internal_error', '사용량 추이 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.get('/v1/credits/accounts', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    const ownerType = req.query.owner_type as CreditOwnerType;
    const ownerId = (req.query.owner_id ?? '').toString();
    if (
      !CREDIT_OWNER_TYPES.includes(ownerType) ||
      !UUID_PATTERN.test(ownerId)
    ) {
      return res
        .status(422)
        .json(errorBody('invalid_owner', 'owner_type/owner_id가 올바르지 않습니다.', ctx.requestId));
    }
    if (!canViewOwner(ctx.permissions, ctx.identity.userId, ownerType, ownerId)) {
      return res
        .status(403)
        .json(errorBody('permission_denied', '해당 계정을 조회할 권한이 없습니다.', ctx.requestId));
    }
    try {
      const data = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        const account = await trx('portal.fc_credit_account')
          .where({
            tenant_id: ctx.tenantId,
            owner_type: ownerType,
            owner_id: ownerId,
          })
          .first();
        if (!account) return null;
        const recentTransactions = await trx('portal.fc_credit_transaction')
          .where({ account_id: account.id })
          .orderBy('created_at', 'desc')
          .limit(10)
          .select('*');
        const reconciliation = await reconcileCreditAccount(
          trx,
          ctx.tenantId,
          account.id as string,
        );
        return {
          account,
          recentTransactions,
          balanced: reconciliation.ok ? reconciliation.value.balanced : null,
        };
      });
      if (!data) {
        return res
          .status(404)
          .json(errorBody('not_found', '크레딧 계정을 찾을 수 없습니다.', ctx.requestId));
      }
      return res.json({ data, meta: meta(ctx.requestId) });
    } catch (e) {
      logger.error(`credit account error: ${(e as Error).message}`, {
        requestId: ctx.requestId,
      });
      return res
        .status(500)
        .json(errorBody('internal_error', '계정 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.get(
    '/v1/credits/accounts/:id/transactions',
    requireMembership(deps),
    async (req, res) => {
      const ctx = getPortalContext(req);
      const accountId = req.params.id;
      if (!UUID_PATTERN.test(accountId)) {
        return res
          .status(422)
          .json(errorBody('invalid_account_id', '계정 ID가 올바르지 않습니다.', ctx.requestId));
      }
      const type = req.query.type as CreditTransactionType | undefined;
      if (type && !CREDIT_TRANSACTION_TYPES.includes(type)) {
        return res
          .status(422)
          .json(errorBody('invalid_type', '지원하지 않는 거래 유형입니다.', ctx.requestId));
      }
      try {
        const result = await db.transaction(async trx => {
          await setTenantContext(trx, ctx.tenantId);
          const account = await trx('portal.fc_credit_account')
            .where({ id: accountId })
            .first('id', 'owner_type', 'owner_id');
          if (!account) return null;
          if (
            !canViewOwner(
              ctx.permissions,
              ctx.identity.userId,
              account.owner_type as CreditOwnerType,
              account.owner_id as string,
            )
          ) {
            const err = new Error('permission_denied');
            (err as { statusCode?: number }).statusCode = 403;
            throw err;
          }
          const page = Math.max(Number(req.query.page ?? 1) || 1, 1);
          const pageSize = Math.min(
            Math.max(Number(req.query.pageSize ?? 20) || 20, 1),
            200,
          );
          let qb = trx('portal.fc_credit_transaction')
            .where({ tenant_id: ctx.tenantId, account_id: accountId })
            .orderBy('created_at', 'desc')
            .orderBy('id', 'desc');
          if (type) qb = qb.where({ type });
          if (req.query.from)
            qb = qb.where('created_at', '>=', String(req.query.from));
          if (req.query.to) qb = qb.where('created_at', '<=', String(req.query.to));
          const totalRow = await qb.clone().clearOrder().count('* as count').first();
          const items = await qb
            .limit(pageSize)
            .offset((page - 1) * pageSize)
            .select('*');
          return {
            items,
            pagination: {
              page,
              pageSize,
              total: Number(totalRow?.count ?? 0),
            },
          };
        });
        if (!result) {
          return res
            .status(404)
            .json(errorBody('not_found', '크레딧 계정을 찾을 수 없습니다.', ctx.requestId));
        }
        return res.json({ data: result, meta: meta(ctx.requestId) });
      } catch (e) {
        if ((e as { statusCode?: number })?.statusCode === 403) {
          return res
            .status(403)
            .json(errorBody('permission_denied', '거래 내역을 조회할 권한이 없습니다.', ctx.requestId));
        }
        logger.error(`credit transactions error: ${(e as Error).message}`, {
          requestId: ctx.requestId,
        });
        return res
          .status(500)
          .json(errorBody('internal_error', '거래 내역 조회 중 오류가 발생했습니다.', ctx.requestId, true));
      }
    },
  );

  router.post('/v1/credits/requests', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    const body = req.body ?? {};
    const type = body.type as CreditRequestType;
    const ownerType = body.owner_type as CreditOwnerType;
    const ownerId = (body.owner_id ?? '').toString();
    const amount = (body.amount ?? '').toString();
    const reason = (body.reason ?? '').toString().trim();
    const idempotencyKey = body.idempotency_key
      ? String(body.idempotency_key).slice(0, 200)
      : undefined;
    if (!CREDIT_REQUEST_TYPES.includes(type)) {
      return res
        .status(422)
        .json(errorBody('invalid_request_type', '지원하지 않는 요청 유형입니다.', ctx.requestId));
    }
    if (!CREDIT_OWNER_TYPES.includes(ownerType) || !UUID_PATTERN.test(ownerId)) {
      return res
        .status(422)
        .json(errorBody('invalid_owner', 'owner_type/owner_id가 올바르지 않습니다.', ctx.requestId));
    }
    if (ownerType === 'user' && ownerId !== ctx.identity.userId) {
      return res
        .status(403)
        .json(errorBody('permission_denied', '다른 사용자의 크레딧을 신청할 수 없습니다.', ctx.requestId));
    }
    if (!reason || reason.length > 500) {
      return res
        .status(422)
        .json(errorBody('invalid_reason', '사유는 1~500자로 입력해야 합니다.', ctx.requestId));
    }
    try {
      const result = await db.transaction(async trx => {
        const created = await createCreditRequest(trx, ctx.tenantId, {
          type,
          ownerType,
          ownerId,
          amount,
          reason,
          requestedBy: ctx.identity.userId,
          idempotencyKey,
        });
        if (!created.ok) return created;
        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          action: 'credit.request.submit',
          resourceType: 'credit_request',
          resourceId: created.value.id as string,
          result: 'success',
          requestId: ctx.requestId,
        });
        return created;
      });
      if (!result.ok) {
        return res
          .status(CREDIT_STATUS_CODE[result.code] ?? 500)
          .json(errorBody(result.code, result.message, ctx.requestId));
      }
      return res.status(201).json({ data: result.value, meta: meta(ctx.requestId) });
    } catch (e) {
      logger.error(`credit request create error: ${(e as Error).message}`, {
        requestId: ctx.requestId,
      });
      return res
        .status(500)
        .json(errorBody('internal_error', '요청 접수 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.get('/v1/credits/requests', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    const status = (req.query.status ?? '').toString();
    const type = req.query.type as CreditRequestType | undefined;
    const mineOnly = req.query.mine === 'true';
    if (
      (status &&
        !['requested', 'approved', 'rejected', 'cancelled'].includes(status)) ||
      (type && !CREDIT_REQUEST_TYPES.includes(type))
    ) {
      return res
        .status(422)
        .json(errorBody('invalid_filter', '필터 값이 올바르지 않습니다.', ctx.requestId));
    }
    const canViewAll = ctx.permissions.has('credit.view');
    if (!mineOnly && !canViewAll) {
      return res
        .status(403)
        .json(errorBody('permission_denied', '승인함 조회 권한(credit.view)이 없습니다.', ctx.requestId));
    }
    try {
      const items = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        let qb = trx('portal.fc_credit_request').orderBy('requested_at', 'desc');
        if (mineOnly) qb = qb.where({ requested_by: ctx.identity.userId });
        if (status) qb = qb.where({ status });
        if (type) qb = qb.where({ type });
        return qb.limit(200).select('*');
      });
      return res.json({ data: { items }, meta: meta(ctx.requestId) });
    } catch (e) {
      logger.error(`credit requests list error: ${(e as Error).message}`, {
        requestId: ctx.requestId,
      });
      return res
        .status(500)
        .json(errorBody('internal_error', '요청 목록 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.post(
    '/v1/credits/requests/:id/decision',
    requireMembership(deps),
    async (req, res) => {
      const ctx = getPortalContext(req);
      const requestId = ctx.requestId;
      const body = req.body ?? {};
      const decision = body.decision;
      if (decision !== 'approved' && decision !== 'rejected') {
        return res
          .status(422)
          .json(errorBody('invalid_decision', 'decision은 approved 또는 rejected여야 합니다.', requestId));
      }
      const reason = (body.reason ?? '').toString().trim();
      if (!reason || reason.length > 500) {
        return res
          .status(422)
          .json(errorBody('invalid_reason', '결정 사유는 1~500자로 입력해야 합니다.', requestId));
      }
      if (!ctx.permissions.has('credit.approve')) {
        return res
          .status(403)
          .json(errorBody('permission_denied', '크레딧 요청을 결정할 권한이 없습니다.', requestId));
      }
      const expectedVersion =
        body.expectedVersion === undefined || body.expectedVersion === null
          ? undefined
          : Number(body.expectedVersion);
      try {
        const result = await db.transaction(async trx => {
          const decided = await decideCreditRequest(
            trx,
            ctx.tenantId,
            req.params.id,
            ctx.identity.userId,
            decision,
            reason,
            Number.isFinite(expectedVersion) ? expectedVersion : undefined,
          );
          if (!decided.ok) return decided;
          await recordAuditEvent(trx, ctx.principal, {
            tenantId: ctx.tenantId,
            actorId: ctx.identity.userId,
            action: `credit.request.${decision}`,
            resourceType: 'credit_request',
            resourceId: req.params.id,
            resourceVersion: String(decided.value.version ?? ''),
            result: 'success',
            changedFields: ['status', 'decided_by', 'decided_at'],
            requestId,
          });
          return decided;
        });
        if (!result.ok) {
          return res
            .status(CREDIT_STATUS_CODE[result.code] ?? 500)
            .json(errorBody(result.code, result.message, requestId));
        }
        return res.json({ data: result.value, meta: meta(requestId) });
      } catch (e) {
        logger.error(`credit decision error: ${(e as Error).message}`, { requestId });
        return res
          .status(500)
          .json(errorBody('internal_error', '결정 처리 중 오류가 발생했습니다.', requestId, true));
      }
    },
  );

  router.post('/v1/credits/transactions', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    const requestId = ctx.requestId;
    const body = req.body ?? {};
    const ownerType = body.owner_type as CreditOwnerType;
    const ownerId = (body.owner_id ?? '').toString();
    const amount = (body.amount ?? '').toString();
    const reason = (body.reason ?? '').toString().trim();
    const idempotencyKey = body.idempotency_key
      ? String(body.idempotency_key).slice(0, 200)
      : undefined;
    if ((body.type ?? 'adjust') !== 'adjust') {
      return res
        .status(422)
        .json(errorBody('invalid_type', '이 엔드포인트는 adjust 정정만 허용합니다.', requestId));
    }
    if (!CREDIT_OWNER_TYPES.includes(ownerType) || !UUID_PATTERN.test(ownerId)) {
      return res
        .status(422)
        .json(errorBody('invalid_owner', 'owner_type/owner_id가 올바르지 않습니다.', requestId));
    }
    if (!reason || reason.length > 500) {
      return res
        .status(422)
        .json(errorBody('invalid_reason', '정정 사유는 1~500자로 입력해야 합니다.', requestId));
    }
    if (!ctx.permissions.has('credit.approve')) {
      return res
        .status(403)
        .json(errorBody('permission_denied', '크레딧 정정 권한이 없습니다.', requestId));
    }
    try {
      const result = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        const account = await trx('portal.fc_credit_account')
          .where({ tenant_id: ctx.tenantId, owner_type: ownerType, owner_id: ownerId })
          .first();
        if (!account) {
          return {
            ok: false as const,
            code: 'not_found' as const,
            message: '크레딧 계정을 찾을 수 없습니다.',
          };
        }
        const applied = await applyCreditTransaction(trx, ctx.tenantId, {
          accountId: account.id as string,
          type: 'adjust',
          amount,
          reason,
          refType: 'manual_adjust',
          idempotencyKey,
          createdBy: ctx.identity.userId,
        });
        if (!applied.ok) return applied;
        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          action: 'credit.transaction.adjust',
          resourceType: 'credit_account',
          resourceId: account.id as string,
          result: 'success',
          changedFields: ['balance'],
          requestId,
        });
        return applied;
      });
      if (!result.ok) {
        return res
          .status(CREDIT_STATUS_CODE[result.code] ?? 500)
          .json(errorBody(result.code, result.message, requestId));
      }
      return res.status(201).json({ data: result.value, meta: meta(requestId) });
    } catch (e) {
      logger.error(`credit adjust error: ${(e as Error).message}`, { requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '정정 처리 중 오류가 발생했습니다.', requestId, true));
    }
  });

  return router;
};
