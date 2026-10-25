import {
  defaultTenantSettings,
  mergeTenantMenus,
  readDemoSettings,
  safeLogoUrl,
  tenantSettingsStorageKey,
  validateTenantSettings,
} from './settingsModel';

afterEach(() => localStorage.clear());

test('branch defaults are complete, accessible, and preserve mandatory menus', () => {
  for (const branch of ['army', 'navy', 'airforce', 'joint']) {
    const settings = defaultTenantSettings(branch);
    expect(validateTenantSettings(settings)).toEqual([]);
    expect(
      settings.menus.find(menu => menu.id === 'tenant-settings')?.visible,
    ).toBe(true);
    expect(settings.menus.some(menu => menu.id === 'krmf-evidence')).toBe(
      false,
    );
  }
});

test('rejects inaccessible colors, hidden home, duplicate order, and archived menu injection', () => {
  const settings = defaultTenantSettings('army');
  settings.branding.primaryColor = '#ffffff';
  settings.menus[0].visible = false;
  settings.menus[1].order = settings.menus[0].order;
  settings.menus.push({
    id: 'krmf-evidence',
    label: '보안',
    visible: true,
    order: 99,
  });
  const errors = validateTenantSettings(settings).join(' ');
  expect(errors).toContain('명암비');
  expect(errors).toContain('숨길 수 없습니다');
  expect(errors).toContain('중복');
  expect(errors).toContain('다시 불러오세요');
});

test.each([
  // eslint-disable-next-line no-script-url -- Deliberately unsafe test input must be rejected.
  'javascript:alert(1)',
  'data:image/svg+xml;base64,xyz',
  '//external/logo.png',
  '/\\external/logo',
  'https://user:password@example.org/logo.png',
  'https://example.org/<svg>',
  '/\nlogo',
])('rejects unsafe logo source %s', value => {
  expect(safeLogoUrl(value)).toBe(false);
});

test.each(['', '/assets/army.png', 'https://example.org/army.png'])(
  'allows safe logo source %s',
  value => {
    expect(safeLogoUrl(value)).toBe(true);
  },
);

test('demo storage isolates tenants while sharing the selected tenant settings', () => {
  const settings = defaultTenantSettings('army');
  settings.branding.portalTitle = '육군 연구 포털';
  settings.version = 3;
  localStorage.setItem(
    tenantSettingsStorageKey('army'),
    JSON.stringify(settings),
  );
  expect(readDemoSettings(localStorage, 'army').branding.portalTitle).toBe(
    '육군 연구 포털',
  );
  expect(readDemoSettings(localStorage, 'navy').branding.portalTitle).not.toBe(
    '육군 연구 포털',
  );
  expect(readDemoSettings(localStorage, 'navy').version).toBe(0);
});

test('corrupt or obsolete browser configuration safely falls back to complete defaults', () => {
  localStorage.setItem(tenantSettingsStorageKey('army'), '{');
  expect(
    validateTenantSettings(readDemoSettings(localStorage, 'army')),
  ).toEqual([]);
  localStorage.setItem(
    tenantSettingsStorageKey('army'),
    JSON.stringify({ version: 99, menus: [] }),
  );
  expect(readDemoSettings(localStorage, 'army').version).toBe(0);
});

test('new menu definitions append without losing existing branding and order', () => {
  const settings = defaultTenantSettings('army');
  const lastMenu = settings.menus.pop()!;
  settings.branding.portalTitle = '고객 맞춤 포털';
  settings.menus[0].label = '시작 화면';
  localStorage.setItem(
    tenantSettingsStorageKey('army'),
    JSON.stringify(settings),
  );
  const loaded = readDemoSettings(localStorage, 'army');
  expect(loaded.branding.portalTitle).toBe('고객 맞춤 포털');
  expect(loaded.menus[0].label).toBe('시작 화면');
  expect(loaded.menus.some(menu => menu.id === lastMenu.id)).toBe(true);
  expect(validateTenantSettings(loaded)).toEqual([]);
});

test('legacy tenant settings inherit appearance without discarding saved colors, text, or menu order', () => {
  const settings = defaultTenantSettings('army');
  delete settings.branding.design;
  delete settings.branding.fontScale;
  settings.branding.portalTitle = '저장된 육군 포털';
  const loaded = mergeTenantMenus(settings);
  expect(loaded.branding.design).toBe('aurora');
  expect(loaded.branding.fontScale).toBe(1);
  expect(loaded.branding.portalTitle).toBe('저장된 육군 포털');
  expect(loaded.menus).toEqual(settings.menus);
  expect(validateTenantSettings(loaded)).toEqual([]);
});

test.each([
  { design: 'unknown' },
  { design: null },
  { fontScale: 1.01 },
  { fontScale: '1.2' },
  { fontScale: 9 },
  { fontScale: Number.NaN },
])('invalid tenant appearance is rejected before saving %j', patch => {
  const settings = defaultTenantSettings('army');
  Object.assign(settings.branding, patch);
  expect(validateTenantSettings(settings).length).toBeGreaterThan(0);
});

test('saved appearance is tenant scoped and survives legacy menu repair', () => {
  const army = defaultTenantSettings('army');
  army.branding.design = 'focus';
  army.branding.fontScale = 1.2;
  army.menus.pop();
  localStorage.setItem(tenantSettingsStorageKey('army'), JSON.stringify(army));
  expect(readDemoSettings(localStorage, 'army').branding.design).toBe('focus');
  expect(readDemoSettings(localStorage, 'army').branding.fontScale).toBe(1.2);
  expect(readDemoSettings(localStorage, 'navy').branding.design).toBe('aurora');
});
