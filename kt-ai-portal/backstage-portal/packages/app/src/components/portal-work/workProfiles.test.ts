import { permissionsForRoles } from '../authz/rolePolicies';
import { PortalRole } from '../authz/types';
import {
  resolveWorkProfile,
  ROLE_WORK_PROFILES,
  isDemoProjectInTenant,
} from './workProfiles';

describe('role landing policy', () => {
  it.each(Object.entries(ROLE_WORK_PROFILES))(
    '%s opens %s without changing permissions',
    (role, expected) => {
      const permissions = permissionsForRoles([role as PortalRole]);
      const before = [...permissions];
      expect(resolveWorkProfile(permissions).id).toBe(expected);
      expect([...permissions]).toEqual(before);
    },
  );
  it('uses effective permission precedence for combined roles', () => {
    expect(
      resolveWorkProfile(
        permissionsForRoles(['project-manager', 'security-manager']),
      ).id,
    ).toBe('security');
    expect(
      resolveWorkProfile(
        permissionsForRoles(['branch-admin', 'security-manager']),
      ).id,
    ).toBe('tenant');
  });
  it('does not expose fixture projects across tenants or to unknown tenants', () => {
    expect(isDemoProjectInTenant('P-2025-001', 'army')).toBe(true);
    expect(isDemoProjectInTenant('P-2025-001', 'navy')).toBe(false);
    expect(isDemoProjectInTenant('P-2025-001', 'defense')).toBe(false);
    expect(isDemoProjectInTenant('unknown', 'marines')).toBe(false);
  });
});
