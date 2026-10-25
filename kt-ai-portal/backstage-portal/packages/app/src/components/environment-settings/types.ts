export type SettingCategory =
  | '시스템 파라미터'
  | '보안 정책'
  | '자원할당 기준'
  | '운영 설정';

export type SettingStatus = '활성' | '비활성' | '변경대기';

export type SecurityPolicyType =
  | '로그인'
  | '세션'
  | '비밀번호'
  | '계정 잠금'
  | '데이터 접근'
  | '반출'
  | 'API Key'
  | '감사로그';

export interface SystemParameter {
  id: string;
  category: string;
  name: string;
  value: string;
  defaultValue: string;
  description: string;
  scope: string;
  editable: boolean;
  requiresApproval: boolean;
  enabled: boolean;
  lastChangedAt: string;
}

export interface SecuritySetting {
  id: string;
  name: string;
  type: SecurityPolicyType;
  value: string;
  target: string;
  requiresMfa: boolean;
  auditLogged: boolean;
  requiresApproval: boolean;
  enabled: boolean;
  lastChangedAt: string;
}

export interface ResourceAllocationPolicy {
  id: string;
  name: string;
  target: string;
  cpu: string;
  gpu: string;
  memory: string;
  storage: string;
  network: string;
  defaultCredit: number;
  requiresApproval: boolean;
  enabled: boolean;
  lastChangedAt: string;
}

export interface PortalOperationSetting {
  id: string;
  name: string;
  description: string;
  value: string;
  screen: string;
  owner: string;
  editable: boolean;
  requiresApproval: boolean;
  enabled: boolean;
  lastChangedAt: string;
}

export interface SettingChangeHistory {
  id: string;
  occurredAt: string;
  changedBy: string;
  category: SettingCategory;
  settingName: string;
  oldValue: string;
  newValue: string;
  reason: string;
  approver?: string;
  applyStatus: '적용' | '대기' | '반려';
  ip: string;
}

export interface EnvironmentSettingsSummary {
  totalParameters: number;
  activeParameters: number;
  pendingChanges: number;
  securityPolicies: number;
  resourcePolicies: number;
  operationSettings: number;
  recentChanges: number;
}

export type EnvironmentSettingsTab =
  | '시스템 파라미터'
  | '보안 정책'
  | '자원할당 기준'
  | '운영 설정'
  | '변경 이력'
  | '요구사항 대응 현황';
