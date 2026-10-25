import {
  defaultTenantSettings,
  normalizeTenantBranding,
  validBranding,
} from './tenantSettings';

const defaultBranding = () =>
  defaultTenantSettings({ id: 'army-id', name: '육군', branch: 'army' })
    .branding;

test('old tenant branding remains valid and inherits appearance defaults without losing identity', () => {
  const {
    design: _design,
    fontScale: _fontScale,
    ...legacy
  } = defaultBranding();
  expect(validBranding(legacy)).toBe(true);
  expect(normalizeTenantBranding(legacy)).toEqual({
    ...legacy,
    design: 'aurora',
    fontScale: 1,
  });
});

test.each(['aurora', 'focus', 'orbit', 'canvas'])(
  'supports the %s tenant design',
  design => {
    expect(
      validBranding({ ...defaultBranding(), design, fontScale: 1.2 }),
    ).toBe(true);
  },
);

test.each([0.9, 1, 1.1, 1.2])('supports %s tenant font scaling', fontScale => {
  expect(validBranding({ ...defaultBranding(), fontScale })).toBe(true);
});

test.each([
  { design: 'unknown' },
  { design: null },
  { fontScale: '1.2' },
  { fontScale: 0.5 },
  { fontScale: 5 },
  { fontScale: 1.01 },
  { fontScale: null },
  { fontScale: Number.NaN },
  { roles: ['portal-admin'] },
  { primaryColor: '#ffffff' },
])('rejects unsafe or unsupported branding %j', patch => {
  expect(validBranding({ ...defaultBranding(), ...patch })).toBe(false);
});

test('normalization preserves a saved appearance when older clients omit its fields', () => {
  const saved = {
    ...defaultBranding(),
    design: 'orbit' as const,
    fontScale: 1.2,
  };
  const {
    design: _design,
    fontScale: _fontScale,
    ...legacy
  } = defaultBranding();
  expect(normalizeTenantBranding({ ...saved, ...legacy })).toEqual(saved);
});
