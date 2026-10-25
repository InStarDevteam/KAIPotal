export type MilitaryBranch = '국방부 공통' | '육군' | '해군' | '공군';

export type TenantStatus = '정상' | '주의' | '과다사용' | '점검중' | '비활성';

export type TenantResourceType =
  | 'GPU'
  | 'CPU'
  | 'Memory'
  | 'Storage'
  | 'Network'
  | 'Container'
  | 'VM'
  | 'Notebook'
  | 'Training Job'
  | 'Inference API';

export type ResourceStatus = '정상' | '주의' | '부족' | '과다사용' | '점검중';

export type QuotaChangeType =
  | '신규 할당'
  | '증설'
  | '축소'
  | '회수'
  | '임시 증설'
  | '기간 연장';

export type QuotaProcessStatus =
  | '요청'
  | '검토중'
  | '승인'
  | '반려'
  | '적용완료'
  | '회수완료';

export type DelegationLevel =
  | '국방부 최상위 관리자'
  | '국방부 플랫폼 운영자'
  | '육군 테넌트 관리자'
  | '해군 테넌트 관리자'
  | '공군 테넌트 관리자'
  | '군별 리소스 관리자'
  | '군별 보안감사자';

export type ProjectStatus =
  | '신청'
  | '승인'
  | '운영중'
  | '만료예정'
  | '종료'
  | '정지';

export type SeparationTarget =
  | '사용자'
  | '프로젝트'
  | '워크스페이스'
  | '데이터'
  | '모델'
  | '리소스 풀'
  | '크레딧'
  | '감사로그';

export type SeparationMethod =
  | '테넌트 단위 분리'
  | '프로젝트 단위 분리'
  | '워크스페이스 단위 분리'
  | '네임스페이스 단위 분리'
  | '권한 정책 기반 분리'
  | '물리/논리 혼합 분리';

export type DataAccessLevel = '공개' | '내부' | '비밀';

export interface BranchTenantOverview {
  id: string;
  branch: MilitaryBranch;
  name: string;
  adminOrganization: string;
  representativeAdmin: string;
  delegatedAdminCount: number;
  projectCount: number;
  workspaceCount: number;
  userCount: number;
  externalUserCount: number;
  gpuTotal: number;
  gpuUsed: number;
  cpuTotal: number;
  cpuUsed: number;
  storageTotal: string;
  storageUsed: string;
  creditBalance: number;
  status: TenantStatus;
}

export interface DelegatedAdmin {
  id: string;
  level: DelegationLevel;
  organization: string;
  name: string;
  accountId: string;
  role: string;
  scope: string;
  manageableTenants: string[];
  approvableTasks: string[];
  validUntil: string;
  lastActivity: string;
  status: '활성' | '만료예정' | '비활성';
}

export interface BranchResourcePool {
  id: string;
  branch: MilitaryBranch;
  resourceType: TenantResourceType;
  total: string;
  allocated: string;
  used: string;
  reserved: string;
  available: string;
  usageRate: number;
  status: ResourceStatus;
  unit: string;
  owner: string;
  lastChangedAt: string;
}

export interface BranchQuota {
  id: string;
  branch: MilitaryBranch;
  target: string;
  resourceType: TenantResourceType;
  currentQuota: string;
  requestedQuota: string;
  changeType: QuotaChangeType;
  reason: string;
  requester: string;
  approver?: string;
  requestedAt: string;
  processStatus: QuotaProcessStatus;
}

export interface UsageSummary {
  overallUsageRate: number;
  armyUsageRate: number;
  navyUsageRate: number;
  airForceUsageRate: number;
  gpuUsageByBranch: Record<MilitaryBranch, number>;
  cpuUsageByBranch: Record<MilitaryBranch, number>;
  storageUsageByBranch: Record<MilitaryBranch, number>;
  creditUsageByBranch: Record<MilitaryBranch, number>;
  overusedTenants: string[];
  maintenanceResources: string[];
  last7DaysTrend: { date: string; value: number }[];
}

export interface BranchProjectUsage {
  id: string;
  branch: MilitaryBranch;
  projectName: string;
  workspaceName: string;
  pm: string;
  memberCount: number;
  projectStatus: ProjectStatus;
  gpuAllocated: number;
  gpuUsed: number;
  cpuAllocated: number;
  cpuUsed: number;
  storageUsed: string;
  networkUsed: string;
  usedCredit: number;
  remainingCredit: number;
  validUntil: string;
  lastActivityAt: string;
  overused: boolean;
}

export interface TenantBoundaryPolicy {
  id: string;
  name: string;
  branch: MilitaryBranch;
  target: SeparationTarget;
  method: SeparationMethod;
  allowedRoles: string[];
  dataAccessLevel: DataAccessLevel;
  externalUserAllowed: boolean;
  crossAccessAllowed: boolean;
  auditLogRequired: boolean;
  status: '활성' | '비활성';
}

export interface QuotaChangeHistory {
  id: string;
  occurredAt: string;
  branch: MilitaryBranch;
  changedBy: string;
  targetTenant: string;
  resourceType: TenantResourceType;
  changeType: QuotaChangeType;
  oldValue: string;
  newValue: string;
  reason: string;
  approver?: string;
  result: '적용' | '반려' | '취소';
  ip: string;
}

export interface TenantManagementSummary {
  totalTenants: number;
  armyProjects: number;
  navyProjects: number;
  airForceProjects: number;
  totalGpuQuota: number;
  totalGpuUsed: number;
  totalCreditBalance: number;
  pendingQuotaChanges: number;
  overuseWarnings: number;
  maintenanceResources: number;
}

export type TenantManagementTab =
  | '사용자·플랫폼 권한'
  | '군별 테넌트 개요'
  | '위임관리 체계'
  | '군별 리소스 풀'
  | '군별 쿼터 관리'
  | '사용량 대시보드'
  | '군별 프로젝트 사용량'
  | '테넌트 경계/분리 정책'
  | '쿼터 변경 이력'
  | '요구사항 대응 현황';
