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
import { PasswordChangeHistory } from './types';

interface PasswordChangeHistoryPanelProps {
  histories: PasswordChangeHistory[];
}

export const PasswordChangeHistoryPanel = ({ histories }: PasswordChangeHistoryPanelProps) => {
  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        비밀번호 변경 이력
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>발생 시각</TableCell>
              <TableCell>사용자</TableCell>
              <TableCell>변경 유형</TableCell>
              <TableCell>변경 방식</TableCell>
              <TableCell align="center">성공 여부</TableCell>
              <TableCell>실패 사유</TableCell>
              <TableCell align="center">관리자 개입</TableCell>
              <TableCell>IP</TableCell>
              <TableCell>비고</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {histories.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.timestamp}</TableCell>
                <TableCell>
                  {row.user}
                  <br />
                  <Typography variant="caption" color="textSecondary">
                    {row.accountId}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={row.changeType} size="small" color="primary" />
                </TableCell>
                <TableCell>{row.method}</TableCell>
                <TableCell align="center">
                  <Chip label={row.success ? '성공' : '실패'} size="small" color={row.success ? 'primary' : 'secondary'} />
                </TableCell>
                <TableCell>{row.failureReason || '-'}</TableCell>
                <TableCell align="center">
                  <Switch checked={row.adminInvolved} size="small" disabled />
                </TableCell>
                <TableCell>{row.ip}</TableCell>
                <TableCell>{row.note || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
