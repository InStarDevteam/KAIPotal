/**
 * 서버 모드(/v1/work/overview) 응답을 화면 모델로 매핑하는 순수 함수들.
 *
 * 계약(docs/portal-experience-v2/WORK_API_CONTRACT.md) 기준:
 * - 크레딧·자원 사용량은 수치를 만들지 않고 pending_integration 상태로만 받는다.
 * - 승인함(approvalQueue)은 유형별 건수 집계만 제공하므로 목록 행은 건수 요약으로 구성한다.
 * - 감사 최근 기록(recentAudit)은 audit.view 권한이 없으면 null + 사유 코드로 난다.
 */

export interface WorkProjectRow {
  id: string;
  name: string;
  status: string;
  memberRole: string;
}
export type WorkApprovalQueueEntry = { type: string; count: number };
export type WorkOverviewSection =
  | 'myProjects'
  | 'myRequests'
  | 'approvalQueue'
  | 'recentAudit';
export const WORK_SECTION_LABELS: Record<WorkOverviewSection, string> = {
  myProjects: '내 프로젝트',
  myRequests: '내 신청',
  approvalQueue: '검토 대기',
  recentAudit: '감사 기록',
};
export interface WorkOverviewData {
  myProjectTotal?: number | null;
  myRequestTotal?: number | null;
  sections?: Partial<
    Record<WorkOverviewSection, 'ready' | 'unavailable' | 'permission_missing'>
  >;
  myProjects: WorkProjectRow[];
  myRequests: Array<Record<string, unknown>>;
  approvalQueue: WorkApprovalQueueEntry[];
  recentAudit: Array<Record<string, unknown>> | null;
  auditExcludedReason: 'permission_missing' | null;
  credits: { state: string };
  resourceUsage: { state: string };
}
export interface WorkOverviewMeta {
  asOf?: string;
  staleAfterSec?: number;
  [key: string]: unknown;
}

/** 신청 유형 → 화면 라벨. 데모 모드의 큐 유형 라벨과 동일하게 유지한다. */
export const WORK_QUEUE_TYPE_LABELS: Record<string, string> = {
  workspace: '작업환경',
  export: '반입·반출',
  credit: '크레딧',
};
export const WORK_QUEUE_ROUTES: Record<string, string> = {
  workspace: '/project-workspace?tab=request',
  export: '/export-approval',
  credit: '/credit-manager',
};

/** 서버 프로젝트 상태(fc_projects.status) 라벨. 원본 값을 그대로 보여주지 않기 위한 최소 매핑. */
export const SERVER_PROJECT_LABELS: Record<string, string> = {
  active: '진행 중',
};

export interface WorkQueueItem {
  id: string;
  name: string;
  detail: string;
  type: string;
  status: string;
  route: string;
}

/**
 * 승인함 유형별 건수 집계를 확인할 업무 큐 행으로 변환한다.
 * 서버는 개별 신청 목록이 아닌 유형별 건수만 낼 수 있으므로, 행은 "유형 요약 + 해당 업무 화면 링크"로 구성한다.
 * 알 수 없는 유형이나 0건은 제외한다. 개별 승인 결정 UI는 여기 두지 않는다.
 */
export function mapApprovalQueueToQueue(
  entries: WorkApprovalQueueEntry[] | undefined,
): WorkQueueItem[] {
  if (!entries) return [];
  return entries
    .filter(entry => WORK_QUEUE_TYPE_LABELS[entry.type] && entry.count > 0)
    .map(entry => ({
      id: `queue-${entry.type}`,
      name: `${WORK_QUEUE_TYPE_LABELS[entry.type]} 검토 대기`,
      detail: `${entry.count}건이 검토를 기다리고 있습니다`,
      type: WORK_QUEUE_TYPE_LABELS[entry.type],
      status: `${entry.count}건`,
      route: WORK_QUEUE_ROUTES[entry.type],
    }));
}

export interface ObservationInfo {
  stale: boolean;
  observedAt: string;
}

/**
 * meta.asOf 대비 staleAfterSec(기본 120) 경과 여부를 판정한다.
 * asOf가 없거나 유효하지 않으면 null — 지연 표시를 만들어내지 않는다.
 */
export function describeObservation(
  meta: WorkOverviewMeta | null | undefined,
  nowMs = Date.now(),
): ObservationInfo | null {
  const asOf = meta && typeof meta.asOf === 'string' ? meta.asOf : null;
  if (!asOf) return null;
  const observed = new Date(asOf);
  if (Number.isNaN(observed.getTime())) return null;
  const staleAfterSec =
    meta && typeof meta.staleAfterSec === 'number' ? meta.staleAfterSec : 120;
  return {
    stale: nowMs - observed.getTime() > staleAfterSec * 1000,
    observedAt: observed.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  };
}

/** 감사 제외 사유 코드를 안내 문구로 변환한다. 사유가 없으면 null. */
export function auditExclusionMessage(
  reason: string | null | undefined,
): string | null {
  if (!reason) return null;
  if (reason === 'permission_missing') return '감사 조회 권한이 필요합니다';
  return '감사 기록을 조회할 수 없습니다';
}

export type WorkFetchFailure = {
  kind: 'permission' | 'network';
  message: string;
  code?: string;
};

/**
 * runtime.request가 던진 오류를 분류한다.
 * PortalRuntimeContext가 Error에 status/code를 첨부하므로, 403·permission_denied는 권한 안내로,
 * 그 외(네트워크 실패, 5xx 등)는 재시도 가능한 장애로 구분한다.
 */
export function classifyWorkFetchError(error: unknown): WorkFetchFailure {
  const status = (error as { status?: number } | null)?.status;
  const code = (error as { code?: string } | null)?.code;
  const message =
    error instanceof Error && error.message
      ? error.message
      : '업무 현황을 불러오지 못했습니다.';
  if (status === 403 || code === 'permission_denied') {
    return { kind: 'permission', message, code };
  }
  return { kind: 'network', message, code };
}

/** 성공한 빈 목록(0)과 조회에 실패한 항목(—)을 구분한다. 이전 API 응답과 호환한다. */
export function workSectionReady(
  data: WorkOverviewData | null,
  section: WorkOverviewSection,
): boolean {
  return (
    !!data && (!data.sections?.[section] || data.sections[section] === 'ready')
  );
}
export function unavailableWorkSections(
  data: WorkOverviewData | null,
): string[] {
  return (Object.keys(WORK_SECTION_LABELS) as WorkOverviewSection[])
    .filter(key => data?.sections?.[key] === 'unavailable')
    .map(key => WORK_SECTION_LABELS[key]);
}
export function approvalCount(
  entries: WorkApprovalQueueEntry[] | undefined,
  type?: string,
): number {
  return (entries ?? [])
    .filter(entry => !type || entry.type === type)
    .reduce((sum, entry) => sum + Math.max(0, entry.count), 0);
}
const REQUEST_STATUS_LABELS: Record<string, string> = {
  requested: '신청 접수',
  reviewing: '검토 중',
  approved: '승인',
  rejected: '반려',
  cancelled: '취소',
  need_revision: '보완 요청',
  export_completed: '반출 완료',
  import_completed: '반입 완료',
};
export function mapMyRequestsToQueue(
  requests: Array<Record<string, unknown>> | undefined,
): WorkQueueItem[] {
  return (requests ?? [])
    .filter(row => WORK_QUEUE_ROUTES[String(row.type)])
    .map(row => ({
      id: String(row.id),
      name: String(row.title),
      detail: `${WORK_QUEUE_TYPE_LABELS[String(row.type)]} 신청`,
      type: WORK_QUEUE_TYPE_LABELS[String(row.type)],
      status: REQUEST_STATUS_LABELS[String(row.status)] ?? '상태 확인 필요',
      route: WORK_QUEUE_ROUTES[String(row.type)],
    }));
}
