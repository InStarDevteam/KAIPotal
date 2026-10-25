import {
  AUDIT_CATEGORY_LABELS,
  AUDIT_RESULT_LABELS,
  auditCategoryLabel,
  auditResultLabel,
  classifyMyPageFetchError,
  parseServerAuditEvents,
  parseServerIdentity,
} from './myPageServerData';

describe('my page server data', () => {
  describe('parseServerIdentity', () => {
    const me = {
      userId: 'u-1',
      displayName: '홍길동',
      memberships: [
        {
          tenant_id: 'army',
          tenant_name: '육군',
          branch: 'army',
          roles: ['general-user'],
        },
      ],
    };
    it('maps /v1/me fields to the identity model', () => {
      expect(parseServerIdentity(me)).toEqual({
        userId: 'u-1',
        displayName: '홍길동',
        memberships: [
          {
            tenantId: 'army',
            tenantName: '육군',
            branch: 'army',
            roles: ['general-user'],
          },
        ],
      });
    });
    it('returns null for malformed payloads', () => {
      expect(parseServerIdentity(null)).toBeNull();
      expect(parseServerIdentity({})).toBeNull();
      expect(
        parseServerIdentity({
          ...me,
          memberships: [{ tenant_id: 'army' }],
        }),
      ).toBeNull();
      expect(
        parseServerIdentity({ ...me, memberships: 'nope' }),
      ).toBeNull();
    });
  });

  describe('parseServerAuditEvents', () => {
    const event = {
      id: 'e-1',
      action: 'client.page.view',
      category: 'usage',
      result: 'success',
      resourceType: 'page',
      resourceId: 'portal-dashboard',
      createdAt: '2026-09-01T00:00:00.000Z',
    };
    it('keeps valid events and tolerates missing resource fields', () => {
      expect(
        parseServerAuditEvents({
          items: [event, { ...event, id: 'e-2', resourceId: null }],
        }),
      ).toEqual([
        {
          id: 'e-1',
          action: 'client.page.view',
          category: 'usage',
          result: 'success',
          resourceType: 'page',
          resourceId: 'portal-dashboard',
          createdAt: '2026-09-01T00:00:00.000Z',
        },
        {
          id: 'e-2',
          action: 'client.page.view',
          category: 'usage',
          result: 'success',
          resourceType: 'page',
          resourceId: null,
          createdAt: '2026-09-01T00:00:00.000Z',
        },
      ]);
    });
    it('drops malformed events and non-item payloads', () => {
      expect(parseServerAuditEvents(null)).toEqual([]);
      expect(parseServerAuditEvents({})).toEqual([]);
      expect(
        parseServerAuditEvents({ items: [null, { id: '' }, { ...event, result: 1 }] }),
      ).toEqual([]);
    });
  });

  describe('labels', () => {
    it('covers known results and categories with raw fallback', () => {
      expect(auditResultLabel('success')).toBe(AUDIT_RESULT_LABELS.success);
      expect(auditResultLabel('other')).toBe('other');
      expect(auditCategoryLabel('security')).toBe(AUDIT_CATEGORY_LABELS.security);
      expect(auditCategoryLabel('x')).toBe('x');
    });
  });

  describe('classifyMyPageFetchError', () => {
    it('classifies 403 as permission and the rest as network', () => {
      const error = new Error('거부');
      (error as { status?: number }).status = 403;
      expect(classifyMyPageFetchError(error, 'f').kind).toBe('permission');
      const serverError = new Error('장애');
      (serverError as { status?: number }).status = 500;
      expect(classifyMyPageFetchError(serverError, 'f').kind).toBe('network');
      expect(classifyMyPageFetchError(undefined, 'f').message).toBe('f');
    });
  });
});
