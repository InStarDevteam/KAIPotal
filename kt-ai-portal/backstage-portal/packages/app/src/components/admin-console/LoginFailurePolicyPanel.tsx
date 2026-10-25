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
import { LoginPolicy } from './types';

interface LoginFailurePolicyPanelProps {
  policies: LoginPolicy[];
}

export const LoginFailurePolicyPanel = ({ policies }: LoginFailurePolicyPanelProps) => {
  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        로그인 실패 차단 정책
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>정책명</TableCell>
              <TableCell align="right">연속 실패 허용</TableCell>
              <TableCell align="right">일일 실패 허용</TableCell>
              <TableCell>차단 방식</TableCell>
              <TableCell align="right">차단 시간(분)</TableCell>
              <TableCell align="center">관리자 알림</TableCell>
              <TableCell align="center">보안 확인</TableCell>
              <TableCell>제한 해제 방식</TableCell>
              <TableCell>적용 대상</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {policies.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell align="right">{row.maxFailedAttempts}회</TableCell>
                <TableCell align="right">{row.dailyMaxFailedAttempts}회</TableCell>
                <TableCell>{row.blockMethod}</TableCell>
                <TableCell align="right">{row.blockDurationMinutes}</TableCell>
                <TableCell align="center">
                  <Switch checked={row.notifyAdmin} size="small" disabled />
                </TableCell>
                <TableCell align="center">
                  <Switch checked={row.requireUserVerification} size="small" disabled />
                </TableCell>
                <TableCell>{row.unlockMethod}</TableCell>
                <TableCell>{row.target}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
