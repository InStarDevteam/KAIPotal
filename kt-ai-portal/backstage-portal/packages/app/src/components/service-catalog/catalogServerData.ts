export const CATALOG_KIND_LABELS: Record<string, string> = {
  tool: '도구',
  service: '서비스',
  dataset: '데이터셋',
  model: '모델',
};

export const CATALOG_CATEGORY_LABELS: Record<string, string> = {
  analysis: '분석',
  development: '개발',
  data: '데이터',
  visualization: '시각화',
  labeling: '라벨링',
};

export const CATALOG_ACCESS_TYPE_LABELS: Record<string, string> = {
  apply: '신청 필요',
  direct_link: '직접 링크',
};

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  requested: '승인 대기',
  approved: '승인',
  rejected: '반려',
  cancelled: '취소',
};

export const EXECUTION_STATUS_LABELS: Record<string, string> = {
  pending_platform: '실행환경 생성 대기(플랫폼 연동 전)',
  provisioning: '실행환경 생성 중',
  failed: '실행환경 생성 실패',
};

export interface ServerCatalogItem {
  id: string;
  name: string;
  kind: string;
  kindLabel: string;
  category: string;
  categoryLabel: string;
  summary: string;
  description: string;
  provider: string;
  accessType: string;
  accessTypeLabel: string;
  linkUrl: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface ServerCatalogApplication {
  id: string;
  itemId: string;
  itemName: string;
  itemKind: string;
  projectId: string;
  reason: string;
  status: string;
  statusLabel: string;
  executionStatus: string;
  executionStatusLabel: string;
  createdAt: string;
}

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const asNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const labelOf = (map: Record<string, string>, value: string) =>
  map[value] ?? value;

export const mapServerCatalogItem = (
  row: Record<string, unknown>,
): ServerCatalogItem => {
  const kind = asString(row.kind);
  const category = asString(row.category);
  const accessType = asString(row.access_type);
  return {
    id: asString(row.id),
    name: asString(row.name),
    kind,
    kindLabel: labelOf(CATALOG_KIND_LABELS, kind),
    category,
    categoryLabel: labelOf(CATALOG_CATEGORY_LABELS, category),
    summary: asString(row.summary),
    description: asString(row.description),
    provider: asString(row.provider),
    accessType,
    accessTypeLabel: labelOf(CATALOG_ACCESS_TYPE_LABELS, accessType),
    linkUrl: asString(row.link_url),
    active: row.active === true,
    sortOrder: asNumber(row.sort_order),
    createdAt: asString(row.created_at),
  };
};

export const mapServerCatalogApplication = (
  row: Record<string, unknown>,
): ServerCatalogApplication => {
  const status = asString(row.status);
  const executionStatus = asString(row.execution_status);
  return {
    id: asString(row.id),
    itemId: asString(row.item_id),
    itemName: asString(row.item_name),
    itemKind: asString(row.item_kind),
    projectId: asString(row.project_id),
    reason: asString(row.reason),
    status,
    statusLabel: labelOf(APPLICATION_STATUS_LABELS, status),
    executionStatus,
    executionStatusLabel: labelOf(EXECUTION_STATUS_LABELS, executionStatus),
    createdAt: asString(row.created_at),
  };
};

export const describeApplicationExecution = (
  application: Pick<ServerCatalogApplication, 'status' | 'executionStatus'>,
): string => {
  if (application.status !== 'approved') return '';
  return (
    EXECUTION_STATUS_LABELS[application.executionStatus] ??
    '실행환경 상태를 확인할 수 없습니다'
  );
};
