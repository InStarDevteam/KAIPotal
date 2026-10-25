import {
  APPLICATION_STATUS_LABELS,
  CATALOG_ACCESS_TYPE_LABELS,
  CATALOG_CATEGORY_LABELS,
  CATALOG_KIND_LABELS,
  EXECUTION_STATUS_LABELS,
  describeApplicationExecution,
  mapServerCatalogApplication,
  mapServerCatalogItem,
} from './catalogServerData';

const itemRow = {
  id: '7a1c2d3e-0000-4000-8000-0000000000c1',
  tenant_id: 'army',
  kind: 'tool',
  category: 'analysis',
  name: 'GPU 분석 도구',
  summary: '요약',
  description: '상세 설명',
  provider: 'portal',
  access_type: 'apply',
  link_url: null,
  active: true,
  sort_order: 10,
  created_at: '2026-09-01T00:00:00.000Z',
};

const applicationRow = {
  id: 'app-1',
  item_id: itemRow.id,
  item_name: 'GPU 분석 도구',
  item_kind: 'tool',
  project_id: 'project-1',
  reason: '정비 데이터 분석용',
  status: 'approved',
  execution_status: 'pending_platform',
  created_at: '2026-09-10T00:00:00.000Z',
};

test('maps catalog items with Korean kind, category and access type labels', () => {
  const item = mapServerCatalogItem(itemRow);
  expect(item).toMatchObject({
    id: itemRow.id,
    name: 'GPU 분석 도구',
    kindLabel: '도구',
    categoryLabel: '분석',
    accessTypeLabel: '신청 필요',
    active: true,
    sortOrder: 10,
  });
  const direct = mapServerCatalogItem({ ...itemRow, access_type: 'direct_link', link_url: 'https://example.com' });
  expect(direct.accessTypeLabel).toBe('직접 링크');
  expect(direct.linkUrl).toBe('https://example.com');
});

test('maps applications with status and execution status labels', () => {
  const application = mapServerCatalogApplication(applicationRow);
  expect(application).toMatchObject({
    itemName: 'GPU 분석 도구',
    statusLabel: '승인',
    executionStatusLabel: '실행환경 생성 대기(플랫폼 연동 전)',
  });
  expect(Object.keys(APPLICATION_STATUS_LABELS)).toHaveLength(4);
  expect(Object.keys(CATALOG_KIND_LABELS)).toHaveLength(4);
  expect(Object.keys(CATALOG_CATEGORY_LABELS)).toHaveLength(5);
  expect(Object.keys(CATALOG_ACCESS_TYPE_LABELS)).toHaveLength(2);
});

test('approved applications stay in platform-pending state and are never shown as usable', () => {
  expect(
    describeApplicationExecution(
      mapServerCatalogApplication(applicationRow),
    ),
  ).toBe('실행환경 생성 대기(플랫폼 연동 전)');
  expect(
    describeApplicationExecution({
      ...mapServerCatalogApplication({ ...applicationRow, execution_status: 'provisioning' }),
    }),
  ).toBe('실행환경 생성 중');
  expect(
    describeApplicationExecution({
      ...mapServerCatalogApplication({ ...applicationRow, execution_status: 'failed' }),
    }),
  ).toBe('실행환경 생성 실패');
  expect(
    describeApplicationExecution(
      mapServerCatalogApplication({ ...applicationRow, status: 'requested' }),
    ),
  ).toBe('');
  expect(EXECUTION_STATUS_LABELS.pending_platform).not.toContain('사용 가능');
});
