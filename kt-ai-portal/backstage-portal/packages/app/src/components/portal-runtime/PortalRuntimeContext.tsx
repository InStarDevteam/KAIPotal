import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  configApiRef,
  discoveryApiRef,
  identityApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { useDemoAdmin } from '../preview-auth';
import { isPortalRole, PortalPermission, PortalRole } from '../authz/types';
import { readDemoMemberRoles } from '../tenant-settings/platformAccessModel';
import { permissionsForRoles } from '../authz/rolePolicies';

export interface PortalTenant {
  id: string;
  name: string;
  branch: string;
  roles: PortalRole[];
  permissions: PortalPermission[];
}
export interface PortalResponse<T> {
  data: T;
  meta: Record<string, unknown>;
}
export interface PortalRuntimeValue {
  tenantId: string;
  tenants: PortalTenant[];
  selectTenant: (id: string) => Promise<void>;
  request: <T>(path: string, init?: RequestInit) => Promise<PortalResponse<T>>;
  isDemo: boolean;
  loading: boolean;
  error: string | null;
  actorId: string;
  roles: PortalRole[];
  permissions: PortalPermission[];
}
const RuntimeContext = createContext<PortalRuntimeValue | undefined>(undefined);
const demoTenants = [
  { id: 'defense', name: '국방부 공통', branch: 'defense' },
  { id: 'army', name: '육군', branch: 'army' },
  { id: 'navy', name: '해군', branch: 'navy' },
  { id: 'airforce', name: '공군', branch: 'airforce' },
  { id: 'marines', name: '해병대', branch: 'marines' },
];

export const PortalRuntimeProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const config = useApi(configApiRef);
  const discovery = useApi(discoveryApiRef);
  const identity = useApi(identityApiRef);
  const { isAdmin } = useDemoAdmin();
  const isDemo =
    config.getOptionalBoolean('app.proposalCapture.enabled') === true;
  const [roleRevision, setRoleRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRoleRevision(value => value + 1);
    window.addEventListener('portal-demo-role-change', refresh);
    return () => window.removeEventListener('portal-demo-role-change', refresh);
  }, []);
  const [tenantId, setTenantId] = useState('');
  const [tenants, setTenants] = useState<PortalTenant[]>([]);
  const [actorId, setActorId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestForTenant = useCallback(
    async <T,>(
      id: string,
      path: string,
      init?: RequestInit,
    ): Promise<PortalResponse<T>> => {
      const [{ token }, base] = await Promise.all([
        identity.getCredentials(),
        discovery.getBaseUrl('portal'),
      ]);
      const headers = new Headers(init?.headers);
      headers.set('Content-Type', 'application/json');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      if (id) headers.set('x-portal-tenant-id', id);
      const response = await fetch(`${base}${path}`, {
        ...init,
        headers,
        credentials: 'include',
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const requestError = new Error(
          body?.error?.message ||
            `요청을 처리하지 못했습니다 (${response.status}).`,
        );
        // 상태 코드·오류 코드를 유지해 호출측이 권한 거부(403)와 일시 장애를 구분할 수 있게 한다.
        (requestError as { status?: number; code?: string }).status =
          response.status;
        (requestError as { status?: number; code?: string }).code =
          body?.error?.code;
        (requestError as { requestId?: string }).requestId =
          typeof body?.error?.requestId === 'string'
            ? body.error.requestId
            : body?.meta?.requestId;
        throw requestError;
      }
      return body;
    },
    [identity, discovery],
  );
  const request = useCallback(
    <T,>(path: string, init?: RequestInit) =>
      requestForTenant<T>(tenantId, path, init),
    [requestForTenant, tenantId],
  );

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      setLoading(true);
      try {
        if (isDemo) {
          const query = new URLSearchParams(window.location.search).get(
            'captureRole',
          );
          const override =
            query || sessionStorage.getItem('__kt_ai_portal_role_override__');
          let role: PortalRole = 'general-user';
          if (
            isAdmin ||
            sessionStorage.getItem('__kt_ai_portal_admin_preview__') === 'true'
          )
            role = 'portal-admin';
          if (isPortalRole(override)) role = override;
          const available = (
            role === 'portal-admin'
              ? demoTenants
              : demoTenants.filter(t => t.id === 'army')
          ).map(t => {
            const roles = readDemoMemberRoles(t.id)[`demo:${role}`] || [role];
            return {
              ...t,
              roles,
              permissions: Array.from(permissionsForRoles(roles)),
            };
          });
          setActorId(`demo:${role}`);
          setTenants(available);
          const stored = sessionStorage.getItem(`kai.tenant.${role}`);
          setTenantId(
            available.find(t => t.id === stored)?.id || available[0].id,
          );
        } else {
          const result = await requestForTenant<{
            userId: string;
            memberships: {
              tenant_id: string;
              tenant_name: string;
              branch: string;
              roles: PortalRole[];
              permissions: PortalPermission[];
            }[];
          }>('', '/v1/me');
          if (!active) return;
          const available = result.data.memberships.map(m => ({
            id: m.tenant_id,
            name: m.tenant_name,
            branch: m.branch,
            roles: m.roles || [],
            permissions: m.permissions || [],
          }));
          if (!available.length)
            throw new Error(
              '사용 가능한 소속이 없습니다. 관리자에게 문의하세요.',
            );
          const selected =
            available.find(
              t =>
                t.id ===
                sessionStorage.getItem(`kai.tenant.${result.data.userId}`),
            ) || available[0];
          await requestForTenant(selected.id, '/v1/context/tenant', {
            method: 'POST',
            body: JSON.stringify({ tenantId: selected.id }),
          });
          if (!active) return;
          setActorId(result.data.userId);
          setTenants(available);
          setTenantId(selected.id);
        }
        if (active) setError(null);
      } catch (e) {
        if (active) {
          setError(
            e instanceof Error ? e.message : '소속 정보를 불러오지 못했습니다.',
          );
          setTenants([]);
          setTenantId('');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void initialize();
    return () => {
      active = false;
    };
  }, [isDemo, isAdmin, requestForTenant, roleRevision]);

  const selectTenant = useCallback(
    async (id: string) => {
      if (!tenants.some(t => t.id === id))
        throw new Error('접근 가능한 소속이 아닙니다.');
      if (!isDemo)
        await requestForTenant(id, '/v1/context/tenant', {
          method: 'POST',
          body: JSON.stringify({ tenantId: id }),
        });
      sessionStorage.setItem(
        `kai.tenant.${isDemo ? actorId.replace('demo:', '') : actorId}`,
        id,
      );
      setTenantId(id);
    },
    [tenants, isDemo, actorId, requestForTenant],
  );
  const selected = tenants.find(t => t.id === tenantId);
  const value = useMemo(
    () => ({
      tenantId,
      tenants,
      selectTenant,
      request,
      isDemo,
      loading,
      error,
      actorId,
      roles: selected?.roles || [],
      permissions: selected?.permissions || [],
    }),
    [
      tenantId,
      tenants,
      selectTenant,
      request,
      isDemo,
      loading,
      error,
      actorId,
      selected,
    ],
  );
  return (
    <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>
  );
};
export const useOptionalPortalRuntime = () => useContext(RuntimeContext);
export const usePortalRuntime = () => {
  const value = useOptionalPortalRuntime();
  if (!value) throw new Error('PortalRuntimeProvider is required');
  return value;
};
