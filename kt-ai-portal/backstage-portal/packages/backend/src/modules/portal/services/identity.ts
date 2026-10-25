import { Knex } from 'knex';
import { PortalPrincipal } from './context';

export interface PortalIdentity {
  userId: string;
  displayName: string;
  status: string;
}

/** 검증된 principal(issuer, subject)로 포털 등록 사용자를 조회한다. */
export const lookupIdentity = async (
  db: Knex,
  principal: PortalPrincipal,
): Promise<PortalIdentity | undefined> =>
  db('portal.fc_external_identities as ei')
    .join('portal.fc_users as u', 'u.user_id', 'ei.user_id')
    .where({
      'ei.issuer': principal.issuer,
      'ei.subject': principal.subject,
      'ei.verified': true,
    })
    .first({
      userId: 'u.user_id',
      displayName: 'u.display_name',
      status: 'u.status',
    });
