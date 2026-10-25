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
import { SecurityAuditItem } from './types';

interface SecurityAuditPanelProps {
  items: SecurityAuditItem[];
}

export const SecurityAuditPanel = ({ items }: SecurityAuditPanelProps) => {
  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        보안 감사
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>감사 항목</TableCell>
              <TableCell align="right">관련 로그 수</TableCell>
              <TableCell>위험도</TableCell>
              <TableCell>조치 상태</TableCell>
              <TableCell>담당자</TableCell>
              <TableCell>최초 발생일</TableCell>
              <TableCell>최근 발생일</TableCell>
              <TableCell>조치 기한</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(row => (
              <TableRow key={row.id}>
                <TableCell style={{ fontWeight: 500 }}>{row.item}</TableCell>
                <TableCell align="right">{row.relatedLogCount}</TableCell>
                <TableCell>
                  <Chip
                    label={row.riskLevel}
                    size="small"
                    color={row.riskLevel === '높음' || row.riskLevel === '심각' ? 'secondary' : 'primary'}
                  />
                </TableCell>
                <TableCell>{row.actionStatus}</TableCell>
                <TableCell>{row.owner}</TableCell>
                <TableCell>{row.firstOccurredAt}</TableCell>
                <TableCell>{row.lastOccurredAt}</TableCell>
                <TableCell>{row.actionDeadline}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
