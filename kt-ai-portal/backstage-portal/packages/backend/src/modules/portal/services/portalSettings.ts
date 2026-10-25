export const SETTING_CATEGORIES = [
  'common',
  'security',
  'resource',
  'operation',
] as const;
export type SettingCategory = (typeof SETTING_CATEGORIES)[number];

export const SETTING_VALUE_TYPES = [
  'string',
  'number',
  'boolean',
  'json',
] as const;
export type SettingValueType = (typeof SETTING_VALUE_TYPES)[number];

export const SETTING_KEY_PATTERN = /^[a-z0-9][a-z0-9_.-]{0,63}$/;

export const SETTING_ADMIN_PERMISSION = 'settings.manage';

export const isSettingAdmin = (permissions: Set<string>): boolean =>
  permissions.has(SETTING_ADMIN_PERMISSION);

const SENSITIVE_KEY_PATTERN =
  /password|passwd|secret|token|credential|api[_-]?key|private[_-]?key|authorization|cookie/i;

export const isSensitiveSettingKey = (key: string): boolean =>
  SENSITIVE_KEY_PATTERN.test(key);

/** Redact at the API boundary, including secrets nested under an ordinary JSON key. */
export const containsSensitiveSettingValue = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(
    ([key, item]) =>
      isSensitiveSettingKey(key) || containsSensitiveSettingValue(item),
  );
};

export const protectSettingValues = (key: string, ...values: unknown[]) => {
  const sensitive =
    isSensitiveSettingKey(key) || values.some(containsSensitiveSettingValue);
  return { sensitive, values: sensitive ? values.map(() => null) : values };
};

const MAX_STRING_LENGTH = 4000;

export const settingValueValid = (
  value: unknown,
  valueType: string,
): boolean => {
  switch (valueType) {
    case 'string':
      return (
        typeof value === 'string' &&
        value.length <= MAX_STRING_LENGTH &&
        Array.from(value).every(character => {
          const code = character.charCodeAt(0);
          return code >= 32 && code !== 127;
        })
      );
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'json': {
      if (value === undefined || typeof value === 'function') return false;
      try {
        JSON.stringify(value);
      } catch {
        return false;
      }
      return true;
    }
    default:
      return false;
  }
};

export const valueTypeMismatchMessage = (
  key: string,
  valueType: string,
): string =>
  `설정값이 ${valueType} 유형과 맞지 않습니다. (${key}의 값을 확인하세요)`;

export const parseStoredValue = (
  value: unknown,
  valueType: string,
): unknown => {
  // pg already decodes JSONB. A string such as "true" must remain a string.
  if (['number', 'boolean'].includes(valueType) && typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};
