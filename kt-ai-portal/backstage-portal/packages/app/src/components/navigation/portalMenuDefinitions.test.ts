import {
  getVisibleMenus,
  portalMenuDefinitions,
} from './portalMenuDefinitions';
import { permissionsForRoles } from '../authz';

describe('portalMenuDefinitions', () => {
  it('모든 메뉴는 1개 이상의 요구 권한을 가진다', () => {
    portalMenuDefinitions.forEach(menu => {
      expect(menu.requiredAnyPermissions.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('모든 메뉴의 journeyStep은 1~8 범위다', () => {
    portalMenuDefinitions.forEach(menu => {
      expect(menu.journeyStep).toBeGreaterThanOrEqual(1);
      expect(menu.journeyStep).toBeLessThanOrEqual(8);
    });
  });

  it('route는 중복되지 않는다', () => {
    const routes = portalMenuDefinitions.map(menu => menu.route);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('role-menu-preview 메뉴가 존재한다', () => {
    const menu = portalMenuDefinitions.find(m => m.id === 'role-menu-preview');
    expect(menu).toBeDefined();
    expect(menu?.route).toBe('/role-menu-preview');
  });

  it('관리 성격 권한을 요구하는 메뉴는 일반 사용자에게 노출되지 않는다', () => {
    const adminMenuIds = [
      'admin-console',
      'tenant-settings',
      'audit-history',
      'tenant-management',
      'environment-settings',
      'krmf-evidence',
      'requirement-coverage',
      'platform-api-integration',
      'developer-console',
      'workflow-scenarios',
      'role-menu-preview',
    ];
    const generalPermissions = permissionsForRoles(['general-user']);
    const visible = getVisibleMenus(permissions =>
      permissions.some(permission => generalPermissions.has(permission)),
    );
    const visibleIds = visible.map(menu => menu.id);
    adminMenuIds.forEach(id => {
      expect(visibleIds).not.toContain(id);
    });
    expect(visibleIds).toContain('portal-dashboard');
    expect(visibleIds).toContain('service-catalog');
  });

  it('군별 관리자는 포털 설정과 감사 이력에 접근할 수 있다', () => {
    const branchPermissions = permissionsForRoles(['branch-admin']);
    const visibleIds = getVisibleMenus(permissions =>
      permissions.some(permission => branchPermissions.has(permission)),
    ).map(menu => menu.id);
    expect(visibleIds).toContain('tenant-settings');
    expect(visibleIds).toContain('audit-history');
  });

  it('포털 관리자는 관리자 콘솔과 권한별 메뉴 미리보기에 접근할 수 있다', () => {
    const adminPermissions = permissionsForRoles(['portal-admin']);
    const visible = getVisibleMenus(permissions =>
      permissions.some(permission => adminPermissions.has(permission)),
    );
    const visibleIds = visible.map(menu => menu.id);
    expect(visibleIds).toContain('admin-console');
    expect(visibleIds).toContain('role-menu-preview');
    expect(visibleIds).toContain('tenant-settings');
    expect(visibleIds).toContain('audit-history');
    expect(visibleIds).not.toContain('krmf-evidence');
  });
});
