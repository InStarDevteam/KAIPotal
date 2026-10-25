import { Knex } from 'knex';
import { setTenantContext } from './context';

export const TRANSFER_KINDS = ['import', 'export'] as const;
export type TransferKind = (typeof TRANSFER_KINDS)[number];

export const TRANSFER_SUBJECT_TYPES = ['server', 'artifact'] as const;
export type TransferSubjectType = (typeof TRANSFER_SUBJECT_TYPES)[number];

export const TRANSFER_SECURITY_GRADES = [
  'public',
  'internal',
  'confidential',
  'secret',
] as const;
export type TransferSecurityGrade = (typeof TRANSFER_SECURITY_GRADES)[number];

export const TRANSFER_PUBLIC_SCOPES = ['none', 'tenant', 'all'] as const;
export type TransferPublicScope = (typeof TRANSFER_PUBLIC_SCOPES)[number];

export const TRANSFER_STATUSES = [
  'requested',
  'in_review',
  'approved',
  'rejected',
  'supplement_requested',
  'cancelled',
] as const;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export const TRANSFER_DECISIONS = [
  'approved',
  'rejected',
  'request_supplement',
] as const;
export type TransferDecision = (typeof TRANSFER_DECISIONS)[number];

const TRANSITIONS: Record<TransferStatus, readonly TransferStatus[]> = {
  requested: ['in_review', 'approved', 'rejected', 'supplement_requested', 'cancelled'],
  in_review: ['approved', 'rejected', 'supplement_requested'],
  supplement_requested: ['in_review'],
  approved: [],
  rejected: [],
  cancelled: [],
};

export const canTransitionTransfer = (
  from: TransferStatus,
  to: TransferStatus,
): boolean => TRANSITIONS[from].includes(to);

export const TRANSFER_FILE_MAX_BYTES = 100 * 1024 * 1024;
export const TRANSFER_FILE_MIME_ALLOWLIST = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-tar',
  'application/gzip',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
]);

export const validTransferMime = (mime: string): boolean =>
  TRANSFER_FILE_MIME_ALLOWLIST.has(mime) || mime.startsWith('text/');

export const SHA256_PATTERN = /^[0-9a-f]{64}$/;
export const validSha256 = (sha256: string): boolean =>
  SHA256_PATTERN.test(sha256);

export type TransferFailureCode =
  | 'not_found'
  | 'invalid_state'
  | 'invalid_input'
  | 'version_conflict'
  | 'not_approved_version'
  | 'forbidden';

export type TransferResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: TransferFailureCode; message: string };

const ok = <T>(value: T): TransferResult<T> => ({ ok: true, value });
const fail = <T>(code: TransferFailureCode, message: string): TransferResult<T> => ({
  ok: false,
  code,
  message,
});

export interface CreateTransferRequestInput {
  kind: TransferKind;
  subjectType: TransferSubjectType;
  title: string;
  purpose: string;
  securityGrade: TransferSecurityGrade;
  publicConsent: boolean;
  publicScope: TransferPublicScope;
  usagePermission?: string | undefined;
  requestedBy: string;
  idempotencyKey?: string | undefined;
}

export const createTransferRequest = async (
  trx: Knex.Transaction,
  tenantId: string,
  input: CreateTransferRequestInput,
): Promise<TransferResult<Record<string, unknown>>> => {
  await setTenantContext(trx, tenantId);

  if (input.idempotencyKey) {
    const existing = await trx('portal.fc_transfer_request')
      .where({ tenant_id: tenantId, idempotency_key: input.idempotencyKey })
      .first();
    if (existing) {
      return ok({ ...(existing as Record<string, unknown>), replayed: true });
    }
  }
  if (!input.title.trim() || !input.purpose.trim()) {
    return fail('invalid_input', '제목과 목적은 비어 있을 수 없습니다.');
  }
  if (input.publicScope !== 'none' && !input.publicConsent) {
    return fail(
      'invalid_input',
      '공개 범위를 지정하려면 공개 동의가 필요합니다.',
    );
  }

  const [row] = await trx('portal.fc_transfer_request')
    .insert({
      tenant_id: tenantId,
      kind: input.kind,
      subject_type: input.subjectType,
      title: input.title.trim(),
      purpose: input.purpose.trim(),
      security_grade: input.securityGrade,
      public_consent: input.publicConsent,
      public_scope: input.publicScope,
      usage_permission: input.usagePermission ?? null,
      requested_by: input.requestedBy,
      idempotency_key: input.idempotencyKey ?? null,
    })
    .returning('*');
  return ok(row as Record<string, unknown>);
};

export const decideTransferRequest = async (
  trx: Knex.Transaction,
  tenantId: string,
  requestId: string,
  actorUserId: string,
  decision: TransferDecision,
  reason: string,
  expectedVersion?: number | undefined,
): Promise<TransferResult<Record<string, unknown>>> => {
  await setTenantContext(trx, tenantId);
  const request = await trx('portal.fc_transfer_request')
    .where({ id: requestId })
    .first();
  if (!request) return fail('not_found', '반입·반출 신청을 찾을 수 없습니다.');

  const currentStatus = request.status as TransferStatus;
  const targetStatus: TransferStatus =
    decision === 'request_supplement' ? 'supplement_requested' : decision;
  if (!canTransitionTransfer(currentStatus, targetStatus)) {
    return fail(
      'invalid_state',
      `현재 상태(${currentStatus})에서는 ${decision} 처리할 수 없습니다.`,
    );
  }
  if (expectedVersion !== undefined && expectedVersion !== request.version) {
    return fail('version_conflict', '신청이 다른 변경으로 갱신되었습니다.');
  }

  let approvedFileVersion: number | null = null;
  if (decision === 'approved') {
    const latest = await trx('portal.fc_transfer_file')
      .where({ request_id: requestId })
      .max('version as max_version')
      .first();
    const maxVersion = Number(latest?.max_version ?? 0);
    if (maxVersion < 1) {
      return fail('invalid_state', '첨부 파일이 없으면 승인할 수 없습니다.');
    }
    approvedFileVersion = maxVersion;
  }

  const updated = await trx('portal.fc_transfer_request')
    .where({ id: requestId, status: currentStatus })
    .update({
      status: targetStatus,
      decided_by: actorUserId,
      decided_at: trx.fn.now(),
      decision_reason: reason,
      approved_file_version:
        decision === 'approved'
          ? approvedFileVersion
          : (request.approved_file_version as number | null),
      version: trx.raw('version + 1'),
      updated_at: trx.fn.now(),
    });
  if (updated === 0) {
    return fail('invalid_state', '신청 상태가 이미 변경되었습니다.');
  }

  const [row] = await trx('portal.fc_transfer_request')
    .where({ id: requestId })
    .returning('*');
  return ok(row as Record<string, unknown>);
};

export const cancelTransferRequest = async (
  trx: Knex.Transaction,
  tenantId: string,
  requestId: string,
  actorUserId: string,
): Promise<TransferResult<Record<string, unknown>>> => {
  await setTenantContext(trx, tenantId);
  const request = await trx('portal.fc_transfer_request')
    .where({ id: requestId })
    .first();
  if (!request) return fail('not_found', '반입·반출 신청을 찾을 수 없습니다.');
  if (request.requested_by !== actorUserId) {
    return fail('forbidden', '본인이 신청한 건에 대해서만 취소할 수 있습니다.');
  }
  if (request.status !== 'requested') {
    return fail(
      'invalid_state',
      '검토 시작 전(requested) 상태에서만 취소할 수 있습니다.',
    );
  }
  const updated = await trx('portal.fc_transfer_request')
    .where({ id: requestId, status: 'requested' })
    .update({
      status: 'cancelled',
      version: trx.raw('version + 1'),
      updated_at: trx.fn.now(),
    });
  if (updated === 0) {
    return fail('invalid_state', '신청 상태가 이미 변경되었습니다.');
  }
  const [row] = await trx('portal.fc_transfer_request')
    .where({ id: requestId })
    .returning('*');
  return ok(row as Record<string, unknown>);
};

export interface TransferFileMeta {
  storedName: string;
  originalName: string;
  mime: string;
  sizeBytes: number;
  sha256: string;
}

export const addTransferFileVersion = async (
  trx: Knex.Transaction,
  tenantId: string,
  requestId: string,
  actorUserId: string,
  meta: TransferFileMeta,
): Promise<
  TransferResult<{
    file: Record<string, unknown>;
    staleApproval: boolean;
    previousApprovedVersion: number | null;
    status: TransferStatus;
  }>
> => {
  await setTenantContext(trx, tenantId);
  const request = await trx('portal.fc_transfer_request')
    .where({ id: requestId })
    .first();
  if (!request) return fail('not_found', '반입·반출 신청을 찾을 수 없습니다.');
  if (request.requested_by !== actorUserId) {
    return fail('forbidden', '본인이 신청한 건의 파일만 교체할 수 있습니다.');
  }
  if (meta.storedName.includes('/') || meta.storedName.includes('\\')) {
    return fail('invalid_input', '저장 파일명이 올바르지 않습니다.');
  }
  if (!validTransferMime(meta.mime)) {
    return fail('invalid_input', '지원하지 않는 파일 형식입니다.');
  }
  if (meta.sizeBytes <= 0 || meta.sizeBytes > TRANSFER_FILE_MAX_BYTES) {
    return fail('invalid_input', '파일 크기가 허용 범위를 벗어났습니다.');
  }
  if (!validSha256(meta.sha256)) {
    return fail('invalid_input', '파일 체크섬이 올바르지 않습니다.');
  }

  const latest = await trx('portal.fc_transfer_file')
    .where({ request_id: requestId })
    .max('version as max_version')
    .first();
  const nextVersion = Number(latest?.max_version ?? 0) + 1;

  const [file] = await trx('portal.fc_transfer_file')
    .insert({
      tenant_id: tenantId,
      request_id: requestId,
      stored_name: meta.storedName,
      original_name: meta.originalName,
      mime: meta.mime,
      size_bytes: meta.sizeBytes,
      sha256: meta.sha256,
      version: nextVersion,
      created_by: actorUserId,
    })
    .returning('*');

  const approvedVersion = request.approved_file_version as number | null;
  const staleApproval =
    request.status === 'approved' &&
    approvedVersion !== null &&
    approvedVersion !== nextVersion;

  let status = request.status as TransferStatus;
  if (status === 'supplement_requested') {
    await trx('portal.fc_transfer_request')
      .where({ id: requestId })
      .update({ status: 'in_review' });
    status = 'in_review';
  }

  return ok({
    file: file as Record<string, unknown>,
    staleApproval,
    previousApprovedVersion: staleApproval ? approvedVersion : null,
    status,
  });
};

export const getTransferRequestDetail = async (
  trx: Knex.Transaction,
  tenantId: string,
  requestId: string,
): Promise<TransferResult<Record<string, unknown>>> => {
  await setTenantContext(trx, tenantId);
  const request = await trx('portal.fc_transfer_request')
    .where({ id: requestId })
    .first();
  if (!request) return fail('not_found', '반입·반출 신청을 찾을 수 없습니다.');
  const files = await trx('portal.fc_transfer_file')
    .where({ request_id: requestId })
    .orderBy('version', 'asc')
    .select('*');
  const approvedVersion = request.approved_file_version as number | null;
  const latestVersion = files.length
    ? Number(files[files.length - 1].version)
    : null;
  const staleApproval =
    request.status === 'approved' &&
    approvedVersion !== null &&
    latestVersion !== null &&
    latestVersion !== approvedVersion;
  return ok({
    ...(request as Record<string, unknown>),
    files,
    staleApproval,
    staleApprovalMessage: staleApproval
      ? `승인 후 파일 변경됨(버전 ${approvedVersion}→${latestVersion}). 다운로드는 승인된 버전만 허용됩니다.`
      : null,
  });
};

export const resolveTransferDownload = async (
  trx: Knex.Transaction,
  tenantId: string,
  fileId: string,
): Promise<
  TransferResult<{ file: Record<string, unknown>; request: Record<string, unknown> }>
> => {
  await setTenantContext(trx, tenantId);
  const file = await trx('portal.fc_transfer_file')
    .where({ id: fileId })
    .first();
  if (!file) return fail('not_found', '파일을 찾을 수 없습니다.');
  const request = await trx('portal.fc_transfer_request')
    .where({ id: file.request_id })
    .first();
  if (!request) return fail('not_found', '반입·반출 신청을 찾을 수 없습니다.');

  if (request.status !== 'approved') {
    return fail(
      'not_approved_version',
      '승인되지 않은 신청의 파일은 다운로드할 수 없습니다.',
    );
  }
  const approvedVersion = request.approved_file_version as number | null;
  if (approvedVersion === null || Number(file.version) !== approvedVersion) {
    return fail(
      'not_approved_version',
      '승인된 파일 버전만 다운로드할 수 있습니다. 파일이 교체' +
        ' 된 경우 재승인이 필요합니다.',
    );
  }
  return ok({ file, request });
};
