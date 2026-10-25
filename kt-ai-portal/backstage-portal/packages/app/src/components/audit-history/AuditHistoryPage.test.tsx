import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { AuditHistoryPage } from './AuditHistoryPage';

const mockRequest = jest.fn();
let mockTenantId = 'army';
jest.mock('../portal-runtime/PortalRuntimeContext', () => ({
  usePortalRuntime: () => ({
    tenantId: mockTenantId,
    tenants: [
      { id: 'army', name: '육군' },
      { id: 'navy', name: '해군' },
    ],
    request: mockRequest,
    isDemo: false,
    loading: false,
  }),
}));
jest.mock('../navigation', () => ({
  portalMenuDefinitions: [{ id: 'portal-dashboard', title: '통합 대시보드' }],
}));

const cutoff = '2026-09-18T03:00:00.000Z';
const event = (tenant: string, actorName: string) => ({
  id: `${tenant}-${actorName}`,
  tenantId: tenant,
  actorId: `${tenant}-user`,
  actorName,
  action: 'client.page.view',
  category: 'usage',
  resourceType: 'page',
  resourceId: 'portal-dashboard',
  result: 'success',
  source: 'client',
  requestId: `${tenant}-request`,
  createdAt: '2026-09-18T02:00:00.000Z',
});
const response = (
  tenant: string,
  actorName: string,
  total = 1,
  size = 25,
  page = 1,
) => ({
  data: {
    items: [event(tenant, actorName)],
    pagination: {
      page,
      pageSize: size,
      total,
      totalPages: Math.ceil(total / size),
      snapshot: cutoff,
    },
    summary: {
      total,
      success: total,
      denied: 0,
      failed: 0,
      uniqueActors: 1,
      byCategory: { usage: total },
    },
  },
  meta: {},
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  mockTenantId = 'army';
  mockRequest.mockReset();
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: jest.fn(() => 'blob:audit-export'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: jest.fn(),
  });
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

test('ignores an earlier tenant response after another tenant is selected', async () => {
  const pendingArmy = deferred<ReturnType<typeof response>>();
  mockRequest.mockImplementation(() =>
    mockTenantId === 'army'
      ? pendingArmy.promise
      : Promise.resolve(response('navy', '해군조회자')),
  );
  const view = render(<AuditHistoryPage />);
  await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
  mockTenantId = 'navy';
  view.rerender(<AuditHistoryPage />);
  expect(await screen.findByText('해군조회자')).toBeInTheDocument();
  await act(async () => {
    pendingArmy.resolve(response('army', '육군조회자'));
    await pendingArmy.promise;
  });
  expect(screen.queryByText('육군조회자')).not.toBeInTheDocument();
  expect(screen.getByText('해군조회자')).toBeInTheDocument();
});

test('cancels a pending export when the current tenant changes', async () => {
  const pendingExport = deferred<ReturnType<typeof response>>();
  mockRequest.mockImplementation((path: string) =>
    path.includes('purpose=export')
      ? pendingExport.promise
      : Promise.resolve(
          response(
            mockTenantId,
            mockTenantId === 'army' ? '육군조회자' : '해군조회자',
          ),
        ),
  );
  const view = render(<AuditHistoryPage />);
  await screen.findByText('육군조회자');
  fireEvent.click(screen.getByRole('button', { name: 'CSV 내려받기' }));
  await waitFor(() =>
    expect(mockRequest).toHaveBeenCalledWith(
      expect.stringContaining('purpose=export'),
    ),
  );
  mockTenantId = 'navy';
  view.rerender(<AuditHistoryPage />);
  await screen.findByText('해군조회자');
  await act(async () => {
    pendingExport.resolve(response('army', '육군조회자', 201, 200));
    await pendingExport.promise;
  });
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  expect(
    mockRequest.mock.calls.filter(([path]) =>
      String(path).includes('purpose=export'),
    ),
  ).toHaveLength(1);
});

test('does not download an export that finishes after leaving the page', async () => {
  const pendingExport = deferred<ReturnType<typeof response>>();
  mockRequest.mockImplementation((path: string) =>
    path.includes('purpose=export')
      ? pendingExport.promise
      : Promise.resolve(response('army', '육군조회자')),
  );
  const view = render(<AuditHistoryPage />);
  await screen.findByText('육군조회자');
  fireEvent.click(screen.getByRole('button', { name: 'CSV 내려받기' }));
  await waitFor(() =>
    expect(mockRequest).toHaveBeenCalledWith(
      expect.stringContaining('purpose=export'),
    ),
  );
  view.unmount();
  await act(async () => {
    pendingExport.resolve(response('army', '육군조회자'));
    await pendingExport.promise;
  });
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

test('uses one bounded export request and never downloads a failed export', async () => {
  mockRequest.mockImplementation((path: string) => {
    const query = new URL(path, 'https://portal.test').searchParams;
    if (query.get('purpose') !== 'export')
      return Promise.resolve(response('army', '육군조회자'));
    return Promise.reject(new Error('일시적으로 이력을 조회할 수 없습니다.'));
  });
  render(<AuditHistoryPage />);
  await screen.findByText('육군조회자');
  fireEvent.click(screen.getByRole('button', { name: 'CSV 내려받기' }));
  expect(
    await screen.findByText('일시적으로 이력을 조회할 수 없습니다.'),
  ).toBeInTheDocument();
  const exports = mockRequest.mock.calls.filter(([path]) =>
    String(path).includes('purpose=export'),
  );
  expect(exports).toHaveLength(1);
  const exportQuery = new URL(exports[0][0], 'https://portal.test')
    .searchParams;
  expect(exportQuery.get('purpose')).toBe('export');
  expect(exportQuery.get('page')).toBe('1');
  expect(exportQuery.get('pageSize')).toBe('10000');
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'CSV 내려받기' })).toBeEnabled();
});
