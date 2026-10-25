export interface ServerMembership {
  membershipId: string;
  userId: string;
  displayName: string;
  email: string | null;
  organizationName: string | null;
  status: string;
  validFrom: string | null;
  validUntil: string | null;
}

export interface ServerRole {
  roleId: string;
  name: string;
  scope: string;
  policyVersion: number | null;
}

export const ROLE_SCOPE_LABELS: Record<string, string> = {
  system: '시스템',
  tenant: '테넌트',
  project: '프로젝트',
};

export const roleScopeLabel = (scope: string): string =>
  ROLE_SCOPE_LABELS[scope] ?? scope;

export const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  active: '활성',
  suspended: '중지',
  expired: '만료',
};

export const membershipStatusLabel = (status: string): string =>
  MEMBERSHIP_STATUS_LABELS[status] ?? status;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const optionalString = (value: unknown) =>
  value === null || value === undefined || typeof value === 'string';

interface MembershipRow {
  membership_id: string;
  user_id: string;
  display_name: string;
  email: string | null;
  organization_name: string | null;
  status: string;
  valid_from: string | null;
  valid_until: string | null;
}

const isValidMembership = (item: unknown): item is MembershipRow => {
  if (!isRecord(item)) return false;
  if (typeof item.membership_id !== 'string' || !item.membership_id)
    return false;
  if (typeof item.user_id !== 'string') return false;
  if (typeof item.display_name !== 'string') return false;
  if (!optionalString(item.email)) return false;
  if (!optionalString(item.organization_name)) return false;
  if (typeof item.status !== 'string') return false;
  return optionalString(item.valid_from) && optionalString(item.valid_until);
};

export const parseMemberships = (data: unknown): ServerMembership[] => {
  if (!Array.isArray(data)) return [];
  return data.filter(isValidMembership).map(row => ({
    membershipId: row.membership_id,
    userId: row.user_id,
    displayName: row.display_name,
    email: row.email ?? null,
    organizationName: row.organization_name ?? null,
    status: row.status,
    validFrom: row.valid_from ?? null,
    validUntil: row.valid_until ?? null,
  }));
};

interface RoleRow {
  role_id: string;
  name: string;
  scope: string;
  policy_version: number | null;
}

const isValidRole = (item: unknown): item is RoleRow => {
  if (!isRecord(item)) return false;
  if (typeof item.role_id !== 'string' || !item.role_id) return false;
  if (typeof item.name !== 'string') return false;
  if (typeof item.scope !== 'string') return false;
  return (
    item.policy_version === null ||
    item.policy_version === undefined ||
    typeof item.policy_version === 'number'
  );
};

export const parseRoles = (data: unknown): ServerRole[] => {
  if (!Array.isArray(data)) return [];
  return data.filter(isValidRole).map(row => ({
    roleId: row.role_id,
    name: row.name,
    scope: row.scope,
    policyVersion: row.policy_version ?? null,
  }));
};

export const parseRolePermissions = (
  data: unknown,
): Record<string, string[]> => {
  const grouped: Record<string, string[]> = {};
  if (!Array.isArray(data)) return grouped;
  for (const item of data) {
    if (!isRecord(item)) continue;
    if (typeof item.role_id !== 'string' || typeof item.permission_id !== 'string')
      continue;
    const list = grouped[item.role_id] ?? [];
    if (!list.includes(item.permission_id)) list.push(item.permission_id);
    grouped[item.role_id] = list;
  }
  return grouped;
};

export type AdminFetchFailure = {
  kind: 'permission' | 'network';
  message: string;
  code?: string;
};

export const classifyAdminFetchError = (
  error: unknown,
  fallbackMessage: string,
): AdminFetchFailure => {
  const status = (error as { status?: number } | null)?.status;
  const code = (error as { code?: string } | null)?.code;
  const message =
    error instanceof Error && error.message ? error.message : fallbackMessage;
  if (status === 403 || code === 'permission_denied')
    return { kind: 'permission', message, code };
  return { kind: 'network', message, code };
};

export type RoleGrantFailure = {
  kind: 'permission' | 'conflict' | 'invalid' | 'network';
  message: string;
  code?: string;
};

export const classifyRoleGrantError = (
  error: unknown,
  fallbackMessage: string,
): RoleGrantFailure => {
  const status = (error as { status?: number } | null)?.status;
  const code = (error as { code?: string } | null)?.code;
  const message =
    error instanceof Error && error.message ? error.message : fallbackMessage;
  if (status === 403 || code === 'permission_denied')
    return { kind: 'permission', message, code };
  if (status === 409)
    return { kind: 'conflict', message, code };
  if (status === 400 || status === 422)
    return { kind: 'invalid', message, code };
  return { kind: 'network', message, code };
};

export interface RoleGrantPayload {
  membershipId: string;
  roleId: string;
  reason: string;
  validUntil: string | null;
}

export type RoleGrantInput =
  | { ok: true; payload: RoleGrantPayload }
  | { ok: false; message: string };

export const buildRoleGrantInput = (
  membershipId: string,
  roleId: string,
  reason: string,
  validUntil: string,
): RoleGrantInput => {
  if (!membershipId) return { ok: false, message: '대상 사용자를 선택하세요.' };
  if (!roleId) return { ok: false, message: '부여할 역할을 선택하세요.' };
  if (!reason.trim())
    return { ok: false, message: '변경 사유를 입력하세요.' };
  if (reason.length > 1000)
    return { ok: false, message: '변경 사유는 1,000자 이내로 입력하세요.' };
  let expiresAt: string | null = null;
  if (validUntil.trim()) {
    const parsed = new Date(`${validUntil}T23:59:59`);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now())
      return { ok: false, message: '만료일은 오늘 이후 날짜로 선택하세요.' };
    expiresAt = parsed.toISOString();
  }
  return {
    ok: true,
    payload: {
      membershipId,
      roleId,
      reason: reason.trim(),
      validUntil: expiresAt,
    },
  };
};
