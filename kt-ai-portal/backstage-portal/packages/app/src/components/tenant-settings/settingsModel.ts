import { portalMenuDefinitions } from '../navigation/portalMenuDefinitions';

export const PORTAL_DESIGN_IDS = [
  'aurora',
  'focus',
  'orbit',
  'canvas',
] as const;
export type PortalDesign = (typeof PORTAL_DESIGN_IDS)[number];
export const PORTAL_FONT_SCALES = [0.9, 1, 1.1, 1.2] as const;
export const PORTAL_FONT_LABELS: Record<number, string> = {
  0.9: '작게',
  1: '기본',
  1.1: '크게',
  1.2: '아주 크게',
};

export interface TenantBranding {
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  portalTitle: string;
  shortName: string;
  welcomeText: string;
  supportText: string;
  design?: PortalDesign;
  fontScale?: number;
}

export interface TenantMenuSetting {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

export interface TenantSettings {
  version: number;
  branding: TenantBranding;
  menus: TenantMenuSetting[];
}

export const PROTECTED_MENU_IDS = [
  'portal-dashboard',
  'portal-work',
  'tenant-settings',
];

export const tenantSettingsStorageKey = (tenantId: string) =>
  `portal:demo:tenant-settings:v2:${encodeURIComponent(tenantId)}`;

const branchColors: Record<string, [string, string, string]> = {
  army: ['#315b45', '#d7a64b', '육군'],
  navy: ['#174a74', '#47a6c8', '해군'],
  airforce: ['#285b99', '#73bddd', '공군'],
  joint: ['#39467a', '#8f81c7', '합동'],
  marines: ['#983c3b', '#d4a54b', '해병대'],
};

export function defaultTenantSettings(
  tenantId: string,
  tenantName?: string,
): TenantSettings {
  const branch =
    Object.keys(branchColors).find(key => tenantId.includes(key)) || 'joint';
  const [primaryColor, accentColor, shortName] = branchColors[branch];
  return {
    version: 0,
    branding: {
      primaryColor,
      accentColor,
      logoUrl: '',
      portalTitle: `${tenantName || shortName} 지능형플랫폼 포털`,
      shortName,
      welcomeText: '필요한 자산을 찾고, 프로젝트를 시작하세요.',
      supportText: '포털 이용 문의는 소속 군 관리자에게 문의해 주세요.',
      design: 'aurora',
      fontScale: 1,
    },
    menus: portalMenuDefinitions.map((menu, order) => ({
      id: menu.id,
      label: menu.title,
      visible: true,
      order,
    })),
  };
}

export function whiteContrast(color: string): number {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return 0;
  const channels = [1, 3, 5].map(start => {
    const value = parseInt(color.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (
    1.05 /
    (channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 + 0.05)
  );
}

const hasControlCharacters = (value: string): boolean =>
  Array.from(value).some(character => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });

export function safeLogoUrl(value: string): boolean {
  if (!value) return true;
  if (hasControlCharacters(value) || /[\\\s<>]/.test(value)) return false;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function validateTenantSettings(settings: TenantSettings): string[] {
  const errors: string[] = [];
  const branding = settings?.branding;
  if (!branding || !Array.isArray(settings.menus))
    return ['설정 형식이 올바르지 않습니다.'];
  if (!Number.isSafeInteger(settings.version) || settings.version < 0)
    errors.push('설정 버전을 확인할 수 없습니다. 다시 불러오세요.');
  if (!/^#[0-9a-f]{6}$/i.test(branding.primaryColor))
    errors.push('대표 색상은 #123456 형식으로 입력하세요.');
  else if (whiteContrast(branding.primaryColor) < 4.5)
    errors.push(
      '대표 색상을 더 어둡게 조정하세요. 흰 글자와의 명암비가 4.5 이상이어야 합니다.',
    );
  if (!/^#[0-9a-f]{6}$/i.test(branding.accentColor))
    errors.push('강조 색상은 #123456 형식으로 입력하세요.');
  if (
    branding.design !== undefined &&
    !PORTAL_DESIGN_IDS.includes(branding.design)
  )
    errors.push('포털 디자인은 Aurora, Focus, Orbit, Canvas 중 선택하세요.');
  if (
    branding.fontScale !== undefined &&
    !PORTAL_FONT_SCALES.some(scale => scale === branding.fontScale)
  )
    errors.push('글자 크기는 90%, 100%, 110%, 120% 중 선택하세요.');
  if (
    typeof branding.logoUrl !== 'string' ||
    branding.logoUrl.length > 2048 ||
    !safeLogoUrl(branding.logoUrl)
  )
    errors.push('로고는 HTTPS 주소 또는 /로 시작하는 내부 경로를 입력하세요.');
  const bounds: [keyof TenantBranding, string, number, number][] = [
    ['portalTitle', '포털 이름', 1, 80],
    ['shortName', '약칭', 1, 24],
    ['welcomeText', '환영 문구', 0, 160],
    ['supportText', '도움말 문구', 0, 160],
  ];
  bounds.forEach(([key, label, min, max]) => {
    const value = branding[key];
    if (
      typeof value !== 'string' ||
      value.trim().length < min ||
      value.length > max
    )
      errors.push(`${label}은 ${min}~${max}자로 입력하세요.`);
    else if (hasControlCharacters(value) || /[<>]/.test(value))
      errors.push(`${label}에는 줄바꿈이나 <, > 문자를 사용할 수 없습니다.`);
  });
  const expectedIds = portalMenuDefinitions.map(menu => menu.id);
  if (
    settings.menus.length !== expectedIds.length ||
    new Set(settings.menus.map(menu => menu.id)).size !== expectedIds.length ||
    settings.menus.some(menu => !expectedIds.includes(menu.id))
  )
    errors.push('메뉴 목록이 변경되었습니다. 설정을 다시 불러오세요.');
  if (
    new Set(settings.menus.map(menu => menu.order)).size !==
    settings.menus.length
  )
    errors.push('메뉴 순서가 중복되었습니다.');
  if (
    settings.menus.some(
      menu =>
        typeof menu.label !== 'string' ||
        !menu.label.trim() ||
        menu.label.length > 40 ||
        hasControlCharacters(menu.label) ||
        /[<>]/.test(menu.label) ||
        typeof menu.visible !== 'boolean' ||
        !Number.isInteger(menu.order) ||
        menu.order < 0 ||
        menu.order > 999,
    )
  )
    errors.push(
      '메뉴 이름은 특수문자 없이 1~40자로 입력하고 올바른 순서를 지정하세요.',
    );
  if (
    settings.menus.some(
      menu => PROTECTED_MENU_IDS.includes(menu.id) && !menu.visible,
    )
  )
    errors.push('홈과 군별 포털 설정, 포털 업무는 숨길 수 없습니다.');
  return errors;
}

export function readDemoSettings(
  storage: Pick<Storage, 'getItem'>,
  tenantId: string,
  tenantName?: string,
): TenantSettings {
  const defaults = defaultTenantSettings(tenantId, tenantName);
  const raw = storage.getItem(tenantSettingsStorageKey(tenantId));
  if (!raw) return defaults;
  try {
    const settings = mergeTenantMenus(JSON.parse(raw) as TenantSettings);
    return validateTenantSettings(settings).length === 0 ? settings : defaults;
  } catch {
    return defaults;
  }
}

/** New portal capabilities append safely without discarding saved branding/order. */
export function mergeTenantMenus(settings: TenantSettings): TenantSettings {
  if (!settings || !Array.isArray(settings.menus)) return settings;
  const normalized = settings.branding
    ? {
        ...settings,
        branding: {
          ...settings.branding,
          design: settings.branding.design ?? 'aurora',
          fontScale: settings.branding.fontScale ?? 1,
        },
      }
    : settings;
  const existingIds = settings.menus.map(menu => menu.id);
  const missing = portalMenuDefinitions.filter(
    menu => !existingIds.includes(menu.id),
  );
  if (!missing.length) return normalized;
  const nextOrder = Math.max(-1, ...settings.menus.map(menu => menu.order)) + 1;
  return {
    ...normalized,
    menus: [
      ...settings.menus,
      ...missing.map((menu, index) => ({
        id: menu.id,
        label: menu.title,
        visible: true,
        order: nextOrder + index,
      })),
    ],
  };
}
