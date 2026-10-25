import { PortalPermission, PortalRole } from './types';

const GENERAL_USER_PERMISSIONS: PortalPermission[] = [
  'portal.view',
  'catalog.view',
  'project.request',
  'workspace.request',
  'credit.view',
  'export.request',
];

const ALL_PERMISSIONS: PortalPermission[] = [
  'portal.view',
  'catalog.view',
  'project.request',
  'project.approve',
  'workspace.request',
  'workspace.approve',
  'credit.view',
  'credit.approve',
  'export.request',
  'export.review',
  'user.manage',
  'rbac.manage',
  'menu.manage',
  'tenant.manage',
  'settings.manage',
  'audit.view',
  'krmf.view',
  'krmf.evidence.submit',
  'krmf.review',
  'krmf.manage',
  'requirement.view',
  'integration.view',
];

export const ROLE_PERMISSIONS: Record<PortalRole, PortalPermission[]> = {
  'general-user': GENERAL_USER_PERMISSIONS,
  'project-manager': [
    ...GENERAL_USER_PERMISSIONS,
    'project.approve',
    'workspace.approve',
    'krmf.evidence.submit',
  ],
  'branch-admin': [
    ...GENERAL_USER_PERMISSIONS,
    'user.manage',
    'tenant.manage',
    'menu.manage',
    'settings.manage',
    'credit.approve',
    'audit.view',
  ],
  'portal-admin': ALL_PERMISSIONS.filter(
    p => p !== 'krmf.review' && p !== 'krmf.manage',
  ),
  'security-manager': [
    ...GENERAL_USER_PERMISSIONS,
    'export.review',
    'audit.view',
    'krmf.view',
    'krmf.evidence.submit',
    'krmf.review',
    'krmf.manage',
    'requirement.view',
    'integration.view',
  ],
  'security-auditor': [
    'portal.view',
    'catalog.view',
    'audit.view',
    'krmf.view',
    'requirement.view',
    'integration.view',
  ],
};

export const permissionsForRoles = (
  roles: PortalRole[],
): Set<PortalPermission> => {
  const result = new Set<PortalPermission>();
  roles.forEach(role => {
    ROLE_PERMISSIONS[role].forEach(permission => result.add(permission));
  });
  return result;
};

export const roleHasPermission = (
  role: PortalRole,
  permission: PortalPermission,
): boolean => ROLE_PERMISSIONS[role].includes(permission);
