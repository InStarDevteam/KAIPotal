import Chip from '@material-ui/core/Chip';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { CreditHistory, CreditType } from './types';

interface MyCreditHistoryPanelProps {
  histories: CreditHistory[];
}

const typeColor = (type: CreditType): 'default' | 'primary' | 'secondary' => {
  switch (type) {
    case '기본부여':
    case '충전':
      return 'primary';
    case '사용':
    case '회수':
    case '만료':
      return 'secondary';
    default:
      return 'default';
  }
};

export const MyCreditHistoryPanel = ({ histories }: MyCreditHistoryPanelProps) => {
  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        크레딧 사용 내역
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>발생일시</TableCell>
              <TableCell>프로젝트</TableCell>
              <TableCell>구분</TableCell>
              <TableCell>크레딧</TableCell>
              <TableCell>잔액</TableCell>
              <TableCell>사유</TableCell>
              <TableCell>관련 자원</TableCell>
              <TableCell>승인자</TableCell>
              <TableCell>상태</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {histories.map(h => (
              <TableRow key={h.id}>
                <TableCell>{h.occurredAt}</TableCell>
                <TableCell>{h.projectName}</TableCell>
                <TableCell>
                  <Chip size="small" label={h.type} color={typeColor(h.type)} />
                </TableCell>
                <TableCell>{h.credit.toLocaleString()}</TableCell>
                <TableCell>{h.balance.toLocaleString()}</TableCell>
                <TableCell>{h.reason}</TableCell>
                <TableCell>{h.relatedResource}</TableCell>
                <TableCell>{h.approver || '-'}</TableCell>
                <TableCell>{h.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
