import Chip from '@material-ui/core/Chip';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { ActivityLog } from './types';
import { ActivityTypeChip } from './ActivityTypeChip';

interface MyActivityLogPanelProps {
  logs: ActivityLog[];
}

export const MyActivityLogPanel = ({ logs }: MyActivityLogPanelProps) => {
  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        내 활동 로그
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>발생 시각</TableCell>
              <TableCell>이벤트 유형</TableCell>
              <TableCell>서비스</TableCell>
              <TableCell>메뉴</TableCell>
              <TableCell>대상</TableCell>
              <TableCell>결과</TableCell>
              <TableCell>IP</TableCell>
              <TableCell>상세 내용</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map(log => (
              <TableRow key={log.id}>
                <TableCell>{log.occurredAt}</TableCell>
                <TableCell>
                  <ActivityTypeChip type={log.type} />
                </TableCell>
                <TableCell>{log.service}</TableCell>
                <TableCell>{log.menu}</TableCell>
                <TableCell>{log.target}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={log.result}
                    color={log.result === '성공' ? 'primary' : 'secondary'}
                  />
                </TableCell>
                <TableCell>{log.ip}</TableCell>
                <TableCell>{log.detail}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
