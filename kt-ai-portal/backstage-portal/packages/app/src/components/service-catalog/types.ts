export type ToolCategory =
  | '분석 프레임워크'
  | '개발도구'
  | '데이터 도구'
  | '시각화 도구'
  | '라벨링 도구'
  | '학습데이터 구축 도구'
  | '라이브러리'
  | '패키지'
  | '컨테이너 이미지'
  | 'Docker 이미지'
  | 'PyPI 패키지'
  | '컨테이너 라이브러리'
  | '분석 도구'
  | '서비스 카탈로그';

export type ProvisionType =
  | '플랫폼 기본 제공'
  | '워크스페이스 선택'
  | '관리자 승인 필요'
  | '외부 링크'
  | '폐쇄망 미러링'
  | '직접 요청';

export type ToolStatus =
  | '사용가능'
  | '신청필요'
  | '점검중'
  | '비활성'
  | '준비중';

export type DataAccessLevel = '공개' | '내부' | '비밀';

export interface Tool {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  provisionType: ProvisionType;
  version: string;
  status: ToolStatus;
  allowedRoles: string[];
  allowedWorkspaces: string[];
  securityLevel: DataAccessLevel;
  owner: string;
  registeredAt: string;
  features: string[];
  installMethod: string;
  requiredResources: string;
  requiresSecurityReview: boolean;
  workspaceApplicable: boolean;
  relatedProjects: string[];
  relatedDocs: string[];
  changeHistory: string[];
  adminOnly?: boolean;
}

export type DirectRequestStatus =
  | '요청'
  | '검토중'
  | '보안검토'
  | '반입대기'
  | '승인'
  | '반려'
  | '카탈로그 등록완료';

export interface DirectToolRequest {
  id: string;
  toolName: string;
  toolType: string;
  provisionType: string;
  requiredVersion: string;
  purpose: string;
  relatedProject: string;
  requiredResources: string;
  closedNetworkRequired: boolean;
  securityReviewRequired: boolean;
  requester: string;
  requestedAt: string;
  status: DirectRequestStatus;
}

export interface SelectedTool {
  tool: Tool;
  version: string;
  project: string;
  workspace: string;
  reason: string;
}

export interface ServiceCatalogData {
  tools: Tool[];
  directRequests: DirectToolRequest[];
  projects: string[];
  workspaces: string[];
}

export type ServiceCatalogTab =
  | '전체'
  | '분석 프레임워크'
  | '개발도구'
  | '데이터 도구'
  | '시각화 도구'
  | '라벨링 도구'
  | '학습데이터 구축 도구'
  | 'Docker 이미지'
  | 'PyPI 패키지'
  | '컨테이너 라이브러리'
  | '분석 도구'
  | '서비스 카탈로그'
  | '직접 입력 요청'
  | '요구사항 대응 현황';
