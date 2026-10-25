import { Router } from 'express';
import { Knex } from 'knex';
import { randomUUID } from 'crypto';
import { HttpAuthService, LoggerService } from '@backstage/backend-plugin-api';
import { getPortalContext, requireMembership, requirePermission } from '../services/middleware';
import { setTenantContext } from '../services/context';
import { recordAuditEvent } from '../services/audit';
import {
  canDecideApplication,
  catalogUrlValid,
  CATALOG_ACCESS_TYPES,
  CATALOG_CATEGORIES,
  CATALOG_KINDS,
  CATALOG_PROVIDERS,
  createLedgerReference,
  decideApplication,
} from '../services/catalog';

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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const createCatalogRouter = ({ db, httpAuth, logger }: RouterDeps) => {
  const router = Router();
  const deps = { db, httpAuth, logger };
  const catalogView = requirePermission(deps, 'catalog.view');

  router.get('/v1/catalog/items', catalogView, async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const kind = req.query.kind as string | undefined;
      const category = req.query.category as string | undefined;
      const active = req.query.active as string | undefined;
      const page = Number(req.query.page ?? 1);
      const pageSize = Number(req.query.pageSize ?? 50);
      if (
        (kind && !CATALOG_KINDS.includes(kind as never)) ||
        (category && !CATALOG_CATEGORIES.includes(category as never)) ||
        (active !== undefined && !['true', 'false'].includes(active)) ||
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
        const base = trx('portal.fc_catalog_item');
        const summaryBase = base.clone();
        if (active !== undefined) summaryBase.where({ active: active === 'true' });
        const categoryRows = await summaryBase.clone().select('category').count('* as count').groupBy('category');
        const applicableRow = await summaryBase.clone().where({ access_type: 'apply' }).count('* as count').first();
        const summary = {
          total: categoryRows.reduce((sum, row) => sum + Number(row.count), 0),
          applicable: Number(applicableRow?.count ?? 0),
          categories: Object.fromEntries(categoryRows.map(row => [row.category, Number(row.count)])),
        };
        if (kind) base.where({ kind });
        if (category) base.where({ category });
        if (active !== undefined) base.where({ active: active === 'true' });
        const totalRow = await base
          .clone()
          .clearOrder()
          .count('* as count')
          .first();
        const items = await base
          .orderBy('sort_order', 'asc')
          .orderBy('name', 'asc')
          .orderBy('id', 'asc')
          .limit(pageSize)
          .offset((page - 1) * pageSize);
        return {
          items,
          summary,
          pagination: {
            page,
            pageSize,
            total: Number(totalRow?.count ?? 0),
          },
        };
      });
      return res.json({ data, meta: meta(ctx.requestId) });
    } catch (e) {
      logger.error(`catalog items error: ${(e as Error).message}`, {
        requestId: ctx.requestId,
      });
      return res
        .status(500)
        .json(errorBody('internal_error', '카탈로그 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.get('/v1/catalog/items/:id', catalogView, async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const item = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        return trx('portal.fc_catalog_item').where({ id: req.params.id }).first();
      });
      if (!item) {
        return res
          .status(404)
          .json(errorBody('not_found', '카탈로그 항목을 찾을 수 없습니다.', ctx.requestId));
      }
      return res.json({ data: item, meta: meta(ctx.requestId) });
    } catch (e) {
      logger.error(`catalog item detail error: ${(e as Error).message}`, {
        requestId: ctx.requestId,
      });
      return res
        .status(500)
        .json(errorBody('internal_error', '카탈로그 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  const validItemBody = (body: Record<string, unknown>, partial: boolean): boolean => {
    const has = (key: string) => body[key] !== undefined;
    if (
      (has('kind') && !CATALOG_KINDS.includes(body.kind as never)) ||
      (has('category') && !CATALOG_CATEGORIES.includes(body.category as never)) ||
      (has('name') && !validText(body.name, 1, 120)) ||
      (has('summary') && body.summary !== null && !validText(body.summary, 0, 500, true)) ||
      (has('description') &&
        body.description !== null &&
        !validText(body.description, 0, 4000, true)) ||
      (has('provider') && !CATALOG_PROVIDERS.includes(body.provider as never)) ||
      (has('accessType') && !CATALOG_ACCESS_TYPES.includes(body.accessType as never)) ||
      (has('linkUrl') && !catalogUrlValid(body.linkUrl)) ||
      (has('active') && typeof body.active !== 'boolean') ||
      (has('sortOrder') &&
        (!Number.isSafeInteger(body.sortOrder) ||
          (body.sortOrder as number) < 0 ||
          (body.sortOrder as number) > 9999))
    ) {
      return false;
    }
    if (!partial) {
      return (
        has('kind') && has('category') && validText(body.name, 1, 120)
      );
    }
    return true;
  };

  router.post('/v1/catalog/items', requirePermission(deps, 'tenant.manage'), async (req, res) => {
    const ctx = getPortalContext(req);
    const requestId = ctx.requestId;
    const body = req.body ?? {};
    const accessType = body.accessType ?? 'apply';
    if (
      !validItemBody(body, false) ||
      (accessType === 'direct_link' && !body.linkUrl)
    ) {
      return res
        .status(422)
        .json(errorBody('invalid_item', '종류·분류·이름·접근방식·링크를 확인하세요.', requestId));
    }
    try {
      const item = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        const id = randomUUID();
        await trx('portal.fc_catalog_item').insert({
          id,
          tenant_id: ctx.tenantId,
          kind: body.kind,
          category: body.category,
          name: body.name,
          summary: body.summary ?? null,
          description: body.description ?? null,
          provider: body.provider ?? 'portal',
          access_type: accessType,
          link_url: body.linkUrl ?? null,
          active: body.active ?? true,
          sort_order: body.sortOrder ?? 0,
          created_by: ctx.identity.userId,
          updated_by: ctx.identity.userId,
        });
        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          action: 'catalog.item.create',
          resourceType: 'catalog_item',
          resourceId: id,
          result: 'success',
          requestId,
        });
        return trx('portal.fc_catalog_item').where({ id }).first();
      });
      return res.status(201).json({ data: item, meta: meta(requestId) });
    } catch (e) {
      logger.error(`catalog item create error: ${(e as Error).message}`, { requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '카탈로그 항목 등록 중 오류가 발생했습니다.', requestId, true));
    }
  });

  router.patch('/v1/catalog/items/:id', requirePermission(deps, 'tenant.manage'), async (req, res) => {
    const ctx = getPortalContext(req);
    const requestId = ctx.requestId;
    const body = req.body ?? {};
    if (!validItemBody(body, true)) {
      return res
        .status(422)
        .json(errorBody('invalid_item', '수정할 필드와 값을 확인하세요.', requestId));
    }
    try {
      const result = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        const existing = await trx('portal.fc_catalog_item')
          .where({ id: req.params.id })
          .first();
        if (!existing) {
          return { status: 404, code: 'not_found', message: '카탈로그 항목을 찾을 수 없습니다.' };
        }
        await trx('portal.fc_catalog_item')
          .where({ id: req.params.id })
          .update({
            ...(body.kind !== undefined ? { kind: body.kind } : {}),
            ...(body.category !== undefined ? { category: body.category } : {}),
            ...(body.name !== undefined ? { name: body.name } : {}),
            ...(body.summary !== undefined ? { summary: body.summary } : {}),
            ...(body.description !== undefined ? { description: body.description } : {}),
            ...(body.provider !== undefined ? { provider: body.provider } : {}),
            ...(body.accessType !== undefined ? { access_type: body.accessType } : {}),
            ...(body.linkUrl !== undefined ? { link_url: body.linkUrl } : {}),
            ...(body.active !== undefined ? { active: body.active } : {}),
            ...(body.sortOrder !== undefined ? { sort_order: body.sortOrder } : {}),
            updated_by: ctx.identity.userId,
            updated_at: trx.fn.now(),
          });
        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          action: 'catalog.item.update',
          resourceType: 'catalog_item',
          resourceId: req.params.id,
          result: 'success',
          changedFields: Object.keys(body),
          requestId,
        });
        const item = await trx('portal.fc_catalog_item')
          .where({ id: req.params.id })
          .first();
        return { status: 200, data: item };
      });
      if (result.status !== 200) {
        return res
          .status(result.status)
          .json(errorBody(result.code ?? 'internal_error', result.message ?? '요청을 처리하지 못했습니다.', requestId));
      }
      return res.json({ data: result.data, meta: meta(requestId) });
    } catch (e) {
      logger.error(`catalog item update error: ${(e as Error).message}`, { requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '카탈로그 항목 수정 중 오류가 발생했습니다.', requestId, true));
    }
  });

  router.post('/v1/catalog/applications', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    const requestId = ctx.requestId;
    const body = req.body ?? {};
    const idempotencyKey =
      body.idempotencyKey === undefined || body.idempotencyKey === null
        ? null
        : String(body.idempotencyKey).slice(0, 120);
    if (
      typeof body.itemId !== 'string' ||
      !UUID_PATTERN.test(body.itemId) ||
      (body.projectId !== undefined &&
        body.projectId !== null &&
        (typeof body.projectId !== 'string' || !UUID_PATTERN.test(body.projectId))) ||
      !validText(body.reason, 1, 1000, true)
    ) {
      return res
        .status(422)
        .json(errorBody('invalid_application', '항목·프로젝트·사유를 확인하세요.', requestId));
    }
    try {
      const result = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        if (idempotencyKey) {
          const existing = await trx('portal.fc_catalog_application')
            .where({ tenant_id: ctx.tenantId, idempotency_key: idempotencyKey })
            .first();
          if (existing) {
            if (existing.requested_by !== ctx.identity.userId) {
              const err = new Error('idempotency_conflict');
              (err as { statusCode?: number }).statusCode = 409;
              throw err;
            }
            return { status: 200, application: existing };
          }
        }
        const item = await trx('portal.fc_catalog_item')
          .where({ id: body.itemId })
          .first();
        if (!item || item.active !== true) {
          return {
            status: 404,
            code: 'item_unavailable',
            message: '신청 가능한 카탈로그 항목을 찾을 수 없습니다.',
          };
        }
        if (body.projectId) {
          const membership = await trx('portal.fc_project_member')
            .where({ project_id: body.projectId, user_id: ctx.identity.userId })
            .first('user_id');
          if (!membership) {
            const err = new Error('not_project_member');
            (err as { statusCode?: number }).statusCode = 403;
            throw err;
          }
        }
        const id = randomUUID();
        const workRequestId = await createLedgerReference(
          trx,
          ctx.tenantId,
          id,
          ctx.identity.userId,
          `[카탈로그 신청] ${item.name as string}`,
          {
            item_id: body.itemId,
            item_name: item.name,
            project_id: body.projectId ?? null,
            reason: body.reason,
          },
        );
        await trx('portal.fc_catalog_application').insert({
          id,
          tenant_id: ctx.tenantId,
          item_id: body.itemId,
          project_id: body.projectId ?? null,
          reason: body.reason,
          status: 'requested',
          execution_status: 'pending_platform',
          idempotency_key: idempotencyKey,
          work_request_id: workRequestId,
          requested_by: ctx.identity.userId,
        });
        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          action: 'catalog.application.create',
          resourceType: 'catalog_application',
          resourceId: id,
          result: 'success',
          requestId,
        });
        const application = await trx('portal.fc_catalog_application')
          .where({ id })
          .first();
        return { status: 201, application };
      });
      return res
        .status(result.status)
        .json({ data: result.application, meta: meta(requestId) });
    } catch (e) {
      if ((e as { statusCode?: number }).statusCode === 409) {
        return res
          .status(409)
          .json(errorBody('idempotency_conflict', '동일한 신청이 다른 사용자에 의해 처리되었습니다.', requestId));
      }
      if ((e as { statusCode?: number }).statusCode === 403) {
        return res
          .status(403)
          .json(errorBody('not_project_member', '해당 프로젝트의 멤버가 아닙니다.', requestId));
      }
      logger.error(`catalog application error: ${(e as Error).message}`, { requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '카탈로그 신청 중 오류가 발생했습니다.', requestId, true));
    }
  });

  router.get('/v1/catalog/applications', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const status = req.query.status as string | undefined;
      const page = Number(req.query.page ?? 1);
      const pageSize = Number(req.query.pageSize ?? 20);
      if (
        (status && !['requested', 'approved', 'rejected', 'cancelled'].includes(status)) ||
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
        const decideAll = canDecideApplication(ctx.permissions);
        const base = trx('portal.fc_catalog_application as a')
          .join('portal.fc_catalog_item as i', 'i.id', 'a.item_id')
          .where(function () {
            this.where('a.requested_by', ctx.identity.userId);
            if (decideAll) this.orWhere(trx.raw('true'));
          })
          .select('a.*', 'i.name as item_name', 'i.kind as item_kind');
        if (status) base.where('a.status', status);
        const totalRow = await base
          .clone()
          .clearSelect()
          .clearOrder()
          .count('* as count')
          .first();
        const items = await base
          .orderBy('a.created_at', 'desc')
          .orderBy('a.id', 'desc')
          .limit(pageSize)
          .offset((page - 1) * pageSize);
        return {
          items,
          pagination: { page, pageSize, total: Number(totalRow?.count ?? 0) },
        };
      });
      return res.json({ data, meta: meta(ctx.requestId) });
    } catch (e) {
      logger.error(`catalog applications error: ${(e as Error).message}`, {
        requestId: ctx.requestId,
      });
      return res
        .status(500)
        .json(errorBody('internal_error', '신청 목록 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.post(
    '/v1/catalog/applications/:id/decision',
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
      if (!canDecideApplication(ctx.permissions)) {
        await db.transaction(async trx => {
          await setTenantContext(trx, ctx.tenantId);
          await recordAuditEvent(trx, ctx.principal, {
            tenantId: ctx.tenantId,
            actorId: ctx.identity.userId,
            action: 'catalog.application.decision',
            resourceType: 'catalog_application',
            resourceId: req.params.id,
            result: 'denied',
            reasonCode: 'missing_permission',
            requestId,
          });
        });
        return res
          .status(403)
          .json(errorBody('permission_denied', '카탈로그 신청을 결정할 권한이 없습니다.', requestId));
      }
      try {
        const result = await db.transaction(async trx => {
          await setTenantContext(trx, ctx.tenantId);
          const decided = await decideApplication(
            trx,
            req.params.id,
            ctx.identity.userId,
            decision,
          );
          if (!decided.ok) return decided;
          await recordAuditEvent(trx, ctx.principal, {
            tenantId: ctx.tenantId,
            actorId: ctx.identity.userId,
            action: `catalog.application.${decision}`,
            resourceType: 'catalog_application',
            resourceId: req.params.id,
            result: 'success',
            changedFields: ['status'],
            requestId,
          });
          return decided;
        });
        if (!result.ok) {
          return res
            .status(result.code === 'not_found' ? 404 : 409)
            .json(
              errorBody(
                result.code,
                result.code === 'not_found'
                  ? '신청을 찾을 수 없습니다.'
                  : '이미 결정된 신청입니다.',
                requestId,
              ),
            );
        }
        return res.json({ data: result.application, meta: meta(requestId) });
      } catch (e) {
        logger.error(`catalog decision error: ${(e as Error).message}`, { requestId });
        return res
          .status(500)
          .json(errorBody('internal_error', '결정 처리 중 오류가 발생했습니다.', requestId, true));
      }
    },
  );

  return router;
};
