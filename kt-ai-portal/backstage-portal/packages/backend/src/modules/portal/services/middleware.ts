import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { HttpAuthService, LoggerService } from '@backstage/backend-plugin-api';
import { Knex } from 'knex';
import { principalFromCredentials, PortalPrincipal } from './context';
import { lookupIdentity, PortalIdentity } from './identity';
import { authorizationForUser } from './rbac';
import { recordAuditEvent } from './audit';

export interface PortalContext {
  requestId: string;
  principal: PortalPrincipal;
  identity: PortalIdentity;
  tenantId: string;
  permissions: Set<string>;
}

export const getPortalContext = (req: Request): PortalContext => {
  const ctx = (req as any).portalContext as PortalContext | undefined;
  if (!ctx) throw new Error('portal_context_missing');
  return ctx;
};

interface RequirePermissionDeps {
  db: Knex;
  httpAuth: HttpAuthService;
  logger: LoggerService;
}

/**
 * 서버 인가 공통 처리. permission이 null이면 membership만 확인한다(화면 집계 등
 * 특정 권한 없이 유효 소속만 요구하는 API용). 실패 시 응답을 본문까지 본다.
 */
const authorize = async (
  deps: RequirePermissionDeps,
  req: Request,
  res: Response,
  permission: string | null,
): Promise<PortalContext | null> => {
  const { db, httpAuth, logger } = deps;
  const requestId = randomUUID();
  const fail = (status: number, code: string, message: string) => {
    res
      .status(status)
      .json({ error: { code, message, retryable: false, requestId } });
  };

  let principal: PortalPrincipal | null = null;
  let identity: PortalIdentity | undefined;
  const tenantId = req.header('x-portal-tenant-id') ?? '';

  try {
    const credentials = await httpAuth.credentials(req);
    principal = principalFromCredentials(credentials);
    identity = await lookupIdentity(db, principal);
    if (!identity) {
      fail(403, 'identity_not_provisioned', '포털에 등록되지 않은 신원입니다.');
      return null;
    }
    if (identity.status !== 'active') {
      fail(403, 'account_not_active', `계정 상태가 ${identity.status}입니다.`);
      return null;
    }
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        tenantId,
      )
    ) {
      fail(422, 'tenant_context_required', 'x-portal-tenant-id 헤더가 필요합니다.');
      return null;
    }

    const authz = await authorizationForUser(db, identity.userId, tenantId);
    // tenant 선택은 서버가 membership 일치 여부를 확인한다(지시서 §4.1).
    // system 역할도 업무 API에서는 선택 tenant의 유효 소속을 요구한다.
    if (!authz.hasTenantMembership) {
      await db.transaction(async trx => {
        await recordAuditEvent(trx, principal, {
          tenantId,
          actorId: identity!.userId,
          action: 'authz.tenant.select',
          resourceType: 'tenant',
          resourceId: tenantId,
          result: 'denied',
          reasonCode: 'no_active_membership',
          requestId,
        });
      });
      fail(403, 'no_active_membership', '해당 테넌트의 유효한 소속이 없습니다.');
      return null;
    }
    const permissions = authz.permissions;
    if (permission && !permissions.has(permission)) {
      // 거부 감사 — 독립 트랜잭션으로 저장
      await db.transaction(async trx => {
        await recordAuditEvent(trx, principal, {
          tenantId,
          actorId: identity!.userId,
          action: 'authz.permission.check',
          resourceType: 'permission',
          resourceId: permission,
          result: 'denied',
          reasonCode: 'missing_permission',
          requestId,
        });
      });
      fail(403, 'permission_denied', `필요 권한(${permission})이 없습니다.`);
      return null;
    }

    const context: PortalContext = {
      requestId,
      principal,
      identity,
      tenantId,
      permissions,
    };
    (req as any).portalContext = context;
    return context;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'unsupported_principal') {
      fail(403, 'unsupported_principal', '지원하지 않는 신원 유형입니다.');
      return null;
    }
    if (e instanceof Error && e.name === 'AuthenticationError') {
      fail(401, 'unauthenticated', '신원을 확인할 수 없습니다.');
      return null;
    }
    logger.error(`portal authz middleware error: ${msg}`, { requestId });
    fail(500, 'internal_error', '요청 처리 중 오류가 발생했습니다.');
    return null;
  }
};

/**
 * 서버 인가 미들웨어. 모든 보호 API에 적용한다.
 *
 * - tenant 선택은 `x-portal-tenant-id` 헤더로 받되 신뢰하지 않고,
 *   유효 membership이 있는 tenant만 허용한다(권한 계산 자체가 membership 기반).
 * - 권한 거부도 감사 원장에 기록한다. 거부 이벤트는 업무 트랜잭션이 없으므로
 *   독립 트랜잭션으로 내구성 있게 저장한다(시험 사양 §6.1).
 */
export const requirePermission =
  (deps: RequirePermissionDeps, permission: string) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const context = await authorize(deps, req, res, permission);
    if (context) next();
  };

/** 유효 소속만 요구하고 특정 권한은 검사하지 않는다(첫 화면 집계 등). */
export const requireMembership =
  (deps: RequirePermissionDeps) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const context = await authorize(deps, req, res, null);
    if (context) next();
  };
