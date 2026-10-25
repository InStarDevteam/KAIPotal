import {
  isSensitiveSettingKey,
  SETTING_KEY_PATTERN,
  settingValueValid,
  parseStoredValue,
  protectSettingValues,
} from './portalSettings';

describe('설정값 유형 검증 (400 한글 사유 기준)', () => {
  test('string 유형은 문자엧만 허용한다', () => {
    expect(settingValueValid('안녕', 'string')).toBe(true);
    expect(settingValueValid(42, 'string')).toBe(false);
    expect(settingValueValid('a'.repeat(4001), 'string')).toBe(false);
    expect(settingValueValid('개행\n포함', 'string')).toBe(false);
  });

  test('number 유형은 유한한 숫자만 허용한다', () => {
    expect(settingValueValid(30, 'number')).toBe(true);
    expect(settingValueValid('30', 'number')).toBe(false);
    expect(settingValueValid(Number.POSITIVE_INFINITY, 'number')).toBe(false);
    expect(settingValueValid(Number.NaN, 'number')).toBe(false);
  });

  test('boolean 유형은 참/거짓만 허용한다', () => {
    expect(settingValueValid(true, 'boolean')).toBe(true);
    expect(settingValueValid('true', 'boolean')).toBe(false);
    expect(settingValueValid(1, 'boolean')).toBe(false);
  });

  test('json 유형은 직렬화 가능한 값을 허용한다', () => {
    expect(settingValueValid({ a: 1 }, 'json')).toBe(true);
    expect(settingValueValid([1, 2], 'json')).toBe(true);
    expect(settingValueValid('plain', 'json')).toBe(true);
    expect(settingValueValid(undefined, 'json')).toBe(false);
  });

  test('알 수 없는 유형은 거부한다', () => {
    expect(settingValueValid('x', 'text')).toBe(false);
  });
});

describe('설정 응답 보호', () => {
  it('keeps JSON-looking string values as strings', () => {
    expect(parseStoredValue('true', 'string')).toBe('true');
    expect(parseStoredValue('123', 'string')).toBe('123');
  });
  it('redacts sensitive current and historical values at the server boundary', () => {
    expect(
      protectSettingValues('smtp.token', 'old-secret', 'new-secret'),
    ).toEqual({ sensitive: true, values: [null, null] });
  });
  it('protects nested secrets and their previous values together', () => {
    expect(
      protectSettingValues(
        'connector.config',
        { enabled: true },
        { entries: [{ apiKey: 'secret' }] },
      ),
    ).toEqual({ sensitive: true, values: [null, null] });
    expect(
      protectSettingValues('portal.title', '기존 포털', '새 포털'),
    ).toEqual({ sensitive: false, values: ['기존 포털', '새 포털'] });
  });
});

describe('설정 키 형식', () => {
  test.each(['session.timeout_minutes', 'password-policy', 'logo_url2'])(
    '허용: %s',
    key => expect(SETTING_KEY_PATTERN.test(key)).toBe(true),
  );

  test.each(['PASSWORD', '-lead', '_lead', '', 'a'.repeat(65)])(
    '거부: %s',
    key => expect(SETTING_KEY_PATTERN.test(key)).toBe(false),
  );
});

describe('민감 키 판정', () => {
  test.each(['password.min_length', 'api.token', 'db.secret', 'smtp_passwd'])(
    '민감: %s',
    key => expect(isSensitiveSettingKey(key)).toBe(true),
  );

  test.each(['portal.title', 'session.timeout_minutes', 'banner.text'])(
    '비민감: %s',
    key => expect(isSensitiveSettingKey(key)).toBe(false),
  );
});
