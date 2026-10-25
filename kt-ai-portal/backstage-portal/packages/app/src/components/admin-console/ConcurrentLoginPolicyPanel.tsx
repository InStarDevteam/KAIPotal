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

interface ConcurrentLoginPolicyPanelProps {
  policies: LoginPolicy[];
}

export const ConcurrentLoginPolicyPanel = ({ policies }: ConcurrentLoginPolicyPanelProps) => {
  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        중복 로그인 정책
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>정책명</TableCell>
              <TableCell align="right">동시 세션 허용 수</TableCell>
              <TableCell align="center">동일 IP 중복</TableCell>
              <TableCell align="center">다른 IP 중복</TableCell>
              <TableCell>기존 세션 종료 방식</TableCell>
              <TableCell align="center">관리자 예외</TableCell>
              <TableCell align="center">외부 사용자 예외</TableCell>
              <TableCell align="center">감사로그</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {policies.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell align="right">{row.maxConcurrentSessions}개</TableCell>
                <TableCell align="center">
                  <Switch checked={row.allowSameIpDuplicate} size="small" disabled />
                </TableCell>
                <TableCell align="center">
                  <Switch checked={row.allowDifferentIpDuplicate} size="small" disabled />
                </TableCell>
                <TableCell>{row.existingSessionAction}</TableCell>
                <TableCell align="center">
                  <Switch checked={row.adminException} size="small" disabled />
                </TableCell>
                <TableCell align="center">
                  <Switch checked={row.externalUserException} size="small" disabled />
                </TableCell>
                <TableCell align="center">
                  <Switch checked={row.auditLogged} size="small" disabled />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
