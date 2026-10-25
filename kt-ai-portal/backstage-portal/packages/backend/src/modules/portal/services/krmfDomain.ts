export const KRMF_PERMISSIONS = {
  view: 'krmf.view',
  manage: 'krmf.manage',
  evidenceSubmit: 'krmf.evidence.submit',
  review: 'krmf.review',
} as const;

export const BASELINE_STATUSES = ['draft', 'active', 'archived'] as const;
export type BaselineStatus = (typeof BASELINE_STATUSES)[number];
export const BASELINE_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['active', 'archived'],
  active: ['archived'],
  archived: ['draft'],
};

export const CONTROL_STATUSES = [
  'not_started',
  'in_progress',
  'evidence_submitted',
  'verified',
] as const;
export type ControlStatus = (typeof CONTROL_STATUSES)[number];
export const CONTROL_TRANSITIONS: Record<string, readonly string[]> = {
  not_started: ['in_progress'],
  in_progress: ['evidence_submitted', 'not_started'],
  evidence_submitted: ['verified', 'in_progress'],
  verified: ['in_progress'],
};

export const APPLICABILITIES = ['applied', 'excluded', 'alternative'] as const;
export type Applicability = (typeof APPLICABILITIES)[number];

export const EVIDENCE_KINDS = ['file', 'reference'] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const ACTION_STATUSES = [
  'open',
  'in_progress',
  'resolved',
  'reconfirmed',
] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];
export const ACTION_TRANSITIONS: Record<string, readonly string[]> = {
  open: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['reconfirmed'],
  reconfirmed: [],
};

export const IMPACTS = ['high', 'medium', 'low'] as const;
export type Impact = (typeof IMPACTS)[number];

export const CHANGE_TYPES = ['policy', 'config'] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];
export const CHANGE_STATUSES = [
  'recorded',
  'under_review',
  'reassessed',
] as const;
export type ChangeStatus = (typeof CHANGE_STATUSES)[number];
export const CHANGE_TRANSITIONS: Record<string, readonly string[]> = {
  recorded: ['under_review'],
  under_review: ['reassessed'],
  reassessed: [],
};

export const TRR_STATUSES = ['not_ready', 'ready', 'na'] as const;
export type TrrStatus = (typeof TRR_STATUSES)[number];
export const TRR_TRANSITIONS: Record<string, readonly string[]> = {
  not_ready: ['ready', 'na'],
  ready: ['not_ready', 'na'],
  na: ['not_ready', 'ready'],
};

export const EVAL_KINDS = [
  'submission',
  'query',
  'answer',
  'supplement',
  'risk_acceptance',
  'authority_confirmation',
] as const;
export type EvalKind = (typeof EVAL_KINDS)[number];
export const EVAL_STATUSES = ['open', 'answered', 'closed'] as const;
export type EvalStatus = (typeof EVAL_STATUSES)[number];
export const EVAL_TRANSITIONS: Record<string, readonly string[]> = {
  open: ['answered', 'closed'],
  answered: ['closed'],
  closed: [],
};

export const LINK_TYPES = [
  'requirement',
  'implementation',
  'test',
  'defect',
] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export interface ScopeIdentity {
  userId: string;
  canViewAll: boolean;
  memberProjectIds: ReadonlySet<string>;
}

export const canViewAllKrmf = (permissions: Set<string>): boolean =>
  permissions.has(KRMF_PERMISSIONS.view);

export const baselineVisibleToMember = (
  baselineProjectId: string | null,
  scope: ScopeIdentity,
): boolean => {
  if (scope.canViewAll) return true;
  if (baselineProjectId === null) return true;
  return scope.memberProjectIds.has(baselineProjectId);
};

export const controlVisibleToMember = (
  ownerId: string | null,
  baselineProjectId: string | null,
  scope: ScopeIdentity,
): boolean => {
  if (scope.canViewAll) return true;
  if (ownerId !== null && ownerId === scope.userId) return true;
  return (
    baselineProjectId !== null && scope.memberProjectIds.has(baselineProjectId)
  );
};

export const transitionError = (
  subjectLabel: string,
  transitions: Record<string, readonly string[]>,
  from: string,
  to: string,
): string | null => {
  if (from === to) return null;
  const allowed = transitions[from] ?? [];
  if (allowed.includes(to)) return null;
  return `${subjectLabel} 상태는 ${from}에서 ${to}(으)로 변경할 수 없습니다.`;
};

export const applicabilityChangeError = (
  from: Applicability,
  to: Applicability,
  reason: string | null | undefined,
): string | null => {
  if (from === to) return null;
  if (from === 'applied' && to !== 'applied' && !reason?.trim()) {
    return '적용 통제를 제외 또는 대체로 전환할 때는 사유를 입력해야 합니다.';
  }
  return null;
};

export interface ImplementationRate {
  rate: number | null;
  label: string;
}

export const computeImplementationRate = (
  appliedControls: number,
  controlsWithApprovedEvidence: number,
): ImplementationRate => {
  if (appliedControls <= 0) {
    return { rate: null, label: '등록된 통제 없음' };
  }
  const rate =
    Math.round((controlsWithApprovedEvidence / appliedControls) * 1000) / 10;
  return { rate, label: `${rate}%` };
};

const BLOCKED_EXTENSIONS = new Set([
  'exe',
  'bat',
  'cmd',
  'com',
  'pif',
  'scr',
  'ps1',
  'vbs',
  'vbe',
  'jse',
  'wsf',
  'wsh',
  'msi',
  'msp',
  'hta',
  'cpl',
]);

const BLOCKED_MIME_EXACT = new Set([
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-dosexec',
  'application/x-executable',
  'application/x-msi',
  'application/x-bat',
  'application/x-cmd',
  'application/x-sh',
  'application/x-elf',
  'application/hta',
]);

export const isBlockedUpload = (filename: string, mime: string): boolean => {
  const dot = filename.lastIndexOf('.');
  const ext = dot >= 0 ? filename.slice(dot + 1).toLowerCase() : '';
  if (ext && BLOCKED_EXTENSIONS.has(ext)) return true;
  const normalized = mime.toLowerCase();
  if (BLOCKED_MIME_EXACT.has(normalized)) return true;
  if (normalized.startsWith('application/x-ms')) return true;
  return false;
};

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export const toCsv = (
  headers: string[],
  rows: Array<Array<string | number | null>>,
): string => {
  const cell = (value: string | number | null): string => {
    if (value === null) return '';
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [headers, ...rows].map(line => line.map(cell).join(','));
  return `\uFEFF${lines.join('\r\n')}`;
};

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
