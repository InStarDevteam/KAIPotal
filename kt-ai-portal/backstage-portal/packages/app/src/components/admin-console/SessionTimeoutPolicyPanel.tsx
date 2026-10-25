import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Switch from '@material-ui/core/Switch';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';

interface SessionTimeoutPolicy {
  id: string;
  name: string;
  idleTimeoutMinutes: number;
  maxSessionMinutes: number;
  clearOnBrowserClose: boolean;
  allowExtension: boolean;
  maxExtensions: number;
  preExpiryNoticeMinutes: number;
  target: string;
  enabled: boolean;
}

const policies: SessionTimeoutPolicy[] = [
  {
    id: 'st-001',
    name: '일반 사용자 세션 정책',
    idleTimeoutMinutes: 30,
    maxSessionMinutes: 480,
    clearOnBrowserClose: true,
    allowExtension: true,
    maxExtensions: 3,
    preExpiryNoticeMinutes: 5,
    target: '일반 사용자',
    enabled: true,
  },
  {
    id: 'st-002',
    name: '관리자 강화 세션 정책',
    idleTimeoutMinutes: 10,
    maxSessionMinutes: 120,
    clearOnBrowserClose: true,
    allowExtension: false,
    maxExtensions: 0,
    preExpiryNoticeMinutes: 3,
    target: 'portal-admin, security-auditor',
    enabled: true,
  },
  {
    id: 'st-003',
    name: '외부 사용자 세션 정책',
    idleTimeoutMinutes: 20,
    maxSessionMinutes: 240,
    clearOnBrowserClose: true,
    allowExtension: true,
    maxExtensions: 2,
    preExpiryNoticeMinutes: 5,
    target: '외부/수행사 사용자',
    enabled: true,
  },
];

export const SessionTimeoutPolicyPanel = () => {
  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        자동 로그아웃 / 세션 정책
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>정책명</TableCell>
              <TableCell align="right">미활동 허용(분)</TableCell>
              <TableCell align="right">최대 세션(분)</TableCell>
              <TableCell align="center">브라우저 종료 시 해제</TableCell>
              <TableCell align="center">세션 연장</TableCell>
              <TableCell align="right">연장 가능 횟수</TableCell>
              <TableCell align="right">만료 전 알림(분)</TableCell>
              <TableCell>적용 대상</TableCell>
              <TableCell align="center">사용 여부</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {policies.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell align="right">{row.idleTimeoutMinutes}</TableCell>
                <TableCell align="right">{row.maxSessionMinutes}</TableCell>
                <TableCell align="center">
                  <Switch checked={row.clearOnBrowserClose} size="small" disabled />
                </TableCell>
                <TableCell align="center">
                  <Switch checked={row.allowExtension} size="small" disabled />
                </TableCell>
                <TableCell align="right">{row.maxExtensions}</TableCell>
                <TableCell align="right">{row.preExpiryNoticeMinutes}</TableCell>
                <TableCell>{row.target}</TableCell>
                <TableCell align="center">
                  <Switch checked={row.enabled} size="small" disabled />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
