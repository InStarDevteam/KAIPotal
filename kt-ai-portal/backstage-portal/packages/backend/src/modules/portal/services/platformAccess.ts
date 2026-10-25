import {
  PORTAL_DESIGN_IDS,
  PORTAL_FONT_SCALES,
  PortalDesign,
} from './tenantSettings';

export const PLATFORM_IDS = ['ai', 'data', 'cloud', 'vdi'] as const;
export type PlatformId = (typeof PLATFORM_IDS)[number];
const ROLES = [
  'general-user',
  'project-manager',
  'branch-admin',
  'portal-admin',
  'security-manager',
  'security-auditor',
];
export interface PlatformPolicy {
  id: PlatformId;
  enabled: boolean;
  href: string;
  order: number;
  allowedRoles: string[];
}
export interface PlatformAccessPolicy {
  version: number;
  platforms: PlatformPolicy[];
  userGrants: Record<string, PlatformId[]>;
}
export interface PlatformPreferences {
  platformOrder: PlatformId[];
  favorites: PlatformId[];
  design?: 'tenant' | PortalDesign;
  fontScale?: number;
}
export const defaultPlatformPolicy = (): PlatformAccessPolicy => ({
  version: 0,
  platforms: PLATFORM_IDS.map((id, order) => ({
    id,
    order,
    enabled: true,
    href: '',
    allowedRoles: [...ROLES],
  })),
  userGrants: {},
});
export const defaultPlatformPreferences = (): PlatformPreferences => ({
  platformOrder: [],
  favorites: [],
});
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
export const safePlatformUrl = (value: unknown): boolean => {
  if (value === '') return true;
  if (
    typeof value !== 'string' ||
    value.length > 2048 ||
    /[\s\\<>]/.test(value)
  )
    return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !!url.hostname &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
};
const platformIds = (value: unknown): value is PlatformId[] =>
  Array.isArray(value) &&
  value.length <= 4 &&
  new Set(value).size === value.length &&
  value.every(id => PLATFORM_IDS.includes(id));
export function validPlatformPolicy(
  value: unknown,
): value is PlatformAccessPolicy {
  if (
    !object(value) ||
    Object.keys(value).some(
      k => !['version', 'platforms', 'userGrants'].includes(k),
    ) ||
    !Number.isSafeInteger(value.version) ||
    Number(value.version) < 0 ||
    !Array.isArray(value.platforms) ||
    value.platforms.length !== 4 ||
    !object(value.userGrants)
  )
    return false;
  const p = value.platforms;
  return (
    p.every(
      x =>
        object(x) &&
        Object.keys(x).length === 5 &&
        PLATFORM_IDS.includes(x.id as PlatformId) &&
        typeof x.enabled === 'boolean' &&
        safePlatformUrl(x.href) &&
        Number.isInteger(x.order) &&
        Number(x.order) >= 0 &&
        Number(x.order) < 4 &&
        Array.isArray(x.allowedRoles) &&
        new Set(x.allowedRoles).size === x.allowedRoles.length &&
        x.allowedRoles.every(r => ROLES.includes(r)),
    ) &&
    new Set(p.map(x => x.id)).size === 4 &&
    new Set(p.map(x => x.order)).size === 4 &&
    Object.entries(value.userGrants).length <= 1000 &&
    Object.entries(value.userGrants).every(
      ([id, grants]) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id,
        ) && platformIds(grants),
    )
  );
}
export function validPlatformPreferences(
  value: unknown,
): value is PlatformPreferences {
  return (
    object(value) &&
    Object.keys(value).every(key =>
      ['platformOrder', 'favorites', 'design', 'fontScale'].includes(key),
    ) &&
    (value.design === undefined ||
      value.design === 'tenant' ||
      PORTAL_DESIGN_IDS.includes(value.design as PortalDesign)) &&
    (value.fontScale === undefined ||
      PORTAL_FONT_SCALES.some(scale => scale === value.fontScale)) &&
    platformIds(value.platformOrder) &&
    (value.platformOrder.length === 0 || value.platformOrder.length === 4) &&
    platformIds(value.favorites)
  );
}
export function platformAccessDecision(
  policy: PlatformPolicy,
  grants: Record<string, PlatformId[]>,
  actorId: string,
  roles: Set<string>,
): { canAccess: boolean; reason: string } {
  if (!policy.enabled) return { canAccess: false, reason: 'tenant_disabled' };
  if (!policy.allowedRoles.some(role => roles.has(role)))
    return { canAccess: false, reason: 'role_denied' };
  if (
    Object.prototype.hasOwnProperty.call(grants, actorId) &&
    !grants[actorId].includes(policy.id)
  )
    return { canAccess: false, reason: 'user_denied' };
  return { canAccess: true, reason: '' };
}
