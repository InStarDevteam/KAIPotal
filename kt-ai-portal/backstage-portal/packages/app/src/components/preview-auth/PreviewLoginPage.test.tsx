import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PreviewLoginPage } from './PreviewLoginPage';
import { selectHomeDesign, useHomeDesign } from '../portal-home/homeDesign';
import { setPreviewAuthenticated } from './previewAuth';

jest.mock('../portal-home/homeDesign', () => ({
  HOME_DESIGNS: [
    { id: 'aurora', number: '01', name: 'Aurora', label: '빛으로 연결하다' },
    { id: 'focus', number: '02', name: 'Focus', label: '시작에 집중하다' },
    { id: 'orbit', number: '03', name: 'Orbit', label: '가능성을 확장하다' },
    { id: 'canvas', number: '04', name: 'Canvas', label: '나의 업무를 펼치다' },
  ],
  useHomeDesign: jest.fn(),
  selectHomeDesign: jest.fn(),
}));
jest.mock('./previewAuth', () => ({ setPreviewAuthenticated: jest.fn() }));
const useDesign = jest.mocked(useHomeDesign);
beforeEach(() => {
  jest.clearAllMocks();
  useDesign.mockReturnValue({
    design: 'aurora',
    fontScale: 1,
    source: 'review',
    reviewEnabled: true,
  });
});
it('offers the four accessible design entries without third-party login', () => {
  render(<PreviewLoginPage accessCode="demo1234" />);
  for (const name of [
    '01 Aurora 메인으로 입장',
    '02 Focus 메인으로 입장',
    '03 Orbit 메인으로 입장',
    '04 Canvas 메인으로 입장',
  ]) {
    expect(screen.getByRole('button', { name })).toBeInTheDocument();
  }
  expect(screen.queryByText(/Google|구글/i)).not.toBeInTheDocument();
  expect(screen.getByLabelText('접근코드')).toHaveAttribute('type', 'password');
});
it('selects a design and reports an incorrect code without authenticating', () => {
  render(<PreviewLoginPage accessCode="demo1234" />);
  fireEvent.change(screen.getByLabelText('접근코드'), {
    target: { value: 'wrong' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: '03 Orbit 메인으로 입장' }),
  );
  expect(selectHomeDesign).toHaveBeenCalledWith('orbit');
  expect(screen.getByRole('alert')).toHaveTextContent(
    '접근코드가 일치하지 않습니다',
  );
  expect(setPreviewAuthenticated).not.toHaveBeenCalled();
  expect(screen.getByLabelText('접근코드')).toHaveAttribute(
    'aria-describedby',
    'portal-login-error portal-access-note',
  );
  fireEvent.change(screen.getByLabelText('접근코드'), {
    target: { value: 'retry' },
  });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('allows the access code to be shown and hidden without changing its value', () => {
  render(<PreviewLoginPage accessCode="demo1234" />);
  fireEvent.change(screen.getByLabelText('접근코드'), {
    target: { value: 'sample' },
  });
  fireEvent.click(screen.getByRole('button', { name: '접근코드 표시' }));
  expect(screen.getByLabelText('접근코드')).toHaveAttribute('type', 'text');
  expect(screen.getByLabelText('접근코드')).toHaveValue('sample');
  fireEvent.click(screen.getByRole('button', { name: '접근코드 숨기기' }));
  expect(screen.getByLabelText('접근코드')).toHaveAttribute('type', 'password');
});
it('uses institutional login when no review code is configured', async () => {
  useDesign.mockReturnValue({
    design: 'focus',
    fontScale: 1,
    source: 'tenant',
    reviewEnabled: false,
  });
  const enterpriseLogin = jest
    .fn()
    .mockRejectedValue(new Error('기관 인증 연결을 확인해 주세요.'));
  render(<PreviewLoginPage enterpriseLogin={enterpriseLogin} />);
  expect(screen.queryByLabelText('접근코드')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: /메인으로 입장/ }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '기관 계정으로 로그인' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent(
      '기관 인증 연결을 확인해 주세요.',
    ),
  );
  expect(enterpriseLogin).toHaveBeenCalledTimes(1);
  expect(setPreviewAuthenticated).not.toHaveBeenCalled();
  expect(
    screen.getByRole('button', { name: '기관 계정으로 로그인' }),
  ).toBeEnabled();
});
it('explains the actual security integration state in the access guide', () => {
  render(<PreviewLoginPage accessCode="demo1234" />);
  fireEvent.click(screen.getByRole('button', { name: '통합 포털' }));
  expect(screen.getByRole('dialog')).toHaveTextContent(
    '기관 인증·보안 시스템과의 연동 후 적용됩니다.',
  );
  expect(screen.getByRole('dialog')).toHaveTextContent(
    '실제 기관 계정 인증이나 단말 보안 검증을 대신하지 않습니다.',
  );
});
