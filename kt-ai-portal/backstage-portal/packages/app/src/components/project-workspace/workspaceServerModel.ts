import { validateWorkspaceRequest } from './workspaceDemoStore';

export const emptyWorkspaceDraft = {
  projectId: '',
  workspaceName: '',
  requestType: 'ai',
  cpuCores: '',
  gpuCount: '0',
  memoryGiB: '',
  storageGiB: '',
  startDate: '',
  endDate: '',
  securityLevel: '내부',
  purpose: '',
  datasets: '',
  models: '',
  frameworks: '',
  labelingTools: '',
  visualizationTools: '',
  trainingDataTools: '',
  persistenceLocation: '',
  deidentificationRequired: 'no',
  usesCredit: 'yes',
  performanceLinkage: 'no',
};
export type WorkspaceDraft = typeof emptyWorkspaceDraft;
export interface WorkspaceProjectOption {
  id: string;
  name: string;
  status: string;
}
export interface ServerWorkspaceRequest {
  id: string;
  type: string;
  title: string;
  status: string;
  version: number;
  project_id: string | null;
  created_at: string;
  payload: Partial<WorkspaceDraft> & { projectName?: string };
}
export const workspaceStatusLabel = (status: string) =>
  ((
    {
      requested: '승인 대기',
      reviewing: '검토 중',
      approved: '신청 승인',
      rejected: '반려',
    } as Record<string, string>
  )[status] ?? status);
export const validateServerWorkspace = (
  draft: WorkspaceDraft,
  projects: WorkspaceProjectOption[],
) => {
  if (
    !projects.some(
      project => project.id === draft.projectId && project.status === 'active',
    )
  )
    return '진행 중인 참여 프로젝트를 선택하세요.';
  if (draft.workspaceName.trim().length > 160)
    return '워크스페이스명은 160자 이내로 입력하세요.';
  return validateWorkspaceRequest(draft);
};
export const workspaceRequestPayload = (
  draft: WorkspaceDraft,
  project: WorkspaceProjectOption,
) => ({
  type: 'workspace',
  title: `${
    draft.requestType === 'ai' ? 'AI' : '데이터'
  } 작업환경 · ${draft.workspaceName.trim()}`,
  projectId: project.id,
  payload: {
    ...draft,
    workspaceName: draft.workspaceName.trim(),
    projectName: project.name,
  },
});
export const workspaceOnly = (rows: ServerWorkspaceRequest[]) =>
  rows.filter(row => row.type === 'workspace');
