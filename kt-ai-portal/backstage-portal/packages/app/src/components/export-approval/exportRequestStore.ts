import {
  AccessScope,
  AuditLogEntry,
  ExportDirection,
  ExportRequest,
  ExportTargetType,
  SecurityLevel,
  Visibility,
} from './types';

export interface DemoExportRequestInput {
  direction: ExportDirection;
  targetType: ExportTargetType;
  targetName: string;
  targetDescription: string;
  projectName: string;
  reason: string;
  requester: string;
  requesterOrg: string;
  securityLevel: SecurityLevel;
  visibility: Visibility;
  accessScope: AccessScope;
  downloadable: boolean;
  attachments: string[];
}

export const exportRequestStorageKey = (tenantId: string, actorId: string) =>
  `kai.demo.export-requests.v1:${encodeURIComponent(
    tenantId,
  )}:${encodeURIComponent(actorId)}`;

const stringFields = [
  'id',
  'direction',
  'targetType',
  'targetName',
  'targetDescription',
  'projectId',
  'projectName',
  'reason',
  'requester',
  'requesterOrg',
  'securityLevel',
  'visibility',
  'accessScope',
  'status',
  'requestedAt',
];

const enumFields: Record<string, string[]> = {
  direction: ['export', 'import'],
  targetType: [
    'server',
    'ai_model',
    'algorithm',
    'dataset',
    'document',
    'docker_image',
    'pypi_package',
  ],
  securityLevel: ['public', 'internal', 'secret'],
  visibility: ['public', 'private', 'restricted'],
  accessScope: [
    'all_users',
    'project_members',
    'approved_users',
    'admins_only',
  ],
  status: [
    'requested',
    'reviewing',
    'need_revision',
    'approved',
    'rejected',
    'export_completed',
    'import_completed',
  ],
};

const isAuditLog = (value: unknown): value is AuditLogEntry[] =>
  Array.isArray(value) &&
  value.every(
    entry =>
      entry &&
      ['timestamp', 'actor', 'action', 'result', 'note'].every(
        field => typeof (entry as Record<string, unknown>)[field] === 'string',
      ),
  );

export const readDemoExportRequests = (
  key: string,
): { items: ExportRequest[]; error?: string } => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { items: [] };
    const data = JSON.parse(raw);
    if (
      data.version !== 1 ||
      !Array.isArray(data.items) ||
      data.items.length > 200 ||
      !data.items.every(
        (item: ExportRequest) =>
          item &&
          stringFields.every(
            field =>
              typeof (item as unknown as Record<string, unknown>)[field] ===
              'string',
          ) &&
          Object.entries(enumFields).every(
            ([field, allowed]) =>
              allowed.includes(
                (item as unknown as Record<string, unknown>)[field] as string,
              ),
          ) &&
          typeof item.downloadable === 'boolean' &&
          Array.isArray(item.attachments) &&
          item.attachments.every(
            attachment => typeof attachment === 'string',
          ) &&
          (item.demoPending === undefined ||
            typeof item.demoPending === 'boolean') &&
          (item.approver === undefined ||
            typeof item.approver === 'string') &&
          (item.approvedAt === undefined ||
            typeof item.approvedAt === 'string') &&
          (item.revisionNote === undefined ||
            typeof item.revisionNote === 'string') &&
          isAuditLog(item.auditLog),
      )
    )
      throw new Error('invalid');
    return { items: data.items };
  } catch {
    return {
      items: [],
      error:
        '저장된 데모 반입·반출 신청을 읽지 못했습니다. 다시 신청하면 목록이 복구됩니다.',
    };
  }
};

export const saveDemoExportRequests = (
  key: string,
  items: ExportRequest[],
) => {
  if (items.length > 200)
    throw new Error(
      '이 브라우저에서는 데모 반입·반출 신청을 최대 200건까지 보관합니다.',
    );
  try {
    localStorage.setItem(key, JSON.stringify({ version: 1, items }));
  } catch {
    throw new Error(
      '브라우저에 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인하세요. 입력 내용은 유지됩니다.',
    );
  }
};

export const normalizeDemoExportRequestInput = (
  input: DemoExportRequestInput,
): DemoExportRequestInput => {
  const result: DemoExportRequestInput = {
    ...input,
    targetName: input.targetName.trim(),
    targetDescription: input.targetDescription.trim(),
    projectName: input.projectName.trim(),
    reason: input.reason.trim(),
    requester: input.requester.trim(),
    requesterOrg: input.requesterOrg.trim(),
    attachments: input.attachments
      .map(attachment => attachment.trim())
      .filter(attachment => attachment),
  };
  for (const [field, label] of [
    ['targetName', '대상명'],
    ['targetDescription', '대상 설명'],
    ['reason', '신청 사유'],
    ['requester', '신청자'],
    ['requesterOrg', '소속'],
  ] as const) {
    if (!result[field]) throw new Error(`${label}을(를) 입력하세요.`);
  }
  if (
    Object.values(result).some(
      value => typeof value === 'string' && value.length > 10000,
    ) ||
    result.attachments.some(attachment => attachment.length > 500)
  )
    throw new Error('각 입력 항목은 10,000자 이내로 작성하세요.');
  return result;
};

export const createDemoExportRequest = (
  input: DemoExportRequestInput,
): ExportRequest => {
  const normalized = normalizeDemoExportRequestInput(input);
  const requestedAt = new Date().toISOString();
  return {
    ...normalized,
    id: `EXP-DEMO-${
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    }`,
    projectId: 'DEMO-LOCAL',
    status: 'requested',
    requestedAt,
    downloadable: normalized.downloadable,
    demoPending: true,
    auditLog: [
      {
        timestamp: requestedAt,
        actor: normalized.requester,
        action: '신청 등록',
        result: '완료',
        note: '데모 모드 로컬 접수(실제 승인 절차 미연결)',
      },
    ],
  };
};
