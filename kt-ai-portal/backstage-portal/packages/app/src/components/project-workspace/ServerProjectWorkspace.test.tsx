import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { ServerProjectWorkspace } from './ServerProjectWorkspace';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';

jest.mock('../portal-runtime/PortalRuntimeContext', () => ({
  usePortalRuntime: jest.fn(),
}));

const project = (name: string) => ({
  id: name,
  name,
  description: '설명',
  status: 'active',
  visibility: 'public',
  owner_id: 'owner',
  version: 1,
  created_at: '2026-10-04T00:00:00Z',
});
const response = (name: string, page: number, total = 101) => ({
  data: {
    items: [project(name)],
    pagination: { page, pageSize: 20, total },
  },
});

let request: jest.Mock;
const Harness = () => {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate(-1)}>브라우저 뒤로</button>
      <span data-testid="project-url">{location.search}</span>
      <ServerProjectWorkspace />
    </>
  );
};
const view = (url = '/project-workspace') => (
  <MemoryRouter initialEntries={[url]}>
    <Harness />
  </MemoryRouter>
);

beforeEach(() => {
  jest.clearAllMocks();
  request = jest.fn(path => {
    const page = Number(new URLSearchParams(path.split('?')[1]).get('page'));
    return Promise.resolve(response(`프로젝트 ${page === 6 ? '101' : '81'}`, page));
  });
  (usePortalRuntime as jest.Mock).mockReturnValue({
    request,
    permissions: [],
    actorId: 'actor',
    tenantId: 'army',
  });
});

it('restores page six and reaches a project beyond the original first hundred', async () => {
  render(view('/project-workspace?page=6'));
  expect(await screen.findByRole('button', { name: '프로젝트 101' })).toBeVisible();
  expect(request).toHaveBeenCalledWith('/v1/projects?page=6&pageSize=20');
  expect(screen.getByRole('status')).toHaveTextContent('전체 101개 · 6 / 6페이지');
  expect(screen.getByRole('button', { name: '다음 프로젝트 페이지' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '이전 프로젝트 페이지' }));
  await screen.findByRole('button', { name: '프로젝트 81' });
  expect(screen.getByTestId('project-url')).toHaveTextContent('page=5');
  fireEvent.click(screen.getByRole('button', { name: '브라우저 뒤로' }));
  await screen.findByRole('button', { name: '프로젝트 101' });
});

it('searches the server across all pages, resets page and preserves query on navigation', async () => {
  request.mockImplementation(path => {
    const params = new URLSearchParams(path.split('?')[1]);
    const page = Number(params.get('page'));
    return Promise.resolve(
      params.get('q') ? response('원격 검색 결과', page, 1) : response('프로젝트 101', page),
    );
  });
  render(view('/project-workspace?page=6'));
  await screen.findByRole('button', { name: '프로젝트 101' });
  fireEvent.change(screen.getByLabelText('전체 프로젝트 검색'), {
    target: { value: ' 장비 데이터 ' },
  });
  fireEvent.click(screen.getByRole('button', { name: '검색' }));
  await screen.findByRole('button', { name: '원격 검색 결과' });
  expect(request).toHaveBeenLastCalledWith(
    `/v1/projects?page=1&pageSize=20&q=${encodeURIComponent('장비 데이터')}`,
  );
  expect(screen.getByTestId('project-url')).not.toHaveTextContent('page=6');
  expect(screen.getByRole('status')).toHaveTextContent('검색 결과 1개');
  fireEvent.click(screen.getByRole('button', { name: '브라우저 뒤로' }));
  await screen.findByRole('button', { name: '프로젝트 101' });
  expect(screen.getByLabelText('전체 프로젝트 검색')).toHaveValue('');
});

it('retains search input when no result exists so users can retry another query', async () => {
  request.mockResolvedValue({
    data: { items: [], pagination: { page: 1, pageSize: 20, total: 0 } },
  });
  render(view('/project-workspace?q=없는검색'));
  expect(await screen.findByText('검색 조건에 맞는 프로젝트가 없습니다.')).toBeVisible();
  expect(screen.getByLabelText('전체 프로젝트 검색')).toHaveValue('없는검색');
  fireEvent.change(screen.getByLabelText('전체 프로젝트 검색'), {
    target: { value: '' },
  });
  fireEvent.click(screen.getByRole('button', { name: '검색' }));
  await waitFor(() => expect(request).toHaveBeenLastCalledWith('/v1/projects?page=1&pageSize=20'));
});

it('excludes a late result from the previously selected tenant', async () => {
  let finish!: (value: unknown) => void;
  request.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const rendered = render(view());
  await waitFor(() => expect(finish).toBeDefined());
  const navyRequest = jest.fn(() => Promise.resolve(response('해군 프로젝트', 1, 1)));
  (usePortalRuntime as jest.Mock).mockReturnValue({
    request: navyRequest,
    permissions: [],
    actorId: 'actor',
    tenantId: 'navy',
  });
  rendered.rerender(view());
  await screen.findByRole('button', { name: '해군 프로젝트' });
  await act(async () => finish(response('이전 육군 프로젝트', 1, 1)));
  expect(screen.queryByRole('button', { name: '이전 육군 프로젝트' })).not.toBeInTheDocument();
});
