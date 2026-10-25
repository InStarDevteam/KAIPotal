import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import {
  TenantSettingsProvider,
  useTenantSettings,
} from './TenantSettingsContext';
import {
  defaultTenantSettings,
  tenantSettingsStorageKey,
} from './settingsModel';

jest.mock('./PlatformAccessContext', () => ({
  PlatformAccessProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
jest.mock('../portal-home/PortalAppearanceProvider', () => ({
  PortalAppearanceProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

let mockRole = 'branch-admin';
let mockCanEdit = true;
const mockRequest = jest.fn();
let mockRuntime = {
  tenantId: 'army',
  tenants: [
    { id: 'army', name: '육군', branch: 'army' },
    { id: 'navy', name: '해군', branch: 'navy' },
  ],
  request: mockRequest,
  isDemo: true,
  actorId: 'demo:branch-admin',
  loading: false,
  error: null,
};
jest.mock('../portal-runtime/PortalRuntimeContext', () => ({
  usePortalRuntime: () => mockRuntime,
}));
jest.mock('../portal-runtime/demoActivity', () => ({
  appendDemoActivity: jest.fn(),
}));
jest.mock('../authz', () => ({
  useAuthz: () => ({
    primaryRole: mockRole,
    hasAnyPermission: () => mockCanEdit,
    hasPermission: () => mockCanEdit,
  }),
}));

let context: ReturnType<typeof useTenantSettings>;
function Probe() {
  context = useTenantSettings();
  return (
    <div>
      {context.loading ? 'loading' : context.settings.branding.portalTitle}
    </div>
  );
}
const provider = () => (
  <TenantSettingsProvider>
    <Probe />
  </TenantSettingsProvider>
);

beforeEach(() => {
  mockRole = 'branch-admin';
  mockCanEdit = true;
  mockRequest.mockReset();
  mockRuntime = {
    ...mockRuntime,
    tenantId: 'army',
    isDemo: true,
    request: mockRequest,
  };
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

test('branch administrator settings are visible to general users in the same tenant, with writes denied', async () => {
  const view = render(provider());
  await waitFor(() => expect(context.loading).toBe(false));
  await act(async () =>
    context.saveSettings({
      ...context.settings,
      branding: { ...context.settings.branding, portalTitle: '육군 연구 포털' },
    }),
  );
  mockRole = 'general-user';
  mockCanEdit = false;
  view.rerender(provider());
  await waitFor(() =>
    expect(screen.getByText('육군 연구 포털')).toBeInTheDocument(),
  );
  await expect(context.saveSettings(context.settings)).rejects.toThrow('권한');
  mockRuntime = { ...mockRuntime, tenantId: 'navy' };
  view.rerender(provider());
  await waitFor(() =>
    expect(screen.getByText('해군 지능형플랫폼 포털')).toBeInTheDocument(),
  );
});

test('a stale response for another tenant cannot replace the selected tenant settings', async () => {
  let resolveArmy: (value: unknown) => void = () => {};
  mockRuntime = { ...mockRuntime, isDemo: false };
  mockRequest.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolveArmy = resolve;
      }),
  );
  mockRequest.mockResolvedValueOnce({
    data: defaultTenantSettings('navy', '해군'),
  });
  const view = render(provider());
  mockRuntime = { ...mockRuntime, tenantId: 'navy' };
  view.rerender(provider());
  await waitFor(() =>
    expect(screen.getByText('해군 지능형플랫폼 포털')).toBeInTheDocument(),
  );
  await act(async () =>
    resolveArmy({ data: defaultTenantSettings('army', '육군') }),
  );
  expect(screen.getByText('해군 지능형플랫폼 포털')).toBeInTheDocument();
});

test('live saves send an optimistic version and omit response-only tenant fields', async () => {
  mockRuntime = { ...mockRuntime, isDemo: false };
  const saved = {
    ...defaultTenantSettings('army', '육군'),
    tenantId: 'army',
    version: 4,
  };
  mockRequest.mockResolvedValue({ data: saved });
  render(provider());
  await waitFor(() => expect(context.loading).toBe(false));
  await act(async () => context.saveSettings(context.settings));
  const body = JSON.parse(mockRequest.mock.calls[1][1].body);
  expect(body.expectedVersion).toBe(4);
  expect(Object.keys(body).sort()).toEqual([
    'branding',
    'expectedVersion',
    'menus',
  ]);
});

test('demo changes from another editor are preserved when an old draft is saved', async () => {
  render(provider());
  await waitFor(() => expect(context.loading).toBe(false));
  const newer = {
    ...context.settings,
    version: 3,
    branding: {
      ...context.settings.branding,
      portalTitle: '다른 관리자의 설정',
    },
  };
  localStorage.setItem(tenantSettingsStorageKey('army'), JSON.stringify(newer));
  await act(async () => {
    await expect(context.saveSettings(context.settings)).rejects.toThrow(
      '다른 창',
    );
  });
  expect(
    JSON.parse(localStorage.getItem(tenantSettingsStorageKey('army'))!).version,
  ).toBe(3);
});

test('saving branding does not clear an independent unsaved platform policy', async () => {
  mockRuntime = { ...mockRuntime, isDemo: true };
  render(provider());
  await waitFor(() => expect(context.loading).toBe(false));
  act(() => {
    context.setHasUnsavedChanges(true);
    context.setHasUnsavedChanges(true, 'platform-access');
  });
  await act(async () =>
    context.saveSettings({
      ...context.settings,
      branding: { ...context.settings.branding, portalTitle: '변경된 디자인' },
    }),
  );
  expect(context.hasUnsavedChanges).toBe(true);
  act(() => context.setHasUnsavedChanges(false, 'platform-access'));
  expect(context.hasUnsavedChanges).toBe(false);
});
