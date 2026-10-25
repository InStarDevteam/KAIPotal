import {
  SecuritySetting,
  SettingChangeHistory,
  SystemParameter,
} from './types';

export const systemParameterStorageKey = (tenantId: string) =>
  `kai.demo.system-parameters.v1:${encodeURIComponent(tenantId)}`;

export const securitySettingStorageKey = (tenantId: string) =>
  `kai.demo.security-settings.v1:${encodeURIComponent(tenantId)}`;

export const settingChangeHistoryStorageKey = (tenantId: string) =>
  `kai.demo.setting-change-history.v1:${encodeURIComponent(tenantId)}`;

const isStringRecord = (item: unknown, fields: string[]): boolean =>
  !!item &&
  fields.every(
    field =>
      typeof (item as unknown as Record<string, unknown>)[field] === 'string',
  );

const isSystemParameter = (item: unknown) =>
  isStringRecord(item, [
    'id',
    'category',
    'name',
    'value',
    'defaultValue',
    'description',
    'scope',
    'lastChangedAt',
  ]) &&
  typeof (item as SystemParameter).editable === 'boolean' &&
  typeof (item as SystemParameter).requiresApproval === 'boolean' &&
  typeof (item as SystemParameter).enabled === 'boolean';

const isSecuritySetting = (item: unknown) =>
  isStringRecord(item, [
    'id',
    'name',
    'type',
    'value',
    'target',
    'lastChangedAt',
  ]) &&
  typeof (item as SecuritySetting).requiresMfa === 'boolean' &&
  typeof (item as SecuritySetting).auditLogged === 'boolean' &&
  typeof (item as SecuritySetting).requiresApproval === 'boolean' &&
  typeof (item as SecuritySetting).enabled === 'boolean';

const isSettingChangeHistory = (item: unknown) =>
  isStringRecord(item, [
    'id',
    'occurredAt',
    'changedBy',
    'category',
    'settingName',
    'oldValue',
    'newValue',
    'reason',
    'applyStatus',
    'ip',
  ]) &&
  ((item as SettingChangeHistory).approver === undefined ||
    typeof (item as SettingChangeHistory).approver === 'string') &&
  ['적용', '대기', '반려'].includes((item as SettingChangeHistory).applyStatus);

const readStoredItems = <T>(
  key: string,
  fallback: T[],
  isValidItem: (item: unknown) => boolean,
  readError: string,
): { items: T[]; error?: string } => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { items: fallback };
    const data = JSON.parse(raw);
    if (
      data.version !== 1 ||
      !Array.isArray(data.items) ||
      data.items.length > 500 ||
      !data.items.every(isValidItem)
    )
      throw new Error('invalid');
    const byId = new Map(
      (data.items as T[]).map(item => [
        (item as unknown as { id: string }).id,
        item,
      ]),
    );
    return {
      items: fallback.map(item => byId.get((item as { id: string }).id) || item),
    };
  } catch {
    return { items: fallback, error: readError };
  }
};

const saveStoredItems = (key: string, items: unknown[], limit: number) => {
  if (items.length > limit)
    throw new Error(
      `이 브라우저에서는 설정을 최대 ${limit}개까지 보관합니다.`,
    );
  try {
    localStorage.setItem(key, JSON.stringify({ version: 1, items }));
  } catch {
    throw new Error(
      '브라우저에 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인하세요. 입력 내용은 유지됩니다.',
    );
  }
};

export const readDemoSystemParameters = (
  key: string,
  fallback: SystemParameter[],
) =>
  readStoredItems(
    key,
    fallback,
    isSystemParameter,
    '저장된 시스템 파라미터를 읽지 못했습니다. 샘플 값을 표시합니다. 다시 저장하면 현재 값으로 복구됩니다.',
  );

export const saveDemoSystemParameters = (key: string, items: SystemParameter[]) =>
  saveStoredItems(key, items, 500);

export const readDemoSecuritySettings = (
  key: string,
  fallback: SecuritySetting[],
) =>
  readStoredItems(
    key,
    fallback,
    isSecuritySetting,
    '저장된 보안 정책을 읽지 못했습니다. 샘플 값을 표시합니다. 다시 저장하면 현재 값으로 복구됩니다.',
  );

export const saveDemoSecuritySettings = (key: string, items: SecuritySetting[]) =>
  saveStoredItems(key, items, 500);

export const readDemoSettingChangeHistory = (
  key: string,
): { items: SettingChangeHistory[]; error?: string } => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { items: [] };
    const data = JSON.parse(raw);
    if (
      data.version !== 1 ||
      !Array.isArray(data.items) ||
      data.items.length > 100 ||
      !data.items.every(isSettingChangeHistory)
    )
      throw new Error('invalid');
    return { items: data.items };
  } catch {
    return {
      items: [],
      error:
        '저장된 설정 변경 이력을 읽지 못했습니다. 기존 브라우저 저장 상태를 확인해 주세요.',
    };
  }
};

export const saveDemoSettingChangeHistory = (
  key: string,
  items: SettingChangeHistory[],
) => {
  if (items.length > 100)
    throw new Error(
      '이 브라우저에서는 설정 변경 이력을 최대 100건까지 보관합니다.',
    );
  try {
    localStorage.setItem(key, JSON.stringify({ version: 1, items }));
  } catch {
    throw new Error(
      '브라우저에 변경 이력을 저장하지 못했습니다. 저장 공간을 확인하세요.',
    );
  }
};
