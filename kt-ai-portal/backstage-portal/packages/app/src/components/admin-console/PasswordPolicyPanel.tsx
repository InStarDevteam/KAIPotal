import { useState } from 'react';
import Box from '@material-ui/core/Box';
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
import { PasswordPolicyDetailPanel } from './PasswordPolicyDetailPanel';
import { PasswordComplexityPanel } from './PasswordComplexityPanel';
import { PasswordExpirationPanel } from './PasswordExpirationPanel';
import { AccountLockPolicyPanel } from './AccountLockPolicyPanel';
import { PasswordPolicy, PasswordExpirationStatus } from './types';

interface PasswordPolicyPanelProps {
  policies: PasswordPolicy[];
  expirationStatuses?: PasswordExpirationStatus[];
}

const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => {
  if (value !== index) return null;
  return <Box marginTop={3}>{children}</Box>;
};

export const PasswordPolicyPanel = ({ policies, expirationStatuses = [] }: PasswordPolicyPanelProps) => {
  const [tab, setTab] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(policies[0]?.id || null);

  const selectedPolicy = policies.find(p => p.id === selectedId);

  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 8, fontWeight: 600 }}>
        비밀번호 정책 관리
      </Typography>
      <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
        비밀번호 정책, 복잡도, 만료/계정 잠금 현황을 조회합니다.
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
          <Tab label="복잡도" />
          <Tab label="만료/잠금 현황" />
          <Tab label="계정 잠금 정책" />
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
                    <TableCell align="right">최소 길이</TableCell>
                    <TableCell>복잡도</TableCell>
                    <TableCell align="right">변경 주기</TableCell>
                    <TableCell>적용 대상</TableCell>
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
                      <TableCell align="right">{row.minLength}</TableCell>
                      <TableCell>{row.complexityDescription}</TableCell>
                      <TableCell align="right">{row.changeCycleDays}일</TableCell>
                      <TableCell>{row.target}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          <Grid item xs={12} md={5}>
            {selectedPolicy ? <PasswordPolicyDetailPanel policy={selectedPolicy} /> : null}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <PasswordComplexityPanel policies={policies} />
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <PasswordExpirationPanel statuses={expirationStatuses} />
      </TabPanel>

      <TabPanel value={tab} index={3}>
        <AccountLockPolicyPanel policies={policies} />
      </TabPanel>
    </Box>
  );
};
