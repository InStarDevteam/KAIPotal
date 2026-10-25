import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MyPage } from './MyPage';
import {
  usePortalRuntime,
  useOptionalPortalRuntime,
} from '../portal-runtime/PortalRuntimeContext';

jest.mock('../portal-runtime/PortalRuntimeContext', () => ({
  usePortalRuntime: jest.fn(),
  useOptionalPortalRuntime: jest.fn(),
}));
const runtime = {
  isDemo: false,
  tenantId: 'army',
  actorId: 'user1',
  tenants: [{ id: 'army', name: '육군' }],
  roles: ['general-user'],
  permissions: ['project.request', 'credit.view'],
  request: jest.fn(),
};
beforeEach(() => {
  jest.clearAllMocks();
  (usePortalRuntime as jest.Mock).mockReturnValue(runtime);
  (useOptionalPortalRuntime as jest.Mock).mockReturnValue(runtime);
});
it('keeps account capabilities while removing the invented pilot tab', () => {
  render(
    <MemoryRouter initialEntries={['/my-page?tab=sessions']}>
      <MyPage />
    </MemoryRouter>,
  );
  expect(screen.queryByRole('tab', { name: /실증/ })).not.toBeInTheDocument();
  expect(screen.getAllByRole('tab')).toHaveLength(11);
  expect(screen.getByRole('tab', { name: '화면 설정' })).toBeInTheDocument();
  expect(
    screen.getByText('활성 세션 조회·종료는 아직 연결되지 않았습니다'),
  ).toBeInTheDocument();
  expect(screen.queryByText('10.20.30.40')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: /종료/ }),
  ).not.toBeInTheDocument();
  expect(runtime.request).not.toHaveBeenCalled();
});
it('never asks for a real password before the identity provider is connected', () => {
  render(
    <MemoryRouter initialEntries={['/my-page?tab=password']}>
      <MyPage />
    </MemoryRouter>,
  );
  expect(
    screen.getByText('비밀번호는 기관 인증 시스템에서 관리합니다'),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText('현재 비밀번호')).not.toBeInTheDocument();
});
it('queries the actual current users projects and links directly to detail', async () => {
  runtime.request.mockResolvedValue({
    data: {
      items: [
        {
          id: 'p1',
          name: '내 실제 프로젝트',
          status: 'active',
          my_role: 'member',
          is_member: true,
        },
      ],
      pagination: { total: 1 },
    },
  });
  render(
    <MemoryRouter initialEntries={['/my-page?tab=projects']}>
      <MyPage />
    </MemoryRouter>,
  );
  expect(await screen.findByText('내 실제 프로젝트')).toBeInTheDocument();
  expect(runtime.request).toHaveBeenCalledWith(
    '/v1/projects?mine=true&page=1&pageSize=20',
  );
  expect(screen.getByRole('link', { name: '프로젝트 보기' })).toHaveAttribute(
    'href',
    '/project-workspace?project=p1',
  );
  fireEvent.change(screen.getByLabelText('현재 목록에서 프로젝트 검색'), {
    target: { value: '존재하지않음' },
  });
  expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument();
});
