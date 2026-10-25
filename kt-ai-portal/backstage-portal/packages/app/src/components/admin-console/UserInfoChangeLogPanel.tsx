import Box from '@material-ui/core/Box';
import Chip from '@material-ui/core/Chip';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { UserInfoChangeLog } from './types';

interface UserInfoChangeLogPanelProps {
  logs: UserInfoChangeLog[];
}

export const UserInfoChangeLogPanel = ({ logs }: UserInfoChangeLogPanelProps) => {
  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        사용자 정보 수정 로그
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>발생 시각</TableCell>
              <TableCell>변경자</TableCell>
              <TableCell>대상 사용자</TableCell>
              <TableCell>변경 항목</TableCell>
              <TableCell>이전 값</TableCell>
              <TableCell>변경 값</TableCell>
              <TableCell>변경 사유</TableCell>
              <TableCell>승인자</TableCell>
              <TableCell>IP</TableCell>
              <TableCell>결과</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.timestamp}</TableCell>
                <TableCell>{row.actor}</TableCell>
                <TableCell>
                  {row.targetUser}
                  <br />
                  <Typography variant="caption" color="textSecondary">
                    {row.targetAccountId}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={row.changedItem} size="small" color="primary" />
                </TableCell>
                <TableCell>{row.previousValue}</TableCell>
                <TableCell>{row.newValue}</TableCell>
                <TableCell>{row.reason}</TableCell>
                <TableCell>{row.approver || '-'}</TableCell>
                <TableCell>{row.ip}</TableCell>
                <TableCell>
                  <Chip label={row.result} size="small" color={row.result === '성공' ? 'primary' : 'secondary'} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
