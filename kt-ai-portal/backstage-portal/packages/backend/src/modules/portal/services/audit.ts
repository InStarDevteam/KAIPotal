import { Knex } from 'knex';
import { PortalPrincipal } from './context';

export interface AuditEventInput {
  tenantId?: string | null;
  actorId?: string | null;
  actorType?: 'user' | 'service' | 'system';
  action: string;
  resourceType?: string;
  resourceId?: string;
  resourceVersion?: string;
  result: 'success' | 'denied' | 'failed';
  reasonCode?: string;
  requestId?: string;
  operationId?: string;
  policyVersion?: number;
  // allowlist된 필드명만 기록한다. before/after 민감 원문은 절대 넣지 않는다.
  changedFields?: string[];
}

/**
 * 감사 원장 기록.
 *
 * 호출자가 전달한 트랜잭션 안에서만 INSERT한다 — 업무 변경과 감사 기록의
 * 원자성(업무 commit 실패 시 감사도 rollback)을 보장하기 위함이다.
 * 원장 테이블은 UPDATE/DELETE 권한이 런타임 계정에 없다(infra/db/roles.sql).
 */
export const recordAuditEvent = async (
  trx: Knex.Transaction,
  principal: PortalPrincipal | null,
  input: AuditEventInput,
): Promise<void> => {
  await trx('portal.fc_audit_events').insert({
    // Timestamp the event itself, not the transaction start. Read-audit events
    // must stay after the immutable export snapshot taken in that transaction.
    occurred_at: trx.raw('clock_timestamp()'),
    recorded_at: trx.raw('clock_timestamp()'),
    tenant_id: input.tenantId ?? null,
    actor_id: input.actorId ?? null,
    actor_type: input.actorType ?? (principal ? 'user' : 'system'),
    issuer: principal?.issuer ?? null,
    subject: principal?.subject ?? null,
    action: input.action,
    resource_type: input.resourceType ?? null,
    resource_id: input.resourceId ?? null,
    resource_version: input.resourceVersion ?? null,
    result: input.result,
    reason_code: input.reasonCode ?? null,
    request_id: input.requestId ?? null,
    operation_id: input.operationId ?? null,
    policy_version: input.policyVersion ?? null,
    changed_fields: input.changedFields
      ? JSON.stringify(input.changedFields)
      : null,
  });
};
