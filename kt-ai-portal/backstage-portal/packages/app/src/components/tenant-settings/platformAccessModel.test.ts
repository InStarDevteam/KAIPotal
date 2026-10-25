import { validPlatformPreferences } from './platformAccessModel';

test('legacy preferences inherit tenant appearance', () => {
  expect(validPlatformPreferences({ platformOrder: [], favorites: [] })).toBe(
    true,
  );
});

test.each(['tenant', 'aurora', 'focus', 'orbit', 'canvas'])(
  'personal %s design preserves ordered platforms and favorites',
  design => {
    expect(
      validPlatformPreferences({
        platformOrder: ['data', 'vdi', 'cloud', 'ai'],
        favorites: ['data'],
        design,
        fontScale: 1.2,
      }),
    ).toBe(true);
  },
);

test.each([
  { design: 'other' },
  { design: null },
  { fontScale: '1.1' },
  { fontScale: 1.01 },
  { fontScale: null },
  { roles: ['portal-admin'] },
])(
  'cannot accept unsupported appearance or unrelated access fields %j',
  patch => {
    expect(
      validPlatformPreferences({ platformOrder: [], favorites: [], ...patch }),
    ).toBe(false);
  },
);
