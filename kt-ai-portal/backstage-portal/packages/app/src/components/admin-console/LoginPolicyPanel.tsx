import { useState } from 'react';
import Box from '@material-ui/core/Box';
import Chip from '@material-ui/core/Chip';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { LoginPolicyDetailPanel } from './LoginPolicyDetailPanel';
import { LoginFailurePolicyPanel } from './LoginFailurePolicyPanel';
import { ConcurrentLoginPolicyPanel } from './ConcurrentLoginPolicyPanel';
import { SessionTimeoutPolicyPanel } from './SessionTimeoutPolicyPanel';
import { LoginPolicy } from './types';

interface LoginPolicyPanelProps {
  policies: LoginPolicy[];
}

const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => {
  if (value !== index) return null;
  return <Box marginTop={3}>{children}</Box>;
};

export const LoginPolicyPanel = ({ policies }: LoginPolicyPanelProps) => {
  const [tab, setTab] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(policies[0]?.id || null);

  const selectedPolicy = policies.find(p => p.id === selectedId);

  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 8, fontWeight: 600 }}>
        로그인 정책 관리
      </Typography>
      <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
        로그인 정책, 실패 차단, 중복 로그인, 자동 로그아웃/세션 정책을 조회합니다.
      </Typography>

      <Paper variant="outlined">
        <Tabs
          value={tab}
          onChange={(_, newValue) => setTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="정책 목록" />
          <Tab label="로그인 실패 차단" />
          <Tab label="중복 로그인" />
          <Tab label="자동 로그아웃" />
        </Tabs>
      </Paper>

      <TabPanel value={tab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>정책명</TableCell>
                    <TableCell>적용 대상</TableCell>
                    <TableCell>허용 시간대</TableCell>
                    <TableCell align="right">실패 허용</TableCell>
                    <TableCell align="center">중복</TableCell>
                    <TableCell align="center">MFA</TableCell>
                    <TableCell align="center">사용</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {policies.map(row => (
                    <TableRow
                      key={row.id}
                      selected={row.id === selectedId}
                      onClick={() => setSelectedId(row.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.target}</TableCell>
                      <TableCell>{row.allowedPeriod}</TableCell>
                      <TableCell align="right">{row.maxFailedAttempts}회</TableCell>
                      <TableCell align="center">{row.allowDuplicateLogin ? '허용' : '불가'}</TableCell>
                      <TableCell align="center">{row.mfaRequired ? '필요' : '-'}</TableCell>
                      <TableCell align="center">
                        <Chip label={row.enabled ? '사용' : '미사용'} size="small" color={row.enabled ? 'primary' : 'default'} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          <Grid item xs={12} md={5}>
            {selectedPolicy ? <LoginPolicyDetailPanel policy={selectedPolicy} /> : null}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <LoginFailurePolicyPanel policies={policies} />
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <ConcurrentLoginPolicyPanel policies={policies} />
      </TabPanel>

      <TabPanel value={tab} index={3}>
        <SessionTimeoutPolicyPanel />
      </TabPanel>
    </Box>
  );
};
