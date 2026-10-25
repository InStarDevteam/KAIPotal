export type UserType = '내부 사용자' | '외부 사용자' | '수행사 사용자';
export type AccountStatus = '활성' | '잠금' | '만료예정' | '휴식';
export type SessionStatus = '활성' | '만료예정' | '종료' | '강제종료';
export type ResourceType =
  | 'CPU'
  | 'GPU'
  | 'Memory'
  | 'Storage'
  | 'Network'
  | 'Notebook'
  | 'Training Job'
  | 'Inference API';
export type CreditType =
  | '기본부여'
  | '사용'
  | '충전'
  | '조정'
  | '회수'
  | '만료';
export type ActivityType =
  | '로그인'
  | '로그아웃'
  | '프로필 수정'
  | '비밀번호 변경'
  | '세션 종료'
  | '프로젝트 조회'
  | '워크스페이스 접속'
  | '검색 조회'
  | '반출 신청'
  | '크레딧 조회'
  | '제안 등록'
  | 'API Key 생성'
  | '알림 설정 변경';
export type DataAccessLevel = '공개' | '내부' | '비밀';

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  contact: string;
  organization: string;
  department: string;
  position: string;
  userType: UserType;
  roles: string[];
  groups: string[];
  accountStatus: AccountStatus;
  lastLoginAt: string;
  createdAt: string;
  isProfilePublic: boolean;
  accessPeriod: string;
}

export interface EmailVerification {
  currentEmail: string;
  status: '확인됨' | '대기중' | '변경요청중';
  lastVerifiedAt: string;
  requestedEmail?: string;
  sentAt?: string;
  pendingStatus?: string;
}

export interface PasswordPolicyInfo {
  minLength: number;
  complexity: string;
  reuseLimit: number;
  changeCycleDays: number;
  expiredAt: string;
  lastChangedAt: string;
}

export interface ActiveSession {
  id: string;
  loginAt: string;
  lastActiveAt: string;
  ip: string;
  browser: string;
  os: string;
  location: string;
  authMethod: string;
  isCurrent: boolean;
  status: SessionStatus;
}

export interface MyProjectWorkspace {
  projectId: string;
  projectName: string;
  workspaceId: string;
  workspaceName: string;
  myRole: string;
  participationStatus: string;
  validUntil: string;
  cpu: string;
  gpu: string;
  memory: string;
  storage: string;
  usedCredit: number;
  remainingCredit: number;
  recentActivity: string;
  services: string[];
}

export interface ResourceUsage {
  id: string;
  usedAt: string;
  projectName: string;
  workspaceName: string;
  resourceType: ResourceType;
  amount: string;
  unit: string;
  duration: string;
  creditEquivalent: number;
  status: string;
}

export interface CreditHistory {
  id: string;
  occurredAt: string;
  projectName: string;
  type: CreditType;
  credit: number;
  balance: number;
  reason: string;
  relatedResource: string;
  approver?: string;
  status: string;
}

export type NotificationChannel = '포털 알림' | '이메일' | 'SMS' | '메신저';

export interface NotificationSetting {
  id: string;
  type: string;
  enabled: boolean;
  channels: NotificationChannel[];
  threshold?: number;
  timeWindow?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  description: string;
  maskedKey: string;
  services: string[];
  scopes: string[];
  createdAt: string;
  expiresAt: string;
  lastUsedAt?: string;
  status: '활성' | '만료' | '폐기';
}

export interface ActivityLog {
  id: string;
  occurredAt: string;
  type: ActivityType;
  service: string;
  menu: string;
  target: string;
  result: '성공' | '실패';
  ip: string;
  detail: string;
}

export type MyPageTab =
  | '프로필'
  | '이메일 확인'
  | '비밀번호 변경'
  | '활성 세션'
  | '내 프로젝트/워크스페이스'
  | '보안 과제'
  | '자원 사용 이력'
  | '크레딧 사용 내역'
  | '알림 설정'
  | '화면 설정'
  | '개인 API Key'
  | '내 활동 로그'
  | '요구사항 대응 현황';

export interface DemoProject {
  id: string;
  name: string;
  requestingUnit: string;
  myRole: string;
  status: '실증중' | '실증완료' | '준비중';
  period: string;
  description: string;
}

export interface KrmfEvidenceAssignment {
  id: string;
  controlId: string;
  controlName: string;
  evidenceName: string;
  dueDate: string;
  status: '제출예정' | '기한임박' | '반려';
  rejectReason?: string;
}

export interface MyNotification {
  id: string;
  category: '승인대기' | '기한임박' | '반려';
  title: string;
  occurredAt: string;
}

export interface WorkspaceAccessStatus {
  workspaceId: string;
  workspaceName: string;
  status: '접속가능' | '만료임박' | '만료';
  accessUrl: string;
  expiresAt: string;
  expiringSoon: boolean;
}
