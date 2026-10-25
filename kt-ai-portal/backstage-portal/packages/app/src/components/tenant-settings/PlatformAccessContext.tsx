import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { useAuthz } from '../authz';
import { appendDemoActivity } from '../portal-runtime/demoActivity';
import {
  defaultPlatformPolicy,
  defaultPlatformPreferences,
  demoPlatformMembers,
  memberRolesKey,
  PLATFORM_DETAILS,
  PlatformAccessPolicy,
  PlatformId,
  PlatformMember,
  PlatformPreferences,
  platformAccessDecision,
  platformPolicyKey,
  preferencesKey,
  readDemoMemberRoles,
  readDemoPlatformPolicy,
  validPlatformPolicy,
  validPlatformPreferences,
} from './platformAccessModel';

interface AccessValue {
  policy: PlatformAccessPolicy;
  platforms: {
    id: PlatformId;
    name: string;
    description: string;
    color: string;
    href: string;
    enabled: boolean;
    canAccess: boolean;
    reason: string;
  }[];
  preferences: PlatformPreferences;
  members: PlatformMember[];
  loading: boolean;
  saving: boolean;
  error: string;
  reload: () => void;
  savePolicy: (next: PlatformAccessPolicy) => Promise<void>;
  savePreferences: (next: PlatformPreferences) => Promise<void>;
  assignTenantAdmin: (member: PlatformMember, reason: string) => Promise<void>;
  launchPlatform: (id: PlatformId) => Promise<string | null>;
}
const Context = createContext<AccessValue | undefined>(undefined);
export function PlatformAccessProvider({ children }: { children: ReactNode }) {
  const {
    tenantId,
    actorId,
    isDemo,
    request,
    loading: runtimeLoading,
  } = usePortalRuntime();
  const { roles = [], hasPermission } = useAuthz();
  const [policy, setPolicy] = useState(defaultPlatformPolicy);
  const [preferences, setPreferences] = useState(defaultPlatformPreferences);
  const [members, setMembers] = useState<PlatformMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [loadedScope, setLoadedScope] = useState('');
  const scope = `${tenantId}:${actorId}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const canManage = hasPermission('tenant.manage');
  useEffect(() => {
    if (runtimeLoading || !tenantId) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    const load = async () => {
      try {
        let data: {
          policy: PlatformAccessPolicy;
          preferences: PlatformPreferences;
        };
        let nextMembers: PlatformMember[] = [];
        if (isDemo) {
          let savedPreferences = defaultPlatformPreferences();
          try {
            const p = JSON.parse(
              localStorage.getItem(preferencesKey(tenantId, actorId)) || 'null',
            );
            if (validPlatformPreferences(p)) savedPreferences = p;
          } catch {
            /* recover */
          }
          data = {
            policy: readDemoPlatformPolicy(tenantId),
            preferences: savedPreferences,
          };
          if (canManage) nextMembers = demoPlatformMembers(tenantId);
        } else {
          data = (await request<typeof data>('/v1/platform-access')).data;
          if (canManage)
            nextMembers = (
              await request<PlatformMember[]>('/v1/platform-access/members')
            ).data;
        }
        if (
          !validPlatformPolicy(data.policy) ||
          !validPlatformPreferences(data.preferences)
        )
          throw new Error('플랫폼 설정 형식을 확인할 수 없습니다.');
        if (active) {
          setPolicy(data.policy);
          setPreferences(data.preferences);
          setMembers(nextMembers);
          setLoadedScope(scope);
        }
      } catch (cause) {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : '플랫폼 설정을 불러오지 못했습니다.',
          );
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [
    runtimeLoading,
    tenantId,
    actorId,
    isDemo,
    request,
    canManage,
    revision,
    scope,
  ]);
  const log = useCallback(
    (action: string, resourceId: string) =>
      appendDemoActivity({
        tenantId,
        actorId,
        actorName: roles[0],
        action,
        category: 'admin',
        resourceType: 'platform_access',
        resourceId,
        result: 'success',
      }),
    [tenantId, actorId, roles],
  );
  const savePolicy = async (next: PlatformAccessPolicy) => {
    if (loadedScope !== scope || error)
      throw new Error('설정을 다시 불러온 후 시도하세요.');
    if (!canManage)
      throw new Error('소속 테넌트 설정을 변경할 권한이 없습니다.');
    if (!validPlatformPolicy(next))
      throw new Error(
        '플랫폼 주소와 권한 설정을 확인하세요. 접속 주소는 HTTPS만 허용됩니다.',
      );
    setSaving(true);
    try {
      let saved: PlatformAccessPolicy;
      if (isDemo) {
        if (readDemoPlatformPolicy(tenantId).version !== next.version)
          throw new Error('다른 창에서 변경되었습니다. 다시 불러오세요.');
        saved = { ...next, version: next.version + 1 };
        localStorage.setItem(
          platformPolicyKey(tenantId),
          JSON.stringify(saved),
        );
        log('platform.policy.update', tenantId);
      } else
        saved = (
          await request<PlatformAccessPolicy>('/v1/platform-access/policy', {
            method: 'PUT',
            body: JSON.stringify(next),
          })
        ).data;
      if (scopeRef.current === scope) setPolicy(saved);
    } finally {
      setSaving(false);
    }
  };
  const savePreferences = async (next: PlatformPreferences) => {
    if (!validPlatformPreferences(next))
      throw new Error('즐겨찾기와 순서를 확인하세요.');
    if (loadedScope !== scope || error)
      throw new Error('설정을 불러온 후 다시 시도하세요.');
    if (isDemo)
      localStorage.setItem(
        preferencesKey(tenantId, actorId),
        JSON.stringify(next),
      );
    else
      await request('/v1/preferences', {
        method: 'PUT',
        body: JSON.stringify(next),
      });
    if (scopeRef.current === scope) setPreferences(next);
  };
  const assignTenantAdmin = async (member: PlatformMember, reason: string) => {
    if (!roles.includes('portal-admin'))
      throw new Error('테넌트 관리자 지정은 슈퍼유저만 할 수 있습니다.');
    if (
      member.id === actorId ||
      member.roles.includes('branch-admin') ||
      member.roles.includes('portal-admin')
    )
      throw new Error('다른 일반 사용자를 선택하세요.');
    if (!reason.trim()) throw new Error('관리자 지정 사유를 입력하세요.');
    if (isDemo) {
      const overrides = readDemoMemberRoles(tenantId);
      overrides[member.id] = ['branch-admin', ...member.roles];
      localStorage.setItem(memberRolesKey(tenantId), JSON.stringify(overrides));
      log('rbac.tenant-admin.assign', member.id);
      window.dispatchEvent(new Event('portal-demo-role-change'));
    } else
      await request('/v1/role-assignments', {
        method: 'POST',
        body: JSON.stringify({
          membershipId: member.membershipId,
          roleId: 'branch-admin',
          reason,
        }),
      });
    setRevision(value => value + 1);
  };
  const launchPlatform = useCallback(
    async (id: PlatformId): Promise<string | null> => {
      if (loading || loadedScope !== scope || error)
        throw new Error(
          '플랫폼 이용 권한을 확인 중입니다. 잠시 후 다시 시도하세요.',
        );
      if (!isDemo) {
        const response = await request<{ href: string | null }>(
          `/v1/platforms/${id}/launch`,
          { method: 'POST' },
        );
        if (scopeRef.current !== scope)
          throw new Error(
            '소속이 변경되었습니다. 현재 소속에서 다시 선택하세요.',
          );
        return response.data.href;
      }
      const latest = readDemoPlatformPolicy(tenantId);
      const platform = latest.platforms.find(p => p.id === id);
      if (!platform) throw new Error('알 수 없는 플랫폼입니다.');
      const decision = platformAccessDecision(
        platform,
        latest.userGrants,
        actorId,
        roles,
      );
      if (!decision.canAccess) throw new Error(decision.reason);
      if (platform.href) log('platform.launch', id);
      return platform.href || null;
    },
    [
      log,
      loading,
      loadedScope,
      scope,
      error,
      isDemo,
      request,
      tenantId,
      actorId,
      roles,
    ],
  );
  const ready = !runtimeLoading && !loading && loadedScope === scope && !error;
  const order = preferences.platformOrder;
  const platforms = [...policy.platforms]
    .sort((a, b) =>
      order.length
        ? order.indexOf(a.id) - order.indexOf(b.id)
        : a.order - b.order,
    )
    .map(p => ({
      ...p,
      ...PLATFORM_DETAILS[p.id],
      ...(ready
        ? platformAccessDecision(p, policy.userGrants, actorId, roles)
        : {
            canAccess: false,
            reason: error || '이용 권한을 확인하고 있습니다.',
          }),
    }));
  return (
    <Context.Provider
      value={{
        policy,
        platforms,
        preferences,
        members,
        loading: loading || runtimeLoading || loadedScope !== scope,
        saving,
        error,
        reload: () => setRevision(v => v + 1),
        savePolicy,
        savePreferences,
        assignTenantAdmin,
        launchPlatform,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePlatformAccess() {
  const context = useContext(Context);
  if (!context) throw new Error('PlatformAccessProvider is required');
  return context;
}
