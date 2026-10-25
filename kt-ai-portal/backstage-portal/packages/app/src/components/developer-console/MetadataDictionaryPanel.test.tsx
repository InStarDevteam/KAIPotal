import { act, fireEvent, render, screen } from '@testing-library/react';
import { MetadataDictionaryPanel } from './MetadataDictionaryPanel';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';

jest.mock('../portal-runtime/PortalRuntimeContext', () => ({
  usePortalRuntime: jest.fn(),
}));
const response = (page = 1, name = '명칭') => ({
  data: {
    release: {
      version: 'portal-draft-test',
      imported_at: '2026-10-04T00:00:00Z',
      mapping_status: 'provisional',
      source_hash: 'test',
    },
    summary: {
      tables: 55,
      columns: 548,
      terms: 606,
      words: 96,
      domains: 22,
      codes: 161,
    },
    tables: [{ table_name: 'fc_projects', column_count: 9 }],
    items: [
      {
        table_name: 'fc_projects',
        column_name: 'name',
        logical_name: name,
        definition: '프로젝트의 명칭',
        domain_id: 'TMP-PG-text',
        data_type: 'text',
        is_nullable: false,
        is_primary_key: false,
        references: [],
        sensitivity: '일반',
        retention_policy: '기관 협의 필요',
        source_migration: 'test',
        mapping_status: 'provisional',
      },
    ],
    pagination: { page, pageSize: 30, total: 548 },
  },
});
let request: jest.Mock;
beforeEach(() => {
  jest.clearAllMocks();
  request = jest.fn(path =>
    Promise.resolve(
      response(Number(new URLSearchParams(path.split('?')[1]).get('page'))),
    ),
  );
  (usePortalRuntime as jest.Mock).mockReturnValue({
    request,
    actorId: 'actor',
    tenantId: 'tenant',
  });
});
it('shows provisional schema metadata and reaches columns after the first page', async () => {
  render(<MetadataDictionaryPanel />);
  await screen.findByText('fc_projects.name');
  expect(screen.getByRole('status')).toHaveTextContent('548개 컬럼');
  expect(screen.getByText(/기관 MDR 원본 사전은 아직 수령/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '사전 다음 페이지' }));
  await screen.findByText(/2 \/ 19 페이지/);
  expect(request).toHaveBeenCalledWith(
    '/v1/metadata/dictionary?page=2&pageSize=30',
  );
});
it('reports an actual request error with retry instead of manufacturing an empty dictionary', async () => {
  request.mockRejectedValueOnce(new Error('DB 조회 실패'));
  render(<MetadataDictionaryPanel />);
  await screen.findByText('DB 조회 실패');
  expect(screen.getByRole('status')).toHaveTextContent('표시할 수 없습니다');
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await screen.findByText('fc_projects.name');
});
it('ignores an old tenant response after the current scope changes', async () => {
  let previous!: (value: unknown) => void;
  request.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        previous = resolve;
      }),
  );
  const view = render(<MetadataDictionaryPanel />);
  (usePortalRuntime as jest.Mock).mockReturnValue({
    request,
    actorId: 'actor',
    tenantId: 'new-tenant',
  });
  view.rerender(<MetadataDictionaryPanel />);
  await screen.findByText('명칭');
  await act(async () => {
    previous(response(1, '이전 소속 결과'));
  });
  expect(screen.queryByText('이전 소속 결과')).not.toBeInTheDocument();
});
