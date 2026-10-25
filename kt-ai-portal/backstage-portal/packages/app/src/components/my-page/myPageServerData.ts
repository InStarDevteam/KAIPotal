export interface ServerIdentityMembership {
  tenantId: string;
  tenantName: string;
  branch: string;
  roles: string[];
}

export interface ServerIdentity {
  userId: string;
  displayName: string;
  memberships: ServerIdentityMembership[];
}

export interface ServerAuditEvent {
  id: string;
  action: string;
  category: string;
  result: string;
  resourceType: string | null;
  resourceId: string | null;
  createdAt: string;
}

export const AUDIT_RESULT_LABELS: Record<string, string> = {
  success: '성공',
  denied: '거부',
  failed: '실패',
};

export const AUDIT_CATEGORY_LABELS: Record<string, string> = {
  access: '접속',
  usage: '이용',
  admin: '관리',
  security: '보안',
};

export const auditResultLabel = (result: string): string =>
  AUDIT_RESULT_LABELS[result] ?? result;

export const auditCategoryLabel = (category: string): string =>
  AUDIT_CATEGORY_LABELS[category] ?? category;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const stringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string');

export const parseServerIdentity = (data: unknown): ServerIdentity | null => {
  if (!isRecord(data)) return null;
  if (typeof data.userId !== 'string' || typeof data.displayName !== 'string')
    return null;
  if (!Array.isArray(data.memberships)) return null;
  const memberships: ServerIdentityMembership[] = [];
  for (const item of data.memberships) {
    if (!isRecord(item)) return null;
    if (
      typeof item.tenant_id !== 'string' ||
      typeof item.tenant_name !== 'string' ||
      typeof item.branch !== 'string' ||
      !stringArray(item.roles)
    )
      return null;
    memberships.push({
      tenantId: item.tenant_id,
      tenantName: item.tenant_name,
      branch: item.branch,
      roles: item.roles,
    });
  }
  return { userId: data.userId, displayName: data.displayName, memberships };
};

const isValidAuditEvent = (item: unknown): item is ServerAuditEvent => {
  if (!isRecord(item)) return false;
  if (typeof item.id !== 'string' || !item.id) return false;
  if (typeof item.action !== 'string') return false;
  if (typeof item.category !== 'string') return false;
  if (typeof item.result !== 'string') return false;
  if (typeof item.createdAt !== 'string') return false;
  const resourceType = item.resourceType;
  const resourceId = item.resourceId;
  if (
    resourceType !== null &&
    resourceType !== undefined &&
    typeof resourceType !== 'string'
  )
    return false;
  if (
    resourceId !== null &&
    resourceId !== undefined &&
    typeof resourceId !== 'string'
  )
    return false;
  return true;
};

export const parseServerAuditEvents = (data: unknown): ServerAuditEvent[] => {
  if (!isRecord(data) || !Array.isArray(data.items)) return [];
  return data.items.filter(isValidAuditEvent).map(row => ({
    id: row.id,
    action: row.action,
    category: row.category,
    result: row.result,
    resourceType: row.resourceType ?? null,
    resourceId: row.resourceId ?? null,
    createdAt: row.createdAt,
  }));
};

export type MyPageFetchFailure = {
  kind: 'permission' | 'network';
  message: string;
  code?: string;
};

export const classifyMyPageFetchError = (
  error: unknown,
  fallbackMessage: string,
): MyPageFetchFailure => {
  const status = (error as { status?: number } | null)?.status;
  const code = (error as { code?: string } | null)?.code;
  const message =
    error instanceof Error && error.message ? error.message : fallbackMessage;
  if (status === 403 || code === 'permission_denied')
    return { kind: 'permission', message, code };
  return { kind: 'network', message, code };
};
