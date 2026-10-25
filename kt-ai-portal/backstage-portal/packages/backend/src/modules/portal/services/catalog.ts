import { randomUUID } from 'crypto';
import { Knex } from 'knex';

export const CATALOG_KINDS = ['tool', 'service', 'dataset', 'model'] as const;
export const CATALOG_CATEGORIES = [
  'analysis',
  'development',
  'data',
  'visualization',
  'labeling',
] as const;
export const CATALOG_PROVIDERS = ['portal', 'external'] as const;
export const CATALOG_ACCESS_TYPES = ['apply', 'direct_link'] as const;
export const APPLICATION_STATUSES = [
  'requested',
  'approved',
  'rejected',
  'cancelled',
] as const;
export const EXECUTION_STATUSES = [
  'pending_platform',
  'provisioning',
  'failed',
] as const;

export const CATALOG_ITEM_ADMIN_PERMISSION = 'tenant.manage';

export const isCatalogItemAdmin = (permissions: Set<string>): boolean =>
  permissions.has(CATALOG_ITEM_ADMIN_PERMISSION);

export const canDecideApplication = (permissions: Set<string>): boolean =>
  permissions.has('workspace.approve') || permissions.has('project.approve');

export const catalogUrlValid = (value: unknown): boolean => {
  if (value === null || value === undefined || value === '') return true;
  if (typeof value !== 'string' || value.length > 2048 || /[\s\\<>]/.test(value)) {
    return false;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  if (!url.hostname || url.username || url.password) return false;
  return true;
};

export const LEDGER_REF_TYPE = 'catalog_application';

export interface LedgerRef {
  workRequestId: string | null;
}

export const findLedgerReference = async (
  trx: Knex.Transaction,
  applicationId: string,
): Promise<LedgerRef> => {
  const row = await trx('portal.fc_work_requests')
    .whereRaw("payload->>'refType' = ? AND payload->>'refId' = ?", [
      LEDGER_REF_TYPE,
      applicationId,
    ])
    .first('id');
  return { workRequestId: (row?.id as string | undefined) ?? null };
};

export const createLedgerReference = async (
  trx: Knex.Transaction,
  tenantId: string,
  applicationId: string,
  requesterUserId: string,
  title: string,
  detail: Record<string, unknown>,
): Promise<string> => {
  const existing = await findLedgerReference(trx, applicationId);
  if (existing.workRequestId) return existing.workRequestId;
  const id = randomUUID();
  await trx('portal.fc_work_requests').insert({
    id,
    tenant_id: tenantId,
    project_id: (detail.project_id as string | undefined) ?? null,
    type: 'workspace',
    title,
    payload: JSON.stringify({ refType: LEDGER_REF_TYPE, refId: applicationId, ...detail }),
    requester_user_id: requesterUserId,
  });
  await trx('portal.fc_request_events').insert({
    tenant_id: tenantId,
    request_id: id,
    actor_user_id: requesterUserId,
    action: 'submitted',
    note: null,
  });
  return id;
};

export type DecideApplicationResult =
  | { ok: true; application: Record<string, unknown> }
  | { ok: false; code: 'not_found' | 'already_decided' };

const REVIEWABLE = ['requested', 'reviewing'];

export const decideApplication = async (
  trx: Knex.Transaction,
  applicationId: string,
  actorUserId: string,
  decision: 'approved' | 'rejected',
): Promise<DecideApplicationResult> => {
  const current = await trx('portal.fc_catalog_application')
    .where({ id: applicationId })
    .first();
  if (!current) return { ok: false, code: 'not_found' };
  if (current.status !== 'requested') return { ok: false, code: 'already_decided' };
  const updated = await trx('portal.fc_catalog_application')
    .where({ id: applicationId, status: 'requested' })
    .update({
      status: decision,
      decided_by: actorUserId,
      decided_at: trx.fn.now(),
      version: trx.raw('version + 1'),
      updated_at: trx.fn.now(),
    });
  if (updated === 0) return { ok: false, code: 'already_decided' };
  const workRequestId = current.work_request_id as string | null;
  if (workRequestId) {
    await trx('portal.fc_work_requests')
      .where({ id: workRequestId })
      .whereIn('status', REVIEWABLE)
      .update({
        status: decision,
        decided_by: actorUserId,
        decided_at: trx.fn.now(),
        version: trx.raw('version + 1'),
        updated_at: trx.fn.now(),
      });
    await trx('portal.fc_request_events').insert({
      tenant_id: current.tenant_id as string,
      request_id: workRequestId,
      actor_user_id: actorUserId,
      action: 'decided',
      note: `카탈로그 신청 ${decision}`,
    });
  }
  const application = await trx('portal.fc_catalog_application')
    .where({ id: applicationId })
    .first();
  return { ok: true, application: application as Record<string, unknown> };
};
