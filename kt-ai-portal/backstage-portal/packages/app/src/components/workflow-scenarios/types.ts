export type ScenarioUserRole =
  | '데이터 엔지니어'
  | '데이터 사이언티스트'
  | 'AI 개발자'
  | '프로젝트 관리자'
  | '군별 관리자'
  | '보안 관리자'
  | '사업관리자';

export type ScenarioPlatform =
  | '포털'
  | '데이터 플랫폼'
  | 'AI 플랫폼'
  | '지능형 클라우드/CMP'
  | '인증/권한'
  | '보안/K-RMF'
  | '지능형 서비스'
  | '군수체계/외부 시스템';

export type ScenarioStepStatus =
  | '화면구현'
  | '부분구현'
  | '기반 자료'
  | '모의 연동'
  | 'API 연계필요'
  | '설계필요'
  | '후속개발'
  | '후속연동'
  | '운영설계필요'
  | '연계설계'
  | '후속API연동'
  | '타플랫폼제공전제';

export interface WorkflowScenarioStep {
  order: number;
  actor: ScenarioUserRole | ScenarioPlatform;
  action: string;
  sourceMenu?: string;
  sourceRoute?: string;
  targetPlatform: ScenarioPlatform;
  exchangedData: string[];
  relatedApiIds: string[];
  relatedSfrIds: string[];
  status: ScenarioStepStatus;
  description: string;
}

export interface WorkflowScenario {
  id: string;
  title: string;
  purpose: string;
  primaryUser: ScenarioUserRole;
  relatedMenus: string[];
  relatedSfrIds: string[];
  relatedApiIds: string[];
  platforms: ScenarioPlatform[];
  steps: WorkflowScenarioStep[];
  rfpMappingReason: string;
  proposalMessage: string;
  followUpItems: string[];
}

export interface UserJourney {
  role: ScenarioUserRole;
  goal: string;
  menus: string[];
  platforms: ScenarioPlatform[];
  outputs: string[];
  relatedSfrIds: string[];
}

export interface PlatformRoleSummary {
  platform: ScenarioPlatform;
  responsibilities: string[];
  boundaryNote: string;
}
