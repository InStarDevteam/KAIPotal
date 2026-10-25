import { act, cleanup, render, waitFor } from '@testing-library/react';
import {
  PlatformAccessProvider,
  usePlatformAccess,
} from './PlatformAccessContext';
import {
  defaultPlatformPolicy,
  defaultPlatformPreferences,
  platformPolicyKey,
  preferencesKey,
} from './platformAccessModel';
import { PortalRole } from '../authz/types';

let mockRoles: PortalRole[] = ['branch-admin'];
let mockCanManage = true;
const mockRequest = jest.fn();
let mockRuntime = {
  tenantId: 'army',
  actorId: 'demo:branch-admin',
  isDemo: true,
  request: mockRequest,
  loading: false,
};
jest.mock('../portal-runtime/PortalRuntimeContext', () => ({
  usePortalRuntime: () => mockRuntime,
}));
jest.mock('../authz', () => ({
  useAuthz: () => ({ roles: mockRoles, hasPermission: () => mockCanManage }),
}));
jest.mock('../portal-runtime/demoActivity', () => ({
  appendDemoActivity: jest.fn(),
}));
let context: ReturnType<typeof usePlatformAccess>;
function Probe() {
  context = usePlatformAccess();
  return null;
}
const provider = () => (
  <PlatformAccessProvider>
    <Probe />
  </PlatformAccessProvider>
);
beforeEach(() => {
  mockRoles = ['branch-admin'];
  mockCanManage = true;
  mockRuntime = {
    tenantId: 'army',
    actorId: 'demo:branch-admin',
    isDemo: true,
    request: mockRequest,
    loading: false,
  };
  mockRequest.mockReset();
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});
test('general users cannot change tenant access policy or assign administrators', async () => {
  mockRoles = ['general-user'];
  mockCanManage = false;
  render(provider());
  await waitFor(() => expect(context.loading).toBe(false));
  await expect(context.savePolicy(defaultPlatformPolicy())).rejects.toThrow(
    '권한',
  );
  await expect(
    context.assignTenantAdmin(
      {
        id: 'other',
        membershipId: 'other',
        name: '다른 사용자',
        roles: ['general-user'],
      },
      '권한 부여',
    ),
  ).rejects.toThrow('슈퍼유저');
});
test('launch rechecks persisted policy so a stale page cannot bypass revoked access', async () => {
  render(provider());
  await waitFor(() => expect(context.loading).toBe(false));
  expect(context.platforms.find(p => p.id === 'ai')?.canAccess).toBe(true);
  const revoked = defaultPlatformPolicy();
  revoked.platforms[0].enabled = false;
  localStorage.setItem(platformPolicyKey('army'), JSON.stringify(revoked));
  await expect(context.launchPlatform('ai')).rejects.toThrow('사용 중지');
});
test('an unconfigured service returns no URL rather than simulating platform success', async () => {
  render(provider());
  await waitFor(() => expect(context.loading).toBe(false));
  await expect(context.launchPlatform('ai')).resolves.toBeNull();
});
test('preferences are isolated by both tenant and actor', async () => {
  const view = render(provider());
  await waitFor(() => expect(context.loading).toBe(false));
  await act(async () =>
    context.savePreferences({
      platformOrder: ['vdi', 'ai', 'data', 'cloud'],
      favorites: ['vdi'],
    }),
  );
  expect(
    JSON.parse(
      localStorage.getItem(preferencesKey('army', 'demo:branch-admin'))!,
    ).favorites,
  ).toEqual(['vdi']);
  mockRuntime = { ...mockRuntime, tenantId: 'navy' };
  view.rerender(provider());
  await waitFor(() => expect(context.loading).toBe(false));
  expect(context.preferences.favorites).toEqual([]);
  mockRuntime = {
    ...mockRuntime,
    tenantId: 'army',
    actorId: 'demo:general-user',
  };
  view.rerender(provider());
  await waitFor(() => expect(context.loading).toBe(false));
  expect(context.preferences.favorites).toEqual([]);
});
test('concurrent administrators cannot overwrite a newer policy', async () => {
  render(provider());
  await waitFor(() => expect(context.loading).toBe(false));
  localStorage.setItem(
    platformPolicyKey('army'),
    JSON.stringify({ ...defaultPlatformPolicy(), version: 3 }),
  );
  await act(async () => {
    await expect(context.savePolicy(context.policy)).rejects.toThrow('다른 창');
  });
});
test('late tenant responses cannot replace the current tenant policy', async () => {
  mockCanManage = false;
  mockRuntime = { ...mockRuntime, isDemo: false };
  let resolveArmy: (value: unknown) => void = () => {};
  mockRequest.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolveArmy = resolve;
      }),
  );
  const navy = defaultPlatformPolicy();
  navy.platforms[0].enabled = false;
  mockRequest.mockResolvedValueOnce({
    data: { policy: navy, preferences: defaultPlatformPreferences() },
  });
  const view = render(provider());
  mockRuntime = { ...mockRuntime, tenantId: 'navy' };
  view.rerender(provider());
  await waitFor(() => expect(context.loading).toBe(false));
  await act(async () =>
    resolveArmy({
      data: {
        policy: defaultPlatformPolicy(),
        preferences: defaultPlatformPreferences(),
      },
    }),
  );
  expect(context.platforms.find(p => p.id === 'ai')?.canAccess).toBe(false);
});

test('a live launch response for a previous tenant cannot redirect the current session', async () => {
  mockCanManage = false;
  mockRuntime = { ...mockRuntime, isDemo: false };
  mockRequest.mockResolvedValue({
    data: {
      policy: defaultPlatformPolicy(),
      preferences: defaultPlatformPreferences(),
    },
  });
  const view = render(provider());
  await waitFor(() => expect(context.loading).toBe(false));
  let resolveLaunch: (value: unknown) => void = () => {};
  mockRequest.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolveLaunch = resolve;
      }),
  );
  const pending = context.launchPlatform('ai');
  mockRuntime = { ...mockRuntime, tenantId: 'navy' };
  view.rerender(provider());
  await waitFor(() => expect(context.loading).toBe(false));
  resolveLaunch({ data: { href: 'https://army.example.mil/' } });
  await expect(pending).rejects.toThrow('소속이 변경');
});
