import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { QuotaChangeHistory } from './types';
import { BranchChip } from './BranchChip';

interface QuotaChangeHistoryPanelProps {
  history: QuotaChangeHistory[];
}

export const QuotaChangeHistoryPanel = ({ history }: QuotaChangeHistoryPanelProps) => {
  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        쿼터 변경 이력
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>발생 시각</TableCell>
              <TableCell>군 구분</TableCell>
              <TableCell>변경자</TableCell>
              <TableCell>대상 테넌트</TableCell>
              <TableCell>리소스 유형</TableCell>
              <TableCell>변경 유형</TableCell>
              <TableCell>이전 값</TableCell>
              <TableCell>변경 값</TableCell>
              <TableCell>변경 사유</TableCell>
              <TableCell>승인자</TableCell>
              <TableCell>처리 결과</TableCell>
              <TableCell>IP</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map(h => (
              <TableRow key={h.id}>
                <TableCell>{h.occurredAt}</TableCell>
                <TableCell>
                  <BranchChip branch={h.branch} />
                </TableCell>
                <TableCell>{h.changedBy}</TableCell>
                <TableCell>{h.targetTenant}</TableCell>
                <TableCell>{h.resourceType}</TableCell>
                <TableCell>{h.changeType}</TableCell>
                <TableCell>{h.oldValue}</TableCell>
                <TableCell>{h.newValue}</TableCell>
                <TableCell>{h.reason}</TableCell>
                <TableCell>{h.approver ?? '-'}</TableCell>
                <TableCell>{h.result}</TableCell>
                <TableCell>{h.ip}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
