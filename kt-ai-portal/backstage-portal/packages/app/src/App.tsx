import { PortalRuntimeProvider } from './components/portal-runtime/PortalRuntimeContext';
import { ActivityTracker } from './components/portal-runtime/ActivityTracker';
import { TenantSettingsProvider } from './components/tenant-settings/TenantSettingsContext';
import { TenantSettingsPage } from './components/tenant-settings/TenantSettingsPage';
import { AuditHistoryPage } from './components/audit-history/AuditHistoryPage';
import { PortalShell } from './components/portal-shell/PortalShell';
import { useEffect } from 'react';
import { of } from 'rxjs';
import { Route, Routes } from 'react-router-dom';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import { ProjectWorkspacePage } from './components/project-workspace';
import { ExportApprovalPage } from './components/export-approval';
import { CreditManagerPage } from './components/credit-manager';
// 보류: import { KrmfEvidencePage } from './components/krmf-evidence';
import { KrmfMonitorPage } from './components/krmf-monitor';
import { IntegratedSearchPage } from './components/integrated-search';
import { PortalWorkPage } from './components/portal-work/PortalWorkPage';
import { PortalHomePage } from './components/portal-home/PortalHomePage';
import { PlatformApiIntegrationPage } from './components/platform-api-integration';
import { AdminConsolePage } from './components/admin-console';
import { ServiceCatalogPage } from './components/service-catalog';
import { ProposalBoardPage } from './components/proposal-board';
import { MyPage } from './components/my-page';
import { EnvironmentSettings } from './components/environment-settings';
import { TenantManagementPage } from './components/tenant-management';
// 보류: import { RequirementCoveragePage } from './components/requirement-coverage';
// 보류: import { RequirementProgressPage } from './components/requirement-progress';
// 보류: import { PlatformApiIntegrationPage } from './components/platform-api-integration';
// 보류: import { WorkflowScenarioPage } from './components/workflow-scenarios';
import {
  PreviewLoginPage,
  isPreviewAuthenticated,
  DemoAdminProvider,
} from './components/preview-auth';
import { Box } from '@material-ui/core';
import { createApp } from '@backstage/app-defaults';
import { AppRouter, OAuth2 } from '@backstage/core-app-api';
import {
  AlertDisplay,
  OAuthRequestDialog,
  UserIdentity,
} from '@backstage/core-components';
import {
  createApiFactory,
  configApiRef,
  createApiRef,
  discoveryApiRef,
  oauthRequestApiRef,
  OAuthApi,
  OpenIdConnectApi,
  ProfileInfoApi,
  BackstageIdentityApi,
  SessionApi,
  useApi,
  SignInPageProps,
} from '@backstage/core-plugin-api';
import {
  AuthzProvider,
  PermissionGuard,
  PortalPermission,
} from './components/authz';
import { RoleMenuPreviewPage } from './components/role-menu-preview';
import { PortalJourneyBar } from './components/navigation';

export const oidcAuthApiRef = createApiRef<
  OAuthApi &
    OpenIdConnectApi &
    ProfileInfoApi &
    BackstageIdentityApi &
    SessionApi
>({
  id: 'auth.oidc',
});

const PREVIEW_GUEST_IDENTITY = {
  type: 'user' as const,
  userEntityRef: 'user:default/guest',
  ownershipEntityRefs: ['user:default/guest'],
};

// 접근코드 로그인은 백엔드 게스트 토큰을 발급받아 BFF 호출에 사용한다.
// UserIdentity.createGuest()는 토큰을 발급하지 않으므로 쓰지 않는다.
const createPreviewGuestAuthApi = () => {
  let cached: { token: string; expiresAt: number } | undefined;
  return {
    async getBackstageIdentity() {
      if (!cached || cached.expiresAt <= Date.now() + 60000) {
        const res = await fetch('/api/auth/guest/refresh', { method: 'POST' });
        if (!res.ok) throw new Error('인증 토큰을 받지 못했습니다.');
        const data = await res.json();
        cached = {
          token: data.backstageIdentity.token as string,
          expiresAt: Date.now() + 3600_000,
        };
      }
      return { token: cached.token, identity: PREVIEW_GUEST_IDENTITY };
    },
    async getProfile() {
      return { email: 'guest@example.com', displayName: '포털 협의 사용자' };
    },
    async signIn() {
      /* 접근코드 통과가 로그인이다. */
    },
    sessionState$: () =>
      of({ loggedIn: true }) as unknown as ReturnType<
        Parameters<typeof UserIdentity.create>[0]['authApi']['sessionState$']
      >,
    async signOut() {
      /* 세션 정리는 프리뷰 인증 키 제거로 수행한다. */
    },
  };
};

const PortalSignInPage = ({ onSignInSuccess }: SignInPageProps) => {
  const config = useApi(configApiRef);
  const oidc = useApi(oidcAuthApiRef);
  const previewEnabled =
    config.getOptionalBoolean('app.previewAuthEnabled') === true;
  useEffect(() => {
    if (!previewEnabled || !isPreviewAuthenticated()) return;
    onSignInSuccess(
      UserIdentity.create({
        identity: PREVIEW_GUEST_IDENTITY,
        profile: {
          email: 'guest@example.com',
          displayName: '포털 협의 사용자',
        },
        authApi: createPreviewGuestAuthApi(),
      }),
    );
  }, [previewEnabled, onSignInSuccess]);
  useEffect(() => {
    if (previewEnabled) return undefined;
    let active = true;
    void oidc
      .getBackstageIdentity({ optional: true })
      .then(async result => {
        if (!result || !active) return;
        const profile = await oidc.getProfile();
        if (active)
          onSignInSuccess(
            UserIdentity.create({
              identity: result.identity,
              profile,
              authApi: oidc,
            }),
          );
      })
      .catch(() => {
        /* The explicit sign-in button reports provider errors. */
      });
    return () => {
      active = false;
    };
  }, [previewEnabled, oidc, onSignInSuccess]);
  const enterpriseLogin = async () => {
    const result = await oidc.getBackstageIdentity({ instantPopup: true });
    if (!result)
      throw new Error(
        '기관 인증 서비스를 사용할 수 없습니다. 관리자에게 문의하세요.',
      );
    const profile = await oidc.getProfile();
    onSignInSuccess(
      UserIdentity.create({
        identity: result.identity,
        profile,
        authApi: oidc,
      }),
    );
  };
  return (
    <PreviewLoginPage
      accessCode={
        previewEnabled
          ? config.getOptionalString('app.previewAccessCode') ?? 'demo1234'
          : undefined
      }
      enterpriseLogin={enterpriseLogin}
    />
  );
};

const app = createApp({
  apis: [
    createApiFactory({
      api: oidcAuthApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        oauthRequestApi: oauthRequestApiRef,
        configApi: configApiRef,
      },
      factory: ({ discoveryApi, oauthRequestApi }) =>
        OAuth2.create({
          discoveryApi,
          oauthRequestApi,
          provider: {
            id: 'oidc',
            title: 'Keycloak',
            icon: () => null,
          },
          environment: 'development',
          defaultScopes: ['openid', 'profile', 'email'],
        }),
    }),
  ],
  components: { SignInPage: PortalSignInPage },
});

const CaptureBoundary = ({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) => (
  <div data-capture-id={id} style={{ height: '100%' }}>
    {children}
  </div>
);

// 업무여정 표시 여부: 정리가 더 필요하므로 일단 비노출. 컴포넌트는 보존.
const PORTAL_JOURNEY_BAR_ENABLED = false;

const guardedRoute = (
  id: string,
  permissions: PortalPermission[],
  page: React.ReactNode,
  journeyStep?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
  options?: { journeySubdued?: boolean },
) => (
  <CaptureBoundary id={id}>
    {PORTAL_JOURNEY_BAR_ENABLED && journeyStep ? (
      <PortalJourneyBar
        currentStep={journeyStep}
        subdued={options?.journeySubdued ?? false}
      />
    ) : null}
    <PermissionGuard anyOf={permissions}>{page}</PermissionGuard>
  </CaptureBoundary>
);

const App = () => (
  <DemoAdminProvider>
    <PortalRuntimeProvider>
      <AuthzProvider>
        <TenantSettingsProvider>
          <AlertDisplay />
          <OAuthRequestDialog />
          <AppRouter>
            <ActivityTracker />
            <Routes>
              <Route path="/" element={<PortalShell />}>
                <Route
                  path="/tenant-settings"
                  element={guardedRoute(
                    'tenant-settings',
                    ['tenant.manage', 'settings.manage', 'menu.manage'],
                    <TenantSettingsPage />,
                  )}
                />
                <Route
                  path="/audit-history"
                  element={guardedRoute(
                    'audit-history',
                    ['audit.view'],
                    <AuditHistoryPage />,
                  )}
                />
                <Route
                  path="*"
                  element={
                    <Box p={4}>
                      <Typography variant="h5">
                        사용할 수 없는 페이지입니다.
                      </Typography>
                      <Typography>
                        메뉴에서 이용할 기능을 선택하세요.
                      </Typography>
                      <Button href="/" color="primary">
                        포털 홈으로 이동
                      </Button>
                    </Box>
                  }
                />
                <Route
                  path="/"
                  element={
                    <CaptureBoundary id="portal-dashboard">
                      <PortalHomePage />
                    </CaptureBoundary>
                  }
                />
                <Route
                  path="/portal-work"
                  element={guardedRoute(
                    'portal-work',
                    ['portal.view'],
                    <PortalWorkPage />,
                  )}
                />
                <Route
                  path="/project-workspace"
                  element={guardedRoute(
                    'project-workspace',
                    ['project.request', 'project.approve'],
                    <ProjectWorkspacePage />,
                    4,
                  )}
                />
                <Route
                  path="/export-approval"
                  element={guardedRoute(
                    'export-approval',
                    ['export.request', 'export.review'],
                    <ExportApprovalPage />,
                    7,
                  )}
                />
                <Route
                  path="/credit-manager"
                  element={guardedRoute(
                    'credit-manager',
                    ['credit.view', 'credit.approve'],
                    <CreditManagerPage />,
                    6,
                  )}
                />
                {/* 전용 기능 보류: 원본 구현은 components/krmf-evidence에 보관 */}
                <Route
                  path="/krmf-monitor"
                  element={guardedRoute(
                    'krmf-monitor',
                    ['krmf.view'],
                    <KrmfMonitorPage />,
                    8,
                  )}
                />
                <Route
                  path="/integrated-search"
                  element={guardedRoute(
                    'integrated-search',
                    ['catalog.view'],
                    <IntegratedSearchPage />,
                    3,
                  )}
                />
                <Route
                  path="/admin-console"
                  element={guardedRoute(
                    'admin-console',
                    ['user.manage', 'rbac.manage', 'menu.manage'],
                    <AdminConsolePage />,
                    2,
                  )}
                />
                <Route
                  path="/role-menu-preview"
                  element={guardedRoute(
                    'role-menu-preview',
                    ['menu.manage', 'rbac.manage'],
                    <RoleMenuPreviewPage />,
                    2,
                  )}
                />
                <Route
                  path="/service-catalog"
                  element={guardedRoute(
                    'service-catalog',
                    ['catalog.view'],
                    <ServiceCatalogPage />,
                    3,
                  )}
                />
                <Route
                  path="/proposal-board"
                  element={guardedRoute(
                    'proposal-board',
                    ['portal.view'],
                    <ProposalBoardPage />,
                    1,
                  )}
                />
                <Route
                  path="/my-page"
                  element={
                    <CaptureBoundary id="my-page">
                      <MyPage />
                    </CaptureBoundary>
                  }
                />
                <Route
                  path="/environment-settings"
                  element={guardedRoute(
                    'environment-settings',
                    ['settings.manage'],
                    <EnvironmentSettings />,
                    8,
                  )}
                />
                <Route
                  path="/tenant-management"
                  element={guardedRoute(
                    'tenant-management',
                    ['tenant.manage'],
                    <TenantManagementPage />,
                    2,
                  )}
                />
                {/* 전용 기능 보류: 원본 구현은 components/requirement-progress에 보관 */}
                {/* 전용 기능 보류: 원본 구현은 components/requirement-coverage에 보관 */}
                <Route
                  path="/developer-console"
                  element={guardedRoute(
                    'developer-console',
                    ['integration.view'],
                    <PlatformApiIntegrationPage />,
                  )}
                />
                <Route
                  path="/platform-api-integration"
                  element={guardedRoute(
                    'platform-api-integration',
                    ['integration.view'],
                    <PlatformApiIntegrationPage />,
                  )}
                />
                {/* 전용 기능 보류: 원본 구현은 components/workflow-scenarios에 보관 */}
              </Route>
            </Routes>
          </AppRouter>
        </TenantSettingsProvider>
      </AuthzProvider>
    </PortalRuntimeProvider>
  </DemoAdminProvider>
);

export default app.createRoot(<App />);
