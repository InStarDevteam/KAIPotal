import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PortalSettingHistoryServerPanel } from './PortalSettingHistoryServerPanel';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { parsePortalSettingHistory } from './portalSettingsServerData';

jest.mock('../portal-runtime/PortalRuntimeContext', () => ({
  usePortalRuntime: jest.fn(),
}));
const request = jest.fn();
const item = {
  id: 'h1',
  category: 'common',
  key: 'portal.title',
  oldValue: '기존 제목',
  newValue: '새 제목',
  sensitive: false,
  changedBy: 'u1',
  changedByName: '포털 관리자',
  changedAt: '2026-10-01T00:00:00Z',
};
beforeEach(() => {
  jest.resetAllMocks();
  (usePortalRuntime as jest.Mock).mockReturnValue({
    request,
    tenantId: 'army',
    actorId: 'u1',
  });
});
it('shows persisted actors, before/after values, and server pagination', async () => {
  request
    .mockResolvedValueOnce({
      data: { items: [item], page: 1, pageSize: 20, total: 21 },
    })
    .mockResolvedValueOnce({
      data: {
        items: [
          {
            ...item,
            id: 'h2',
            oldValue: null,
            newValue: '서버 두 번째 페이지',
          },
        ],
        page: 2,
        pageSize: 20,
        total: 21,
      },
    });
  render(<PortalSettingHistoryServerPanel />);
  expect(await screen.findByText('새 제목')).toBeInTheDocument();
  expect(screen.getByText('포털 관리자')).toBeInTheDocument();
  expect(screen.getByText('기존 제목')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  expect(await screen.findByText('서버 두 번째 페이지')).toBeInTheDocument();
  expect(request).toHaveBeenLastCalledWith(
    '/v1/portal-settings/history?page=2&pageSize=20',
  );
  expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
});
it('never exposes marked sensitive history values even if the response is malformed', async () => {
  request.mockResolvedValue({
    data: {
      items: [
        {
          ...item,
          sensitive: true,
          oldValue: 'SHOULD-NOT-RENDER',
          newValue: 'SECRET',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    },
  });
  render(<PortalSettingHistoryServerPanel />);
  expect(await screen.findAllByText('보호된 값')).toHaveLength(2);
  expect(screen.queryByText('SHOULD-NOT-RENDER')).not.toBeInTheDocument();
  expect(screen.queryByText('SECRET')).not.toBeInTheDocument();
});
it('shows permission denial without a fake list or retry action', async () => {
  request.mockRejectedValue(
    Object.assign(new Error('환경설정 권한이 없습니다.'), { status: 403 }),
  );
  render(<PortalSettingHistoryServerPanel />);
  expect(
    await screen.findByText('환경설정 권한이 없습니다.'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: '다시 시도' }),
  ).not.toBeInTheDocument();
});
it('clears old history on failed refresh and retries the real request', async () => {
  request
    .mockResolvedValueOnce({
      data: { items: [item], page: 1, pageSize: 20, total: 1 },
    })
    .mockRejectedValueOnce(new Error('네트워크 오류'))
    .mockResolvedValueOnce({
      data: { items: [], page: 1, pageSize: 20, total: 0 },
    });
  render(<PortalSettingHistoryServerPanel />);
  await screen.findByText('새 제목');
  fireEvent.click(screen.getByRole('button', { name: '새로고침' }));
  await screen.findByText('네트워크 오류');
  expect(screen.queryByText('새 제목')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await waitFor(() =>
    expect(
      screen.getByText('저장된 설정 변경 이력이 없습니다.'),
    ).toBeInTheDocument(),
  );
});
it('rejects malformed history envelopes instead of reporting an empty success', () => {
  expect(() => parsePortalSettingHistory({ items: [] })).toThrow();
});
