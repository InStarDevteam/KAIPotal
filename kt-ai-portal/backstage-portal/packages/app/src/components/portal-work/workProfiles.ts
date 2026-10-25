import { PortalPermission, PortalRole } from '../authz/types';

export type WorkProfileId =
  | 'personal'
  | 'project'
  | 'tenant'
  | 'operations'
  | 'security'
  | 'audit';
export interface WorkProfile {
  id: WorkProfileId;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryRoute: string;
  primaryMenu: string;
}
export const WORK_PROFILES: Record<WorkProfileId, WorkProfile> = {
  personal: {
    id: 'personal',
    label: '나의 업무',
    eyebrow: 'MY WORKSPACE',
    title: '오늘의 작업을 이어가세요.',
    description:
      '참여 프로젝트와 작업환경, 내가 신청한 업무를 한눈에 확인하세요.',
    primaryLabel: '작업환경 신청',
    primaryRoute: '/project-workspace?tab=request',
    primaryMenu: 'project-workspace',
  },
  project: {
    id: 'project',
    label: '프로젝트 운영',
    eyebrow: 'PROJECT OVERVIEW',
    title: '팀의 다음 작업을 준비하세요.',
    description:
      '프로젝트 진행 상황과 자원, 검토할 작업환경 신청을 확인하세요.',
    primaryLabel: '작업환경 신청·검토',
    primaryRoute: '/project-workspace?tab=request',
    primaryMenu: 'project-workspace',
  },
  tenant: {
    id: 'tenant',
    label: '테넌트 운영',
    eyebrow: 'TENANT OPERATIONS',
    title: '우리 조직의 운영을 한눈에.',
    description: '소속의 자원 현황과 크레딧 요청, 사용자 접근을 관리하세요.',
    primaryLabel: '사용자·접근 관리',
    primaryRoute: '/tenant-management',
    primaryMenu: 'tenant-management',
  },
  operations: {
    id: 'operations',
    label: '포털 운영',
    eyebrow: 'OPERATIONS CENTER',
    title: '안정적인 운영의 시작.',
    description:
      '선택한 테넌트의 자원 현황과 승인 대상, 플랫폼 연결을 확인하세요.',
    primaryLabel: '테넌트 관리',
    primaryRoute: '/tenant-management',
    primaryMenu: 'tenant-management',
  },
  security: {
    id: 'security',
    label: '보안 검토',
    eyebrow: 'SECURITY DESK',
    title: '확인이 필요한 업무부터.',
    description:
      '반입·반출 검토와 접속 이력을 중심으로 보안 업무를 시작하세요.',
    primaryLabel: '반입·반출 검토',
    primaryRoute: '/export-approval',
    primaryMenu: 'export-approval',
  },
  audit: {
    id: 'audit',
    label: '감사 조회',
    eyebrow: 'AUDIT WORKSPACE',
    title: '기록에서 흐름을 확인하세요.',
    description: '접속·사용 기록과 변경 이력을 읽기 전용으로 확인하세요.',
    primaryLabel: '감사 이력 조회',
    primaryRoute: '/audit-history',
    primaryMenu: 'audit-history',
  },
};

/** Select a landing experience from effective permissions; this grants no rights. */
export function resolveWorkProfile(
  permissions: ReadonlySet<PortalPermission>,
): WorkProfile {
  const has = (permission: PortalPermission) => permissions.has(permission);
  if (has('tenant.manage') && has('rbac.manage'))
    return WORK_PROFILES.operations;
  if (has('tenant.manage')) return WORK_PROFILES.tenant;
  if (has('export.review')) return WORK_PROFILES.security;
  if (has('project.approve') || has('workspace.approve'))
    return WORK_PROFILES.project;
  if (has('audit.view') && !has('project.request')) return WORK_PROFILES.audit;
  return WORK_PROFILES.personal;
}
export const ROLE_WORK_PROFILES: Record<PortalRole, WorkProfileId> = {
  'general-user': 'personal',
  'project-manager': 'project',
  'branch-admin': 'tenant',
  'portal-admin': 'operations',
  'security-manager': 'security',
  'security-auditor': 'audit',
};

// Explicitly scoped fixture membership. Never used outside the demo profile.
export const DEMO_PROJECT_TENANTS: Record<string, string> = {
  'P-2025-001': 'army',
  'P-2025-002': 'army',
  'P-2025-003': 'airforce',
  'P-2025-004': 'navy',
};
export const isDemoProjectInTenant = (projectId: string, tenantId: string) =>
  DEMO_PROJECT_TENANTS[projectId] === tenantId;
export const relativeRoute = (path: string, key: string, value: string) =>
  `${path}?${key}=${encodeURIComponent(value)}`;
