import { render, screen, cleanup } from '@testing-library/react';
import {
  AuthzProvider,
  useAuthz,
  ROLE_OVERRIDE_STORAGE_KEY,
} from './AuthzContext';

let mockCaptureEnabled = false;
let mockServerContext: { roles: string[]; permissions: string[] } | undefined;
jest.mock('@backstage/core-plugin-api', () => ({
  configApiRef: {},
  useApi: () => ({ getOptionalBoolean: () => mockCaptureEnabled }),
}));
jest.mock('../preview-auth', () => ({
  useDemoAdmin: () => ({ isAdmin: true }),
}));
jest.mock('../portal-runtime/PortalRuntimeContext', () => ({
  useOptionalPortalRuntime: () => mockServerContext,
}));
const Probe = () => {
  const { primaryRole, hasPermission } = useAuthz();
  return (
    <div>
      {primaryRole}:{String(hasPermission('rbac.manage'))}
    </div>
  );
};
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  mockServerContext = undefined;
});

test('Firebase email admin flag does not grant production administrator permissions', () => {
  mockCaptureEnabled = false;
  render(
    <AuthzProvider>
      <Probe />
    </AuthzProvider>,
  );
  expect(screen.getByText('general-user:false')).toBeInTheDocument();
});
test('browser preview flags cannot elevate a non-capture session', () => {
  mockCaptureEnabled = false;
  sessionStorage.setItem('__kt_ai_portal_admin_preview__', 'true');
  sessionStorage.setItem(ROLE_OVERRIDE_STORAGE_KEY, 'portal-admin');
  render(
    <AuthzProvider>
      <Probe />
    </AuthzProvider>,
  );
  expect(screen.getByText('general-user:false')).toBeInTheDocument();
});
test('explicit capture profile retains role preview for presentation', () => {
  mockCaptureEnabled = true;
  sessionStorage.setItem(ROLE_OVERRIDE_STORAGE_KEY, 'security-auditor');
  render(
    <AuthzProvider>
      <Probe />
    </AuthzProvider>,
  );
  expect(screen.getByText('security-auditor:false')).toBeInTheDocument();
});

test('production permissions use server grants rather than the role name', () => {
  mockCaptureEnabled = false;
  mockServerContext = { roles: ['portal-admin'], permissions: ['portal.view'] };
  render(
    <AuthzProvider>
      <Probe />
    </AuthzProvider>,
  );
  expect(screen.getByText('portal-admin:false')).toBeInTheDocument();
});

test('production recognizes verified tenant administrator grants', () => {
  mockCaptureEnabled = false;
  mockServerContext = {
    roles: ['branch-admin'],
    permissions: ['portal.view', 'rbac.manage'],
  };
  render(
    <AuthzProvider>
      <Probe />
    </AuthzProvider>,
  );
  expect(screen.getByText('branch-admin:true')).toBeInTheDocument();
});

test('demo tenant assignments take effect through the runtime without granting production overrides', () => {
  mockCaptureEnabled = true;
  sessionStorage.setItem(ROLE_OVERRIDE_STORAGE_KEY, 'general-user');
  mockServerContext = {
    roles: ['branch-admin'],
    permissions: ['tenant.manage'],
  };
  render(
    <AuthzProvider>
      <Probe />
    </AuthzProvider>,
  );
  expect(screen.getByText('branch-admin:false')).toBeInTheDocument();
});
