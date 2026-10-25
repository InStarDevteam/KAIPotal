import { Router } from 'express';
import { Knex } from 'knex';
import { randomUUID } from 'crypto';
import { HttpAuthService, LoggerService } from '@backstage/backend-plugin-api';
import { getPortalContext, requirePermission } from '../services/middleware';
import { setTenantContext } from '../services/context';
import { recordAuditEvent } from '../services/audit';
import {
  getProposalBundle,
  hasBlockingReview,
  isProposalAdmin,
  isUniqueViolation,
  listProposals,
  planSympathyAction,
  proposalEditable,
  proposalReadable,
  PROPOSAL_SORTS,
  PROPOSAL_STATUSES,
  PROPOSAL_TYPES,
  PROPOSAL_VISIBILITIES,
  REVIEW_DECISIONS,
  reviewDecisionToStatus,
  safeHttpUrl,
  ReviewDecision,
} from '../services/proposals';

import { validPortalText as validText } from '../services/textValidation';

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
  connectionState: 'connected' as const,
  freshness: 'fresh' as const,
  nextCursor: null,
});

const errorBody = (
  code: string,
  message: string,
  requestId: string,
  retryable = false,
) => ({ error: { code, message, retryable, requestId } });

export const createProposalsRouter = ({ db, httpAuth, logger }: RouterDeps) => {
  const router = Router();
  const deps = { db, httpAuth, logger };
  const portalView = requirePermission(deps, 'portal.view');

  router.get('/v1/proposals', portalView, async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const type = req.query.type as string | undefined;
      const status = req.query.status as string | undefined;
      const visibility = req.query.visibility as string | undefined;
      const sort = (req.query.sort as string | undefined) ?? 'latest';
      const page = Number(req.query.page ?? 1);
      const pageSize = Number(req.query.pageSize ?? 20);
      if (
        (type && !PROPOSAL_TYPES.includes(type as never)) ||
        (status && !PROPOSAL_STATUSES.includes(status as never)) ||
        (visibility && !PROPOSAL_VISIBILITIES.includes(visibility as never)) ||
        !PROPOSAL_SORTS.includes(sort as never) ||
        !Number.isSafeInteger(page) ||
        page < 1 ||
        !Number.isSafeInteger(pageSize) ||
        pageSize < 1 ||
        pageSize > 200
      ) {
        return res
          .status(422)
          .json(errorBody('invalid_filters', '조회 조건을 확인하세요.', ctx.requestId));
      }
      const data = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        return listProposals(trx, ctx.identity.userId, isProposalAdmin(ctx.permissions), {
          type,
          status,
          visibility,
          mine: req.query.mine === 'true',
          sort: sort as 'latest' | 'sympathy',
          page,
          pageSize,
        });
      });
      return res.json({ data, meta: meta(ctx.requestId) });
    } catch (e) {
      logger.error(`proposal list error: ${(e as Error).message}`, {
        requestId: ctx.requestId,
      });
      return res
        .status(500)
        .json(errorBody('internal_error', '제안 목록 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.post('/v1/proposals', portalView, async (req, res) => {
    const ctx = getPortalContext(req);
    const requestId = ctx.requestId;
    const body = req.body ?? {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const type = body.type;
    const visibility = body.visibility ?? 'tenant';
    const attachmentUri = body.attachmentUri ?? null;
    const idempotencyKey =
      body.idempotencyKey === undefined || body.idempotencyKey === null
        ? null
        : String(body.idempotencyKey).slice(0, 120);
    if (
      !PROPOSAL_TYPES.includes(type) ||
      !validText(title, 1, 200) ||
      (body.necessity !== undefined &&
        body.necessity !== null &&
        !validText(body.necessity, 0, 4000, true)) ||
      (body.utilizationPlan !== undefined &&
        body.utilizationPlan !== null &&
        !validText(body.utilizationPlan, 0, 4000, true)) ||
      !PROPOSAL_VISIBILITIES.includes(visibility) ||
      !safeHttpUrl(attachmentUri, true)
    ) {
      return res
        .status(422)
        .json(errorBody('invalid_proposal', '유형·제목·내용·공개범위·첨부 링크를 확인하세요.', requestId));
    }
    try {
      const result = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        if (idempotencyKey) {
          const existing = await trx('portal.fc_proposal')
            .where({ tenant_id: ctx.tenantId, idempotency_key: idempotencyKey })
            .first();
          if (existing) {
            if (existing.author_id !== ctx.identity.userId) {
              const err = new Error('idempotency_conflict');
              (err as { statusCode?: number }).statusCode = 409;
              throw err;
            }
            return { status: 200, proposal: existing };
          }
        }
        const id = randomUUID();
        await trx('portal.fc_proposal').insert({
          id,
          tenant_id: ctx.tenantId,
          type,
          title,
          necessity: body.necessity ?? null,
          utilization_plan: body.utilizationPlan ?? null,
          visibility,
          status: 'submitted',
          author_id: ctx.identity.userId,
          attachment_uri: attachmentUri,
          idempotency_key: idempotencyKey,
          created_by: ctx.identity.userId,
          updated_by: ctx.identity.userId,
        });
        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          action: 'proposal.create',
          resourceType: 'proposal',
          resourceId: id,
          result: 'success',
          requestId,
        });
        const proposal = await trx('portal.fc_proposal').where({ id }).first();
        return { status: 201, proposal };
      });
      return res
        .status(result.status)
        .json({ data: result.proposal, meta: meta(requestId) });
    } catch (e) {
      if ((e as { statusCode?: number }).statusCode === 409) {
        return res
          .status(409)
          .json(errorBody('idempotency_conflict', '동일한 생성 요청이 다른 사용자에 의해 처리되었습니다.', requestId));
      }
      logger.error(`proposal create error: ${(e as Error).message}`, { requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '제안 등록 중 오류가 발생했습니다.', requestId, true));
    }
  });

  router.get('/v1/proposals/:id', portalView, async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const data = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        const bundle = await getProposalBundle(trx, req.params.id, ctx.identity.userId);
        if (
          !bundle ||
          !proposalReadable(
            bundle.proposal,
            ctx.identity.userId,
            isProposalAdmin(ctx.permissions),
          )
        ) {
          return null;
        }
        await trx('portal.fc_proposal')
          .where({ id: req.params.id })
          .update({ view_count: trx.raw('view_count + 1') });
        return bundle;
      });
      if (!data) {
        return res
          .status(404)
          .json(errorBody('not_found', '제안을 찾을 수 없습니다.', ctx.requestId));
      }
      return res.json({ data, meta: meta(ctx.requestId) });
    } catch (e) {
      logger.error(`proposal detail error: ${(e as Error).message}`, {
        requestId: ctx.requestId,
      });
      return res
        .status(500)
        .json(errorBody('internal_error', '제안 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.patch('/v1/proposals/:id', portalView, async (req, res) => {
    const ctx = getPortalContext(req);
    const requestId = ctx.requestId;
    const body = req.body ?? {};
    const patch: Record<string, unknown> = {};
    for (const key of [
      'title',
      'necessity',
      'utilizationPlan',
      'visibility',
      'attachmentUri',
      'expectedVersion',
    ]) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
    if (
      Object.keys(patch).length === 0 ||
      (patch.title !== undefined && !validText(patch.title, 1, 200)) ||
      (patch.necessity !== undefined &&
        patch.necessity !== null &&
        !validText(patch.necessity, 0, 4000, true)) ||
      (patch.utilizationPlan !== undefined &&
        patch.utilizationPlan !== null &&
        !validText(patch.utilizationPlan, 0, 4000, true)) ||
      (patch.visibility !== undefined &&
        !PROPOSAL_VISIBILITIES.includes(patch.visibility as never)) ||
      (patch.attachmentUri !== undefined &&
        !safeHttpUrl(patch.attachmentUri, true))
    ) {
      return res
        .status(422)
        .json(errorBody('invalid_proposal', '수정할 필드와 값을 확인하세요.', requestId));
    }
    try {
      const result = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        const proposal = await trx('portal.fc_proposal')
          .where({ id: req.params.id })
          .first();
        if (!proposal) {
          return { status: 404, code: 'not_found', message: '제안을 찾을 수 없습니다.' };
        }
        if (
          !proposalEditable(
            proposal,
            ctx.identity.userId,
            isProposalAdmin(ctx.permissions),
          )
        ) {
          await recordAuditEvent(trx, ctx.principal, {
            tenantId: ctx.tenantId,
            actorId: ctx.identity.userId,
            action: 'proposal.update',
            resourceType: 'proposal',
            resourceId: req.params.id,
            result: 'denied',
            reasonCode: 'missing_permission',
            requestId,
          });
          return {
            status: 403,
            code: 'permission_denied',
            message: '제안을 수정할 권한이 없습니다.',
          };
        }
        const reviews = await trx('portal.fc_proposal_review')
          .where({ proposal_id: req.params.id })
          .select('decision');
        if (hasBlockingReview(reviews)) {
          return {
            status: 409,
            code: 'reviewed_locked',
            message: '답변이 등록된 제안은 수정할 수 없습니다.',
          };
        }
        const expectedVersion =
          patch.expectedVersion === undefined
            ? undefined
            : Number(patch.expectedVersion);
        if (
          expectedVersion !== undefined &&
          expectedVersion !== proposal.version
        ) {
          return {
            status: 409,
            code: 'version_conflict',
            message: '다른 사용자가 먼저 수정했습니다. 최신 내용을 다시 불러온 후 시도하세요.',
          };
        }
        await trx('portal.fc_proposal')
          .where({ id: req.params.id })
          .update({
            ...(patch.title !== undefined ? { title: patch.title } : {}),
            ...(patch.necessity !== undefined
              ? { necessity: patch.necessity }
              : {}),
            ...(patch.utilizationPlan !== undefined
              ? { utilization_plan: patch.utilizationPlan }
              : {}),
            ...(patch.visibility !== undefined
              ? { visibility: patch.visibility }
              : {}),
            ...(patch.attachmentUri !== undefined
              ? { attachment_uri: patch.attachmentUri }
              : {}),
            version: trx.raw('version + 1'),
            updated_by: ctx.identity.userId,
            updated_at: trx.fn.now(),
          });
        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          action: 'proposal.update',
          resourceType: 'proposal',
          resourceId: req.params.id,
          resourceVersion: String((proposal.version as number) + 1),
          result: 'success',
          changedFields: Object.keys(patch).filter(key => key !== 'expectedVersion'),
          requestId,
        });
        const updated = await trx('portal.fc_proposal')
          .where({ id: req.params.id })
          .first();
        return { status: 200, data: updated };
      });
      if (result.status !== 200) {
        return res
          .status(result.status)
          .json(errorBody(result.code ?? 'internal_error', result.message ?? '요청을 처리하지 못했습니다.', requestId));
      }
      return res.json({ data: result.data, meta: meta(requestId) });
    } catch (e) {
      logger.error(`proposal update error: ${(e as Error).message}`, { requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '제안 수정 중 오류가 발생했습니다.', requestId, true));
    }
  });

  router.delete('/v1/proposals/:id', portalView, async (req, res) => {
    const ctx = getPortalContext(req);
    const requestId = ctx.requestId;
    try {
      const result = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        const proposal = await trx('portal.fc_proposal')
          .where({ id: req.params.id })
          .first();
        if (!proposal) {
          return { status: 404, code: 'not_found', message: '제안을 찾을 수 없습니다.' };
        }
        if (
          !proposalEditable(
            proposal,
            ctx.identity.userId,
            isProposalAdmin(ctx.permissions),
          )
        ) {
          return {
            status: 403,
            code: 'permission_denied',
            message: '제안을 삭제할 권한이 없습니다.',
          };
        }
        const reviews = await trx('portal.fc_proposal_review')
          .where({ proposal_id: req.params.id })
          .select('decision');
        if (reviews.length > 0) {
          return {
            status: 409,
            code: 'reviewed_locked',
            message: '답변이 등록된 제안은 삭제할 수 없습니다.',
          };
        }
        await trx('portal.fc_proposal_sympathy')
          .where({ proposal_id: req.params.id })
          .delete();
        await trx('portal.fc_proposal')
          .where({ id: req.params.id })
          .delete();
        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          action: 'proposal.delete',
          resourceType: 'proposal',
          resourceId: req.params.id,
          result: 'success',
          requestId,
        });
        return { status: 200, data: { id: req.params.id, deleted: true } };
      });
      if (result.status !== 200) {
        return res
          .status(result.status)
          .json(errorBody(result.code ?? 'internal_error', result.message ?? '요청을 처리하지 못했습니다.', requestId));
      }
      return res.json({ data: result.data, meta: meta(requestId) });
    } catch (e) {
      logger.error(`proposal delete error: ${(e as Error).message}`, { requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '제안 삭제 중 오류가 발생했습니다.', requestId, true));
    }
  });

  router.post('/v1/proposals/:id/sympathy', portalView, async (req, res) => {
    const ctx = getPortalContext(req);
    const requestId = ctx.requestId;
    try {
      const result = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        const proposal = await trx('portal.fc_proposal')
          .where({ id: req.params.id })
          .first();
        if (
          !proposal ||
          !proposalReadable(
            proposal,
            ctx.identity.userId,
            isProposalAdmin(ctx.permissions),
          )
        ) {
          return { status: 404, code: 'not_found', message: '제안을 찾을 수 없습니다.' };
        }
        const existing = await trx('portal.fc_proposal_sympathy')
          .where({ proposal_id: req.params.id, user_id: ctx.identity.userId })
          .first('user_id');
        const action = planSympathyAction(Boolean(existing));
        try {
          if (action === 'delete') {
            await trx('portal.fc_proposal_sympathy')
              .where({ proposal_id: req.params.id, user_id: ctx.identity.userId })
              .delete();
          } else {
            await trx('portal.fc_proposal_sympathy').insert({
              proposal_id: req.params.id,
              tenant_id: ctx.tenantId,
              user_id: ctx.identity.userId,
            });
          }
        } catch (e) {
          if (isUniqueViolation(e)) {
            return {
              status: 409,
              code: 'sympathy_conflict',
              message: '동시에 공감 처리되었습니다. 현재 상태를 확인하세요.',
            };
          }
          throw e;
        }
        const countRow = await trx('portal.fc_proposal_sympathy')
          .where({ proposal_id: req.params.id })
          .count('* as count')
          .first();
        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          action: `proposal.sympathy.${action}`,
          resourceType: 'proposal',
          resourceId: req.params.id,
          result: 'success',
          requestId,
        });
        return {
          status: 200,
          data: {
            proposalId: req.params.id,
            sympathyCount: Number(countRow?.count ?? 0),
            mySympathy: action === 'insert',
          },
        };
      });
      if (result.status !== 200) {
        const status = result.status === 404 ? 404 : 409;
        return res.status(status).json(errorBody(result.code ?? 'internal_error', result.message ?? '요청을 처리하지 못했습니다.', requestId));
      }
      return res.json({ data: result.data, meta: meta(requestId) });
    } catch (e) {
      logger.error(`proposal sympathy error: ${(e as Error).message}`, { requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '공감 처리 중 오류가 발생했습니다.', requestId, true));
    }
  });

  router.post('/v1/proposals/:id/reviews', portalView, async (req, res) => {
    const ctx = getPortalContext(req);
    const requestId = ctx.requestId;
    const body = req.body ?? {};
    const decision = body.decision;
    const attachmentUri = body.attachmentUri ?? null;
    if (
      !REVIEW_DECISIONS.includes(decision) ||
      !validText(body.body, 1, 4000, true) ||
      !safeHttpUrl(attachmentUri, true)
    ) {
      return res
        .status(422)
        .json(errorBody('invalid_review', '결정 유형·내용·첨부 링크를 확인하세요.', requestId));
    }
    if (!isProposalAdmin(ctx.permissions)) {
      await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          action: 'proposal.review',
          resourceType: 'proposal',
          resourceId: req.params.id,
          result: 'denied',
          reasonCode: 'missing_permission',
          requestId,
        });
      });
      return res
        .status(403)
        .json(errorBody('permission_denied', '제안에 답변할 권한이 없습니다.', requestId));
    }
    try {
      const result = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        const proposal = await trx('portal.fc_proposal')
          .where({ id: req.params.id })
          .first();
        if (!proposal) {
          return { status: 404, code: 'not_found', message: '제안을 찾을 수 없습니다.' };
        }
        const nextStatus = reviewDecisionToStatus(decision as ReviewDecision);
        const id = randomUUID();
        await trx('portal.fc_proposal_review').insert({
          id,
          tenant_id: ctx.tenantId,
          proposal_id: req.params.id,
          reviewer_id: ctx.identity.userId,
          decision,
          body: body.body,
          attachment_uri: attachmentUri,
        });
        await trx('portal.fc_proposal')
          .where({ id: req.params.id })
          .update({
            status: nextStatus,
            version: trx.raw('version + 1'),
            updated_by: ctx.identity.userId,
            updated_at: trx.fn.now(),
          });
        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          action: 'proposal.review',
          resourceType: 'proposal',
          resourceId: req.params.id,
          resourceVersion: String((proposal.version as number) + 1),
          result: 'success',
          changedFields: ['status'],
          requestId,
        });
        return {
          status: 201,
          data: { id, proposalId: req.params.id, decision, status: nextStatus },
        };
      });
      if (result.status !== 201) {
        return res
          .status(result.status)
          .json(errorBody(result.code ?? 'internal_error', result.message ?? '요청을 처리하지 못했습니다.', requestId));
      }
      return res.status(201).json({ data: result.data, meta: meta(requestId) });
    } catch (e) {
      logger.error(`proposal review error: ${(e as Error).message}`, { requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '답변 등록 중 오류가 발생했습니다.', requestId, true));
    }
  });

  return router;
};
