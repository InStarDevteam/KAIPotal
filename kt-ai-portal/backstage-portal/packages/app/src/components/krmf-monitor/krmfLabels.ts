import { KrmfOverview } from './krmfApi';

export const APPLICABILITY_LABELS: Record<string, string> = {
  applied: '적용',
  excluded: '제외',
  alternative: '대체',
};

export const CONTROL_STATUS_LABELS: Record<string, string> = {
  not_started: '이행 전',
  in_progress: '이행 중',
  evidence_submitted: '증적 제출',
  verified: '검증 완료',
};

export const REVIEW_STATUS_LABELS: Record<string, string> = {
  pending: '검토대기',
  approved: '승인',
  rejected: '반려',
};

export const ACTION_STATUS_LABELS: Record<string, string> = {
  open: '등록',
  in_progress: '진행 중',
  resolved: '조치 완료',
  reconfirmed: '재확인 완료',
};

export const ACTION_STATUS_FLOW: string[] = [
  'open',
  'in_progress',
  'resolved',
  'reconfirmed',
];

export const TRR_STATUS_LABELS: Record<string, string> = {
  not_ready: '미준비',
  ready: '준비 완료',
  na: '해당 없음',
};

export const EVAL_KIND_LABELS: Record<string, string> = {
  submission: '제출',
  query: '질의',
  answer: '답변',
  supplement: '보완 요청',
  risk_acceptance: '잔여위험 수용',
  authority_confirmation: '관계기관 확인',
};

export const EVAL_STATUS_LABELS: Record<string, string> = {
  open: '열림',
  answered: '답변 완료',
  closed: '종결',
};

export const applicabilityLabel = (value: string | undefined): string =>
  (value && APPLICABILITY_LABELS[value]) || '미지정';

export const controlStatusLabel = (value: string | undefined): string =>
  (value && (CONTROL_STATUS_LABELS[value] || value)) || '미지정';

export const reviewStatusLabel = (value: string | undefined): string =>
  (value && REVIEW_STATUS_LABELS[value]) || '미지정';

export const actionStatusLabel = (value: string | undefined): string =>
  (value && ACTION_STATUS_LABELS[value]) || '미지정';

export const trrStatusLabel = (value: string | undefined): string =>
  (value && (TRR_STATUS_LABELS[value] || value)) || '미지정';

export const trrEvidenceReadyLabel = (ready: boolean | undefined): string =>
  ready ? '준비 완료' : '미준비';

export const evalKindLabel = (value: string | undefined): string =>
  (value && (EVAL_KIND_LABELS[value] || value)) || '미지정';

export const evalStatusLabel = (value: string | undefined): string =>
  (value && (EVAL_STATUS_LABELS[value] || value)) || '미지정';

export const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
};

export const isOverdue = (
  dueDate: string | null | undefined,
  nowMs = Date.now(),
): boolean => {
  if (!dueDate) return false;
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() < nowMs;
};

export const implementationRateLabel = (
  overview: Pick<KrmfOverview, 'total_controls' | 'rate_label'>,
): string =>
  overview.total_controls === 0 ? '등록된 통제 없음' : overview.rate_label;

export interface RecentChangeView {
  id: string;
  label: string;
  at: string;
}

export const normalizeRecentChange = (
  raw: Record<string, unknown>,
  index: number,
): RecentChangeView => {
  const title =
    [raw.title, raw.summary, raw.change_type, raw.description]
      .find(value => typeof value === 'string' && value.trim().length > 0) ??
    '변경 내역';
  const at =
    [raw.occurred_at, raw.created_at, raw.updated_at]
      .find(value => typeof value === 'string' && value.trim().length > 0) ??
    '';
  const id =
    typeof raw.id === 'string' && raw.id
      ? raw.id
      : `recent-change-${index}`;
  return { id, label: String(title), at: String(at) };
};

export const normalizeRecentChanges = (
  raw: unknown,
): RecentChangeView[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === 'object',
    )
    .map((item, index) => normalizeRecentChange(item, index));
};
