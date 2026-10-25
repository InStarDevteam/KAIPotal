import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, useNavigate, useLocation } from 'react-router-dom';
import { IntegratedSearchPage } from './IntegratedSearchPage';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';

jest.mock('../portal-runtime/PortalRuntimeContext', () => ({
  usePortalRuntime: jest.fn(),
}));
const sourceResponse = {
  data: {
    sources: [
      {
        key: 'projects',
        label: '프로젝트',
        kind: 'portal',
        status: 'available',
      },
      {
        key: 'dataset',
        label: '데이터셋',
        kind: 'external',
        status: 'integration_pending',
        note: '외부 원천 연동 대기',
      },
    ],
  },
};
const result = (title: string) => ({
  type: 'project',
  id: title,
  title,
  summary: '',
  source_label: '포털',
  source_status: 'available',
  link_path: '/project-workspace',
  updated_at: null,
});
const reply = (title: string, page = 1, total = 1) => ({
  data: { total, page, page_size: 50, results: [result(title)], took_ms: 1 },
});
let request: jest.Mock;
const Harness = () => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <>
      <button onClick={() => navigate('/integrated-search?q=새검색')}>
        상단 재검색
      </button>
      <button onClick={() => navigate('/integrated-search?q=x')}>
        잘못된 검색
      </button>
      <button onClick={() => navigate(-1)}>뒤로</button>
      <span data-testid="search-url">{location.search}</span>
      <IntegratedSearchPage />
    </>
  );
};
const view = (url = '/integrated-search') => (
  <MemoryRouter initialEntries={[url]}>
    <Harness />
  </MemoryRouter>
);
beforeEach(() => {
  jest.clearAllMocks();
  request = jest.fn(path =>
    Promise.resolve(
      path.startsWith('/v1/search/sources') ? sourceResponse : reply('첫검색'),
    ),
  );
  (usePortalRuntime as jest.Mock).mockReturnValue({
    request,
    loading: false,
    tenantId: 'army',
  });
});
it('empty entry reports an input hint and real source availability without a failed search', async () => {
  render(view());
  await screen.findByText('검색 서비스 연결됨');
  expect(screen.getByText('데이터셋')).toBeVisible();
  expect(screen.getByRole('status')).toHaveTextContent(
    '검색어를 2자 이상 입력',
  );
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(
    request.mock.calls.filter(([path]) => path.startsWith('/v1/search?')),
  ).toHaveLength(0);
});
it('a new query on the same route updates the input and actual request', async () => {
  request.mockImplementation(path =>
    Promise.resolve(
      path.includes('/sources')
        ? sourceResponse
        : reply(new URLSearchParams(path.split('?')[1]).get('q')!),
    ),
  );
  render(view('/integrated-search?q=첫검색'));
  await screen.findByText('첫검색', { selector: 'span' });
  fireEvent.click(screen.getByRole('button', { name: '상단 재검색' }));
  await screen.findByText('새검색', { selector: 'span' });
  expect(screen.getByLabelText('검색어')).toHaveValue('새검색');
  expect(
    request.mock.calls.some(([path]) =>
      path.includes(`q=${encodeURIComponent('새검색')}`),
    ),
  ).toBe(true);
});
it('server pagination is reachable, persists in URL and survives browser back', async () => {
  request.mockImplementation(path => {
    const page = Number(
      new URLSearchParams(path.split('?')[1]).get('page') || 1,
    );
    return Promise.resolve(
      path.includes('/sources')
        ? sourceResponse
        : reply(page === 1 ? '첫 페이지' : '마지막 페이지', page, 51),
    );
  });
  render(view('/integrated-search?q=프로젝트'));
  await screen.findByText('첫 페이지');
  fireEvent.click(screen.getByRole('button', { name: '다음 결과' }));
  await screen.findByText('마지막 페이지');
  expect(screen.getByText(/q=.+page=2/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '다음 결과' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '뒤로' }));
  await screen.findByText('첫 페이지');
  expect(screen.getByRole('button', { name: '이전 결과' })).toBeDisabled();
});
it('validation cannot be overwritten by a late valid search response', async () => {
  let resolve!: (value: unknown) => void;
  request.mockImplementation(path =>
    path.includes('/sources')
      ? Promise.resolve(sourceResponse)
      : new Promise(done => {
          resolve = done;
        }),
  );
  render(view('/integrated-search?q=첫검색'));
  await waitFor(() => expect(resolve).toBeDefined());
  fireEvent.click(screen.getByRole('button', { name: '잘못된 검색' }));
  await screen.findByRole('alert');
  await act(async () => resolve(reply('오래된 결과')));
  expect(screen.queryByText('오래된 결과')).not.toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('2자 이상');
  expect(screen.getByText('검색 서비스 연결됨')).toBeInTheDocument();
});
it('switching tenant discards the old tenant pending result', async () => {
  let resolve!: (value: unknown) => void;
  request.mockImplementation(path =>
    path.includes('/sources')
      ? Promise.resolve(sourceResponse)
      : new Promise(done => {
          resolve = done;
        }),
  );
  const rendered = render(view('/integrated-search?q=프로젝트'));
  await waitFor(() => expect(resolve).toBeDefined());
  const navyRequest = jest.fn(path =>
    Promise.resolve(
      path.includes('/sources') ? sourceResponse : reply('해군 프로젝트'),
    ),
  );
  (usePortalRuntime as jest.Mock).mockReturnValue({
    request: navyRequest,
    loading: false,
    tenantId: 'navy',
  });
  rendered.rerender(view('/integrated-search?q=프로젝트'));
  await screen.findByText('해군 프로젝트');
  await act(async () => resolve(reply('육군 이전 결과')));
  expect(screen.queryByText('육군 이전 결과')).not.toBeInTheDocument();
});
it('source metadata failures can be retried independently', async () => {
  request
    .mockRejectedValueOnce(new Error('metadata unavailable'))
    .mockResolvedValue(sourceResponse);
  render(view());
  fireEvent.click(
    await screen.findByRole('button', { name: '연결 상태 다시 확인' }),
  );
  expect(await screen.findByText('검색 서비스 연결됨')).toBeInTheDocument();
});
