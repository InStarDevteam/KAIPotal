import { createContext, ReactNode, useContext, useMemo } from 'react';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import { useDemoAdmin } from '../preview-auth';
import { permissionsForRoles } from './rolePolicies';
import { isPortalRole, PortalPermission, PortalRole } from './types';
import { useOptionalPortalRuntime } from '../portal-runtime/PortalRuntimeContext';

export const ROLE_OVERRIDE_STORAGE_KEY = '__kt_ai_portal_role_override__';

const ADMIN_AREA_PERMISSIONS: PortalPermission[] = [
  'user.manage',
  'rbac.manage',
  'menu.manage',
  'tenant.manage',
  'settings.manage',
  'audit.view',
  'krmf.view',
  'requirement.view',
  'integration.view',
];

const isAdminPreviewEnabled = (): boolean =>
  typeof sessionStorage !== 'undefined' &&
  sessionStorage.getItem('__kt_ai_portal_admin_preview__') === 'true';

// captureRole 쿼리 파라미터가 있으면 sessionStorage에 저장한 뒤 그 값을 사용한다.
const readCaptureRoleOverride = (): PortalRole | null => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('captureRole');
  if (isPortalRole(fromQuery)) {
    try {
      sessionStorage.setItem(ROLE_OVERRIDE_STORAGE_KEY, fromQuery);
    } catch {
      // sessionStorage 사용 불가 환경에서는 쿼리 값만 사용
    }
    return fromQuery;
  }
  if (typeof sessionStorage === 'undefined') return null;
  const stored = sessionStorage.getItem(ROLE_OVERRIDE_STORAGE_KEY);
  return isPortalRole(stored) ? stored : null;
};

export interface AuthzContextValue {
  roles: PortalRole[];
  primaryRole: PortalRole;
  permissions: Set<PortalPermission>;
  hasPermission: (permission: PortalPermission) => boolean;
  hasAnyPermission: (permissions: PortalPermission[]) => boolean;
  hasAllPermissions: (permissions: PortalPermission[]) => boolean;
  isAdminArea: boolean;
}

const AuthzContext = createContext<AuthzContextValue | undefined>(undefined);

export const AuthzProvider = ({ children }: { children: ReactNode }) => {
  const config = useApi(configApiRef);
  const { isAdmin } = useDemoAdmin();
  const runtime = useOptionalPortalRuntime();

  const captureEnabled =
    config.getOptionalBoolean('app.proposalCapture.enabled') === true;

  const value = useMemo<AuthzContextValue>(() => {
    let roles: PortalRole[];
    if (captureEnabled) {
      // 제안/캡처 환경 전용: app.proposalCapture.enabled=true 일 때만
      // captureRole 쿼리와 sessionStorage 관리자 미리보기를 허용한다.
      const override = readCaptureRoleOverride();
      if (runtime?.roles.length) {
        roles = runtime.roles;
      } else if (override) {
        roles = [override];
      } else if (isAdmin || isAdminPreviewEnabled()) {
        roles = ['portal-admin'];
      } else {
        roles = ['general-user'];
      }
    } else {
      roles = runtime?.roles.length ? runtime.roles : ['general-user'];
    }

    // Outside the explicit demo profile only server-verified grants are used.
    const permissions = captureEnabled
      ? permissionsForRoles(roles)
      : new Set<PortalPermission>(runtime?.permissions ?? []);
    const hasPermission = (permission: PortalPermission) =>
      permissions.has(permission);
    const hasAnyPermission = (targets: PortalPermission[]) =>
      targets.some(permission => permissions.has(permission));
    const hasAllPermissions = (targets: PortalPermission[]) =>
      targets.every(permission => permissions.has(permission));

    return {
      roles,
      primaryRole: roles[0],
      permissions,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isAdminArea: hasAnyPermission(ADMIN_AREA_PERMISSIONS),
    };
  }, [captureEnabled, isAdmin, runtime?.roles, runtime?.permissions]);

  return (
    <AuthzContext.Provider value={value}>{children}</AuthzContext.Provider>
  );
};

export const useAuthz = (): AuthzContextValue => {
  const ctx = useContext(AuthzContext);
  if (!ctx) {
    throw new Error('useAuthz must be used within AuthzProvider');
  }
  return ctx;
};
