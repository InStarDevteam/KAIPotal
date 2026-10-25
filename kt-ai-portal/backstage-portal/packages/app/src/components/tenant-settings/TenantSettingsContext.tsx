import {
  createContext,
  CSSProperties,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createTheme, ThemeProvider, useTheme } from '@material-ui/core/styles';
import { useAuthz } from '../authz';
import { PlatformAccessProvider } from './PlatformAccessContext';
import { PortalAppearanceProvider } from '../portal-home/PortalAppearanceProvider';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { appendDemoActivity } from '../portal-runtime/demoActivity';
import {
  defaultTenantSettings,
  mergeTenantMenus,
  readDemoSettings,
  TenantSettings,
  tenantSettingsStorageKey,
  validateTenantSettings,
} from './settingsModel';

interface TenantSettingsContextValue {
  settings: TenantSettings;
  loading: boolean;
  error: string;
  saving: boolean;
  reload: () => void;
  saveSettings: (next: TenantSettings) => Promise<void>;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (dirty: boolean, source?: string) => void;
}

const TenantSettingsContext = createContext<
  TenantSettingsContextValue | undefined
>(undefined);

export function TenantSettingsProvider({ children }: { children: ReactNode }) {
  const {
    tenantId,
    tenants,
    request,
    isDemo,
    actorId,
    loading: runtimeLoading,
    error: runtimeError,
  } = usePortalRuntime();
  const { primaryRole, hasAnyPermission, hasPermission } = useAuthz();
  const outerTheme = useTheme();
  const tenantName = tenants.find(tenant => tenant.id === tenantId)?.name;
  const scope = `${tenantId}:${primaryRole}:${isDemo}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const defaults = useMemo(
    () => defaultTenantSettings(tenantId, tenantName),
    [tenantId, tenantName],
  );
  const [loaded, setLoaded] = useState<{
    scope: string;
    settings: TenantSettings;
  }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [dirtySources, setDirtySources] = useState<Record<string, boolean>>({});
  const setHasUnsavedChanges = useCallback(
    (dirty: boolean, source = 'branding') => {
      setDirtySources(current =>
        current[source] === dirty ? current : { ...current, [source]: dirty },
      );
    },
    [],
  );
  const hasUnsavedChanges = Object.values(dirtySources).some(Boolean);
  const settings = loaded?.scope === scope ? loaded.settings : defaults;

  useEffect(() => {
    if (runtimeLoading) return undefined;
    if (!tenantId) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setError('');
    setDirtySources({});
    const load = async () => {
      try {
        const data = isDemo
          ? readDemoSettings(localStorage, tenantId, tenantName)
          : mergeTenantMenus(
              (await request<TenantSettings>('/v1/tenant-settings')).data,
            );
        if (validateTenantSettings(data).length)
          throw new Error('서버에서 받은 포털 설정을 확인할 수 없습니다.');
        if (active) setLoaded({ scope, settings: data });
      } catch (cause) {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : '포털 설정을 불러오지 못했습니다.',
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
    scope,
    tenantId,
    tenantName,
    primaryRole,
    isDemo,
    request,
    revision,
    runtimeLoading,
  ]);

  const saveSettings = useCallback(
    async (next: TenantSettings) => {
      if (
        !hasAnyPermission(['tenant.manage', 'settings.manage', 'menu.manage'])
      )
        throw new Error('포털 설정을 변경할 권한이 없습니다.');
      if (
        JSON.stringify(next.branding) !== JSON.stringify(settings.branding) &&
        !hasAnyPermission(['tenant.manage', 'settings.manage'])
      )
        throw new Error('포털 디자인을 변경할 권한이 없습니다.');
      if (
        JSON.stringify(next.menus) !== JSON.stringify(settings.menus) &&
        !hasPermission('menu.manage')
      )
        throw new Error('메뉴 구성을 변경할 권한이 없습니다.');
      const validation = validateTenantSettings(next);
      if (validation.length) throw new Error(validation[0]);
      const saveScope = scope;
      setSaving(true);
      try {
        let saved: TenantSettings;
        if (isDemo) {
          const current = readDemoSettings(localStorage, tenantId, tenantName);
          if (current.version !== next.version)
            throw new Error(
              '다른 창에서 설정이 변경되었습니다. 다시 불러온 후 저장하세요.',
            );
          saved = { ...next, version: next.version + 1 };
          localStorage.setItem(
            tenantSettingsStorageKey(tenantId),
            JSON.stringify(saved),
          );
          appendDemoActivity({
            tenantId,
            actorId,
            actorName: primaryRole,
            action: 'tenant.settings.update',
            category: 'admin',
            resourceType: 'tenant_settings',
            resourceId: tenantId,
            result: 'success',
          });
        } else {
          saved = (
            await request<TenantSettings>('/v1/tenant-settings', {
              method: 'PUT',
              body: JSON.stringify({
                branding: next.branding,
                menus: next.menus,
                expectedVersion: next.version,
              }),
            })
          ).data;
        }
        if (scopeRef.current === saveScope) {
          setLoaded({ scope: saveScope, settings: saved });
          setHasUnsavedChanges(false);
          setError('');
        }
      } finally {
        setSaving(false);
      }
    },
    [
      hasAnyPermission,
      hasPermission,
      setHasUnsavedChanges,
      settings,
      scope,
      isDemo,
      tenantId,
      primaryRole,
      tenantName,
      request,
      actorId,
    ],
  );

  const theme = useMemo(
    () =>
      createTheme(outerTheme, {
        palette: {
          primary: {
            main: settings.branding.primaryColor,
            contrastText: '#ffffff',
          },
          secondary: { main: settings.branding.accentColor },
        },
      }),
    [outerTheme, settings.branding.primaryColor, settings.branding.accentColor],
  );
  const style = {
    '--portal-primary': settings.branding.primaryColor,
    '--portal-accent': settings.branding.accentColor,
    '--portal-primary-soft': `${settings.branding.primaryColor}12`,
  } as CSSProperties;

  return (
    <TenantSettingsContext.Provider
      value={{
        settings,
        loading:
          !runtimeError &&
          (runtimeLoading || loading || (loaded?.scope !== scope && !error)),
        error,
        saving,
        saveSettings,
        reload: () => setRevision(value => value + 1),
        hasUnsavedChanges,
        setHasUnsavedChanges,
      }}
    >
      <ThemeProvider theme={theme}>
        <div style={style}>
          <PlatformAccessProvider>
            <PortalAppearanceProvider>{children}</PortalAppearanceProvider>
          </PlatformAccessProvider>
        </div>
      </ThemeProvider>
    </TenantSettingsContext.Provider>
  );
}

export function useTenantSettings() {
  const value = useContext(TenantSettingsContext);
  if (!value)
    throw new Error(
      'useTenantSettings must be used within TenantSettingsProvider',
    );
  return value;
}
