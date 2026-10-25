export type ProjectStatus =
  | 'requested'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'running'
  | 'paused'
  | 'closed';

export type ProjectRole =
  | 'PM'
  | 'Developer'
  | 'Analyst'
  | 'DataManager'
  | 'SecurityReviewer'
  | 'ExternalUser';

export type WorkspaceStatus =
  | 'provisioning'
  | 'active'
  | 'suspended'
  | 'terminating'
  | 'terminated';

export type SecurityLevel = '공개' | '내부' | '비밀';

export interface ResourceQuota {
  cpuCores: number;
  gpuCount: number;
  memoryGiB: number;
  storageGiB: number;
  networkMbps: number;
  usesCredit: boolean;
}

export interface ProjectMember {
  userId: string;
  name: string;
  organization: string;
  role: ProjectRole;
}

export interface ApprovalHistory {
  action: 'requested' | 'approved' | 'rejected' | 'paused' | 'closed';
  actor: string;
  comment: string;
  timestamp: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  purpose: string;
  requestType?: 'AI 작업 환경(컨테이너) 생성 요청' | '데이터 작업 환경(컨테이너) 생성 요청' | '일반 프로젝트';
  ownerOrganization: string;
  pm: ProjectMember;
  members: ProjectMember[];
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  securityLevel: SecurityLevel;
  workspaceStatus: WorkspaceStatus;
  quota: ResourceQuota;
  datasets: string[];
  models: string[];
  availableDatasets?: string[];
  availableModels?: string[];
  selectedDataset?: string;
  selectedModel?: string;
  usingPurpose?: string;
  utilizationPurpose?: string;
  qualityVerificationPlan?: string;
  participatingOrganizations?: string[];
  frameworks?: string[];
  labelingTools?: string[];
  visualizationTools?: string[];
  trainingDataTools?: string[];
  serviceCatalogSelection?: string;
  customServiceInput?: string;
  activityLog: string[];
  approvalHistory: ApprovalHistory[];
  workspaceLifecycle?: WorkspaceLifecycle;
  pilotProjectIds?: string[];
}

export type WorkspaceLifecycleState =
  | 'requested'
  | 'approved'
  | 'provisioning'
  | 'active'
  | 'expiring'
  | 'terminated'
  | 'failed'
  | 'rolling_back';

export type WorkspaceRbacRole = '프로젝트 관리자' | '분석가' | '엔지니어';

export interface WorkspaceResourceUsage {
  cpuCores: number;
  gpuCount: number;
  memoryGiB: number;
  storageGiB: number;
}

export interface WorkspaceMemberRbac {
  userId: string;
  name: string;
  organization: string;
  role: WorkspaceRbacRole;
}

export interface WorkspaceRollbackInfo {
  status: 'in_progress' | 'completed';
  reason: string;
  creditRestored: boolean;
}

export interface WorkspaceLifecycle {
  state: WorkspaceLifecycleState;
  requestedAt: string;
  approvedAt?: string;
  activatedAt?: string;
  expiresAt: string;
  accessUrl?: string;
  members: WorkspaceMemberRbac[];
  usage: WorkspaceResourceUsage;
  limit: WorkspaceResourceUsage;
  realtimeUsage?: {
    cpuPercent: number;
    gpuPercent: number;
    measuredAt: string;
  };
  rollback?: WorkspaceRollbackInfo;
}

export type DataGenerationRequestType = 'synthetic' | 'simulator';

export type DataGenerationRequestStatus =
  | 'requested'
  | 'generating'
  | 'completed'
  | 'failed';

export interface DataGenerationRequest {
  id: string;
  pilotProjectId: string;
  type: DataGenerationRequestType;
  status: DataGenerationRequestStatus;
  requestedAt: string;
  targetCount: number;
}

export interface PilotProject {
  id: string;
  name: string;
  unit: string; // 소요부대
  dtOt: 'DT' | 'OT' | 'DT+OT';
  scenario: string;
  acceptanceCriteria: string;
  kpis: { name: string; target: string; measured?: string }[];
  requiredDataTypes: {
    type: string;
    targetCount: number;
    currentCount: number;
  }[];
  acquisitionMethods: ('interop' | 'file-import' | 'synthetic' | 'simulator')[];
  linkedSystems: string[];
  generationRequestIds: string[];
  dataLineage: {
    version: string;
    source: string;
    generatedAt: string;
    note?: string;
  }[];
  qualityCheck?: {
    status: 'pending' | 'passed' | 'failed';
    checkedAt?: string;
    note?: string;
  };
  dataSplit?: { train: number; validation: number; test: number };
  resultSummary?: string;
  artifacts?: string[];
  status:
    | 'preparing'
    | 'data_collection'
    | 'data_generation'
    | 'quality_check'
    | 'ready'
    | 'dt_running'
    | 'ot_running'
    | 'completed';
}
