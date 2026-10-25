import { Knex } from 'knex';
import { setTenantContext } from './context';

/**
 * 서버 RBAC 평가기.
 *
 * 권한 원천은 DB의 fc_roles/fc_role_permissions(기준 데이터, seed:reference)와
 * fc_role_assignments(유효 할당)다. 브라우저가 보낸 역할/권한 값은 신뢰하지 않는다.
 *
 * scope 규칙:
 * - system 역할(portal-admin)을 포함하여 선택 tenant의 유효 할당만 적용.
 * - tenant/project 역할: 현재 tenant의 유효 할당만 적용.
 * 유효 할당 = membership active AND valid_from<=now AND (valid_until IS NULL OR > now).
 */
export interface UserAuthorization {
  permissions: Set<string>;
  roles: Set<string>;
  // 선택 tenant에 활성 membership이 있는지
  hasTenantMembership: boolean;
  // 선택 tenant에서 system scope 역할을 보유했는지. 업무 범위 우회는 허용하지 않는다.
  hasSystemRole: boolean;
}

export const authorizationForUser = async (
  db: Knex,
  userId: string,
  tenantId: string,
): Promise<UserAuthorization> =>
  db.transaction(async trx => {
    // 선택 tenant 안에서만 평가한다. 전역 역할도 타 tenant 업무권한을 자동 상속하지 않는다.
    // SET LOCAL과 모든 쿼리를 같은 연결에서 실행하여 runtime RLS를 유지한다.
    await setTenantContext(trx, tenantId);
    const tenant = await trx('portal.fc_tenants')
      .where({ id: tenantId, status: 'active' })
      .first('id');
    if (!tenant)
      return {
        permissions: new Set<string>(),
        roles: new Set<string>(),
        hasTenantMembership: false,
        hasSystemRole: false,
      };

    const rows = await trx('portal.fc_role_assignments as ra')
      .join('portal.fc_tenant_memberships as m', join =>
        join
          .on('m.tenant_id', 'ra.tenant_id')
          .andOn('m.id', 'ra.membership_id'),
      )
      .join('portal.fc_roles as r', 'r.role_id', 'ra.role_id')
      .join('portal.fc_role_permissions as rp', 'rp.role_id', 'ra.role_id')
      .where('m.user_id', userId)
      .where('m.status', 'active')
      .where('m.valid_from', '<=', trx.fn.now())
      .where(qb =>
        qb
          .whereNull('m.valid_until')
          .orWhere('m.valid_until', '>', trx.fn.now()),
      )
      .join('portal.fc_users as u', 'u.user_id', 'm.user_id')
      .where('u.status', 'active')
      .where('ra.valid_from', '<=', trx.fn.now())
      .where(qb =>
        qb
          .whereNull('ra.valid_until')
          .orWhere('ra.valid_until', '>', trx.fn.now()),
      )
      .andWhere(qb =>
        // system 역할은 전역, 그 외는 현재 tenant 한정
        qb.where('ra.tenant_id', tenantId),
      )
      .distinct('rp.permission_id', 'r.scope', 'r.role_id');

    const membership = await trx('portal.fc_tenant_memberships')
      .where({ tenant_id: tenantId, user_id: userId, status: 'active' })
      .where('valid_from', '<=', trx.fn.now())
      .where(qb =>
        qb.whereNull('valid_until').orWhere('valid_until', '>', trx.fn.now()),
      )
      .first('id');

    return {
      permissions: new Set(rows.map(row => row.permission_id as string)),
      roles: new Set(rows.map(row => row.role_id as string)),
      hasTenantMembership: Boolean(membership),
      hasSystemRole: rows.some(row => row.scope === 'system'),
    };
  });
