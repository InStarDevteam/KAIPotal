import { Knex } from 'knex';
import { BackstageCredentials } from '@backstage/backend-plugin-api';

/**
 * 검증된 서버 principal.
 *
 * 주의: Backstage credentials는 userEntityRef만 제공하고 OIDC issuer/subject를
 * 노출하지 않는다. Keycloak OIDC 직접 연동(P1 잔여) 전까지는 Backstage가 검증한
 * userEntityRef를 외부 신원 키로 사용하며, fc_external_identities에는
 * (issuer='backstage', subject=userEntityRef)로 기록한다. 이는 정식 매핑이며
 * 추정이 아니다. OIDC 전환 시 issuer/subject 마이그레이션 계획을 DECISIONS에 남긴다.
 */
export interface PortalPrincipal {
  userEntityRef: string;
  issuer: string;
  subject: string;
  authenticationStrength: 'guest' | 'oidc' | 'unknown';
}

export const principalFromCredentials = (
  credentials: BackstageCredentials,
): PortalPrincipal => {
  const principal = credentials.principal as {
    type: string;
    userEntityRef?: string;
  };
  if (principal.type !== 'user' || !principal.userEntityRef) {
    // 서비스/무인증 principal은 포털 업무 신원으로 인정하지 않는다.
    throw new Error('unsupported_principal');
  }
  const strength: PortalPrincipal['authenticationStrength'] =
    /^user:[^/]+\/guest$/.test(principal.userEntityRef) ? 'guest' : 'unknown';
  return {
    userEntityRef: principal.userEntityRef,
    issuer: 'backstage',
    subject: principal.userEntityRef,
    authenticationStrength: strength,
  };
};

/**
 * tenant context를 현재 트랜잭션에만 설정한다.
 * SET LOCAL은 트랜잭션 종료 시 자동 해제되므로 connection pool 재사용 누출이 없다.
 * 트랜잭션 밖에서 호출하면 SET LOCAL이 무의미하므로 반드시 trx를 받는다.
 */
export const setTenantContext = async (
  trx: Knex.Transaction,
  tenantId: string,
): Promise<void> => {
  await trx.raw('SELECT set_config(?, ?, true)', [
    'portal.tenant_id',
    tenantId,
  ]);
};

/** header/body의 tenantId를 신뢰하지 않고, membership이 유효한지 서버에서 확인한다. */
export const assertActiveMembership = async (
  trx: Knex.Transaction,
  tenantId: string,
  userId: string,
): Promise<void> => {
  const row = await trx('portal.fc_tenant_memberships')
    .where({ tenant_id: tenantId, user_id: userId, status: 'active' })
    .where('valid_from', '<=', trx.fn.now())
    .where(qb =>
      qb.whereNull('valid_until').orWhere('valid_until', '>', trx.fn.now()),
    )
    .first('id');
  if (!row) {
    const err = new Error('no_active_membership');
    (err as any).statusCode = 403;
    throw err;
  }
};
