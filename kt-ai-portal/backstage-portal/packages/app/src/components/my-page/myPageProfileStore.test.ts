import {
  createDemoApiKey,
  myPageApiKeysKey,
  myPageEmailKey,
  myPageNotificationsKey,
  myPageProfileKey,
  myPageSessionsKey,
  readMyPageApiKeys,
  readMyPageEmail,
  readMyPageNotificationSettings,
  readMyPageProfile,
  readMyPageSessions,
  saveMyPageApiKeys,
  saveMyPageEmail,
  saveMyPageNotificationSettings,
  saveMyPageProfile,
  saveMyPageSessions,
} from './myPageProfileStore';
import {
  mockActiveSessions,
  mockApiKeys,
  mockEmailVerification,
  mockNotificationSettings,
  mockUserProfile,
} from './mockMyPageData';

afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

test('profile persists per tenant and actor without crossing boundaries', () => {
  const key = myPageProfileKey('army', 'demo:general-user');
  const edited = {
    ...mockUserProfile,
    name: '김수정',
    contact: '010-9999-8888',
    isProfilePublic: false,
  };
  saveMyPageProfile(key, edited);
  expect(readMyPageProfile(key, mockUserProfile).profile).toEqual(edited);
  expect(
    readMyPageProfile(myPageProfileKey('navy', 'demo:general-user'), mockUserProfile)
      .profile,
  ).toEqual(mockUserProfile);
  expect(
    readMyPageProfile(myPageProfileKey('army', 'demo:portal-admin'), mockUserProfile)
      .profile,
  ).toEqual(mockUserProfile);
});

test('profile save rejects blank name and storage failures stay visible', () => {
  expect(() =>
    saveMyPageProfile('key', { ...mockUserProfile, name: '  ' }),
  ).toThrow('이름을 입력');
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  expect(() => saveMyPageProfile('key', mockUserProfile)).toThrow(
    '저장하지 못했습니다',
  );
});

test('email verification state round-trips including pending requests', () => {
  const key = myPageEmailKey('army', 'demo:general-user');
  const pending = {
    ...mockEmailVerification,
    status: '대기중' as const,
    requestedEmail: 'new.mail@kt.com',
    sentAt: '2026-09-24T04:00:00Z',
  };
  saveMyPageEmail(key, pending);
  expect(readMyPageEmail(key, mockEmailVerification).verification).toEqual(
    pending,
  );
  expect(() =>
    saveMyPageEmail(key, { ...mockEmailVerification, requestedEmail: 'bad' }),
  ).toThrow('이메일 형식');
});

test('sessions are removable and persist, with malformed records reported', () => {
  const key = myPageSessionsKey('army', 'demo:general-user');
  const remaining = mockActiveSessions.filter(s => !s.isCurrent);
  saveMyPageSessions(key, remaining);
  expect(readMyPageSessions(key, mockActiveSessions).items).toEqual(remaining);
  localStorage.setItem('broken', '{"version":1,"value":[null]}');
  expect(readMyPageSessions('broken', mockActiveSessions).error).toBeTruthy();
  expect(() =>
    saveMyPageSessions(
      'key',
      Array.from({ length: 51 }, (_, i) => ({
        ...mockActiveSessions[0],
        id: `sess-${i}`,
      })),
    ),
  ).toThrow('최대 50개');
});

test('api keys persist masked values and demo keys carry the kaip_demo_ prefix', () => {
  const key = myPageApiKeysKey('army', 'demo:general-user');
  const { apiKey, fullKey } = createDemoApiKey('테스트 키', '데모 용도');
  expect(fullKey.startsWith('kaip_demo_')).toBe(true);
  expect(apiKey.maskedKey.startsWith('kaip_demo_')).toBe(true);
  expect(apiKey.maskedKey).not.toContain(fullKey.slice(8, -4));
  saveMyPageApiKeys(key, [apiKey, ...mockApiKeys]);
  expect(readMyPageApiKeys(key, []).items).toHaveLength(3);
  expect(() =>
    saveMyPageApiKeys(
      'key',
      Array.from({ length: 11 }, (_, i) => ({
        ...mockApiKeys[0],
        id: `key-${i}`,
      })),
    ),
  ).toThrow('최대 10개');
});

test('notification settings round-trip and reject invalid channels', () => {
  const key = myPageNotificationsKey('army', 'demo:general-user');
  const changed = mockNotificationSettings.map(item =>
    item.id === 'noti-001'
      ? { ...item, enabled: false, channels: ['포털 알림'] as ('포털 알림')[] }
      : item,
  );
  saveMyPageNotificationSettings(key, changed);
  expect(readMyPageNotificationSettings(key, []).items).toEqual(changed);
  localStorage.setItem(
    'bad-channel',
    JSON.stringify({
      version: 1,
      value: [
        { id: 'n1', type: 'x', enabled: true, channels: ['팩스'] },
      ],
    }),
  );
  expect(
    readMyPageNotificationSettings('bad-channel', mockNotificationSettings).error,
  ).toBeTruthy();
});
