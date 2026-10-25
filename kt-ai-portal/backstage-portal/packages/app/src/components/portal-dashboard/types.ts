export type NoticeSeverity = 'info' | 'warning' | 'error';

export type NoticeType =
  | '공지'
  | '시스템'
  | '보안'
  | '정책'
  | '이벤트';

export type AssetType = 'dataset' | 'ai_model';

export type ProjectStatus =
  | 'requested'
  | 'pending_approval'
  | 'approved'
  | 'running'
  | 'paused'
  | 'closed';

export type ExportTargetType =
  | 'server'
  | 'ai_model'
  | 'algorithm'
  | 'dataset'
  | 'document'
  | 'docker_image'
  | 'pypi_package';

export type ExportStatus =
  | 'requested'
  | 'reviewing'
  | 'need_revision'
  | 'approved'
  | 'rejected';

export type SystemStatus =
  | '정상'
  | '점검'
  | '장애'
  | '지연'
  | '오프라인';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface CurrentUser {
  displayName: string;
  email: string;
  role: string;
  currentDate: string;
  status: string;
}

export interface SummaryMetrics {
  datasets: number;
  aiModels: number;
  activeProjects: number;
  exportPending: number;
  creditShortageProjects: number;
  krmfProgress: number;
  openSearchAssets: number;
  openMetadataStatus: SystemStatus;
  toolCount?: number;
  newProposalCount?: number;
  pendingReviewCount?: number;
  tenantCount?: number;
  branchProjectCount?: number;
  pendingQuotaChanges?: number;
  overuseWarnings?: number;
}

export interface Notice {
  id: string;
  title: string;
  type: NoticeType;
  date: string;
  severity: NoticeSeverity;
}

export interface RecentAsset {
  id: string;
  type: AssetType;
  name: string;
  description: string;
  tags: string[];
  owner: string;
  registeredAt: string;
}

export interface MyProject {
  id: string;
  name: string;
  status: ProjectStatus;
  pm: string;
  endDate: string;
  resourceUsage: number;
}

export interface ExportPendingItem {
  id: string;
  targetName: string;
  targetType: ExportTargetType;
  requester: string;
  status: ExportStatus;
  requestedAt: string;
}

export interface CreditWarning {
  id: string;
  projectName: string;
  message: string;
  severity: Severity;
}

export interface CreditSummary {
  totalRemaining: number;
  monthlyEstimate: number;
  shortageProjects: number;
  gpuLimitedProjects: number;
  warnings: CreditWarning[];
}

export interface KrmfHighRiskIssue {
  id: string;
  title: string;
  severity: Severity;
}

export interface KrmfProgress {
  totalControls: number;
  submitted: number;
  approved: number;
  weakPoints: number;
  progressRate: number;
  highRiskIssues: KrmfHighRiskIssue[];
}

export interface SystemStatusItem {
  name: string;
  status: SystemStatus;
}

export type QuickLinkType = 'internal' | 'external';

export interface QuickLink {
  id: string;
  title: string;
  description: string;
  type: QuickLinkType;
  target: string;
  adminOnly?: boolean;
}

export interface DashboardData {
  currentUser: CurrentUser;
  summaryMetrics: SummaryMetrics;
  notices: Notice[];
  recentAssets: RecentAsset[];
  myProjects: MyProject[];
  exportPending: ExportPendingItem[];
  creditSummary: CreditSummary;
  krmfProgress: KrmfProgress;
  systemStatus: SystemStatusItem[];
  quickLinks: QuickLink[];
}
