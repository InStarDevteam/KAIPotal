import {
  ActiveSession,
  ApiKey,
  EmailVerification,
  NotificationChannel,
  NotificationSetting,
  UserProfile,
} from './types';

export const myPageStorageKey = (
  store: string,
  tenantId: string,
  actorId: string,
) =>
  `kai.demo.myPage.${store}.v1:${encodeURIComponent(
    tenantId,
  )}:${encodeURIComponent(actorId)}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const hasStringFields = (value: unknown, fields: string[]) =>
  isRecord(value) &&
  fields.every(field => typeof value[field] === 'string');

const hasStringArrayFields = (value: unknown, fields: string[]) =>
  isRecord(value) &&
  fields.every(
    field => Array.isArray(value[field]) && (value[field] as unknown[]).every(item => typeof item === 'string'),
  );

const readRecord = <T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => boolean,
): { value: T; error?: string } => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { value: fallback };
    const data = JSON.parse(raw);
    if (data.version !== 1 || !validate(data.value)) throw new Error('invalid');
    return { value: data.value };
  } catch {
    return {
      value: fallback,
      error:
        '저장된 마이페이지 정보를 읽지 못했습니다. 기본 정보를 표시합니다. 다시 저장하면 현재 내용으로 복구됩니다.',
    };
  }
};

const saveRecord = <T>(key: string, value: T) => {
  try {
    localStorage.setItem(key, JSON.stringify({ version: 1, value }));
  } catch {
    throw new Error(
      '브라우저에 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인하세요. 입력 내용은 유지됩니다.',
    );
  }
};

const readItems = <T>(
  key: string,
  fallback: T[],
  validateItem: (item: unknown) => boolean,
  maxItems: number,
): { items: T[]; error?: string } => {
  const loaded = readRecord(key, fallback, value => {
    if (!Array.isArray(value) || value.length > maxItems) return false;
    return value.every(validateItem);
  });
  return { items: loaded.value, error: loaded.error };
};

const saveItems = <T>(key: string, items: T[], maxItems: number, label: string) => {
  if (items.length > maxItems)
    throw new Error(
      `이 브라우저에서는 ${label}을(를) 최대 ${maxItems}개까지 보관합니다.`,
    );
  saveRecord(key, items);
};

// 프로필
export const myPageProfileKey = (tenantId: string, actorId: string) =>
  myPageStorageKey('profile', tenantId, actorId);

const isUserProfile = (value: unknown): value is UserProfile =>
  hasStringFields(value, [
    'userId',
    'name',
    'email',
    'contact',
    'organization',
    'department',
    'position',
    'userType',
    'accountStatus',
    'lastLoginAt',
    'createdAt',
    'accessPeriod',
  ]) &&
  hasStringArrayFields(value, ['roles', 'groups']) &&
  isRecord(value) &&
  typeof value.isProfilePublic === 'boolean';

export const readMyPageProfile = (key: string, fallback: UserProfile) => {
  const loaded = readRecord(key, fallback, isUserProfile);
  return { profile: loaded.value, error: loaded.error };
};

export const saveMyPageProfile = (key: string, profile: UserProfile) => {
  if (
    !profile.name.trim() ||
    Object.values(profile).some(
      value => typeof value === 'string' && value.length > 200,
    )
  )
    throw new Error('이름을 입력하고, 각 항목은 200자 이내로 작성하세요.');
  saveRecord(key, profile);
};

// 이메일 확인 상태
export const myPageEmailKey = (tenantId: string, actorId: string) =>
  myPageStorageKey('email', tenantId, actorId);

const isEmailVerification = (value: unknown): value is EmailVerification =>
  hasStringFields(value, ['currentEmail', 'status', 'lastVerifiedAt']) &&
  isRecord(value) &&
  ['확인됨', '대기중', '변경요청중'].includes(value.status as string) &&
  (value.requestedEmail === undefined ||
    typeof value.requestedEmail === 'string') &&
  (value.sentAt === undefined || typeof value.sentAt === 'string') &&
  (value.pendingStatus === undefined ||
    typeof value.pendingStatus === 'string');

export const readMyPageEmail = (key: string, fallback: EmailVerification) => {
  const loaded = readRecord(key, fallback, isEmailVerification);
  return { verification: loaded.value, error: loaded.error };
};

export const saveMyPageEmail = (key: string, verification: EmailVerification) => {
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verification.currentEmail) ||
    (verification.requestedEmail !== undefined &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verification.requestedEmail))
  )
    throw new Error('이메일 형식을 확인하세요.');
  saveRecord(key, verification);
};

// 활성 세션
export const myPageSessionsKey = (tenantId: string, actorId: string) =>
  myPageStorageKey('sessions', tenantId, actorId);

const isActiveSession = (value: unknown): value is ActiveSession =>
  hasStringFields(value, [
    'id',
    'loginAt',
    'lastActiveAt',
    'ip',
    'browser',
    'os',
    'location',
    'authMethod',
    'status',
  ]) &&
  isRecord(value) &&
  typeof value.isCurrent === 'boolean' &&
  ['활성', '만료예정', '종료', '강제종료'].includes(value.status as string);

const MAX_SESSIONS = 50;

export const readMyPageSessions = (key: string, fallback: ActiveSession[]) =>
  readItems(key, fallback, isActiveSession, MAX_SESSIONS);

export const saveMyPageSessions = (key: string, items: ActiveSession[]) =>
  saveItems(key, items, MAX_SESSIONS, '세션');

// 개인 API Key
export const myPageApiKeysKey = (tenantId: string, actorId: string) =>
  myPageStorageKey('apiKeys', tenantId, actorId);

const isApiKey = (value: unknown): value is ApiKey =>
  hasStringFields(value, [
    'id',
    'name',
    'description',
    'maskedKey',
    'createdAt',
    'expiresAt',
    'status',
  ]) &&
  hasStringArrayFields(value, ['services', 'scopes']) &&
  isRecord(value) &&
  (value.lastUsedAt === undefined || typeof value.lastUsedAt === 'string') &&
  ['활성', '만료', '폐기'].includes(value.status as string);

const MAX_API_KEYS = 10;

export const readMyPageApiKeys = (key: string, fallback: ApiKey[]) =>
  readItems(key, fallback, isApiKey, MAX_API_KEYS);

export const saveMyPageApiKeys = (key: string, items: ApiKey[]) =>
  saveItems(key, items, MAX_API_KEYS, 'API Key');

export const demoApiKeyId = () =>
  `key-demo-${
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }`;

// 데모 키는 목록에는 마스킹된 형태만 남기고, 전체 값은 생성 직후 한 번만 표시한다.
export const createDemoApiKey = (
  name: string,
  description: string,
): { apiKey: ApiKey; fullKey: string } => {
  const random = `${crypto.getRandomValues(new Uint8Array(8)).reduce(
    (hex, byte) => hex + byte.toString(16).padStart(2, '0'),
    '',
  )}`;
  const fullKey = `kaip_demo_${random}`;
  return {
    apiKey: {
      id: demoApiKeyId(),
      name: name.trim(),
      description,
      maskedKey: `kaip_demo_****_${random.slice(-4)}`,
      services: ['Service Catalog'],
      scopes: ['read'],
      createdAt: new Date().toISOString().slice(0, 10),
      expiresAt: '2026-12-31',
      status: '활성',
    },
    fullKey,
  };
};

// 알림 설정
export const myPageNotificationsKey = (tenantId: string, actorId: string) =>
  myPageStorageKey('notifications', tenantId, actorId);

const notificationChannels: NotificationChannel[] = [
  '포털 알림',
  '이메일',
  'SMS',
  '메신저',
];

const isNotificationSetting = (value: unknown): value is NotificationSetting =>
  hasStringFields(value, ['id', 'type']) &&
  isRecord(value) &&
  typeof value.enabled === 'boolean' &&
  Array.isArray(value.channels) &&
  (value.channels as unknown[]).every(
    channel =>
      typeof channel === 'string' &&
      notificationChannels.includes(channel as NotificationChannel),
  ) &&
  (value.threshold === undefined || Number.isFinite(value.threshold)) &&
  (value.timeWindow === undefined || typeof value.timeWindow === 'string');

const MAX_NOTIFICATION_SETTINGS = 50;

export const readMyPageNotificationSettings = (
  key: string,
  fallback: NotificationSetting[],
) => readItems(key, fallback, isNotificationSetting, MAX_NOTIFICATION_SETTINGS);

export const saveMyPageNotificationSettings = (
  key: string,
  items: NotificationSetting[],
) => saveItems(key, items, MAX_NOTIFICATION_SETTINGS, '알림 설정');
