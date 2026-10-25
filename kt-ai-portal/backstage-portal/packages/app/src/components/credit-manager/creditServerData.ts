export type CreditOwnerType = 'user' | 'project' | 'tenant';

export const CREDIT_OWNER_TYPES: CreditOwnerType[] = ['user', 'project', 'tenant'];

export const CREDIT_OWNER_TYPE_LABELS: Record<CreditOwnerType, string> = {
  user: '사용자',
  project: '프로젝트',
  tenant: '소속',
};

export type CreditRequestType = 'initial_grant' | 'charge' | 'adjustment';

export const CREDIT_REQUEST_TYPE_LABELS: Record<CreditRequestType, string> = {
  initial_grant: '초기 부여',
  charge: '충전',
  adjustment: '정정 요청',
};

export type CreditRequestStatus = 'requested' | 'approved' | 'rejected' | 'cancelled';

export const CREDIT_REQUEST_STATUS_LABELS: Record<CreditRequestStatus, string> = {
  requested: '신청',
  approved: '승인',
  rejected: '반려',
  cancelled: '취소',
};

export type CreditTransactionType = 'grant' | 'charge' | 'deduct' | 'adjust';

export const CREDIT_TRANSACTION_TYPES: CreditTransactionType[] = [
  'grant',
  'charge',
  'deduct',
  'adjust',
];

export const CREDIT_TRANSACTION_TYPE_LABELS: Record<CreditTransactionType, string> = {
  grant: '부여',
  charge: '충전',
  deduct: '차감',
  adjust: '정정',
};

export interface CreditProductRow {
  id: string;
  code: string;
  name: string;
  unit: string;
  unit_price: string;
  currency: string;
  valid_from: string;
  valid_to: string | null;
  active: boolean;
}

export interface CreditAccountRow {
  id: string;
  owner_type: CreditOwnerType;
  owner_id: string;
  balance: string;
  version: number;
  updated_at: string;
}

export interface CreditAccountData {
  account: CreditAccountRow;
  recentTransactions: CreditTransactionRow[];
  balanced: boolean | null;
}

export interface CreditTransactionRow {
  id: string;
  type: CreditTransactionType;
  amount: string;
  reason: string;
  ref_type: string | null;
  ref_id: string | null;
  created_by: string;
  created_at: string;
}

export interface CreditTransactionPage {
  items: CreditTransactionRow[];
  pagination: { page: number; pageSize: number; total: number };
}

export interface CreditRequestRow {
  id: string;
  type: CreditRequestType;
  owner_type: CreditOwnerType;
  owner_id: string;
  amount: string;
  reason: string;
  status: CreditRequestStatus;
  requested_by: string;
  requested_at: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  version: number;
}

export interface CreditUsageTrend {
  items: Array<Record<string, unknown>>;
  measured: boolean;
}

export const newIdempotencyKey = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const formatCreditAmount = (
  value: string | number | null | undefined,
): string => {
  if (value === null || value === undefined || value === '') return '—';
  const raw = String(value);
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return '—';
  const negative = raw.startsWith('-');
  const unsigned = negative ? raw.slice(1) : raw;
  const [whole, fraction = ''] = unsigned.split('.');
  const trimmed = fraction.replace(/0+$/, '');
  const withSeparator = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${withSeparator}${trimmed ? `.${trimmed}` : ''}`;
};

export const isPendingCreditRequest = (row: CreditRequestRow): boolean =>
  row.status === 'requested';

export const AMOUNT_INPUT_PATTERN = /^-?\d+(\.\d{1,4})?$/;

export const validateCreditAmountInput = (
  value: string,
  options: { allowNegative?: boolean } = {},
): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return '금액을 입력하세요.';
  if (!AMOUNT_INPUT_PATTERN.test(trimmed)) return '금액은 소수점 4자리 이내 숫자로 입력하세요.';
  if (!options.allowNegative && trimmed.startsWith('-'))
    return '신청 금액은 0보다 커야 합니다.';
  if (Number(trimmed) === 0) return '금액은 0이 아니어야 합니다.';
  return null;
};

export const validateCreditReason = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return '사유를 입력하세요.';
  if (trimmed.length > 500) return '사유는 500자 이내로 입력하세요.';
  return null;
};

export type CreditFetchFailure = {
  kind: 'permission' | 'conflict' | 'not_found' | 'network';
  message: string;
  code?: string;
};

export const classifyCreditFetchError = (error: unknown): CreditFetchFailure => {
  const status = (error as { status?: number } | null)?.status;
  const code = (error as { code?: string } | null)?.code;
  const message =
    error instanceof Error && error.message
      ? error.message
      : '크레딧 정보를 불러오지 못했습니다.';
  if (status === 403 || code === 'permission_denied') {
    return { kind: 'permission', message, code };
  }
  if (status === 409 || code === 'version_conflict' || code === 'invalid_state') {
    return { kind: 'conflict', message, code };
  }
  if (status === 404 || code === 'not_found') {
    return { kind: 'not_found', message, code };
  }
  return { kind: 'network', message, code };
};

export const conflictRefetchMessage =
  '다른 변경과 충돌했습니다. 최신 데이터로 다시 조회한 뒤 시도하세요.';
