import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WorkEnvRequestWizard } from './WorkEnvRequestWizard';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';

jest.mock('../portal-runtime/PortalRuntimeContext', () => ({
  usePortalRuntime: jest.fn(),
}));
jest.mock('../authz', () => ({
  useAuthz: () => ({ hasAnyPermission: () => true }),
}));
const runtime = jest.mocked(usePortalRuntime);
const request = jest.fn();
const configure = (tenantId = 'army', isDemo = true) =>
  runtime.mockReturnValue({
    tenantId,
    actorId: 'demo:admin',
    isDemo,
    loading: false,
    request,
    permissions: ['project.request', 'workspace.request'],
    roles: ['general-user'],
    tenants: [],
    selectTenant: jest.fn(),
    error: null,
  } as ReturnType<typeof usePortalRuntime>);
afterEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});
const next = () =>
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
const fill = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
test('submits the actual request and preserves approved status after remount', () => {
  configure();
  const view = render(<WorkEnvRequestWizard />);
  fill(/워크스페이스명/, '정비 AI 체험 환경');
  next();
  fireEvent.click(screen.getByLabelText('육군 장비 정비이력 데이터셋'));
  next();
  fill(/CPU Core/, '4');
  fill(/GPU 수량/, '1');
  fill(/Memory/, '16');
  fill(/Storage/, '100');
  next();
  fireEvent.click(screen.getByLabelText('PyTorch'));
  next();
  next();
  fill(/사용 시작일/, '2026-10-01');
  fill(/사용 종료일/, '2026-10-31');
  next();
  fireEvent.click(screen.getByRole('button', { name: '제출' }));
  expect(screen.getByText('정비 AI 체험 환경')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '승인' }));
  view.unmount();
  const again = render(<WorkEnvRequestWizard />);
  expect(screen.getByText('정비 AI 체험 환경')).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: '승인' }),
  ).not.toBeInTheDocument();
  expect(screen.getByText('승인')).toBeInTheDocument();
  configure('navy');
  again.rerender(<WorkEnvRequestWizard />);
  expect(screen.queryByText('정비 AI 체험 환경')).not.toBeInTheDocument();
  expect(screen.getByLabelText(/워크스페이스명/)).toHaveValue('');
});
test('production with no memberships asks for a project instead of showing fixture choices or fake submit', async () => {
  configure('army', false);
  request.mockResolvedValue({ data: { items: [], nextCursor: null, pagination: { page: 1, pageSize: 50, total: 0 } } });
  render(
    <MemoryRouter>
      <WorkEnvRequestWizard />
    </MemoryRouter>,
  );
  expect(
    await screen.findByText('먼저 프로젝트에 참여하세요'),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: '프로젝트 목록으로' }),
  ).toHaveAttribute('href', '/project-workspace?tab=projects');
  expect(
    screen.queryByRole('button', { name: '신청 제출' }),
  ).not.toBeInTheDocument();
  expect(request).toHaveBeenCalledWith(
    '/v1/projects?mine=true&status=active&page=1&pageSize=50',
  );
  expect(localStorage.length).toBe(0);
});

test('production posts a validated workspace request to the shared server and never to localStorage', async () => {
  configure('army', false);
  request.mockImplementation(async (path: string, options?: RequestInit) => {
    if (options?.method === 'POST') return { data: { id: 'request-1' } };
    if (path.startsWith('/v1/projects'))
      return {
        data: {
          items: [
            { id: 'project-1', name: '실제 분석 프로젝트', status: 'active' },
          ],
          pagination: { page: 1, pageSize: 50, total: 1 },
        },
      };
    return { data: { items: [], nextCursor: null } };
  });
  render(
    <MemoryRouter>
      <WorkEnvRequestWizard />
    </MemoryRouter>,
  );
  await screen.findByRole('button', { name: '신청 제출' });
  fill(/워크스페이스명/, '분석 환경');
  fill(/CPU \(Core\)/, '4');
  fill(/메모리 \(GiB\)/, '16');
  fill(/저장소 \(GiB\)/, '100');
  fill(/사용 시작일/, '2026-10-01');
  fill(/사용 종료일/, '2026-10-31');
  fireEvent.click(screen.getByRole('button', { name: '신청 제출' }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      '/v1/work/requests',
      expect.objectContaining({ method: 'POST' }),
    ),
  );
  const [, options] = request.mock.calls.find(
    ([, init]) => init?.method === 'POST',
  )!;
  expect(JSON.parse(options.body)).toMatchObject({
    type: 'workspace',
    projectId: 'project-1',
    payload: { workspaceName: '분석 환경', cpuCores: '4' },
  });
  expect(
    await screen.findByText(/작업환경 신청을 접수했습니다/),
  ).toBeInTheDocument();
  expect(localStorage.length).toBe(0);
});
