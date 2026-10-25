import { SecurityLevel } from './types';

export type WorkEnvRequestType =
  | 'AI 작업 환경(컨테이너) 생성 요청'
  | '데이터 작업 환경(컨테이너) 생성 요청';
export type SubmissionStatus = '신청' | '승인' | '반려';
export interface WorkEnvSubmission {
  id: string;
  requestType: WorkEnvRequestType;
  projectName: string;
  workspaceName: string;
  securityLevel: SecurityLevel;
  status: SubmissionStatus;
  submittedAt: string;
  request: Record<string, string | string[]>;
  reviewedAt?: string;
}

export const workspaceStorageKey = (tenantId: string, actorId: string) =>
  `kai.demo.workspace-requests.v1:${encodeURIComponent(
    tenantId,
  )}:${encodeURIComponent(actorId)}`;

export const readWorkspaceRequests = (
  key: string,
): { items: WorkEnvSubmission[]; error?: string } => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { items: [] };
    const data = JSON.parse(raw);
    if (
      data.version !== 1 ||
      !Array.isArray(data.items) ||
      data.items.length > 200 ||
      !data.items.every(
        (item: WorkEnvSubmission) =>
          item &&
          [
            'id',
            'requestType',
            'projectName',
            'workspaceName',
            'securityLevel',
            'submittedAt',
          ].every(
            field =>
              typeof (item as unknown as Record<string, unknown>)[field] ===
              'string',
          ) &&
          ['신청', '승인', '반려'].includes(item.status) &&
          item.request &&
          typeof item.request === 'object' &&
          !Array.isArray(item.request) &&
          Object.values(item.request).every(
            value =>
              typeof value === 'string' ||
              (Array.isArray(value) &&
                value.every(entry => typeof entry === 'string')),
          ),
      )
    )
      throw new Error('invalid');
    return { items: data.items };
  } catch {
    return {
      items: [],
      error:
        '저장된 신청 내역을 읽지 못했습니다. 기존 브라우저 저장 상태를 확인해 주세요.',
    };
  }
};

export const saveWorkspaceRequests = (
  key: string,
  items: WorkEnvSubmission[],
) => {
  if (items.length > 200)
    throw new Error('이 브라우저의 체험 신청 보관 한도는 200건입니다.');
  try {
    localStorage.setItem(key, JSON.stringify({ version: 1, items }));
  } catch {
    throw new Error(
      '신청을 브라우저에 저장하지 못했습니다. 저장 공간을 확인하세요. 입력 내용은 유지됩니다.',
    );
  }
};

export const validateWorkspaceRequest = (
  form: Record<string, string | string[]>,
): string | null => {
  if (form.projectId === 'new' && !String(form.newProjectName).trim())
    return '신규 프로젝트 이름을 입력하세요.';
  if (!String(form.workspaceName).trim())
    return '워크스페이스 이름을 입력하세요.';
  for (const [field, label] of [
    ['cpuCores', 'CPU'],
    ['memoryGiB', 'Memory'],
    ['storageGiB', 'Storage'],
  ]) {
    const value = Number(form[field]);
    if (!Number.isInteger(value) || value <= 0 || value > 100000)
      return `${label} 자원을 1 이상 100,000 이하의 정수로 입력하세요.`;
  }
  const gpu = Number(form.gpuCount || '0');
  if (!Number.isInteger(gpu) || gpu < 0 || gpu > 1024)
    return 'GPU 수량을 0 이상 1,024 이하의 정수로 입력하세요.';
  if (
    !form.startDate ||
    !form.endDate ||
    !Number.isFinite(Date.parse(String(form.startDate))) ||
    !Number.isFinite(Date.parse(String(form.endDate)))
  )
    return '사용 시작일과 종료일을 입력하세요.';
  if (String(form.endDate) < String(form.startDate))
    return '종료일은 시작일 이후로 선택하세요.';
  return null;
};
