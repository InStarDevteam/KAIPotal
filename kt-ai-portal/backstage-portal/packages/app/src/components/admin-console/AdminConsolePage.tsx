import { IntegrationPendingPanel } from '../common/IntegrationPendingPanel';
import { useState } from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Alert from '@material-ui/lab/Alert';
import { Link } from 'react-router-dom';
import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import { AdminSummaryCards } from './AdminSummaryCards';
import { UserRegistrationPanel } from './UserRegistrationPanel';
import { UserManagementPanel } from './UserManagementPanel';
import { ExternalUserManagementPanel } from './ExternalUserManagementPanel';
import { RolePermissionPanel } from './RolePermissionPanel';
import { ServerMembershipPanel } from './ServerMembershipPanel';
import { ServerRoleGrantPanel } from './ServerRoleGrantPanel';
import { LoginPolicyPanel } from './LoginPolicyPanel';
import { PasswordPolicyPanel } from './PasswordPolicyPanel';
import { useAuthz } from '../authz';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { UserStatusHistoryPanel } from './UserStatusHistoryPanel';
import { PlatformOpsToolsPanel } from './PlatformOpsToolsPanel';
import { mockAdminData } from './mockAdminData';
import { UserRegistration, UserStatusHistory } from './types';

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => {
  if (value !== index) return null;
  return <Box marginTop={3}>{children}</Box>;
};

export const AdminConsolePage = () => {
  const { hasPermission } = useAuthz();
  const { isDemo } = usePortalRuntime();
  const [tab, setTab] = useState(isDemo ? 0 : 1);
  const [registrations, setRegistrations] = useState<UserRegistration[]>(
    mockAdminData.registrations,
  );
  const [statusHistories, setStatusHistories] = useState<UserStatusHistory[]>(
    mockAdminData.statusHistories,
  );

  const {
    summary,
    users,
    externalUsers,
    roles,
    groups,
    servicePermissions,
    dataAccessPermissions,
    approvalPermissions,
    projectRoleMappings,
    organizationTransfers,
    permissionChangeHistories,
    loginPolicies,
    passwordPolicies,
    passwordExpirationStatuses,
  } = mockAdminData;

  return (
    <Box padding={3}>
      <Typography variant="h4" style={{ fontWeight: 700, marginBottom: 8 }}>
        관리자 콘솔
      </Typography>
      <Typography
        variant="subtitle1"
        color="textSecondary"
        style={{ marginBottom: 24 }}
      >
        국방지능형플랫폼포털 관리자 허브 — 사용자, 권한, 정책, 메뉴, 감사로그를
        관리합니다.
      </Typography>

      {!isDemo && (
        <Box marginBottom={2}>
          <Alert severity="info">
            사용자·권한은 현재 소속의 서버 정보입니다. 정책과 외부 사용자 관리
            등 연결 준비 중인 항목은 각 탭에서 상태를 확인할 수 있습니다.
          </Alert>
        </Box>
      )}

      {isDemo && <AdminSummaryCards summary={summary} />}

      <Box marginTop={3}>
        <Paper variant="outlined">
          <Tabs
            value={tab}
            onChange={(_, newValue) => setTab(newValue)}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="사용자 등록 신청" />
            <Tab label="사용자 관리" />
            <Tab label="외부 사용자 관리" />
            <Tab label="권한/역할" />
            <Tab label="로그인 정책" />
            <Tab label="비밀번호 정책" />
            <Tab label="감사 로그" />
            <Tab label="메뉴 관리" />
            <Tab label="플랫폼 운영도구" />
          </Tabs>
        </Paper>

        <TabPanel value={tab} index={0}>
          {isDemo ? (
            <>
              <UserRegistrationPanel
                registrations={registrations}
                onRegistrationsChange={setRegistrations}
                onHistoriesChange={setStatusHistories}
              />
              <Box marginTop={3}>
                <UserStatusHistoryPanel
                  histories={statusHistories}
                  title="전체 등록 신청 이력"
                />
              </Box>
            </>
          ) : (
            <IntegrationPendingPanel
              title="사용자 등록 신청 · 연결 준비 중"
              description="계정 등록·승인 서비스 연결 후 신청 목록과 승인 업무가 제공됩니다. 현재 등록 사용자는 ‘사용자 관리’에서 조회하세요."
            />
          )}
        </TabPanel>
        <TabPanel value={tab} index={1}>
          {isDemo ? (
            <UserManagementPanel users={users} histories={statusHistories} />
          ) : (
            <ServerMembershipPanel />
          )}
        </TabPanel>
        <TabPanel value={tab} index={2}>
          {isDemo ? (
            <ExternalUserManagementPanel externalUsers={externalUsers} />
          ) : (
            <IntegrationPendingPanel
              title="외부 사용자 관리 · 연결 준비 중"
              description="외부 사용자 등록과 유효기간·보안서약 정보는 계정 관리 서비스 연결 후 제공됩니다."
            />
          )}
        </TabPanel>
        <TabPanel value={tab} index={3}>
          {isDemo ? (
            <RolePermissionPanel
              roles={roles}
              groups={groups}
              users={users}
              servicePermissions={servicePermissions}
              dataAccessPermissions={dataAccessPermissions}
              approvalPermissions={approvalPermissions}
              projectRoleMappings={projectRoleMappings}
              organizationTransfers={organizationTransfers}
              permissionChangeHistories={permissionChangeHistories}
            />
          ) : (
            <ServerRoleGrantPanel />
          )}
        </TabPanel>
        <TabPanel value={tab} index={4}>
          {isDemo ? (
            <LoginPolicyPanel policies={loginPolicies} />
          ) : (
            <IntegrationPendingPanel
              title="로그인 정책 · 연결 준비 중"
              description="기관 인증 서비스와 정책 적용이 연결되면 로그인 제한·인증 기준을 조회하고 관리할 수 있습니다."
            />
          )}
        </TabPanel>
        <TabPanel value={tab} index={5}>
          {isDemo ? (
            <PasswordPolicyPanel
              policies={passwordPolicies}
              expirationStatuses={passwordExpirationStatuses}
            />
          ) : (
            <IntegrationPendingPanel
              title="비밀번호 정책 · 연결 준비 중"
              description="SSO 계정의 비밀번호 규칙과 만료 현황은 기관 인증 서비스에서 관리합니다. 연결 후 적용 상태를 확인할 수 있습니다."
            />
          )}
        </TabPanel>
        <TabPanel value={tab} index={6}>
          <Typography variant="h6" gutterBottom>
            통합 접속·사용 이력
          </Typography>
          <Typography color="textSecondary" paragraph>
            사용자 접속, 서비스 이용, 관리자 설정 변경을 한 곳에서 조회하고 검색
            결과를 내려받습니다.
          </Typography>
          {hasPermission('audit.view') ? (
            <Button
              component={Link}
              to="/audit-history"
              variant="contained"
              color="primary"
            >
              접속·사용 이력 열기
            </Button>
          ) : (
            <Typography color="textSecondary">
              이력을 조회하려면 감사 조회 권한이 필요합니다.
            </Typography>
          )}
        </TabPanel>
        <TabPanel value={tab} index={7}>
          <Typography variant="h6" gutterBottom>
            군별 메뉴 구성
          </Typography>
          <Typography color="textSecondary" paragraph>
            소속 군의 메뉴 표시 여부, 순서와 명칭을 군별 포털 설정에서
            관리합니다.
          </Typography>
          <Button
            component={Link}
            to="/tenant-settings"
            variant="contained"
            color="primary"
          >
            군별 포털 설정 열기
          </Button>
        </TabPanel>
        <TabPanel value={tab} index={8}>
          {isDemo ? (
            <PlatformOpsToolsPanel />
          ) : (
            <IntegrationPendingPanel
              title="플랫폼 운영도구 · 연결 준비 중"
              description="운영도구 주소와 플랫폼 권한이 연결되면 승인된 도구로 이동할 수 있습니다."
            />
          )}
        </TabPanel>
      </Box>
    </Box>
  );
};
