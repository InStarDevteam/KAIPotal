import { useSearchParams } from 'react-router-dom';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { MyPageTabs, MY_PAGE_TABS } from './MyPageTabs';
import { DefenseProfilePanel } from './DefenseProfilePanel';
import { AppearanceSettingsPanel } from './AppearanceSettingsPanel';
import { ActiveSessionPanel } from './ActiveSessionPanel';
import { MyProjectWorkspacePanel } from './MyProjectWorkspacePanel';
import { ServerMyProjectsPanel } from './ServerMyProjectsPanel';
import { ServerMyCreditsPanel } from './ServerMyCreditsPanel';
import { PendingConnectionPanel } from './PendingConnectionPanel';
import { EmailVerificationPanel } from './EmailVerificationPanel';
import { PasswordChangePanel } from './PasswordChangePanel';
import { ResourceUsageHistoryPanel } from './ResourceUsageHistoryPanel';
import { MyCreditHistoryPanel } from './MyCreditHistoryPanel';
import { NotificationSettingPanel } from './NotificationSettingPanel';
import { PersonalApiKeyPanel } from './PersonalApiKeyPanel';
import { MyActivityLogPanel } from './MyActivityLogPanel';
import { ServerMyActivityPanel } from './ServerMyActivityPanel';
import {
  mockEmailVerification,
  mockPasswordPolicy,
  mockActiveSessions,
  mockMyProjectWorkspaces,
  mockResourceUsages,
  mockCreditHistories,
  mockNotificationSettings,
  mockApiKeys,
  mockActivityLogs,
  mockMyNotifications,
  mockWorkspaceAccessStatuses,
} from './mockMyPageData';
import { MyPageTab } from './types';
import './myPage.css';

const tabIds = [
  'profile',
  'email',
  'password',
  'sessions',
  'projects',
  'resources',
  'credits',
  'appearance',
  'notifications',
  'api-keys',
  'activity',
];
export const MyPage = () => {
  const { isDemo, tenantId, actorId, tenants } = usePortalRuntime();
  const [params, setParams] = useSearchParams();
  const tabIndex = Math.max(0, tabIds.indexOf(params.get('tab') || 'profile'));
  const activeTab = MY_PAGE_TABS[tabIndex];
  const changeTab = (tab: MyPageTab) => {
    const next = new URLSearchParams(params);
    next.set('tab', tabIds[MY_PAGE_TABS.indexOf(tab)]);
    setParams(next);
  };
  const content = () => {
    switch (activeTab) {
      case '프로필':
        return <DefenseProfilePanel />;
      case '화면 설정':
        return <AppearanceSettingsPanel />;
      case '활성 세션':
        return (
          <ActiveSessionPanel sessions={isDemo ? mockActiveSessions : []} />
        );
      case '내 프로젝트/워크스페이스':
        return isDemo ? (
          <MyProjectWorkspacePanel
            items={mockMyProjectWorkspaces}
            accessStatuses={mockWorkspaceAccessStatuses}
          />
        ) : (
          <ServerMyProjectsPanel />
        );
      case '크레딧 사용 내역':
        return isDemo ? (
          <MyCreditHistoryPanel histories={mockCreditHistories} />
        ) : (
          <ServerMyCreditsPanel />
        );
      case '내 활동 로그':
        return isDemo ? (
          <MyActivityLogPanel logs={mockActivityLogs} />
        ) : (
          <ServerMyActivityPanel />
        );
      default:
        if (!isDemo) return <PendingConnectionPanel title={activeTab} />;
        switch (activeTab) {
          case '이메일 확인':
            return (
              <EmailVerificationPanel verification={mockEmailVerification} />
            );
          case '비밀번호 변경':
            return <PasswordChangePanel policy={mockPasswordPolicy} />;
          case '자원 사용 이력':
            return <ResourceUsageHistoryPanel usages={mockResourceUsages} />;
          case '알림 설정':
            return (
              <NotificationSettingPanel
                settings={mockNotificationSettings}
                notifications={mockMyNotifications}
              />
            );
          case '개인 API Key':
            return <PersonalApiKeyPanel apiKeys={mockApiKeys} />;
          default:
            return null;
        }
    }
  };
  return (
    <div className="my-page">
      <header className="my-page-header">
        <div>
          <span className="my-eyebrow">PERSONAL SPACE</span>
          <h1>마이페이지</h1>
          <p>내 계정과 업무, 이용 기록을 한곳에서 관리하세요.</p>
        </div>
        <div className="my-page-scope">
          {tenants.find(t => t.id === tenantId)?.name}
          {isDemo && (
            <span className="my-status pending">예시 데이터 · 화면 시연</span>
          )}
        </div>
      </header>
      <div className="my-page-layout">
        <MyPageTabs value={activeTab} onChange={changeTab} />
        <div
          key={`${tenantId}:${actorId}:${isDemo}:${activeTab}`}
          id="my-page-panel"
          role="tabpanel"
          aria-labelledby={`my-tab-${tabIndex}`}
          className="my-page-content"
        >
          {content()}
        </div>
      </div>
    </div>
  );
};
