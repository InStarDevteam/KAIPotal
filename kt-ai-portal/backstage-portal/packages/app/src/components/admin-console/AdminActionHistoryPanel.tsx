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
import { AdminActionHistory } from './types';

interface AdminActionHistoryPanelProps {
  histories: AdminActionHistory[];
}

export const AdminActionHistoryPanel = ({ histories }: AdminActionHistoryPanelProps) => {
  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        관리자 조치 이력
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>발생 시각</TableCell>
              <TableCell>관리자</TableCell>
              <TableCell>조치 유형</TableCell>
              <TableCell>대상</TableCell>
              <TableCell>조치 내용</TableCell>
              <TableCell>사유</TableCell>
              <TableCell align="center">승인 필요</TableCell>
              <TableCell>승인자</TableCell>
              <TableCell>결과</TableCell>
              <TableCell>IP</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {histories.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.timestamp}</TableCell>
                <TableCell>{row.admin}</TableCell>
                <TableCell>
                  <Chip label={row.actionType} size="small" color="primary" />
                </TableCell>
                <TableCell>
                  {row.target}
                  <br />
                  <Typography variant="caption" color="textSecondary">
                    {row.targetAccountId}
                  </Typography>
                </TableCell>
                <TableCell>{row.actionDetail}</TableCell>
                <TableCell>{row.reason}</TableCell>
                <TableCell align="center">
                  <Switch checked={row.approvalRequired} size="small" disabled />
                </TableCell>
                <TableCell>{row.approver || '-'}</TableCell>
                <TableCell>
                  <Chip label={row.result} size="small" color={row.result === '성공' ? 'primary' : 'secondary'} />
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
