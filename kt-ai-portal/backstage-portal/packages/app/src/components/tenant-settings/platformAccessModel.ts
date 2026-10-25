import { PortalRole, PORTAL_ROLES } from '../authz/types';
import {
  PORTAL_DESIGN_IDS,
  PORTAL_FONT_SCALES,
  PortalDesign,
} from './settingsModel';

export const PLATFORM_IDS = ['ai', 'data', 'cloud', 'vdi'] as const;
export type PlatformId = (typeof PLATFORM_IDS)[number];
export const PLATFORM_DETAILS: Record<
  PlatformId,
  { name: string; description: string; color: string }
> = {
  ai: {
    name: 'AI 플랫폼',
    description: '아이디어를 모델로, 모델을 서비스로.',
    color: '#6558d9',
  },
  data: {
    name: '데이터 플랫폼',
    description: '필요한 데이터를 찾고 분석하세요.',
    color: '#168b86',
  },
  cloud: {
    name: '클라우드 플랫폼',
    description: '업무에 필요한 자원을 유연하게.',
    color: '#3478d4',
  },
  vdi: {
    name: 'VDI',
    description: '안전한 나만의 업무 공간.',
    color: '#be7b37',
  },
};
export interface PlatformPolicy {
  id: PlatformId;
  enabled: boolean;
  href: string;
  order: number;
  allowedRoles: PortalRole[];
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
export interface PlatformMember {
  id: string;
  membershipId: string;
  name: string;
  roles: PortalRole[];
}
export const platformPolicyKey = (tenantId: string) =>
  `portal:demo:platform-access:v1:${encodeURIComponent(tenantId)}`;
export const preferencesKey = (tenantId: string, actorId: string) =>
  `portal:preferences:v1:${encodeURIComponent(tenantId)}:${encodeURIComponent(
    actorId,
  )}`;
export const memberRolesKey = (tenantId: string) =>
  `portal:demo:member-roles:v1:${encodeURIComponent(tenantId)}`;
export const defaultPlatformPolicy = (): PlatformAccessPolicy => ({
  version: 0,
  platforms: PLATFORM_IDS.map((id, order) => ({
    id,
    order,
    enabled: true,
    href: '',
    allowedRoles: [...PORTAL_ROLES],
  })),
  userGrants: {},
});
export const defaultPlatformPreferences = (): PlatformPreferences => ({
  platformOrder: [],
  favorites: [],
});
export function safePlatformUrl(value: unknown): boolean {
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
}
export function validPlatformPolicy(
  value: unknown,
): value is PlatformAccessPolicy {
  const p = value as PlatformAccessPolicy;
  return (
    !!p &&
    Number.isSafeInteger(p.version) &&
    p.version >= 0 &&
    Array.isArray(p.platforms) &&
    p.platforms.length === 4 &&
    new Set(p.platforms.map(x => x.id)).size === 4 &&
    new Set(p.platforms.map(x => x.order)).size === 4 &&
    p.platforms.every(
      x =>
        PLATFORM_IDS.includes(x.id) &&
        typeof x.enabled === 'boolean' &&
        safePlatformUrl(x.href) &&
        Number.isInteger(x.order) &&
        x.order >= 0 &&
        x.order < 4 &&
        Array.isArray(x.allowedRoles) &&
        new Set(x.allowedRoles).size === x.allowedRoles.length &&
        x.allowedRoles.every(r => PORTAL_ROLES.includes(r)),
    ) &&
    !!p.userGrants &&
    typeof p.userGrants === 'object' &&
    !Array.isArray(p.userGrants) &&
    Object.entries(p.userGrants).every(
      ([key, ids]) =>
        key.length > 0 &&
        key.length < 150 &&
        Array.isArray(ids) &&
        new Set(ids).size === ids.length &&
        ids.every(id => PLATFORM_IDS.includes(id)),
    )
  );
}
export function validPlatformPreferences(
  value: unknown,
): value is PlatformPreferences {
  const p = value as PlatformPreferences;
  return (
    !!p &&
    typeof p === 'object' &&
    !Array.isArray(p) &&
    Object.keys(p).every(key =>
      ['platformOrder', 'favorites', 'design', 'fontScale'].includes(key),
    ) &&
    (p.design === undefined ||
      p.design === 'tenant' ||
      PORTAL_DESIGN_IDS.includes(p.design)) &&
    (p.fontScale === undefined ||
      PORTAL_FONT_SCALES.some(scale => scale === p.fontScale)) &&
    ['platformOrder', 'favorites'].every(key => {
      const ids = p[key as 'platformOrder' | 'favorites'];
      return (
        Array.isArray(ids) &&
        (key !== 'platformOrder' || ids.length === 0 || ids.length === 4) &&
        new Set(ids).size === ids.length &&
        ids.every(id => PLATFORM_IDS.includes(id))
      );
    })
  );
}
export function readDemoPlatformPolicy(tenantId: string): PlatformAccessPolicy {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(platformPolicyKey(tenantId)) || 'null',
    );
    if (validPlatformPolicy(parsed)) return parsed;
  } catch {
    /* recover invalid local preview state */
  }
  return defaultPlatformPolicy();
}
export function readDemoMemberRoles(
  tenantId: string,
): Record<string, PortalRole[]> {
  try {
    const value = JSON.parse(
      localStorage.getItem(memberRolesKey(tenantId)) || '{}',
    );
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.values(value).every(
        roles =>
          Array.isArray(roles) &&
          roles.length > 0 &&
          roles.every(r => PORTAL_ROLES.includes(r)),
      )
    )
      return value;
  } catch {
    /* recover */
  }
  return {};
}
export function demoPlatformMembers(tenantId: string): PlatformMember[] {
  const overrides = readDemoMemberRoles(tenantId);
  return [
    { id: 'demo:general-user', name: '김민준', roles: ['general-user'] },
    { id: 'demo:project-manager', name: '이서연', roles: ['project-manager'] },
    { id: 'demo:branch-admin', name: '박지훈', roles: ['branch-admin'] },
    {
      id: 'demo:portal-admin',
      name: '통합 운영 관리자',
      roles: ['portal-admin'],
    },
  ].map(member => ({
    ...member,
    membershipId: member.id,
    roles: overrides[member.id] || (member.roles as PortalRole[]),
  }));
}
export function platformAccessDecision(
  policy: PlatformPolicy,
  userGrants: Record<string, PlatformId[]>,
  actorId: string,
  roles: PortalRole[],
): { canAccess: boolean; reason: string } {
  if (!policy.enabled)
    return {
      canAccess: false,
      reason: '소속 테넌트에서 사용 중지한 플랫폼입니다.',
    };
  if (!roles.some(role => policy.allowedRoles.includes(role)))
    return {
      canAccess: false,
      reason: '현재 역할에 플랫폼 이용 권한이 없습니다.',
    };
  if (
    Object.prototype.hasOwnProperty.call(userGrants, actorId) &&
    !userGrants[actorId].includes(policy.id)
  )
    return {
      canAccess: false,
      reason: '관리자가 사용자별 플랫폼 접근을 제한했습니다.',
    };
  return {
    canAccess: true,
    reason: policy.href ? '' : '서비스 접속 주소를 준비하고 있습니다.',
  };
}
