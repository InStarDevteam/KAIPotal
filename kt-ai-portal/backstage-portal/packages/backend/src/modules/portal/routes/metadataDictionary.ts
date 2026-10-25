import { Router, RequestHandler } from 'express';
import { Knex } from 'knex';
import { HttpAuthService, LoggerService } from '@backstage/backend-plugin-api';
import { getPortalContext, requirePermission } from '../services/middleware';

export function createMetadataDictionaryRouter(deps: {
  db: Knex;
  httpAuth: HttpAuthService;
  logger: LoggerService;
}): Router {
  const router = Router();
  const route =
    (handler: RequestHandler): RequestHandler =>
    (req, res, next) => {
      Promise.resolve(handler(req, res, next)).catch(next);
    };
  router.get(
    '/v1/metadata/dictionary',
    requirePermission(deps, 'integration.view'),
    route(async (req, res) => {
      const ctx = getPortalContext(req);
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      const table = typeof req.query.table === 'string' ? req.query.table : '';
      const page = req.query.page === undefined ? 1 : Number(req.query.page);
      const pageSize =
        req.query.pageSize === undefined ? 30 : Number(req.query.pageSize);
      if (
        q.length > 100 ||
        [...q].some(
          char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
        ) ||
        (table && !/^fc_[a-z0-9_]{1,80}$/.test(table)) ||
        !Number.isInteger(page) ||
        page < 1 ||
        page > 10000 ||
        !Number.isInteger(pageSize) ||
        pageSize < 1 ||
        pageSize > 100 ||
        Object.keys(req.query).some(
          key => !['q', 'table', 'page', 'pageSize'].includes(key),
        ) ||
        ['q', 'table'].some(
          key =>
            req.query[key] !== undefined && typeof req.query[key] !== 'string',
        )
      ) {
        return res
          .status(422)
          .json({
            error: {
              code: 'invalid_query',
              message: '사전 검색 조건과 페이지를 확인하세요.',
              requestId: ctx.requestId,
            },
          });
      }
      const result = await deps.db.transaction(async trx => {
        const release = await trx('portal.fc_metadata_releases')
          .orderBy('imported_at', 'desc')
          .first();
        if (!release)
          return {
            release: null,
            summary: null,
            tables: [],
            items: [],
            pagination: { page, pageSize, total: 0 },
          };
        const releaseId = release.release_id;
        const tables = await trx('portal.fc_metadata_columns')
          .where({ release_id: releaseId })
          .groupBy('table_name')
          .select('table_name')
          .count('* as column_count')
          .orderBy('table_name');
        const summary: Record<string, number> = {
          tables: tables.length,
          columns: Number(release.column_count),
        };
        for (const kind of ['domains', 'words', 'terms', 'codes']) {
          const count = await trx(`portal.fc_metadata_${kind}`)
            .where({ release_id: releaseId })
            .count('* as count')
            .first();
          summary[kind] = Number(count?.count ?? 0);
        }
        const query = trx('portal.fc_metadata_columns').where({
          release_id: releaseId,
        });
        if (table) query.where({ table_name: table });
        if (q) {
          const value = `%${q.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
          query.where(function search() {
            this.whereRaw('lower(table_name) like ?', [value])
              .orWhereRaw('lower(column_name) like ?', [value])
              .orWhereRaw('lower(logical_name) like ?', [value]);
          });
        }
        const total = await query.clone().count('* as count').first();
        const items = await query
          .orderBy('table_name')
          .orderBy('column_name')
          .offset((page - 1) * pageSize)
          .limit(pageSize)
          .select('*');
        return {
          release,
          summary,
          tables: tables.map(t => ({
            ...t,
            column_count: Number(t.column_count),
          })),
          items,
          pagination: { page, pageSize, total: Number(total?.count ?? 0) },
        };
      });
      return res.json({
        data: result,
        meta: {
          requestId: ctx.requestId,
          asOf: new Date().toISOString(),
          dataMode: 'live',
          sourceSystem: 'portal',
          connectionState: 'connected',
        },
      });
    }),
  );
  return router;
}
