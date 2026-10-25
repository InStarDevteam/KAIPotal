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
import { PasswordPolicy } from './types';

interface AccountLockPolicyPanelProps {
  policies: PasswordPolicy[];
}

export const AccountLockPolicyPanel = ({ policies }: AccountLockPolicyPanelProps) => {
  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        계정 잠금 정책
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>정책명</TableCell>
              <TableCell>만료 후 잠금 방식</TableCell>
              <TableCell align="right">유예기간(일)</TableCell>
              <TableCell align="right">임시 비밀번호 만료(분)</TableCell>
              <TableCell align="center">초기 로그인 시 변경</TableCell>
              <TableCell>적용 대상</TableCell>
              <TableCell align="center">사용 여부</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {policies.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.expiredLockAction}</TableCell>
                <TableCell align="right">{row.gracePeriodDays}</TableCell>
                <TableCell align="right">{row.tempPasswordExpiryMinutes}</TableCell>
                <TableCell align="center">
                  <Switch checked={row.requireChangeOnFirstLogin} size="small" disabled />
                </TableCell>
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
