import { Router, RequestHandler } from 'express';
import { Knex } from 'knex';
import { HttpAuthService, LoggerService } from '@backstage/backend-plugin-api';
import { getPortalContext, requirePermission } from '../services/middleware';
import { setTenantContext } from '../services/context';
import { recordAuditEvent } from '../services/audit';
import {
  configuredTargets,
  integrationPlatformIds,
  runIntegrationProbe,
} from '../services/integrationProbe';

export const createIntegrationRouter = (deps: {
  db: Knex;
  httpAuth: HttpAuthService;
  logger: LoggerService;
}): Router => {
  const router = Router();
  const route =
    (handler: RequestHandler): RequestHandler =>
    (req, res, next) => {
      Promise.resolve(handler(req, res, next)).catch(next);
    };
  const meta = (requestId: string) => ({
    requestId,
    asOf: new Date().toISOString(),
    dataMode: 'live',
    sourceSystem: 'portal',
    connectionState: 'connected',
  });
  const running = new Set<string>();
  router.get(
    '/v1/integrations/targets',
    requirePermission(deps, 'integration.view'),
    route(async (req, res) => {
      const ctx = getPortalContext(req);
      const targets = configuredTargets(ctx.tenantId);
      res.json({
        data: integrationPlatformIds.map(id => ({
          id,
          configured: !!targets[id],
          baseUrl: targets[id]?.baseUrl || '',
          healthPath: targets[id]?.healthPath || '',
          readPaths: targets[id]?.readPaths || [],
          authentication: targets[id]?.tokenEnv
            ? 'server-token'
            : 'network-policy',
        })),
        meta: meta(ctx.requestId),
      });
    }),
  );
  router.post(
    '/v1/integrations/test',
    requirePermission(deps, 'settings.manage'),
    route(async (req, res) => {
      const ctx = getPortalContext(req);
      const body = req.body || {};
      if (
        !integrationPlatformIds.includes(body.platform) ||
        !['connection', 'contract'].includes(body.kind) ||
        Object.keys(body).some(
          key => !['platform', 'kind', 'path', 'query'].includes(key),
        ) ||
        (body.path !== undefined &&
          (typeof body.path !== 'string' || body.path.length > 512)) ||
        (body.query !== undefined &&
          (typeof body.query !== 'string' || body.query.length > 4096))
      ) {
        return res.status(422).json({
          error: {
            code: 'invalid_probe',
            message: '플랫폼과 조회 API 정보를 확인하세요.',
            requestId: ctx.requestId,
          },
        });
      }
      const key = `${ctx.tenantId}:${ctx.identity.userId}`;
      if (running.has(key))
        return res.status(429).json({
          error: {
            code: 'probe_in_progress',
            message: '진행 중인 테스트가 완료된 후 다시 실행하세요.',
            requestId: ctx.requestId,
          },
        });
      running.add(key);
      try {
        // Record the attempt before making an external request. Audit failures fail closed.
        await deps.db.transaction(async trx => {
          await setTenantContext(trx, ctx.tenantId);
          await recordAuditEvent(trx, ctx.principal, {
            tenantId: ctx.tenantId,
            actorId: ctx.identity.userId,
            action: 'integration.test.start',
            resourceType: 'platform',
            resourceId: body.platform,
            result: 'success',
            requestId: ctx.requestId,
          });
        });
        const data = await runIntegrationProbe(
          configuredTargets(ctx.tenantId)[
            body.platform as (typeof integrationPlatformIds)[number]
          ],
          body,
          ctx.tenantId,
        );
        await deps.db.transaction(async trx => {
          await setTenantContext(trx, ctx.tenantId);
          await recordAuditEvent(trx, ctx.principal, {
            tenantId: ctx.tenantId,
            actorId: ctx.identity.userId,
            action: `integration.test.${body.kind}`,
            resourceType: 'platform',
            resourceId: body.platform,
            result: (
              {
                passed: 'success',
                blocked: 'denied',
                failed: 'failed',
              } as const
            )[data.outcome],
            reasonCode: data.status ? `http_${data.status}` : data.outcome,
            requestId: ctx.requestId,
          });
        });
        return res.json({ data, meta: meta(ctx.requestId) });
      } finally {
        running.delete(key);
      }
    }),
  );
  return router;
};
