export type PlatformSystem =
  | '포털'
  | '데이터 플랫폼'
  | 'AI 플랫폼'
  | '지능형 클라우드/CMP'
  | '인증/권한'
  | '보안/K-RMF'
  | '지능형 서비스'
  | '군수체계/외부 시스템';

export type ApiIntegrationStatus =
  | '화면 구현'
  | '연계 설계'
  | '후속 API 연동'
  | '타 플랫폼 제공 전제'
  | '확인 필요';

export interface PlatformApiIntegration {
  id: string;
  name: string;
  category: string;
  sourceSystem: PlatformSystem;
  targetSystem: PlatformSystem;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'EVENT' | 'FILE';
  endpointCandidate: string;
  protocolCandidates: string[];
  requestData: string[];
  responseData: string[];
  relatedSfrIds: string[];
  relatedMenus: string[];
  securityConsiderations: string[];
  status: ApiIntegrationStatus;
  followUpQuestions: string[];
  description: string;
  /** 포털이 담당하는 역할 (신청/조회/승인 workflow 등) */
  portalRole?: string;
  /** 연계 대상 플랫폼이 담당하는 역할 (실제 처리/원천 데이터 제공 등) */
  platformRole?: string;
  /** 포털과 플랫폼 간 책임 경계 */
  responsibilityBoundary?: string;
  /** 후속 API 연동으로 전환되기 위한 조건 */
  followUpConditions?: string[];
  /** 오류 발생 시 처리 및 재처리 방안 */
  errorHandling?: string[];
  /** 감사로그 기록 항목 */
  auditLog?: string[];
}
