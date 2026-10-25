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
import { PermissionChangeHistory } from './types';

interface PermissionChangeHistoryPanelProps {
  histories: PermissionChangeHistory[];
}

export const PermissionChangeHistoryPanel = ({ histories }: PermissionChangeHistoryPanelProps) => {
  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        권한 변경 감사이력
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>발생 시각</TableCell>
              <TableCell>변경자</TableCell>
              <TableCell>대상</TableCell>
              <TableCell>변경 유형</TableCell>
              <TableCell>이전 권한</TableCell>
              <TableCell>변경 권한</TableCell>
              <TableCell>변경 사유</TableCell>
              <TableCell>승인자</TableCell>
              <TableCell>결과</TableCell>
              <TableCell>IP</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {histories.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.timestamp}</TableCell>
                <TableCell>{row.actor}</TableCell>
                <TableCell>
                  {row.targetType}: {row.targetName}
                </TableCell>
                <TableCell>{row.changeType}</TableCell>
                <TableCell>{row.previousPermission}</TableCell>
                <TableCell>{row.newPermission}</TableCell>
                <TableCell>{row.reason}</TableCell>
                <TableCell>{row.approver || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={row.result}
                    size="small"
                    color={({ 성공: 'primary', 보류: 'default' } as const)[row.result as '성공' | '보류'] ?? 'secondary'}
                  />
                </TableCell>
                <TableCell>{row.ip}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
