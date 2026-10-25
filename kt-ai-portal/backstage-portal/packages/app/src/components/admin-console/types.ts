export type AdminUserType = '내부' | '외부' | '수행사';

export type RegistrationStatus =
  | '신청'
  | '본인확인완료'
  | '검토중'
  | '승인'
  | '반려'
  | '보완요청';

export type IdentityVerificationStatus =
  | '미확인'
  | '확인중'
  | '확인완료'
  | '확인실패'
  | '재확인필요';

export type AccountStatus = '활성' | '잠금' | '비활성' | '만료예정';

export type AuditEventType =
  | '로그인'
  | '로그아웃'
  | '로그인 실패'
  | '계정 차단'
  | '계정 잠금 해제'
  | '비밀번호 변경'
  | '사용자 정보 수정'
  | '권한 변경'
  | '그룹 변경'
  | '메뉴 권한 변경'
  | '로그인 정책 변경'
  | '비밀번호 정책 변경'
  | '프로젝트 승인'
  | '반출 승인'
  | '크레딧 승인'
  | 'K-RMF 증빙 승인'
  | '검색 조회'
  | '파일 다운로드'
  | '관리자 정책 변경';

export type AuditResult = '성공' | '실패' | '차단';

export type RiskLevel = '낮음' | '보통' | '높음' | '심각';

export type StatusHistoryEvent =
  | '사용자 등록 신청'
  | '본인확인 완료'
  | '검토 시작'
  | '승인'
  | '반려'
  | '보완요청'
  | '계정 생성'
  | '계정 잠금'
  | '계정 해제'
  | '역할 변경'
  | '접속 기간 변경'
  | '접근 서비스 변경';

export type DataAccessLevel = '공개' | '내부' | '비밀';

export type AccessibleService =
  | 'Portal Dashboard'
  | 'Integrated Search'
  | 'Project Workspace'
  | 'Export Approval'
  | 'Credit Manager'
  | 'K-RMF Evidence'
  | 'Admin Console'
  | 'OpenMetadata'
  | 'OpenSearch Dashboards';

export type PermissionLevel =
  | '접근불가'
  | '조회'
  | '신청'
  | '수정'
  | '승인'
  | '관리';

export type MenuItemType = '메뉴' | '기능' | '외부링크';

export type ProgramType =
  | '내부 화면'
  | '외부 링크'
  | '관리 도구'
  | '카탈로그'
  | '신청 화면';

export type ApprovalType =
  | '사용자 등록 승인'
  | '프로젝트 생성 승인'
  | '워크스페이스 생성 승인'
  | '추가 리소스 승인'
  | '반입 승인'
  | '반출 승인'
  | '크레딧 충전 승인'
  | 'K-RMF 증빙 승인'
  | '정책 변경 승인';

export type OrganizationChangeType =
  | '인사이동'
  | '퇴직'
  | '파견종료'
  | '수행사 계약종료';

export type OrganizationTransferStatus =
  | '감지'
  | '검토중'
  | '회수예정'
  | '인계완료'
  | '처리완료'
  | '보류';

export interface AdminSummary {
  pendingRegistrations: number;
  pendingApprovals: number;
  externalUsers: number;
  activeUsers: number;
  lockedAccounts: number;
  permissionGroups: number;
  loginPolicies: number;
  recentSecurityEvents: number;
}

export interface UserRegistration {
  id: string;
  name: string;
  organization: string;
  email: string;
  phone?: string;
  userType: AdminUserType;
  reason: string;
  identityVerified: boolean;
  identityStatus: IdentityVerificationStatus;
  status: RegistrationStatus;
  appliedAt: string;
  // 상세 확장 필드
  department?: string;
  position?: string;
  identityMethod?: string;
  identityVerifiedAt?: string;
  identityResult?: string;
  verifier?: string;
  businessPurpose?: string;
  requestedRole?: string;
  requestedServices?: string[];
  accessStartDate?: string;
  accessEndDate?: string;
  securityOathSubmitted?: boolean;
  privacyAgreed?: boolean;
  externalSecurityConfirmed?: boolean;
  reviewComment?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  accountId: string;
  email: string;
  organization: string;
  department?: string;
  role: string;
  userGroup?: string;
  userType: AdminUserType;
  accountStatus: AccountStatus;
  lastLoginAt: string;
  accessibleServices: AccessibleService[];
  accessibleMenus?: string[];
  dataAccessLevel?: DataAccessLevel;
  projectAccess?: string;
  canApproveExport?: boolean;
  canManageCredit?: boolean;
  canAuditKrmf?: boolean;
  locked: boolean;
}

export interface ExternalUser {
  id: string;
  name: string;
  email: string;
  organization: string;
  company: string;
  accountStatus: AccountStatus;
  accessStart: string;
  accessEnd: string;
  role: string;
  accessibleServices: AccessibleService[];
  lastLoginAt?: string;
  expiryWarning?: boolean;
}

export interface UserStatusHistory {
  id: string;
  timestamp: string;
  actor: string;
  userId: string;
  event: StatusHistoryEvent;
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
  ip?: string;
}

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  target: string;
  accessibleMenus: string[];
  accessibleServices?: AccessibleService[];
  dataAccessLevel: string;
  projectPermission: string;
  approvalAuthority: string[];
  userCount: number;
  groupCount?: number;
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminGroup {
  id: string;
  name: string;
  description: string;
  organization: string;
  appliedRoles: string[];
  userCount: number;
  accessibleServices: AccessibleService[];
  dataAccessLevel: DataAccessLevel;
  enabled: boolean;
}

export interface ServicePermission {
  service: AccessibleService;
  allowedRoles: string[];
  allowedGroups: string[];
  authRequired: boolean;
  mfaRequired: boolean;
  externalAllowed: boolean;
  auditLogged: boolean;
}

export interface DataAccessPermission {
  level: DataAccessLevel;
  allowedRoles: string[];
  allowedGroups: string[];
  exportAllowed: boolean;
  additionalAuthRequired: boolean;
  auditRequired: boolean;
  retentionPolicy: string;
}

export interface ApprovalPermission {
  type: ApprovalType;
  primaryApproverRoles: string[];
  secondaryApproverRoles: string[];
  finalApproverRoles: string[];
  delegationAllowed: boolean;
  externalApproverAllowed: boolean;
  auditLogged: boolean;
}

export interface ProjectRoleMapping {
  id: string;
  projectName: string;
  userName: string;
  accountId: string;
  projectRole: string;
  workspaceAccess: string;
  dataAccessLevel: DataAccessLevel;
  canApprove: boolean;
  canManageResources: boolean;
  validFrom: string;
  validUntil: string;
}

export interface OrganizationTransfer {
  id: string;
  userName: string;
  accountId: string;
  changeType: OrganizationChangeType;
  prevOrganization: string;
  newOrganization: string;
  prevRoles: string[];
  revokedPermissions: string[];
  transferTargetUser?: string;
  status: OrganizationTransferStatus;
  scheduledAt: string;
}

export interface PermissionChangeHistory {
  id: string;
  timestamp: string;
  actor: string;
  targetType: '사용자' | '그룹' | '역할';
  targetName: string;
  changeType: string;
  previousPermission: string;
  newPermission: string;
  reason: string;
  approver?: string;
  result: '성공' | '실패' | '보류';
  ip: string;
}

export interface Program {
  id: string;
  name: string;
  description: string;
  type: ProgramType;
  path: string;
  owner: string;
  enabled: boolean;
  accessRoles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LoginPolicy {
  id: string;
  name: string;
  target: string;
  appliedRoles: string[];
  appliedGroups: string[];
  allowedStartDate: string;
  allowedEndDate: string;
  allowedPeriod: string;
  maxFailedAttempts: number;
  dailyMaxFailedAttempts: number;
  blockDurationMinutes: number;
  blockMethod: string;
  notifyAdmin: boolean;
  requireUserVerification: boolean;
  unlockMethod: string;
  allowDuplicateLogin: boolean;
  maxConcurrentSessions: number;
  allowSameIpDuplicate: boolean;
  allowDifferentIpDuplicate: boolean;
  existingSessionAction: string;
  adminException: boolean;
  externalUserException: boolean;
  auditLogged: boolean;
  mfaRequired: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PasswordPolicy {
  id: string;
  name: string;
  target: string;
  appliedRoles: string[];
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
  forbidUserId: boolean;
  reuseLimit: number;
  changeCycleDays: number;
  expiredLockAction: string;
  gracePeriodDays: number;
  tempPasswordExpiryMinutes: number;
  requireChangeOnFirstLogin: boolean;
  complexityDescription: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PasswordExpirationStatus {
  id: string;
  userName: string;
  accountId: string;
  policyName: string;
  lastChangedAt: string;
  expiresAt: string;
  daysRemaining: number;
  gracePeriodDays: number;
  lockScheduled: boolean;
  accountStatus: AccountStatus;
  actionRequired: boolean;
}

export interface LoginHistory {
  id: string;
  timestamp: string;
  user: string;
  accountId: string;
  organization: string;
  authMethod: string;
  ip: string;
  browser: string;
  result: AuditResult;
  failureReason?: string;
  sessionId: string;
}

export interface LogoutHistory {
  id: string;
  timestamp: string;
  user: string;
  accountId: string;
  logoutMethod: string;
  sessionId: string;
  durationMinutes: number;
  ip: string;
}

export type PasswordChangeType =
  | '사용자 직접 변경'
  | '관리자 초기화'
  | '임시 비밀번호 발급'
  | '만료 후 변경'
  | '정책 변경에 따른 강제 변경';

export interface PasswordChangeHistory {
  id: string;
  timestamp: string;
  user: string;
  accountId: string;
  changeType: PasswordChangeType;
  method: string;
  success: boolean;
  failureReason?: string;
  adminInvolved: boolean;
  ip: string;
  note?: string;
}

export interface UserAccessLog {
  id: string;
  timestamp: string;
  user: string;
  accountId: string;
  service: string;
  menu: string;
  feature: string;
  target: string;
  result: AuditResult;
  dataAccessLevel?: DataAccessLevel;
  ip: string;
  auditRequired: boolean;
}

export interface UserInfoChangeLog {
  id: string;
  timestamp: string;
  actor: string;
  targetUser: string;
  targetAccountId: string;
  changedItem: string;
  previousValue: string;
  newValue: string;
  reason: string;
  approver?: string;
  ip: string;
  result: AuditResult;
}

export interface SecurityAuditItem {
  id: string;
  item: string;
  relatedLogCount: number;
  riskLevel: RiskLevel;
  actionStatus: string;
  owner: string;
  firstOccurredAt: string;
  lastOccurredAt: string;
  actionDeadline: string;
}

export interface AdminActionHistory {
  id: string;
  timestamp: string;
  admin: string;
  actionType: string;
  target: string;
  targetAccountId: string;
  actionDetail: string;
  reason: string;
  approvalRequired: boolean;
  approver?: string;
  result: AuditResult;
  ip: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  eventType: AuditEventType;
  target: string;
  ip: string;
  result: AuditResult;
  riskLevel: RiskLevel;
  detail: string;
}

export interface MenuItem {
  id: string;
  name: string;
  parent: string;
  path: string;
  connectedFeature: string;
  displayOrder: number;
  enabled: boolean;
  accessRoles: string[];
  menuType: MenuItemType;
  icon?: string;
  description?: string;
  hidden?: boolean;
  readWrite?: '읽기' | '쓰기' | '관리';
  external?: boolean;
}

export interface RequirementCoverage {
  area: string;
  screenImplemented: string;
  logicImplemented: string;
  coverage: string;
  followUp: string;
}

export interface AdminConsoleData {
  summary: AdminSummary;
  registrations: UserRegistration[];
  users: AdminUser[];
  externalUsers: ExternalUser[];
  statusHistories: UserStatusHistory[];
  roles: AdminRole[];
  groups: AdminGroup[];
  servicePermissions: ServicePermission[];
  dataAccessPermissions: DataAccessPermission[];
  approvalPermissions: ApprovalPermission[];
  projectRoleMappings: ProjectRoleMapping[];
  organizationTransfers: OrganizationTransfer[];
  permissionChangeHistories: PermissionChangeHistory[];
  programs: Program[];
  loginPolicies: LoginPolicy[];
  passwordPolicies: PasswordPolicy[];
  passwordExpirationStatuses: PasswordExpirationStatus[];
  auditLogs: AuditLog[];
  loginHistories: LoginHistory[];
  logoutHistories: LogoutHistory[];
  passwordChangeHistories: PasswordChangeHistory[];
  userAccessLogs: UserAccessLog[];
  userInfoChangeLogs: UserInfoChangeLog[];
  securityAuditItems: SecurityAuditItem[];
  adminActionHistories: AdminActionHistory[];
  menuItems: MenuItem[];
  requirementCoverage: RequirementCoverage[];
}
