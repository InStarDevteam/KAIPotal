export type TransferKind = 'import' | 'export';

export const TRANSFER_KIND_LABELS: Record<TransferKind, string> = {
  import: '반입',
  export: '반출',
};

export type TransferSubjectType = 'server' | 'artifact';

export const TRANSFER_SUBJECT_LABELS: Record<TransferSubjectType, string> = {
  server: '서버',
  artifact: '산출물',
};

export type TransferStatus =
  | 'requested'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'supplement_requested'
  | 'cancelled';

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  requested: '신청',
  in_review: '검토 중',
  approved: '승인',
  rejected: '반려',
  supplement_requested: '보완 요청',
  cancelled: '취소',
};

export type TransferSecurityGrade =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'secret';

export const TRANSFER_GRADE_LABELS: Record<TransferSecurityGrade, string> = {
  public: '공개',
  internal: '낮음',
  confidential: '대외비',
  secret: '비밀',
};

export type TransferPublicScope = 'none' | 'tenant' | 'all';

export const TRANSFER_SCOPE_LABELS: Record<TransferPublicScope, string> = {
  none: '비공개',
  tenant: '소속 공개',
  all: '전체 공개',
};

export const TRANSFER_USAGE_PERMISSIONS: Record<string, string> = {
  all_users: '전체 사용자',
  project_members: '프로젝트 참여자',
  approved_users: '승인 사용자',
  admins_only: '관리자 전용',
};

export type TransferDecision = 'approved' | 'rejected' | 'request_supplement';

export const TRANSFER_DECISION_LABELS: Record<TransferDecision, string> = {
  approved: '승인',
  rejected: '반려',
  request_supplement: '보완 요청',
};

export interface TransferFileRow {
  id: string;
  request_id: string;
  original_name: string;
  mime: string;
  size_bytes: number;
  sha256: string;
  version: number;
  created_by: string;
  created_at: string;
}

export interface TransferRequestRow {
  id: string;
  kind: TransferKind;
  subject_type: TransferSubjectType;
  title: string;
  purpose: string;
  security_grade: TransferSecurityGrade;
  public_consent: boolean;
  public_scope: TransferPublicScope;
  usage_permission: string | null;
  status: TransferStatus;
  requested_by: string;
  requested_at: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  approved_file_version: number | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface TransferRequestDetail extends TransferRequestRow {
  files: TransferFileRow[];
  staleApproval: boolean;
  staleApprovalMessage: string | null;
}

export const TRANSFER_FILE_MAX_BYTES = 100 * 1024 * 1024;

const TRANSFER_FILE_MIME_ALLOWLIST = new Set([
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

export const validateTransferFile = (file: {
  name: string;
  size: number;
  type: string;
}): string | null => {
  if (file.size <= 0) return '빈 파일은 첨부할 수 없습니다.';
  if (file.size > TRANSFER_FILE_MAX_BYTES)
    return '파일 크기가 허용 범위(100MB)를 초과했습니다.';
  if (!validTransferMime(file.type))
    return '지원하지 않는 파일 형식입니다. PDF·ZIP·TAR·GZ·TXT·CSV·PNG·JPG 형식만 첨부할 수 있습니다.';
  return null;
};

export const canDecideTransferStatus = (status: TransferStatus): boolean =>
  status === 'requested' || status === 'in_review';

export const canCancelTransfer = (
  row: Pick<TransferRequestRow, 'status' | 'requested_by'>,
  actorId: string,
): boolean => row.status === 'requested' && row.requested_by === actorId;

export const isTransferFileDownloadable = (
  file: Pick<TransferFileRow, 'version'>,
  detail: Pick<TransferRequestRow, 'status' | 'approved_file_version'>,
): boolean =>
  detail.status === 'approved' &&
  detail.approved_file_version !== null &&
  detail.approved_file_version === file.version;

export const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export const shortSha256 = (sha256: string): string =>
  sha256.length > 16 ? `${sha256.slice(0, 16)}…` : sha256;

export const newIdempotencyKey = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export interface TransferSubmitInput {
  kind: TransferKind;
  subjectType: TransferSubjectType;
  title: string;
  purpose: string;
  securityGrade: TransferSecurityGrade;
  publicConsent: boolean;
  publicScope: TransferPublicScope;
  usagePermission: string;
}

export const buildTransferSubmitForm = (
  input: TransferSubmitInput,
  file: Blob & { name?: string },
  idempotencyKey: string,
): FormData => {
  const form = new FormData();
  form.set('kind', input.kind);
  form.set('subject_type', input.subjectType);
  form.set('title', input.title.trim());
  form.set('purpose', input.purpose.trim());
  form.set('security_grade', input.securityGrade);
  form.set('public_consent', input.publicConsent ? 'true' : 'false');
  form.set('public_scope', input.publicScope);
  form.set('usage_permission', input.usagePermission);
  form.set('idempotency_key', idempotencyKey);
  form.append('file', file, file.name ?? 'attachment');
  return form;
};

export const buildTransferFileForm = (
  file: Blob & { name?: string },
): FormData => {
  const form = new FormData();
  form.append('file', file, file.name ?? 'attachment');
  return form;
};

export const validateTransferReason = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return '결정 사유를 입력하세요.';
  if (trimmed.length > 500) return '결정 사유는 500자 이내로 입력하세요.';
  return null;
};

export type TransferFetchFailure = {
  kind: 'permission' | 'conflict' | 'invalid' | 'network';
  message: string;
  code?: string;
};

export const classifyTransferFetchError = (
  error: unknown,
): TransferFetchFailure => {
  const status = (error as { status?: number } | null)?.status;
  const code = (error as { code?: string } | null)?.code;
  const message =
    error instanceof Error && error.message
      ? error.message
      : '반입·반출 정보를 불러오지 못했습니다.';
  if (status === 403 || code === 'permission_denied' || code === 'forbidden') {
    return { kind: 'permission', message, code };
  }
  if (
    status === 409 ||
    code === 'version_conflict' ||
    code === 'invalid_state' ||
    code === 'not_approved_version'
  ) {
    return { kind: 'conflict', message, code };
  }
  if (status === 422 || code === 'file_too_large') {
    return { kind: 'invalid', message, code };
  }
  return { kind: 'network', message, code };
};

export const conflictRefetchMessage =
  '다른 변경과 충돌했습니다. 최신 신청 내역으로 다시 조회한 뒤 시도하세요.';

export const extractDownloadFilename = (
  contentDisposition: string | null,
  fallback: string,
): string => {
  if (contentDisposition) {
    const star = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (star?.[1]) {
      try {
        return decodeURIComponent(star[1].trim());
      } catch {
        return star[1].trim();
      }
    }
    const plain = contentDisposition.match(/filename="?([^";]+)"?/i);
    if (plain?.[1]) return plain[1].trim();
  }
  return fallback;
};
