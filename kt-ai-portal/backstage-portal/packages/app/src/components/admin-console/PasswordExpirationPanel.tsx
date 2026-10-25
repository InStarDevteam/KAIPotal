import Box from '@material-ui/core/Box';
import Chip from '@material-ui/core/Chip';
import Paper from '@material-ui/core/Paper';
import Switch from '@material-ui/core/Switch';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { PasswordExpirationStatus } from './types';

interface PasswordExpirationPanelProps {
  statuses: PasswordExpirationStatus[];
}

export const PasswordExpirationPanel = ({ statuses }: PasswordExpirationPanelProps) => {
  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        비밀번호 만료 / 계정 잠금 현황
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>사용자</TableCell>
              <TableCell>적용 정책</TableCell>
              <TableCell>마지막 변경일</TableCell>
              <TableCell>만료 예정일</TableCell>
              <TableCell align="right">남은 일수</TableCell>
              <TableCell align="right">유예기간</TableCell>
              <TableCell align="center">잠금 예정</TableCell>
              <TableCell>계정 상태</TableCell>
              <TableCell align="center">조치 필요</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {statuses.map(row => (
              <TableRow key={row.id}>
                <TableCell>
                  {row.userName}
                  <br />
                  <Typography variant="caption" color="textSecondary">
                    {row.accountId}
                  </Typography>
                </TableCell>
                <TableCell>{row.policyName}</TableCell>
                <TableCell>{row.lastChangedAt}</TableCell>
                <TableCell>{row.expiresAt}</TableCell>
                <TableCell align="right">{row.daysRemaining}</TableCell>
                <TableCell align="right">{row.gracePeriodDays}일</TableCell>
                <TableCell align="center">
                  <Switch checked={row.lockScheduled} size="small" disabled />
                </TableCell>
                <TableCell>
                  <Chip label={row.accountStatus} size="small" color={row.accountStatus === '활성' ? 'primary' : 'secondary'} />
                </TableCell>
                <TableCell align="center">
                  <Switch checked={row.actionRequired} size="small" disabled />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
