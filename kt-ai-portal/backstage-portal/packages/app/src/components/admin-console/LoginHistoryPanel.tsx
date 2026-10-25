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
import { LoginHistory } from './types';

interface LoginHistoryPanelProps {
  histories: LoginHistory[];
}

export const LoginHistoryPanel = ({ histories }: LoginHistoryPanelProps) => {
  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        로그인 이력
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>발생 시각</TableCell>
              <TableCell>사용자</TableCell>
              <TableCell>소속</TableCell>
              <TableCell>인증 방식</TableCell>
              <TableCell>IP</TableCell>
              <TableCell>브라우저</TableCell>
              <TableCell>결과</TableCell>
              <TableCell>실패 사유</TableCell>
              <TableCell>세션 ID</TableCell>
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
                <TableCell>{row.organization}</TableCell>
                <TableCell>{row.authMethod}</TableCell>
                <TableCell>{row.ip}</TableCell>
                <TableCell>{row.browser}</TableCell>
                <TableCell>
                  <Chip label={row.result} size="small" color={row.result === '성공' ? 'primary' : 'secondary'} />
                </TableCell>
                <TableCell>{row.failureReason || '-'}</TableCell>
                <TableCell>{row.sessionId}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
