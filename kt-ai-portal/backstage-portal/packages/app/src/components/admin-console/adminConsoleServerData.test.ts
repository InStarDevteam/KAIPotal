import {
  MEMBERSHIP_STATUS_LABELS,
  ROLE_SCOPE_LABELS,
  buildRoleGrantInput,
  classifyAdminFetchError,
  classifyRoleGrantError,
  membershipStatusLabel,
  parseMemberships,
  parseRolePermissions,
  parseRoles,
  roleScopeLabel,
} from './adminConsoleServerData';

describe('admin console server data', () => {
  const membership = {
    membership_id: 'm-1',
    user_id: 'u-1',
    display_name: '홍길동',
    email: 'hong@example.mil',
    organization_name: '육군본부',
    status: 'active',
    valid_from: '2026-01-01T00:00:00.000Z',
    valid_until: null,
  };

  describe('parseMemberships', () => {
    it('keeps valid rows with snake_case fields mapped', () => {
      expect(parseMemberships([membership])).toEqual([
        {
          membershipId: 'm-1',
          userId: 'u-1',
          displayName: '홍길동',
          email: 'hong@example.mil',
          organizationName: '육군본부',
          status: 'active',
          validFrom: '2026-01-01T00:00:00.000Z',
          validUntil: null,
        },
      ]);
    });
    it('drops malformed rows and non-array payloads', () => {
      expect(parseMemberships(null)).toEqual([]);
      expect(parseMemberships([null, { membership_id: '' }])).toEqual([]);
      expect(parseMemberships([{ ...membership, email: 42 }])).toEqual([]);
    });
    it('tolerates null optional fields', () => {
      const parsed = parseMemberships([
        {
          ...membership,
          email: null,
          organization_name: null,
          valid_from: null,
        },
      ]);
      expect(parsed[0].email).toBeNull();
      expect(parsed[0].organizationName).toBeNull();
      expect(parsed[0].validFrom).toBeNull();
    });
  });

  describe('parseRoles / parseRolePermissions', () => {
    const role = { role_id: 'portal-admin', name: '포털 관리자', scope: 'system', policy_version: 2 };
    it('parses roles and normalizes a missing policy version', () => {
      expect(parseRoles([role, { ...role, role_id: 'viewer', policy_version: null }])).toEqual([
        { roleId: 'portal-admin', name: '포털 관리자', scope: 'system', policyVersion: 2 },
        { roleId: 'viewer', name: '포털 관리자', scope: 'system', policyVersion: null },
      ]);
    });
    it('drops roles without identifiers', () => {
      expect(parseRoles([{ name: 'x', scope: 'system' }])).toEqual([]);
    });
    it('groups permissions per role and de-duplicates', () => {
      const grouped = parseRolePermissions([
        { role_id: 'a', permission_id: 'portal.view' },
        { role_id: 'a', permission_id: 'portal.view' },
        { role_id: 'a', permission_id: 'audit.view' },
        { role_id: 'b', permission_id: 'portal.view' },
        { role_id: 7, permission_id: 'x' },
      ]);
      expect(grouped).toEqual({
        a: ['portal.view', 'audit.view'],
        b: ['portal.view'],
      });
    });
  });

  describe('labels', () => {
    it('covers known scopes and statuses and falls back to raw values', () => {
      expect(roleScopeLabel('system')).toBe(ROLE_SCOPE_LABELS.system);
      expect(roleScopeLabel('custom')).toBe('custom');
      expect(membershipStatusLabel('active')).toBe(
        MEMBERSHIP_STATUS_LABELS.active,
      );
      expect(membershipStatusLabel('pending')).toBe('pending');
    });
  });

  describe('error classification', () => {
    const errorWith = (status: number, code?: string) => {
      const error = new Error('실패');
      (error as { status?: number }).status = status;
      (error as { code?: string }).code = code;
      return error;
    };
    it('classifies fetch 403 as permission and the rest as network', () => {
      expect(classifyAdminFetchError(errorWith(403), 'f').kind).toBe(
        'permission',
      );
      expect(classifyAdminFetchError(errorWith(503), 'f').kind).toBe(
        'network',
      );
      expect(classifyAdminFetchError(undefined, 'f').message).toBe('f');
    });
    it('classifies grant 403/409/4xx/network', () => {
      expect(classifyRoleGrantError(errorWith(403), 'f').kind).toBe(
        'permission',
      );
      expect(classifyRoleGrantError(errorWith(409), 'f').kind).toBe(
        'conflict',
      );
      expect(classifyRoleGrantError(errorWith(422), 'f').kind).toBe('invalid');
      expect(classifyRoleGrantError(errorWith(500), 'f').kind).toBe('network');
    });
  });

  describe('buildRoleGrantInput', () => {
    it('builds a payload with a future expiration date', () => {
      const future = new Date(Date.now() + 7 * 24 * 3600 * 1000)
        .toISOString()
        .slice(0, 10);
      const result = buildRoleGrantInput('m-1', 'portal-admin', '인수인계', future);
      if (!result.ok) throw new Error('expected ok');
      expect(result.payload.membershipId).toBe('m-1');
      expect(result.payload.validUntil).toBeTruthy();
    });
    it('requires membership, role and reason', () => {
      expect(buildRoleGrantInput('', 'r', '사유', '').ok).toBe(false);
      expect(buildRoleGrantInput('m', '', '사유', '').ok).toBe(false);
      expect(buildRoleGrantInput('m', 'r', '   ', '').ok).toBe(false);
      expect(buildRoleGrantInput('m', 'r', '사유'.repeat(1001), '').ok).toBe(
        false,
      );
    });
    it('rejects past expiration dates and keeps empty as null', () => {
      expect(buildRoleGrantInput('m', 'r', '사유', '2020-01-01').ok).toBe(false);
      const noExpiry = buildRoleGrantInput('m', 'r', '사유', '');
      if (!noExpiry.ok) throw new Error('expected ok');
      expect(noExpiry.payload.validUntil).toBeNull();
    });
  });
});
