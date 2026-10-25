import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { ProposalBoardPage } from './ProposalBoardPage';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';

jest.mock('../portal-runtime/PortalRuntimeContext', () => ({
  usePortalRuntime: jest.fn(),
}));
const runtime = jest.mocked(usePortalRuntime);
type RequestFn = (path: string, init?: RequestInit) => Promise<unknown>;
const configure = (
  tenantId = 'army',
  actorId = 'demo:user',
  isDemo = true,
  request?: RequestFn,
) =>
  runtime.mockReturnValue({
    tenantId,
    actorId,
    isDemo,
    loading: false,
    roles: ['general-user'],
    permissions: [],
    request: request ?? jest.fn(),
  } as unknown as ReturnType<typeof usePortalRuntime>);
afterEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});
const register = () => {
  fireEvent.change(screen.getByLabelText(/제안 제목/), {
    target: { value: '직접 작성한 제안' },
  });
  fireEvent.change(screen.getByLabelText(/제안자/), {
    target: { value: '테스트 작성자' },
  });
  fireEvent.change(screen.getByLabelText(/필요성/), {
    target: { value: '실제 입력 내용을 보존합니다.' },
  });
  fireEvent.click(screen.getByLabelText('개인정보 동의'));
  fireEvent.click(screen.getByRole('button', { name: '등록' }));
};
test('creates, votes, comments, edits and deletes own proposal persistently', () => {
  configure();
  const view = render(<ProposalBoardPage />);
  register();
  expect(screen.getAllByText('직접 작성한 제안')).not.toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: '좋아요 0' }));
  fireEvent.change(screen.getByLabelText('댓글 내용'), {
    target: { value: '검토 의견입니다.' },
  });
  fireEvent.click(screen.getByRole('button', { name: '댓글 작성' }));
  expect(screen.getByText('검토 의견입니다.')).toBeInTheDocument();
  view.unmount();
  render(<ProposalBoardPage />);
  fireEvent.click(screen.getByRole('tab', { name: '내 제안' }));
  fireEvent.click(screen.getByText('직접 작성한 제안'));
  expect(screen.getByRole('button', { name: '좋아요 1' })).toBeInTheDocument();
  expect(screen.getByText('검토 의견입니다.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '내 제안 수정' }));
  fireEvent.change(screen.getByLabelText(/제안 제목/), {
    target: { value: '수정한 제안' },
  });
  fireEvent.click(screen.getByRole('button', { name: '수정 저장' }));
  expect(screen.queryByText('직접 작성한 제안')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '내 제안 삭제' }));
  fireEvent.click(screen.getByRole('button', { name: '삭제' }));
  expect(screen.queryByText('수정한 제안')).not.toBeInTheDocument();
});
test('tenant and actor switching discard forms and never copy previous scope data', () => {
  configure();
  const view = render(<ProposalBoardPage />);
  register();
  configure('navy');
  view.rerender(<ProposalBoardPage />);
  expect(screen.queryByText('직접 작성한 제안')).not.toBeInTheDocument();
  expect(screen.getByLabelText(/제안 제목/)).toHaveValue('');
  configure('army', 'demo:other');
  view.rerender(<ProposalBoardPage />);
  expect(screen.queryByText('직접 작성한 제안')).not.toBeInTheDocument();
  configure();
  view.rerender(<ProposalBoardPage />);
  expect(screen.getByText('직접 작성한 제안')).toBeInTheDocument();
});
test('server mode loads proposals from the API and never reads demo storage', async () => {
  const request = jest.fn().mockImplementation((path: string) => {
    if (path.startsWith('/v1/proposals'))
      return Promise.resolve({
        data: {
          items: [
            {
              id: '3f6f9a20-0000-4000-8000-0000000000aa',
              type: 'feature',
              title: '서버에서 온 제안',
              visibility: 'tenant',
              status: 'submitted',
              author_id: 'demo:user',
              view_count: 3,
              version: 1,
              created_at: '2026-09-20T01:00:00.000Z',
              updated_at: '2026-09-20T01:00:00.000Z',
              sympathy_count: 2,
            },
          ],
          pagination: { page: 1, pageSize: 50, total: 1 },
        },
        meta: {},
      });
    return Promise.resolve({ data: {}, meta: {} });
  });
  configure('army', 'demo:user', false, request as RequestFn);
  render(<MemoryRouter><ProposalBoardPage /></MemoryRouter>);
  expect(await screen.findByText('서버에서 온 제안')).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: '제안 등록' }),
  ).toBeInTheDocument();
  expect(localStorage.length).toBe(0);
  fireEvent.click(screen.getByRole('tab', { name: '내 제안' }));
  expect(await screen.findByText('서버에서 온 제안')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '전체 제안' }));
  expect(await screen.findByText('서버에서 온 제안')).toBeInTheDocument();
});
test('server mode submits new proposals through the proposals API', async () => {
  const request = jest.fn().mockImplementation((path: string) => {
    if (path.startsWith('/v1/proposals'))
      return Promise.resolve({
        data: { items: [], pagination: { page: 1, pageSize: 50, total: 0 } },
        meta: {},
      });
    return Promise.resolve({ data: {}, meta: {} });
  });
  configure('army', 'demo:user', false, request as RequestFn);
  render(<MemoryRouter><ProposalBoardPage /></MemoryRouter>);
  await screen.findByText('제안이 없습니다.');
  fireEvent.click(screen.getByRole('button', { name: '제안 등록' }));
  fireEvent.change(screen.getByLabelText(/제안 제목/), {
    target: { value: 'API로 등록한 제안' },
  });
  fireEvent.change(screen.getByLabelText(/필요성/), {
    target: { value: '실제 입력 내용을 서버에 보니다.' },
  });
  fireEvent.click(screen.getByRole('button', { name: '등록' }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      '/v1/proposals',
      expect.objectContaining({ method: 'POST' }),
    ),
  );
  const body = JSON.parse(
    (request.mock.calls.find(call => call[0] === '/v1/proposals')?.[1]?.body as string) ?? '{}',
  ) as Record<string, unknown>;
  expect(body).toMatchObject({
    type: 'feature',
    title: 'API로 등록한 제안',
    necessity: '실제 입력 내용을 서버에 보니다.',
    visibility: 'tenant',
  });
  expect(String(body.idempotencyKey ?? '')).not.toBe('');
});
