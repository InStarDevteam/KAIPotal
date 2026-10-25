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
import { UserAccessLog } from './types';

interface UserAccessLogPanelProps {
  logs: UserAccessLog[];
}

export const UserAccessLogPanel = ({ logs }: UserAccessLogPanelProps) => {
  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        사용자 접근 로그
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>발생 시각</TableCell>
              <TableCell>사용자</TableCell>
              <TableCell>서비스</TableCell>
              <TableCell>메뉴</TableCell>
              <TableCell>기능</TableCell>
              <TableCell>접근 대상</TableCell>
              <TableCell>결과</TableCell>
              <TableCell>데이터 등급</TableCell>
              <TableCell>IP</TableCell>
              <TableCell align="center">감사 필요</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.timestamp}</TableCell>
                <TableCell>
                  {row.user}
                  <br />
                  <Typography variant="caption" color="textSecondary">
                    {row.accountId}
                  </Typography>
                </TableCell>
                <TableCell>{row.service}</TableCell>
                <TableCell>{row.menu}</TableCell>
                <TableCell>{row.feature}</TableCell>
                <TableCell>{row.target}</TableCell>
                <TableCell>
                  <Chip label={row.result} size="small" color={row.result === '성공' ? 'primary' : 'secondary'} />
                </TableCell>
                <TableCell>{row.dataAccessLevel || '-'}</TableCell>
                <TableCell>{row.ip}</TableCell>
                <TableCell align="center">
                  <Switch checked={row.auditRequired} size="small" disabled />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
