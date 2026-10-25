import { Router } from 'express';
import { Knex } from 'knex';
import { HttpAuthService, LoggerService } from '@backstage/backend-plugin-api';
import { getPortalContext, requireMembership } from '../services/middleware';
import { setTenantContext } from '../services/context';
import {
  parseSearchQuery,
  parseSuggestQuery,
  searchPortalData,
  searchSources,
} from '../services/portalSearch';

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
});

const errorBody = (
  code: string,
  message: string,
  requestId: string,
  retryable = false,
) => ({ error: { code, message, retryable, requestId } });

export const createPortalSearchRouter = ({
  db,
  httpAuth,
  logger,
}: RouterDeps) => {
  const router = Router();
  const deps = { db, httpAuth, logger };

  router.get('/v1/search', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    const parsed = parseSearchQuery(req.query);
    if (!parsed.ok) {
      return res
        .status(422)
        .json(errorBody(parsed.code, parsed.message, ctx.requestId));
    }
    try {
      const result = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        return searchPortalData(trx, {
          tenantId: ctx.tenantId,
          permissions: ctx.permissions,
          q: parsed.q,
          types: parsed.types,
          page: parsed.page,
          pageSize: parsed.pageSize,
        });
      });
      return res.json({
        data: { ...result, search_semantic_status: 'not_available' as const },
        meta: meta(ctx.requestId),
      });
    } catch (e) {
      logger.error(`portal search error: ${(e as Error).message}`, {
        requestId: ctx.requestId,
      });
      return res
        .status(500)
        .json(
          errorBody(
            'internal_error',
            '검색 처리 중 오류가 발생했습니다. requestId를 문의 시 첨부해 주세요.',
            ctx.requestId,
            true,
          ),
        );
    }
  });

  router.get('/v1/search/sources', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    return res.json({
      data: { sources: searchSources() },
      meta: meta(ctx.requestId),
    });
  });

  router.get('/v1/search/suggest', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    const parsed = parseSuggestQuery(req.query);
    if (!parsed.ok) {
      return res
        .status(422)
        .json(errorBody(parsed.code, parsed.message, ctx.requestId));
    }
    try {
      const result = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        return searchPortalData(trx, {
          tenantId: ctx.tenantId,
          permissions: ctx.permissions,
          q: parsed.q,
          types: null,
          page: 1,
          pageSize: 10,
        });
      });
      return res.json({
        data: {
          q: parsed.q,
          suggestions: result.results.map(r => ({
            type: r.type,
            id: r.id,
            title: r.title,
          })),
        },
        meta: meta(ctx.requestId),
      });
    } catch (e) {
      logger.error(`portal suggest error: ${(e as Error).message}`, {
        requestId: ctx.requestId,
      });
      return res
        .status(500)
        .json(
          errorBody(
            'internal_error',
            '자동완성 처리 중 오류가 발생했습니다. requestId를 문의 시 첨부해 주세요.',
            ctx.requestId,
            true,
          ),
        );
    }
  });

  return router;
};
