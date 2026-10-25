export const PORTAL_DESIGN_IDS = [
  'aurora',
  'focus',
  'orbit',
  'canvas',
] as const;
export type PortalDesign = (typeof PORTAL_DESIGN_IDS)[number];
export const PORTAL_FONT_SCALES = [0.9, 1, 1.1, 1.2] as const;

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

/** Legacy saved branding inherits the same defaults as newly created tenants. */
export const normalizeTenantBranding = (
  branding: TenantBranding,
): TenantBranding => ({
  ...branding,
  design: branding.design ?? 'aurora',
  fontScale: branding.fontScale ?? 1,
});

export interface TenantMenu {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

// Keep route IDs aligned with the active portal menu registry. Archived workflows
// cannot be re-enabled through tenant configuration.
export const tenantMenuDefinitions: Array<{
  id: string;
  label: string;
  permissions: string[];
}> = [
  {
    id: 'portal-dashboard',
    label: '포털 홈',
    permissions: ['portal.view'],
  },
  { id: 'portal-work', label: '포털 업무', permissions: ['portal.view'] },
  {
    id: 'admin-console',
    label: '관리자 콘솔',
    permissions: ['user.manage', 'rbac.manage', 'menu.manage'],
  },
  {
    id: 'role-menu-preview',
    label: '권한별 메뉴 미리보기',
    permissions: ['menu.manage', 'rbac.manage'],
  },
  {
    id: 'krmf-monitor',
    label: 'K-RMF 현황',
    permissions: ['krmf.view'],
  },
  { id: 'integrated-search', label: '통합검색', permissions: ['catalog.view'] },
  {
    id: 'service-catalog',
    label: '서비스/도구 카탈로그',
    permissions: ['catalog.view'],
  },
  {
    id: 'project-workspace',
    label: '프로젝트/워크스페이스',
    permissions: ['project.request', 'project.approve'],
  },
  {
    id: 'credit-manager',
    label: '크레딧 관리',
    permissions: ['credit.view', 'credit.approve'],
  },
  {
    id: 'export-approval',
    label: '반입·반출 승인',
    permissions: ['export.request', 'export.review'],
  },
  { id: 'my-page', label: '마이페이지', permissions: ['portal.view'] },
  {
    id: 'environment-settings',
    label: '환경설정',
    permissions: ['settings.manage'],
  },
  {
    id: 'tenant-management',
    label: '테넌트·접근 관리',
    permissions: ['tenant.manage'],
  },
  {
    id: 'tenant-settings',
    label: '군별 포털 설정',
    permissions: ['settings.manage', 'tenant.manage', 'menu.manage'],
  },
  {
    id: 'developer-console',
    label: '개발 관리자',
    permissions: ['integration.view'],
  },
  { id: 'audit-history', label: '접속·사용 이력', permissions: ['audit.view'] },
  { id: 'proposal-board', label: '제안 게시판', permissions: ['portal.view'] },
];

export const defaultTenantSettings = (tenant: {
  id: string;
  name: string;
  branch: string;
}) => {
  const palettes: Record<string, [string, string, string]> = {
    army: ['#315b45', '#d7a64b', '육군'],
    navy: ['#174a74', '#47a6c8', '해군'],
    airforce: ['#285b99', '#73bddd', '공군'],
    joint: ['#39467a', '#8f81c7', '합동'],
    marines: ['#983c3b', '#d4a54b', '해병대'],
  };
  const [primaryColor, accentColor, shortName] =
    palettes[tenant.branch] ?? palettes.joint;
  return {
    tenantId: tenant.id,
    version: 0,
    branding: {
      primaryColor,
      accentColor,
      shortName,
      logoUrl: '',
      portalTitle: `${tenant.name} 지능형플랫폼 포털`,
      welcomeText: '필요한 자산을 찾고, 프로젝트를 시작하세요.',
      supportText: '포털 이용 문의는 소속 군 관리자에게 문의해 주세요.',
      design: 'aurora' as PortalDesign,
      fontScale: 1,
    },
    menus: tenantMenuDefinitions.map(({ id, label }, order) => ({
      id,
      label,
      order,
      visible: true,
    })),
  };
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const safeText = (value: unknown, min: number, max: number) =>
  typeof value === 'string' &&
  value.trim().length >= min &&
  value.length <= max &&
  !/[<>]/.test(value) &&
  Array.from(value).every(character => {
    const code = character.charCodeAt(0);
    return code >= 32 && code !== 127;
  });

const safeLogo = (value: unknown): boolean => {
  if (
    typeof value !== 'string' ||
    value.length > 2048 ||
    /[\s\\<>]/.test(value)
  )
    return false;
  if (!value) return true;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
};

const contrastWithWhite = (color: string): number => {
  const rgb = [1, 3, 5]
    .map(offset => parseInt(color.slice(offset, offset + 2), 16) / 255)
    .map(value =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return 1.05 / (rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 + 0.05);
};

export const validBranding = (value: unknown): value is TenantBranding => {
  if (!isObject(value)) return false;
  return (
    Object.keys(value).every(key =>
      [
        'primaryColor',
        'accentColor',
        'logoUrl',
        'portalTitle',
        'shortName',
        'welcomeText',
        'supportText',
        'design',
        'fontScale',
      ].includes(key),
    ) &&
    (value.design === undefined ||
      PORTAL_DESIGN_IDS.includes(value.design as PortalDesign)) &&
    (value.fontScale === undefined ||
      PORTAL_FONT_SCALES.some(scale => scale === value.fontScale)) &&
    typeof value.primaryColor === 'string' &&
    /^#[0-9a-f]{6}$/i.test(value.primaryColor) &&
    contrastWithWhite(value.primaryColor) >= 4.5 &&
    typeof value.accentColor === 'string' &&
    /^#[0-9a-f]{6}$/i.test(value.accentColor) &&
    safeLogo(value.logoUrl) &&
    safeText(value.portalTitle, 1, 80) &&
    safeText(value.shortName, 1, 24) &&
    safeText(value.welcomeText, 0, 160) &&
    safeText(value.supportText, 0, 160)
  );
};

export const validMenus = (value: unknown): value is TenantMenu[] => {
  if (!Array.isArray(value) || value.length !== tenantMenuDefinitions.length)
    return false;
  const ids = new Set<string>();
  const orders = new Set<number>();
  for (const menu of value) {
    if (
      !isObject(menu) ||
      Object.keys(menu).length !== 4 ||
      typeof menu.id !== 'string' ||
      !tenantMenuDefinitions.some(item => item.id === menu.id) ||
      ids.has(menu.id) ||
      !safeText(menu.label, 1, 40) ||
      typeof menu.visible !== 'boolean' ||
      typeof menu.order !== 'number' ||
      !Number.isInteger(menu.order) ||
      menu.order < 0 ||
      menu.order > 999 ||
      orders.has(menu.order) ||
      (['portal-dashboard', 'portal-work', 'tenant-settings'].includes(
        menu.id,
      ) &&
        !menu.visible)
    )
      return false;
    ids.add(menu.id);
    orders.add(menu.order);
  }
  return true;
};

export function mergeTenantMenus(menus: TenantMenu[]): TenantMenu[] {
  const missing = tenantMenuDefinitions.filter(
    menu => !menus.some(saved => saved.id === menu.id),
  );
  const start = Math.max(-1, ...menus.map(menu => menu.order)) + 1;
  return [
    ...menus,
    ...missing.map((menu, index) => ({
      id: menu.id,
      label: menu.label,
      visible: true,
      order: start + index,
    })),
  ];
}
