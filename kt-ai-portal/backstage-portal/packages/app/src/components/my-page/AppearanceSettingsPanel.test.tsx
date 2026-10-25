import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { AppearanceSettingsPanel } from './AppearanceSettingsPanel';
import { defaultTenantSettings } from '../tenant-settings/settingsModel';
import { PlatformPreferences } from '../tenant-settings/platformAccessModel';
import { clearHomeDesignSelection } from '../portal-home/homeDesign';

let mockPreferences: PlatformPreferences;
let mockSettings = defaultTenantSettings('army');
const mockSavePreferences = jest.fn();
const mockSetDirty = jest.fn();
jest.mock('../tenant-settings/PlatformAccessContext', () => ({
  usePlatformAccess: () => ({
    preferences: mockPreferences,
    loading: false,
    saving: false,
    error: '',
    reload: jest.fn(),
    savePreferences: mockSavePreferences,
  }),
}));
jest.mock('../tenant-settings/TenantSettingsContext', () => ({
  useTenantSettings: () => ({
    settings: mockSettings,
    setHasUnsavedChanges: mockSetDirty,
  }),
}));
jest.mock('../portal-home/homeDesign', () => ({
  ...jest.requireActual('../portal-home/homeDesign'),
  clearHomeDesignSelection: jest.fn(),
}));

beforeEach(() => {
  mockSettings = defaultTenantSettings('army');
  mockPreferences = {
    platformOrder: ['vdi', 'data', 'cloud', 'ai'],
    favorites: ['vdi'],
    design: 'tenant',
  };
  mockSavePreferences.mockReset();
  mockSavePreferences.mockImplementation(async next => {
    mockPreferences = next;
  });
  mockSetDirty.mockReset();
  (clearHomeDesignSelection as jest.Mock).mockClear();
});
afterEach(cleanup);

test('saving a personal design preserves existing platform ordering and favorites and exits temporary review', async () => {
  render(<AppearanceSettingsPanel />);
  fireEvent.click(screen.getByRole('button', { name: '개인 디자인 Orbit' }));
  fireEvent.click(screen.getByRole('button', { name: '화면 설정 저장' }));
  await waitFor(() =>
    expect(mockSavePreferences).toHaveBeenCalledWith({
      platformOrder: ['vdi', 'data', 'cloud', 'ai'],
      favorites: ['vdi'],
      design: 'orbit',
    }),
  );
  expect(clearHomeDesignSelection).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/화면 설정을 저장했습니다/)).toBeTruthy();
});

test('font changes are persisted and apply the same explicit font scale as the tenant controls', async () => {
  render(<AppearanceSettingsPanel />);
  fireEvent.mouseDown(screen.getByLabelText('개인 글자 크기'));
  fireEvent.click(
    await screen.findByRole('option', { name: '아주 크게 · 120%' }),
  );
  fireEvent.click(screen.getByRole('button', { name: '화면 설정 저장' }));
  await waitFor(() =>
    expect(mockSavePreferences).toHaveBeenCalledWith(
      expect.objectContaining({ fontScale: 1.2 }),
    ),
  );
});

test('returning to tenant defaults removes the font override without changing favorites', async () => {
  mockPreferences = { ...mockPreferences, design: 'canvas', fontScale: 1.2 };
  render(<AppearanceSettingsPanel />);
  fireEvent.click(screen.getByRole('button', { name: '군 기본값으로 채우기' }));
  fireEvent.click(screen.getByRole('button', { name: '화면 설정 저장' }));
  await waitFor(() =>
    expect(mockSavePreferences).toHaveBeenCalledWith({
      platformOrder: ['vdi', 'data', 'cloud', 'ai'],
      favorites: ['vdi'],
      design: 'tenant',
    }),
  );
});

test('a failed server save remains visible and never exits review or reports successful persistence', async () => {
  mockSavePreferences.mockRejectedValueOnce(new Error('서버 저장 실패'));
  render(<AppearanceSettingsPanel />);
  fireEvent.click(screen.getByRole('button', { name: '개인 디자인 Focus' }));
  fireEvent.click(screen.getByRole('button', { name: '화면 설정 저장' }));
  await screen.findByText('서버 저장 실패');
  expect(clearHomeDesignSelection).not.toHaveBeenCalled();
  expect(screen.queryByText(/화면 설정을 저장했습니다/)).toBeNull();
  expect(
    screen
      .getByRole('button', { name: '화면 설정 저장' })
      .getAttribute('disabled'),
  ).toBeNull();
});

test('an in-flight save blocks duplicate submissions and all draft/reset controls until completion', async () => {
  let finish: () => void = () => {};
  mockSavePreferences.mockImplementationOnce(
    next =>
      new Promise<void>(resolve => {
        finish = () => {
          mockPreferences = next;
          resolve();
        };
      }),
  );
  render(<AppearanceSettingsPanel />);
  fireEvent.click(screen.getByRole('button', { name: '개인 디자인 Focus' }));
  const saveButton = screen.getByRole('button', { name: '화면 설정 저장' });
  fireEvent.click(saveButton);
  fireEvent.click(saveButton);
  expect(mockSavePreferences).toHaveBeenCalledTimes(1);
  for (const name of [
    '화면 설정 저장',
    '변경 취소',
    '군 기본값으로 채우기',
    '개인 디자인 Canvas',
  ])
    expect(screen.getByRole('button', { name }).hasAttribute('disabled')).toBe(
      true,
    );
  expect(
    screen.getByLabelText('개인 글자 크기').getAttribute('aria-disabled'),
  ).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: '개인 디자인 Canvas' }));
  expect(
    screen
      .getByRole('button', { name: '개인 디자인 Focus' })
      .getAttribute('aria-pressed'),
  ).toBe('true');
  await act(async () => finish());
  await screen.findByText(/화면 설정을 저장했습니다/);
  expect(
    screen
      .getByRole('button', { name: '개인 디자인 Canvas' })
      .hasAttribute('disabled'),
  ).toBe(false);
  expect(mockSavePreferences).toHaveBeenCalledTimes(1);
});
