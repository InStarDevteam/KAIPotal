import { useState } from 'react';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import { AuditLogDashboard } from './AuditLogDashboard';
import { AuditLogFilterPanel } from './AuditLogFilterPanel';
import { LoginHistoryPanel } from './LoginHistoryPanel';
import { LogoutHistoryPanel } from './LogoutHistoryPanel';
import { PasswordChangeHistoryPanel } from './PasswordChangeHistoryPanel';
import { UserAccessLogPanel } from './UserAccessLogPanel';
import { UserInfoChangeLogPanel } from './UserInfoChangeLogPanel';
import { SecurityAuditPanel } from './SecurityAuditPanel';
import { AdminActionHistoryPanel } from './AdminActionHistoryPanel';
import { AuditEventTypeChip } from './AuditEventTypeChip';
import { AuditRiskChip } from './AuditRiskChip';
import {
  AuditLog,
  LoginHistory,
  LogoutHistory,
  PasswordChangeHistory,
  UserAccessLog,
  UserInfoChangeLog,
  SecurityAuditItem,
  AdminActionHistory,
} from './types';

interface AuditLogPanelProps {
  logs: AuditLog[];
  loginHistories: LoginHistory[];
  logoutHistories: LogoutHistory[];
  passwordChangeHistories: PasswordChangeHistory[];
  userAccessLogs: UserAccessLog[];
  userInfoChangeLogs: UserInfoChangeLog[];
  securityAuditItems: SecurityAuditItem[];
  adminActionHistories: AdminActionHistory[];
}

const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => {
  if (value !== index) return null;
  return <Box marginTop={3}>{children}</Box>;
};

export const AuditLogPanel = ({
  logs,
  loginHistories,
  logoutHistories,
  passwordChangeHistories,
  userAccessLogs,
  userInfoChangeLogs,
  securityAuditItems,
  adminActionHistories,
}: AuditLogPanelProps) => {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 8, fontWeight: 600 }}>
        이력 / 감사 로그
      </Typography>
      <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
        감사로그 대시보드, 통합 감사로그, 이력/접근/정보수정/보안감사/관리자 조치 이력을 조회합니다.
      </Typography>

      <AuditLogDashboard logs={logs} />

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
            <Tab label="통합 감사로그" />
            <Tab label="감사로그 필터" />
            <Tab label="로그인 이력" />
            <Tab label="로그아웃 이력" />
            <Tab label="비밀번호 변경 이력" />
            <Tab label="사용자 접근 로그" />
            <Tab label="사용자 정보 수정 로그" />
            <Tab label="보안 감사" />
            <Tab label="관리자 조치 이력" />
          </Tabs>
        </Paper>
      </Box>

      <TabPanel value={tab} index={0}>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>발생 시각</TableCell>
                <TableCell>사용자</TableCell>
                <TableCell>이벤트 유형</TableCell>
                <TableCell>대상</TableCell>
                <TableCell>IP</TableCell>
                <TableCell>결과</TableCell>
                <TableCell>위험도</TableCell>
                <TableCell>상세 내용</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map(row => (
                <TableRow key={row.id}>
                  <TableCell>{row.timestamp}</TableCell>
                  <TableCell>{row.user}</TableCell>
                  <TableCell>
                    <AuditEventTypeChip eventType={row.eventType} />
                  </TableCell>
                  <TableCell>{row.target}</TableCell>
                  <TableCell>{row.ip}</TableCell>
                  <TableCell>{row.result}</TableCell>
                  <TableCell>
                    <AuditRiskChip riskLevel={row.riskLevel} />
                  </TableCell>
                  <TableCell>{row.detail}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <AuditLogFilterPanel />
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <LoginHistoryPanel histories={loginHistories} />
      </TabPanel>

      <TabPanel value={tab} index={3}>
        <LogoutHistoryPanel histories={logoutHistories} />
      </TabPanel>

      <TabPanel value={tab} index={4}>
        <PasswordChangeHistoryPanel histories={passwordChangeHistories} />
      </TabPanel>

      <TabPanel value={tab} index={5}>
        <UserAccessLogPanel logs={userAccessLogs} />
      </TabPanel>

      <TabPanel value={tab} index={6}>
        <UserInfoChangeLogPanel logs={userInfoChangeLogs} />
      </TabPanel>

      <TabPanel value={tab} index={7}>
        <SecurityAuditPanel items={securityAuditItems} />
      </TabPanel>

      <TabPanel value={tab} index={8}>
        <AdminActionHistoryPanel histories={adminActionHistories} />
      </TabPanel>
    </Box>
  );
};
