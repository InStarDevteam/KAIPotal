import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DefenseProfilePanel } from './DefenseProfilePanel';
import { emptyDefenseProfile } from './defenseProfileModel';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';

jest.mock('../portal-runtime/PortalRuntimeContext', () => ({
  usePortalRuntime: jest.fn(),
}));
const request = jest.fn();
const profile = {
  ...emptyDefenseProfile(),
  userCategory: 'military',
  personnelType: 'soldier',
  militaryNumber: 'DEMO-01234',
};
const response = {
  data: {
    profile,
    version: 2,
    identity: {
      userId: 'u1',
      displayName: '시험 사용자',
      email: 'test@example.invalid',
      status: 'active',
    },
  },
};
beforeEach(() => {
  jest.clearAllMocks();
  (usePortalRuntime as jest.Mock).mockReturnValue({
    isDemo: false,
    request,
    tenantId: 'army',
    actorId: 'u1',
    tenants: [{ id: 'army', name: '육군' }],
    roles: ['general-user'],
  });
});
it('saves declared personnel fields to server with optimistic version, not authorization', async () => {
  request.mockResolvedValueOnce(response).mockResolvedValueOnce({
    data: { profile: { ...profile, contact: '02-1234-5678' }, version: 3 },
  });
  render(<DefenseProfilePanel />);
  await screen.findByText('시험 사용자');
  fireEvent.change(screen.getByLabelText('업무 연락처'), {
    target: { value: '02-1234-5678' },
  });
  fireEvent.click(screen.getByRole('button', { name: '프로필 저장' }));
  expect(await screen.findByText('프로필을 저장했습니다.')).toBeInTheDocument();
  const call = request.mock.calls[1];
  expect(call[0]).toBe('/v1/me/profile');
  expect(JSON.parse(call[1].body)).toEqual({
    profile: { ...profile, contact: '02-1234-5678' },
    expectedVersion: 2,
  });
});
it('keeps entered values after a failed save and never reports success', async () => {
  request
    .mockResolvedValueOnce(response)
    .mockRejectedValueOnce(new Error('저장 서비스 오류'));
  render(<DefenseProfilePanel />);
  await screen.findByText('시험 사용자');
  fireEvent.change(screen.getByLabelText('부서'), {
    target: { value: '정보화부서' },
  });
  fireEvent.click(screen.getByRole('button', { name: '프로필 저장' }));
  expect(await screen.findByText('저장 서비스 오류')).toBeInTheDocument();
  expect(screen.getByLabelText('부서')).toHaveValue('정보화부서');
  expect(screen.queryByText('프로필을 저장했습니다.')).not.toBeInTheDocument();
});
it('does not enable save or substitute fixtures when profile API is unavailable', async () => {
  request.mockRejectedValue(new Error('프로필 API 연결 대기'));
  render(<DefenseProfilePanel />);
  await waitFor(() =>
    expect(screen.getByText('프로필 API 연결 대기')).toBeInTheDocument(),
  );
  expect(screen.getByRole('button', { name: '프로필 저장' })).toBeDisabled();
  expect(screen.queryByText('김국방 (시연)')).not.toBeInTheDocument();
});

it('exposes labeled category selection and clears military fields when switching to external', async () => {
  request.mockResolvedValueOnce(response);
  render(<DefenseProfilePanel />);
  await screen.findByText('시험 사용자');
  fireEvent.mouseDown(
    screen.getByLabelText('사용자 구분', { selector: '[role="button"]' }),
  );
  fireEvent.click(screen.getByRole('option', { name: '외부 사용자' }));
  expect(
    screen.queryByLabelText('군번 / 군무원 직원번호'),
  ).not.toBeInTheDocument();
  expect(screen.getByLabelText('소속 회사 / 연구기관')).toBeInTheDocument();
  fireEvent.mouseDown(
    screen.getByLabelText('사용자 구분', { selector: '[role="button"]' }),
  );
  fireEvent.click(screen.getByRole('option', { name: '군 내부 사용자' }));
  expect(screen.getByLabelText('군번 / 군무원 직원번호')).toHaveValue('');
});
