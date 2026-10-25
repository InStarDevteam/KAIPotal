import { EnvironmentSettingsTab } from './types';

export const SERVER_SETTING_CATEGORIES = [
  'common',
  'security',
  'resource',
  'operation',
] as const;
export type ServerSettingCategory = (typeof SERVER_SETTING_CATEGORIES)[number];

export const SERVER_SETTING_VALUE_TYPES = [
  'string',
  'number',
  'boolean',
  'json',
] as const;
export type ServerSettingValueType =
  (typeof SERVER_SETTING_VALUE_TYPES)[number];

export interface PortalSettingItem {
  category: ServerSettingCategory;
  key: string;
  value: unknown;
  valueType: ServerSettingValueType;
  description: string | null;
  sensitive: boolean;
  version: number;
  updatedBy: string;
  updatedAt: string;
}

export const SETTING_CATEGORY_LABELS: Record<ServerSettingCategory, string> = {
  common: '공통',
  security: '보안',
  resource: '자원',
  operation: '운영',
};

export const SETTING_VALUE_TYPE_LABELS: Record<ServerSettingValueType, string> =
  {
    string: '문자열',
    number: '숫자',
    boolean: '불리언',
    json: 'JSON',
  };

export const serverCategoryForTab = (
  tab: EnvironmentSettingsTab,
): ServerSettingCategory | null => {
  switch (tab) {
    case '시스템 파라미터':
      return 'common';
    case '보안 정책':
      return 'security';
    case '자원할당 기준':
      return 'resource';
    case '운영 설정':
      return 'operation';
    default:
      return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isServerSettingCategory = (
  value: unknown,
): value is ServerSettingCategory =>
  SERVER_SETTING_CATEGORIES.includes(value as ServerSettingCategory);

const isServerSettingValueType = (
  value: unknown,
): value is ServerSettingValueType =>
  SERVER_SETTING_VALUE_TYPES.includes(value as ServerSettingValueType);

const isValidItem = (item: unknown): item is PortalSettingItem => {
  if (!isRecord(item)) return false;
  if (!isServerSettingCategory(item.category)) return false;
  if (typeof item.key !== 'string' || !item.key) return false;
  if (!isServerSettingValueType(item.valueType)) return false;
  if (typeof item.sensitive !== 'boolean') return false;
  if (typeof item.version !== 'number' || !Number.isInteger(item.version))
    return false;
  if (typeof item.updatedBy !== 'string') return false;
  if (typeof item.updatedAt !== 'string') return false;
  if (item.description !== null && typeof item.description !== 'string')
    return false;
  if (item.sensitive && item.value === null) return true;
  if (item.valueType === 'string' && typeof item.value !== 'string')
    return false;
  if (item.valueType === 'number' && typeof item.value !== 'number')
    return false;
  if (item.valueType === 'boolean' && typeof item.value !== 'boolean')
    return false;
  return true;
};

export const parsePortalSettings = (data: unknown): PortalSettingItem[] => {
  const items = isRecord(data) && Array.isArray(data.items) ? data.items : null;
  if (!items) return [];
  return items.filter(isValidItem);
};

export interface PortalSettingHistoryItem {
  id: string;
  category: ServerSettingCategory;
  key: string;
  oldValue: unknown;
  newValue: unknown;
  sensitive: boolean;
  changedBy: string;
  changedByName: string;
  changedAt: string;
}

export interface PortalSettingHistoryPage {
  items: PortalSettingHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
}

export const parsePortalSettingHistory = (
  data: unknown,
): PortalSettingHistoryPage => {
  if (
    !isRecord(data) ||
    !Array.isArray(data.items) ||
    !Number.isSafeInteger(data.page) ||
    Number(data.page) < 1 ||
    !Number.isSafeInteger(data.pageSize) ||
    Number(data.pageSize) < 1 ||
    !Number.isSafeInteger(data.total) ||
    Number(data.total) < 0 ||
    !data.items.every(
      item =>
        isRecord(item) &&
        typeof item.id === 'string' &&
        isServerSettingCategory(item.category) &&
        typeof item.key === 'string' &&
        typeof item.sensitive === 'boolean' &&
        typeof item.changedBy === 'string' &&
        typeof item.changedByName === 'string' &&
        typeof item.changedAt === 'string' &&
        'oldValue' in item &&
        'newValue' in item,
    )
  ) {
    throw new Error(
      '설정 변경 이력 응답을 확인할 수 없습니다. 다시 불러오세요.',
    );
  }
  return data as unknown as PortalSettingHistoryPage;
};

export const formatSettingHistoryValue = (
  value: unknown,
  sensitive: boolean,
): string => {
  if (sensitive) return '보호된 값';
  if (value === null || value === undefined) return '없음';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

export const MASKED_SETTING_VALUE = '••••••••';

export const maskSettingValue = (item: {
  sensitive: boolean;
  value: unknown;
  valueType: ServerSettingValueType;
}): string => {
  if (item.sensitive) return MASKED_SETTING_VALUE;
  if (item.value === null || item.value === undefined) return '—';
  if (item.valueType === 'json') return JSON.stringify(item.value);
  return String(item.value);
};

export const settingValueToEditText = (
  value: unknown,
  valueType: ServerSettingValueType,
): string => {
  if (valueType === 'json') return JSON.stringify(value ?? null);
  return String(value ?? '');
};

export type SettingEditParseResult =
  | { ok: true; value: unknown }
  | { ok: false; message: string };

export const parseSettingEditText = (
  text: string,
  valueType: ServerSettingValueType,
): SettingEditParseResult => {
  const trimmed = text.trim();
  switch (valueType) {
    case 'string':
      return { ok: true, value: text };
    case 'number': {
      if (!trimmed) return { ok: false, message: '숫자를 입력하세요.' };
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed))
        return { ok: false, message: '숫자 형식을 확인하세요.' };
      return { ok: true, value: parsed };
    }
    case 'boolean': {
      if (trimmed === 'true') return { ok: true, value: true };
      if (trimmed === 'false') return { ok: true, value: false };
      return { ok: false, message: 'true 또는 false로 입력하세요.' };
    }
    case 'json': {
      if (!trimmed) return { ok: false, message: 'JSON 값을 입력하세요.' };
      try {
        return { ok: true, value: JSON.parse(trimmed) };
      } catch {
        return { ok: false, message: 'JSON 형식을 확인하세요.' };
      }
    }
    default:
      return { ok: false, message: '지원하지 않는 값 유형입니다.' };
  }
};

export type SettingsFetchFailure = {
  kind: 'permission' | 'network';
  message: string;
  code?: string;
};

export const classifySettingsFetchError = (
  error: unknown,
  fallbackMessage: string,
): SettingsFetchFailure => {
  const status = (error as { status?: number } | null)?.status;
  const code = (error as { code?: string } | null)?.code;
  const message =
    error instanceof Error && error.message ? error.message : fallbackMessage;
  if (status === 403 || code === 'permission_denied')
    return { kind: 'permission', message, code };
  return { kind: 'network', message, code };
};

export type SettingsSaveFailure = {
  kind: 'conflict' | 'permission' | 'invalid' | 'network';
  message: string;
  code?: string;
};

export const classifySettingsSaveError = (
  error: unknown,
  fallbackMessage: string,
): SettingsSaveFailure => {
  const status = (error as { status?: number } | null)?.status;
  const code = (error as { code?: string } | null)?.code;
  const message =
    error instanceof Error && error.message ? error.message : fallbackMessage;
  if (status === 409 || code === 'version_conflict')
    return { kind: 'conflict', message, code };
  if (status === 403 || code === 'permission_denied')
    return { kind: 'permission', message, code };
  if (status === 400 || status === 422)
    return { kind: 'invalid', message, code };
  return { kind: 'network', message, code };
};
