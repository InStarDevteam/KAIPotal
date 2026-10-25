import { DirectToolRequest, DirectRequestStatus, SelectedTool } from './types';

export interface DirectToolRequestInput {
  toolName: string;
  toolType: string;
  provisionType: string;
  requiredVersion: string;
  purpose: string;
  relatedProject: string;
  requiredResources: string;
  closedNetworkRequired: boolean;
  securityReviewRequired: boolean;
}

export const serviceCatalogRequestStorageKey = (
  tenantId: string,
  actorId: string,
) =>
  `kai.demo.service-requests.v1:${encodeURIComponent(
    tenantId,
  )}:${encodeURIComponent(actorId)}`;

const requestStatuses: DirectRequestStatus[] = [
  '요청',
  '검토중',
  '보안검토',
  '반입대기',
  '승인',
  '반려',
  '카탈로그 등록완료',
];

const stringFields = [
  'id',
  'toolName',
  'toolType',
  'provisionType',
  'requiredVersion',
  'purpose',
  'relatedProject',
  'requiredResources',
  'requester',
  'requestedAt',
  'status',
];

export const serviceRequestId = () =>
  `req-${
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }`;

export const readServiceCatalogRequests = (
  key: string,
): { items: DirectToolRequest[]; error?: string } => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { items: [] };
    const data = JSON.parse(raw);
    if (
      data.version !== 1 ||
      !Array.isArray(data.items) ||
      data.items.length > 200 ||
      !data.items.every(
        (item: DirectToolRequest) =>
          item &&
          stringFields.every(
            field =>
              typeof (item as unknown as Record<string, unknown>)[field] ===
              'string',
          ) &&
          typeof item.closedNetworkRequired === 'boolean' &&
          typeof item.securityReviewRequired === 'boolean' &&
          requestStatuses.includes(item.status),
      )
    )
      throw new Error('invalid');
    return { items: data.items };
  } catch {
    return {
      items: [],
      error:
        '저장된 도구 요청을 읽지 못했습니다. 샘플 목록을 표시합니다. 다시 저장하면 현재 목록으로 복구됩니다.',
    };
  }
};

export const saveServiceCatalogRequests = (
  key: string,
  items: DirectToolRequest[],
) => {
  if (items.length > 200)
    throw new Error(
      '이 브라우저에서는 도구 요청을 최대 200건까지 보관합니다. 필요 없는 요청을 삭제해 주세요.',
    );
  try {
    localStorage.setItem(key, JSON.stringify({ version: 1, items }));
  } catch {
    throw new Error(
      '브라우저에 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인하세요. 입력 내용은 유지됩니다.',
    );
  }
};

export const normalizeDirectToolRequestInput = (
  input: DirectToolRequestInput,
): DirectToolRequestInput => {
  const result = {
    toolName: input.toolName.trim(),
    toolType: input.toolType.trim(),
    provisionType: input.provisionType.trim(),
    requiredVersion: input.requiredVersion.trim(),
    purpose: input.purpose.trim(),
    relatedProject: input.relatedProject.trim(),
    requiredResources: input.requiredResources.trim(),
    closedNetworkRequired: input.closedNetworkRequired,
    securityReviewRequired: input.securityReviewRequired,
  };
  if (!result.toolName) throw new Error('요청 도구명을 입력하세요.');
  if (!result.purpose) throw new Error('사용 목적을 입력하세요.');
  if (
    result.toolName.length > 160 ||
    Object.values(result).some(
      value => typeof value === 'string' && value.length > 10000,
    )
  )
    throw new Error(
      '도구명은 160자, 각 입력 항목은 10,000자 이내로 작성하세요.',
    );
  return result;
};

export const createDirectToolRequest = (
  input: DirectToolRequestInput,
  requester: string,
): DirectToolRequest => ({
  ...normalizeDirectToolRequestInput(input),
  id: serviceRequestId(),
  requester,
  requestedAt: new Date().toISOString().slice(0, 10),
  status: '요청',
});

export const createSelectionToolRequest = (
  selections: SelectedTool[],
  project: string,
  requester: string,
): DirectToolRequest => {
  if (selections.length === 0)
    throw new Error('신청서에 담을 도구를 1개 이상 선택하세요.');
  const toolNames = selections.map(selection => selection.tool.name);
  return createDirectToolRequest(
    {
      toolName:
        toolNames.length === 1
          ? toolNames[0]
          : `${toolNames[0]} 외 ${toolNames.length - 1}건`,
      toolType: '카탈로그 선택',
      provisionType: '워크스페이스 선택',
      requiredVersion: selections
        .map(selection => `${selection.tool.name} ${selection.version}`)
        .join(', '),
      purpose: selections
        .map(selection => selection.reason.trim())
        .filter(reason => reason)
        .join(' / '),
      relatedProject: project,
      requiredResources: '-',
      closedNetworkRequired: false,
      securityReviewRequired: selections.some(
        selection => selection.tool.requiresSecurityReview,
      ),
    },
    requester,
  );
};
