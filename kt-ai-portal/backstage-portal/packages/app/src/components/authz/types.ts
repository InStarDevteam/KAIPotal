export type PortalRole =
  | 'general-user'
  | 'project-manager'
  | 'branch-admin'
  | 'portal-admin'
  | 'security-manager'
  | 'security-auditor';

export type PortalPermission =
  | 'portal.view'
  | 'catalog.view'
  | 'project.request'
  | 'project.approve'
  | 'workspace.request'
  | 'workspace.approve'
  | 'credit.view'
  | 'credit.approve'
  | 'export.request'
  | 'export.review'
  | 'user.manage'
  | 'rbac.manage'
  | 'menu.manage'
  | 'tenant.manage'
  | 'settings.manage'
  | 'audit.view'
  | 'krmf.view'
  | 'krmf.evidence.submit'
  | 'krmf.review'
  | 'krmf.manage'
  | 'requirement.view'
  | 'integration.view';

export const ROLE_LABELS: Record<PortalRole, string> = {
  'general-user': '일반 사용자',
  'project-manager': '프로젝트 관리자',
  'branch-admin': '군별 관리자',
  'portal-admin': '포털 관리자',
  'security-manager': '보안 관리자',
  'security-auditor': '보안 감사관',
};

export const PERMISSION_LABELS: Record<PortalPermission, string> = {
  'portal.view': '포털 조회',
  'catalog.view': '카탈로그 조회',
  'project.request': '프로젝트 신청',
  'project.approve': '프로젝트 승인',
  'workspace.request': '작업환경 신청',
  'workspace.approve': '작업환경 승인',
  'credit.view': '크레딧 조회',
  'credit.approve': '크레딧 승인',
  'export.request': '반입·반출 신청',
  'export.review': '반입·반출 검토',
  'user.manage': '사용자 관리',
  'rbac.manage': '권한(RBAC) 관리',
  'menu.manage': '메뉴 관리',
  'tenant.manage': '테넌트 관리',
  'settings.manage': '환경설정 관리',
  'audit.view': '감사 조회',
  'krmf.view': 'K-RMF 조회',
  'krmf.evidence.submit': 'K-RMF 증적 등록',
  'krmf.review': 'K-RMF 검토',
  'krmf.manage': 'K-RMF 관리',
  'requirement.view': '요구사항 현황 조회',
  'integration.view': '플랫폼 연계 현황 조회',
};

export const PORTAL_ROLES: PortalRole[] = [
  'general-user',
  'project-manager',
  'branch-admin',
  'portal-admin',
  'security-manager',
  'security-auditor',
];

export const isPortalRole = (value: unknown): value is PortalRole =>
  typeof value === 'string' && PORTAL_ROLES.includes(value as PortalRole);
