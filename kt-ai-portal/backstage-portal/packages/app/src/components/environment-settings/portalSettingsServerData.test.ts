import {
  MASKED_SETTING_VALUE,
  SETTING_CATEGORY_LABELS,
  classifySettingsFetchError,
  classifySettingsSaveError,
  maskSettingValue,
  parsePortalSettings,
  parseSettingEditText,
  serverCategoryForTab,
  settingValueToEditText,
} from './portalSettingsServerData';

describe('portal settings server data', () => {
  const item = {
    category: 'security',
    key: 'password.min_length',
    value: 12,
    valueType: 'number',
    description: '비밀번호 최소 길이',
    sensitive: false,
    version: 3,
    updatedBy: 'admin-1',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };

  describe('parsePortalSettings', () => {
    it('keeps valid items and drops malformed ones', () => {
      const parsed = parsePortalSettings({
        items: [
          item,
          { ...item, key: 'bad', valueType: 'unknown' },
          null,
          { ...item, key: 'no-version', version: 'x' },
        ],
      });
      expect(parsed).toEqual([item]);
    });
    it('returns an empty list when the payload has no items array', () => {
      expect(parsePortalSettings(null)).toEqual([]);
      expect(parsePortalSettings({})).toEqual([]);
      expect(parsePortalSettings({ items: 'nope' })).toEqual([]);
    });
    it('rejects values that do not match their value type', () => {
      expect(
        parsePortalSettings({
          items: [{ ...item, valueType: 'boolean', value: 'yes' }],
        }),
      ).toEqual([]);
      expect(
        parsePortalSettings({
          items: [{ ...item, valueType: 'string', value: 1 }],
        }),
      ).toEqual([]);
    });
  });

  describe('serverCategoryForTab', () => {
    it('maps the four setting tabs to server categories', () => {
      expect(serverCategoryForTab('시스템 파라미터')).toBe('common');
      expect(serverCategoryForTab('보안 정책')).toBe('security');
      expect(serverCategoryForTab('자원할당 기준')).toBe('resource');
      expect(serverCategoryForTab('운영 설정')).toBe('operation');
    });
    it('returns null for tabs without a server category', () => {
      expect(serverCategoryForTab('변경 이력')).toBeNull();
      expect(serverCategoryForTab('요구사항 대응 현황')).toBeNull();
    });
  });

  describe('maskSettingValue', () => {
    it('masks sensitive values regardless of content', () => {
      expect(
        maskSettingValue({
          sensitive: true,
          value: 'super-secret',
          valueType: 'string',
        }),
      ).toBe(MASKED_SETTING_VALUE);
    });
    it('formats non-sensitive values by type', () => {
      expect(
        maskSettingValue({ sensitive: false, value: 12, valueType: 'number' }),
      ).toBe('12');
      expect(
        maskSettingValue({
          sensitive: false,
          value: { a: 1 },
          valueType: 'json',
        }),
      ).toBe('{"a":1}');
      expect(
        maskSettingValue({ sensitive: false, value: null, valueType: 'json' }),
      ).toBe('—');
    });
  });

  describe('setting edit text conversion', () => {
    it('round-trips numbers, booleans and strings', () => {
      expect(
        parseSettingEditText(
          settingValueToEditText(12, 'number'),
          'number',
        ),
      ).toEqual({ ok: true, value: 12 });
      expect(
        parseSettingEditText(
          settingValueToEditText(true, 'boolean'),
          'boolean',
        ),
      ).toEqual({ ok: true, value: true });
      expect(
        parseSettingEditText(
          settingValueToEditText('abc', 'string'),
          'string',
        ),
      ).toEqual({ ok: true, value: 'abc' });
    });
    it('round-trips json values', () => {
      const text = settingValueToEditText({ a: 1 }, 'json');
      expect(parseSettingEditText(text, 'json')).toEqual({
        ok: true,
        value: { a: 1 },
      });
    });
    it('rejects invalid input per type', () => {
      expect(parseSettingEditText('abc', 'number')).toEqual({
        ok: false,
        message: '숫자 형식을 확인하세요.',
      });
      expect(parseSettingEditText('yes', 'boolean').ok).toBe(false);
      expect(parseSettingEditText('{a', 'json').ok).toBe(false);
      expect(parseSettingEditText('', 'number').ok).toBe(false);
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
      expect(
        classifySettingsFetchError(errorWith(403), 'fallback').kind,
      ).toBe('permission');
      expect(
        classifySettingsFetchError(errorWith(500), 'fallback').kind,
      ).toBe('network');
      expect(classifySettingsFetchError(undefined, 'fallback').message).toBe(
        'fallback',
      );
    });
    it('classifies save 409 as conflict, 4xx as invalid, otherwise network', () => {
      expect(classifySettingsSaveError(errorWith(409), 'f').kind).toBe(
        'conflict',
      );
      expect(
        classifySettingsSaveError(errorWith(403, 'permission_denied'), 'f')
          .kind,
      ).toBe('permission');
      expect(classifySettingsSaveError(errorWith(400), 'f').kind).toBe(
        'invalid',
      );
      expect(classifySettingsSaveError(errorWith(422), 'f').kind).toBe(
        'invalid',
      );
      expect(classifySettingsSaveError(errorWith(503), 'f').kind).toBe(
        'network',
      );
    });
  });

  describe('labels', () => {
    it('covers every server category', () => {
      expect(SETTING_CATEGORY_LABELS.common).toBe('공통');
      expect(SETTING_CATEGORY_LABELS.operation).toBe('운영');
    });
  });
});
