import { Router } from 'express';
import { Knex } from 'knex';
import { randomUUID } from 'crypto';
import { HttpAuthService, LoggerService } from '@backstage/backend-plugin-api';
import { getPortalContext, requireMembership } from '../services/middleware';
import { setTenantContext } from '../services/context';
import { recordAuditEvent } from '../services/audit';
import {
  buildWorkOverview,
  canDecideType,
  typeRequestPermissions,
  decideRequest,
  getRequestWithHistory,
  listApprovalQueue,
  WORK_REQUEST_TYPES,
  WorkRequestType,
} from '../services/workRequests';

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
  // 관측 주기/신선도 기준 — 클라이언트가 지연 상태를 판정하는 데 사용한다.
  collectionCycleSec: 30,
  staleAfterSec: 120,
});

const errorBody = (
  code: string,
  message: string,
  requestId: string,
  retryable = false,
) => ({ error: { code, message, retryable, requestId } });

/** 내 신청 목록(커서 페이지네이션). */
const listMyRequests = async (
  trx: Knex.Transaction,
  userId: string,
  options: { cursor?: string | undefined; limit: number },
) => {
  const limit = Math.min(Math.max(options.limit, 1), 100);
  let qb = trx('portal.fc_work_requests')
    .where({ requester_user_id: userId })
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
    .limit(limit + 1);
  if (options.cursor) {
    const [at, id] = options.cursor.split('|');
    if (at && id) {
      qb = qb.where(function olderRequests() {
        this.where('created_at', '<', at).orWhere(function sameTimeOlderId() {
          this.where('created_at', at).andWhere('id', '<', id);
        });
      });
    }
  }
  const rows = await qb.select('*');
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return {
    items,
    nextCursor:
      hasMore && last
        ? `${(last.created_at as Date).toISOString()}|${last.id}`
        : null,
  };
};

/**
 * 포털 업무 첫 화면 집계 + 공유 승인함.
 *
 * 기존 40개 플랫폼 연계 계약과의 관계: 크레딧·자원 사용량 등 플랫폼 원천 데이터는
 * 여전히 그 계약들의 책임이며, 이 라우터는 포털 낮 추적(멤버십·신청·승인·감사)만
 * 다룬다. 원천 미연동 항목은 수치를 만들지 않고 pending_integration으로 표시한다.
 */
export const createWorkOverviewRouter = ({
  db,
  httpAuth,
  logger,
}: RouterDeps) => {
  const router = Router();
  const deps = { db, httpAuth, logger };

  // ── 첫 화면 집계: 유효 소속만 필요(역할별 내용은 권한 집합으로 분기) ──
  router.get('/v1/work/overview', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const overview = await db.transaction(async trx =>
        buildWorkOverview(
          trx,
          ctx.tenantId,
          ctx.identity.userId,
          ctx.permissions,
          (section, error) =>
            logger.error(
              `work overview section unavailable: ${section}: ${
                (error as Error).message
              }`,
              {
                requestId: ctx.requestId,
                section,
              },
            ),
        ),
      );
      const states = Object.values(overview.sections).filter(
        state => state !== 'permission_missing',
      );
      if (states.every(state => state === 'unavailable')) {
        return res
          .status(503)
          .json(
            errorBody(
              'work_sources_unavailable',
              '업무 현황 연결을 확인하고 있습니다. 잠시 후 다시 시도하세요.',
              ctx.requestId,
              true,
            ),
          );
      }
      return res.json({
        data: overview,
        meta: {
          ...meta(ctx.requestId),
          partial: states.includes('unavailable'),
        },
      });
    } catch (e) {
      logger.error(`work overview error: ${(e as Error).message}`, {
        requestId: ctx.requestId,
      });
      return res
        .status(500)
        .json(
          errorBody(
            'internal_error',
            '집계 중 오류가 발생했습니다.',
            ctx.requestId,
            true,
          ),
        );
    }
  });

  // ── 내 신청 목록(커서 페이지네이션) ──
  router.get('/v1/work/requests', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const limit = Math.min(Number(req.query.limit ?? 20) || 20, 100);
      const result = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        return listMyRequests(trx, ctx.identity.userId, {
          cursor: req.query.cursor as string | undefined,
          limit,
        });
      });
      return res.json({
        data: result,
        meta: { ...meta(ctx.requestId), nextCursor: result.nextCursor },
      });
    } catch (e) {
      logger.error(`work requests error: ${(e as Error).message}`, {
        requestId: ctx.requestId,
      });
      return res
        .status(500)
        .json(
          errorBody(
            'internal_error',
            '신청 목록 조회 중 오류가 발생했습니다.',
            ctx.requestId,
            true,
          ),
        );
    }
  });

  // ── 신청 접수(다른 사용자의 승인함에 실제로 보이는 흐름) ──
  router.post(
    '/v1/work/requests',
    requireMembership(deps),
    async (req, res) => {
      const ctx = getPortalContext(req);
      const requestId = ctx.requestId;
      const body = req.body ?? {};
      const type = body.type as WorkRequestType;
      const title = (body.title ?? '').toString().trim();
      if (!WORK_REQUEST_TYPES.includes(type)) {
        return res
          .status(422)
          .json(
            errorBody(
              'invalid_request_type',
              '지원하지 않는 신청 유형입니다.',
              requestId,
            ),
          );
      }
      if (!title || title.length > 200) {
        return res
          .status(422)
          .json(
            errorBody(
              'invalid_title',
              '제목이 비어 있거나 너무 깁니다.',
              requestId,
            ),
          );
      }
      if (!ctx.permissions.has(typeRequestPermissions[type])) {
        return res
          .status(403)
          .json(
            errorBody(
              'permission_denied',
              '이 유형의 업무를 신청할 권한이 없습니다.',
              requestId,
            ),
          );
      }
      const projectId = body.projectId as string | undefined;
      if (
        projectId !== undefined &&
        (typeof projectId !== 'string' ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            projectId,
          ))
      ) {
        return res
          .status(422)
          .json(
            errorBody(
              'invalid_project',
              '유효한 프로젝트를 선택하세요.',
              requestId,
            ),
          );
      }
      try {
        const created = await db.transaction(async trx => {
          await setTenantContext(trx, ctx.tenantId);
          if (projectId) {
            const member = await trx('portal.fc_project_members')
              .where({ project_id: projectId, user_id: ctx.identity.userId })
              .first('project_id');
            if (!member) {
              const err = new Error('not_project_member');
              (err as any).statusCode = 403;
              throw err;
            }
          }
          const id = randomUUID();
          await trx('portal.fc_work_requests').insert({
            id,
            tenant_id: ctx.tenantId,
            project_id: projectId ?? null,
            type,
            title,
            payload: JSON.stringify(body.payload ?? {}),
            requester_user_id: ctx.identity.userId,
          });
          await trx('portal.fc_request_events').insert({
            tenant_id: ctx.tenantId,
            request_id: id,
            actor_user_id: ctx.identity.userId,
            action: 'submitted',
            note: null,
          });
          await recordAuditEvent(trx, ctx.principal, {
            tenantId: ctx.tenantId,
            actorId: ctx.identity.userId,
            action: 'work.request.submit',
            resourceType: 'work_request',
            resourceId: id,
            result: 'success',
            requestId,
          });
          return trx('portal.fc_work_requests').where({ id }).first();
        });
        return res.status(201).json({ data: created, meta: meta(requestId) });
      } catch (e) {
        if ((e as any)?.statusCode === 403) {
          return res
            .status(403)
            .json(
              errorBody(
                'not_project_member',
                '해당 프로젝트의 멤버가 아닙니다.',
                requestId,
              ),
            );
        }
        logger.error(`work request create error: ${(e as Error).message}`, {
          requestId,
        });
        return res
          .status(500)
          .json(
            errorBody(
              'internal_error',
              '신청 접수 중 오류가 발생했습니다.',
              requestId,
              true,
            ),
          );
      }
    },
  );

  // ── 공유 승인함: 내 권한으로 검토 가능한 유형만 노출 ──
  router.get(
    '/v1/work/approvals',
    requireMembership(deps),
    async (req, res) => {
      const ctx = getPortalContext(req);
      try {
        const result = await db.transaction(async trx =>
          listApprovalQueue(trx, ctx.tenantId, ctx.permissions, {
            status: req.query.status as string | undefined,
            cursor: req.query.cursor as string | undefined,
            limit: Number(req.query.limit ?? 20) || 20,
          }),
        );
        return res.json({
          data: result,
          meta: { ...meta(ctx.requestId), nextCursor: result.nextCursor },
        });
      } catch (e) {
        logger.error(`work approvals error: ${(e as Error).message}`, {
          requestId: ctx.requestId,
        });
        return res
          .status(500)
          .json(
            errorBody(
              'internal_error',
              '승인함 조회 중 오류가 발생했습니다.',
              ctx.requestId,
              true,
            ),
          );
      }
    },
  );

  // ── 신청 상세 + 이력(유형별 검토 권한 필요) ──
  router.get(
    '/v1/work/approvals/:id',
    requireMembership(deps),
    async (req, res) => {
      const ctx = getPortalContext(req);
      try {
        const found = await db.transaction(async trx =>
          getRequestWithHistory(trx, ctx.tenantId, req.params.id),
        );
        if (!found) {
          return res
            .status(404)
            .json(
              errorBody('not_found', '신청을 찾을 수 없습니다.', ctx.requestId),
            );
        }
        if (
          !canDecideType(
            found.request.type as WorkRequestType,
            ctx.permissions,
          ) &&
          found.request.requester_user_id !== ctx.identity.userId
        ) {
          return res
            .status(403)
            .json(
              errorBody(
                'permission_denied',
                '이 신청을 조회할 권한이 없습니다.',
                ctx.requestId,
              ),
            );
        }
        return res.json({ data: found, meta: meta(ctx.requestId) });
      } catch (e) {
        logger.error(`work approval detail error: ${(e as Error).message}`, {
          requestId: ctx.requestId,
        });
        return res
          .status(500)
          .json(
            errorBody(
              'internal_error',
              '신청 조회 중 오류가 발생했습니다.',
              ctx.requestId,
              true,
            ),
          );
      }
    },
  );

  // ── 승인/반려 결정: 낙관적 락 + 이력·감사 원자 기록 ──
  router.post(
    '/v1/work/approvals/:id/decisions',
    requireMembership(deps),
    async (req, res) => {
      const ctx = getPortalContext(req);
      const requestId = ctx.requestId;
      const body = req.body ?? {};
      const decision = body.decision;
      if (decision !== 'approved' && decision !== 'rejected') {
        return res
          .status(422)
          .json(
            errorBody(
              'invalid_decision',
              'decision은 approved 또는 rejected여야 합니다.',
              requestId,
            ),
          );
      }
      const note = body.note ? String(body.note).slice(0, 500) : undefined;
      const expectedVersion =
        body.expectedVersion === undefined || body.expectedVersion === null
          ? undefined
          : Number(body.expectedVersion);
      try {
        const result = await db.transaction(async trx => {
          await setTenantContext(trx, ctx.tenantId);
          const current = await trx('portal.fc_work_requests')
            .where({ id: req.params.id })
            .first();
          if (
            current &&
            !canDecideType(current.type as WorkRequestType, ctx.permissions)
          ) {
            const err = new Error('permission_denied');
            (err as any).statusCode = 403;
            throw err;
          }
          const decided = await decideRequest(
            trx,
            ctx.tenantId,
            req.params.id,
            ctx.identity.userId,
            decision,
            Number.isFinite(expectedVersion) ? expectedVersion : undefined,
          );
          if (!decided.ok) return decided;
          await trx('portal.fc_request_events').insert({
            tenant_id: ctx.tenantId,
            request_id: req.params.id,
            actor_user_id: ctx.identity.userId,
            action: 'decided',
            note: note ?? null,
          });
          await recordAuditEvent(trx, ctx.principal, {
            tenantId: ctx.tenantId,
            actorId: ctx.identity.userId,
            action: `work.request.${decision}`,
            resourceType: 'work_request',
            resourceId: req.params.id,
            resourceVersion: String((decided.request.version as number) ?? ''),
            result: 'success',
            changedFields: ['status', 'decided_by', 'decided_at'],
            requestId,
          });
          return decided;
        });

        if (!result.ok) {
          const statuses = {
            not_found: 404,
            already_decided: 409,
            version_conflict: 409,
          };
          const status = statuses[result.code] ?? 500;
          return res
            .status(status)
            .json(
              errorBody(
                result.code,
                `결정을 반영하지 못했습니다 (${result.code}).`,
                requestId,
              ),
            );
        }
        return res.json({ data: result.request, meta: meta(requestId) });
      } catch (e) {
        if ((e as any)?.statusCode === 403) {
          return res
            .status(403)
            .json(
              errorBody(
                'permission_denied',
                '이 신청 유형을 결정할 권한이 없습니다.',
                requestId,
              ),
            );
        }
        logger.error(`work decision error: ${(e as Error).message}`, {
          requestId,
        });
        return res
          .status(500)
          .json(
            errorBody(
              'internal_error',
              '결정 처리 중 오류가 발생했습니다.',
              requestId,
              true,
            ),
          );
      }
    },
  );

  return router;
};
