import {
  AccessibleService,
  AdminUserType,
  DataAccessLevel,
} from './types';

export interface AdminUserAccessRecord {
  userId: string;
  organization?: string;
  department?: string;
  userGroup?: string;
  userType?: AdminUserType;
  role?: string;
  dataAccessLevel?: DataAccessLevel;
  projectAccess?: string;
  canApproveExport?: boolean;
  canManageCredit?: boolean;
  accessibleServices?: AccessibleService[];
}

export const adminUserAccessStorageKey = (tenantId: string) =>
  `kai.demo.admin-user-access.v1:${encodeURIComponent(tenantId)}`;

const userTypes: AdminUserType[] = ['내부', '외부', '수행사'];
const dataAccessLevels: DataAccessLevel[] = ['공개', '내부', '비밀'];
const accessibleServices: AccessibleService[] = [
  'Portal Dashboard',
  'Integrated Search',
  'Project Workspace',
  'Export Approval',
  'Credit Manager',
  'K-RMF Evidence',
  'Admin Console',
  'OpenMetadata',
  'OpenSearch Dashboards',
];

const optionalString = (item: unknown, field: string) => {
  const value = (item as unknown as Record<string, unknown>)[field];
  return value === undefined || typeof value === 'string';
};

const optionalBoolean = (item: unknown, field: string) => {
  const value = (item as unknown as Record<string, unknown>)[field];
  return value === undefined || typeof value === 'boolean';
};

const isValidRecord = (item: unknown): item is AdminUserAccessRecord => {
  if (!item || typeof (item as AdminUserAccessRecord).userId !== 'string')
    return false;
  if (
    (item as AdminUserAccessRecord).userType !== undefined &&
    !userTypes.includes((item as AdminUserAccessRecord).userType!)
  )
    return false;
  if (
    (item as AdminUserAccessRecord).dataAccessLevel !== undefined &&
    !dataAccessLevels.includes((item as AdminUserAccessRecord).dataAccessLevel!)
  )
    return false;
  const services = (item as AdminUserAccessRecord).accessibleServices;
  if (
    services !== undefined &&
    (!Array.isArray(services) ||
      !services.every(service => accessibleServices.includes(service)))
  )
    return false;
  return (
    optionalString(item, 'organization') &&
    optionalString(item, 'department') &&
    optionalString(item, 'userGroup') &&
    optionalString(item, 'role') &&
    optionalString(item, 'projectAccess') &&
    optionalBoolean(item, 'canApproveExport') &&
    optionalBoolean(item, 'canManageCredit')
  );
};

export const readAdminUserAccess = (
  key: string,
): { items: AdminUserAccessRecord[]; error?: string } => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { items: [] };
    const data = JSON.parse(raw);
    if (
      data.version !== 1 ||
      !Array.isArray(data.items) ||
      data.items.length > 500 ||
      !data.items.every(isValidRecord)
    )
      throw new Error('invalid');
    return { items: data.items };
  } catch {
    return {
      items: [],
      error:
        '저장된 사용자 접근 설정을 읽지 못했습니다. 기존 브라우저 저장 상태를 확인해 주세요.',
    };
  }
};

export const saveAdminUserAccess = (
  key: string,
  items: AdminUserAccessRecord[],
) => {
  if (items.length > 500)
    throw new Error(
      '이 브라우저에서는 사용자 접근 설정을 최대 500건까지 보관합니다.',
    );
  try {
    localStorage.setItem(key, JSON.stringify({ version: 1, items }));
  } catch {
    throw new Error(
      '브라우저에 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인하세요. 입력 내용은 유지됩니다.',
    );
  }
};
