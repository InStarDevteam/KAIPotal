import {
  defaultPlatformPolicy,
  platformAccessDecision,
  safePlatformUrl,
  validPlatformPolicy,
  validPlatformPreferences,
} from './platformAccess';

const user = '80ed3015-4b1f-4efa-ab1f-f0f97f88011a';
test('a user allowlist cannot override tenant disable or role denial, including portal admins', () => {
  const platform = defaultPlatformPolicy().platforms[0];
  const grants = { [user]: ['ai' as const] };
  expect(
    platformAccessDecision(
      { ...platform, enabled: false },
      grants,
      user,
      new Set(['portal-admin']),
    ).canAccess,
  ).toBe(false);
  expect(
    platformAccessDecision(
      { ...platform, allowedRoles: ['branch-admin'] },
      grants,
      user,
      new Set(['general-user']),
    ).canAccess,
  ).toBe(false);
  expect(
    platformAccessDecision(
      platform,
      { [user]: [] },
      user,
      new Set(['portal-admin']),
    ).canAccess,
  ).toBe(false);
});
test('active role permission and absence of a user restriction permit platform entry', () => {
  const platform = defaultPlatformPolicy().platforms[0];
  expect(
    platformAccessDecision(platform, {}, user, new Set(['general-user']))
      .canAccess,
  ).toBe(true);
  expect(platformAccessDecision(platform, {}, user, new Set()).canAccess).toBe(
    false,
  );
});
test.each([
  'http://platform.example',
  // eslint-disable-next-line no-script-url -- Malicious input must be rejected by validation.
  'javascript:alert(1)',
  '//platform.example',
  'https://user:secret@example.org',
  'https://example.org/\nfoo',
])('rejects unsafe handoff URL %s', value =>
  expect(safePlatformUrl(value)).toBe(false),
);
test('validates complete policies and rejects cross-contract role injections and malformed objects', () => {
  expect(validPlatformPolicy(defaultPlatformPolicy())).toBe(true);
  expect(
    validPlatformPolicy({
      ...defaultPlatformPolicy(),
      userGrants: { [user]: ['ai'] },
    }),
  ).toBe(true);
  expect(
    validPlatformPolicy({
      ...defaultPlatformPolicy(),
      userGrants: { 'another-tenant-name': ['ai'] },
    }),
  ).toBe(false);
  expect(
    validPlatformPolicy({
      ...defaultPlatformPolicy(),
      roles: ['portal-admin'],
    }),
  ).toBe(false);
  expect(
    validPlatformPolicy({
      ...defaultPlatformPolicy(),
      platforms: [null, null, null, null],
    }),
  ).toBe(false);
});
test('personal preferences cannot smuggle access grants or hidden platform IDs', () => {
  expect(
    validPlatformPreferences({
      platformOrder: ['vdi', 'cloud', 'data', 'ai'],
      favorites: ['vdi'],
    }),
  ).toBe(true);
  expect(
    validPlatformPreferences({ platformOrder: [], favorites: ['unknown'] }),
  ).toBe(false);
  expect(
    validPlatformPreferences({
      platformOrder: [],
      favorites: [],
      roles: ['portal-admin'],
    }),
  ).toBe(false);
  expect(
    validPlatformPreferences({ platformOrder: ['ai'], favorites: [] }),
  ).toBe(false);
});

test.each(['tenant', 'aurora', 'focus', 'orbit', 'canvas'])(
  'accepts persisted personal design %s alongside platform ordering',
  design => {
    expect(
      validPlatformPreferences({
        platformOrder: ['vdi', 'cloud', 'data', 'ai'],
        favorites: ['ai'],
        design,
        fontScale: 1.1,
      }),
    ).toBe(true);
  },
);

test.each([
  { design: 'unknown' },
  { design: 1 },
  { design: null },
  { fontScale: 0 },
  { fontScale: '1.2' },
  { fontScale: 1.01 },
  { fontScale: null },
  { fontScale: Number.POSITIVE_INFINITY },
])('rejects unsupported personal appearance %j', patch => {
  expect(
    validPlatformPreferences({ platformOrder: [], favorites: [], ...patch }),
  ).toBe(false);
});
