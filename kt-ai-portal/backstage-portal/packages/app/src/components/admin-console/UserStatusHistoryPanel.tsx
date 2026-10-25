import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { UserStatusHistory } from './types';

interface UserStatusHistoryPanelProps {
  histories: UserStatusHistory[];
  userId?: string;
  title?: string;
}

export const UserStatusHistoryPanel = ({ histories, userId, title }: UserStatusHistoryPanelProps) => {
  const filtered = userId ? histories.filter(h => h.userId === userId) : histories;
  const sorted = [...filtered].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        {title || '사용자 상태 변경 이력'}
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>발생 시각</TableCell>
              <TableCell>처리자</TableCell>
              <TableCell>이벤트</TableCell>
              <TableCell>이전 상태</TableCell>
              <TableCell>변경 상태</TableCell>
              <TableCell>사유</TableCell>
              <TableCell>IP / 위치</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.timestamp}</TableCell>
                <TableCell>{row.actor}</TableCell>
                <TableCell>{row.event}</TableCell>
                <TableCell>{row.previousStatus || '-'}</TableCell>
                <TableCell>{row.newStatus || '-'}</TableCell>
                <TableCell>{row.reason || '-'}</TableCell>
                <TableCell>{row.ip || '-'}</TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  이력이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
