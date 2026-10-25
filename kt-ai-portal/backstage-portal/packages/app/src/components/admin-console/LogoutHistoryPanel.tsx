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
import { LogoutHistory } from './types';

interface LogoutHistoryPanelProps {
  histories: LogoutHistory[];
}

export const LogoutHistoryPanel = ({ histories }: LogoutHistoryPanelProps) => {
  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        로그아웃 이력
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>발생 시각</TableCell>
              <TableCell>사용자</TableCell>
              <TableCell>로그아웃 방식</TableCell>
              <TableCell>세션 ID</TableCell>
              <TableCell align="right">세션 지속(분)</TableCell>
              <TableCell>IP</TableCell>
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
                  <Chip label={row.logoutMethod} size="small" color="primary" />
                </TableCell>
                <TableCell>{row.sessionId}</TableCell>
                <TableCell align="right">{row.durationMinutes}</TableCell>
                <TableCell>{row.ip}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
