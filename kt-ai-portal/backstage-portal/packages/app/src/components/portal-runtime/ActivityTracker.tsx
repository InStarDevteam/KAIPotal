import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { portalMenuDefinitions } from '../navigation';
import { usePortalRuntime } from './PortalRuntimeContext';
import { appendDemoActivity } from './demoActivity';
import { useTenantSettings } from '../tenant-settings/TenantSettingsContext';

export function ActivityTracker() {
  const runtime = usePortalRuntime();
  const {
    settings,
    loading: settingsLoading,
    error: settingsError,
  } = useTenantSettings();
  const location = useLocation();
  const previous = useRef('');
  const sessionTenant = useRef('');
  useEffect(() => {
    const { tenantId, actorId, loading, isDemo, request, permissions } =
      runtime;
    if (loading || settingsLoading || settingsError || !tenantId) return;
    const menu = portalMenuDefinitions.find(
      item => item.route === location.pathname,
    );
    if (
      !menu ||
      !menu.requiredAnyPermissions.some(p => permissions.includes(p))
    )
      return;
    if (settings.menus.find(item => item.id === menu.id)?.visible === false)
      return;
    const key = `${tenantId}:${location.pathname}`;
    if (previous.current === key) return;
    previous.current = key;
    const record = async (action: 'session.start' | 'page.view') => {
      if (isDemo) {
        appendDemoActivity({
          tenantId,
          actorId,
          actorName: actorId,
          action: `client.${action}`,
          category: action === 'page.view' ? 'usage' : 'access',
          resourceType: 'page',
          resourceId: menu.id,
          result: 'success',
        });
      } else {
        await request('/v1/activity', {
          method: 'POST',
          body: JSON.stringify({
            action,
            ...(action === 'page.view' ? { pageId: menu.id } : {}),
          }),
        });
      }
    };
    // Browser activity is telemetry, never evidence of successful authentication.
    const track = async () => {
      if (sessionTenant.current !== tenantId) {
        await record('session.start');
        sessionTenant.current = tenantId;
      }
      await record('page.view');
    };
    void track().catch(() => {
      previous.current = '';
    });
  }, [runtime, location.pathname, settings, settingsLoading, settingsError]);
  return null;
}
