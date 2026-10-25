import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Chip from '@material-ui/core/Chip';
import { ChargeHistory, ChargeStatus } from './types';

const statusConfig: Record<
  ChargeStatus,
  { label: string; color: 'default' | 'primary' | 'secondary' }
> = {
  requested: { label: '신청', color: 'default' },
  approved: { label: '승인', color: 'primary' },
  rejected: { label: '반려', color: 'secondary' },
  applied: { label: '반영완료', color: 'primary' },
};

export const CreditChargeHistory = ({ history }: { history: ChargeHistory[] }) => {
  return (
    <Paper style={{ padding: 16 }}>
      <Typography variant="h6" gutterBottom>
        크레딧 충전 이력
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>프로젝트</TableCell>
              <TableCell>충전 일시</TableCell>
              <TableCell>충전 크레딧</TableCell>
              <TableCell>사유</TableCell>
              <TableCell>승인자</TableCell>
              <TableCell>상태</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.projectName}</TableCell>
                <TableCell>{new Date(row.chargedAt).toLocaleString()}</TableCell>
                <TableCell>{row.credits.toLocaleString()}</TableCell>
                <TableCell>{row.reason}</TableCell>
                <TableCell>{row.approver}</TableCell>
                <TableCell>
                  <Chip size="small" label={statusConfig[row.status].label} color={statusConfig[row.status].color} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
