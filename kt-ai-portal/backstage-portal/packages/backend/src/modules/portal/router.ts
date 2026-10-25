import express, { Router } from 'express';
import { Knex } from 'knex';
import { randomUUID } from 'crypto';
import { HttpAuthService, LoggerService } from '@backstage/backend-plugin-api';
import {
  assertActiveMembership,
  principalFromCredentials,
  setTenantContext,
} from './services/context';
import { recordAuditEvent } from './services/audit';
import { createAdminRouter } from './routes/admin';
import { lookupIdentity } from './services/identity';
import { authorizationForUser } from './services/rbac';
import { createPlatformAccessRouter } from './routes/platformAccess';
import { createIntegrationRouter } from './routes/integrations';
import { createTenantOperationsRouter } from './routes/tenantOperations';
import { createWorkOverviewRouter } from './routes/workOverview';
import { buildKrmfRouter } from './routes/krmf';
import { createCreditsRouter } from './routes/credits';
import { createTransferRequestsRouter } from './routes/transfers';
import { createPortalSearchRouter } from './routes/portalSearch';
import { createProjectsRouter } from './routes/projects';
import { createProposalsRouter } from './routes/proposals';
import { createCatalogRouter } from './routes/catalog';
import { createMyProfileRouter } from './routes/myProfile';
import { createPortalSettingsRouter } from './routes/portalSettings';
import { createMetadataDictionaryRouter } from './routes/metadataDictionary';

export interface PortalRouterOptions {
  db: Knex;
  logger: LoggerService;
  httpAuth: HttpAuthService;
}

// BFF 공통 응답 계약 (시험 사양 §3): data + meta{requestId, asOf, dataMode, ...}
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
) => ({
  error: { code, message, retryable, requestId },
});

export const createRouter = async ({
  db,
  logger,
  httpAuth,
}: PortalRouterOptions): Promise<Router> => {
  const router = Router();
  // 플러그인 라우터에는 전역 body 파서가 적용되지 않으므로 명시한다.
  router.use(express.json({ limit: '64kb' }));

  const handleAuthError = (e: unknown, res: any, requestId: string) => {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'unsupported_principal') {
      return res
        .status(403)
        .json(
          errorBody(
            'unsupported_principal',
            '지원하지 않는 신원 유형입니다.',
            requestId,
          ),
        );
    }
    // 인증 실패와 내부 오류(DB 등)를 구분한다 — 내부 오류를 401로 가장하지 않는다.
    const isAuthError = e instanceof Error && e.name === 'AuthenticationError';
    if (isAuthError) {
      return res
        .status(401)
        .json(
          errorBody('unauthenticated', '신원을 확인할 수 없습니다.', requestId),
        );
    }
    logger.error(`portal api internal error: ${msg}`, { requestId });
    return res
      .status(500)
      .json(
        errorBody(
          'internal_error',
          '요청 처리 중 오류가 발생했습니다. requestId를 문의 시 첨부해 주세요.',
          requestId,
          true,
        ),
      );
  };

  // Liveness — 인증 불필요, DB 연결만 확인한다.
  router.get('/v1/health', async (_req, res) => {
    const requestId = randomUUID();
    try {
      await db('portal.fc_roles').count('* as count');
      await db('portal.fc_tenant_memberships').select('id').limit(0);
      res.json({ data: { status: 'ok' }, meta: meta(requestId) });
    } catch (e) {
      res
        .status(503)
        .json(
          errorBody(
            'db_unavailable',
            '데이터베이스에 연결할 수 없습니다.',
            requestId,
            true,
          ),
        );
    }
  });

  // 검증된 신원 + 포털 등록 정보 조회.
  router.get('/v1/me', async (req, res) => {
    const requestId = randomUUID();
    try {
      const credentials = await httpAuth.credentials(req);
      const principal = principalFromCredentials(credentials);

      const identity = await lookupIdentity(db, principal);

      if (!identity) {
        // 미등록 신원은 자동 프로비저닝하지 않는다 — 최초 관리자 bootstrap은
        // 별도 승인 경로(Setup Guide §4-9)로만 허용한다.
        return res
          .status(403)
          .json(
            errorBody(
              'identity_not_provisioned',
              '포털에 등록되지 않은 신원입니다. 관리자 승인이 필요합니다.',
              requestId,
            ),
          );
      }
      if (identity.status !== 'active') {
        return res
          .status(403)
          .json(
            errorBody(
              'account_not_active',
              `계정 상태가 ${identity.status}입니다.`,
              requestId,
            ),
          );
      }

      // tenant registry 자체는 전역, 소속은 각 tenant 트랜잭션에서 본인만 조회한다.
      const tenants = await db('portal.fc_tenants')
        .where({ status: 'active' })
        .select('id');
      const memberships = [];
      for (const tenant of tenants) {
        const rows = await db.transaction<Record<string, unknown>[]>(
          async (trx): Promise<Record<string, unknown>[]> => {
            await setTenantContext(trx, tenant.id);
            const result = await trx('portal.fc_tenant_memberships as m')
              .join('portal.fc_tenants as t', 't.id', 'm.tenant_id')
              .where({
                'm.user_id': identity.userId,
                'm.status': 'active',
                'm.tenant_id': tenant.id,
              })
              .where('m.valid_from', '<=', trx.fn.now())
              .where(qb =>
                qb
                  .whereNull('m.valid_until')
                  .orWhere('m.valid_until', '>', trx.fn.now()),
              )
              .select(
                'm.tenant_id',
                't.code as tenant_code',
                't.name as tenant_name',
                't.branch',
              );
            return result as Record<string, unknown>[];
          },
        );
        if (rows.length > 0) {
          const authorization = await authorizationForUser(
            db,
            identity.userId,
            tenant.id,
          );
          if (!authorization.hasTenantMembership) continue;
          memberships.push(
            ...rows.map(row => ({
              ...row,
              roles: [...authorization.roles].sort(),
              permissions: [...authorization.permissions].sort(),
            })),
          );
        }
      }

      return res.json({
        data: {
          userId: identity.userId,
          displayName: identity.displayName,
          authenticationStrength: principal.authenticationStrength,
          memberships,
        },
        meta: meta(requestId),
      });
    } catch (e) {
      return handleAuthError(e, res, requestId);
    }
  });

  // tenant 선택: header/body 값을 신뢰하지 않고 membership을 서버에서 확인한 뒤
  // 선택 사실을 감사 원장에 남긴다.
  router.post('/v1/context/tenant', async (req, res) => {
    const requestId = randomUUID();
    const tenantId = (req.body?.tenantId ?? '') as string;
    // 입력 검증: uuid 형식이 아니면 DB 조회 전에 거부한다 (422, 시험 사양 §3).
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        tenantId,
      )
    ) {
      return res
        .status(422)
        .json(
          errorBody(
            'invalid_tenant_id',
            'tenantId 형식이 올바르지 않습니다.',
            requestId,
          ),
        );
    }
    try {
      const credentials = await httpAuth.credentials(req);
      const principal = principalFromCredentials(credentials);

      const identity = await lookupIdentity(db, principal);
      if (!identity || identity.status !== 'active') {
        return res
          .status(403)
          .json(
            errorBody(
              'identity_not_provisioned',
              '포털에 등록되지 않은 신원입니다.',
              requestId,
            ),
          );
      }

      await db.transaction(async trx => {
        await setTenantContext(trx, tenantId);
        await assertActiveMembership(trx, tenantId, identity.userId);
        const tenant = await trx('portal.fc_tenants')
          .where({ id: tenantId, status: 'active' })
          .first('id');
        if (!tenant) {
          const error = new Error('no_active_membership');
          (error as any).statusCode = 403;
          throw error;
        }
        await recordAuditEvent(trx, principal, {
          tenantId,
          actorId: identity.userId,
          action: 'context.tenant.select',
          resourceType: 'tenant',
          resourceId: tenantId,
          result: 'success',
          requestId,
        });
      });

      return res.json({
        data: { activeTenantId: tenantId },
        meta: meta(requestId),
      });
    } catch (e) {
      const status = (e as any)?.statusCode;
      if (status === 403) {
        return res
          .status(403)
          .json(
            errorBody(
              'no_active_membership',
              '해당 테넌트의 유효한 소속이 없습니다.',
              requestId,
            ),
          );
      }
      return handleAuthError(e, res, requestId);
    }
  });

  // 사용자·역할 관리 API (P1) — 각 엔드포인트는 requirePermission으로 보호된다.
  router.use(createAdminRouter({ db, httpAuth, logger }));
  router.use(createTenantOperationsRouter({ db, httpAuth, logger }));
  router.use(createPlatformAccessRouter({ db, httpAuth, logger }));
  router.use(createIntegrationRouter({ db, httpAuth, logger }));
  router.use(createWorkOverviewRouter({ db, httpAuth, logger }));
  router.use(buildKrmfRouter({ db, httpAuth, logger }));
  router.use(createCreditsRouter({ db, httpAuth, logger }));
  router.use(createTransferRequestsRouter({ db, httpAuth, logger }));
  router.use(createPortalSearchRouter({ db, httpAuth, logger }));
  router.use(createProjectsRouter({ db, httpAuth, logger }));
  router.use(createProposalsRouter({ db, httpAuth, logger }));
  router.use(createCatalogRouter({ db, httpAuth, logger }));
  router.use(createPortalSettingsRouter({ db, httpAuth, logger }));
  router.use(createMyProfileRouter({ db, httpAuth, logger }));
  router.use(createMetadataDictionaryRouter({ db, httpAuth, logger }));

  return router;
};
