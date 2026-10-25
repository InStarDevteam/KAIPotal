import Box from '@material-ui/core/Box';
import LinearProgress from '@material-ui/core/LinearProgress';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { BranchResourcePool } from './types';
import { BranchChip } from './BranchChip';
import { ResourceStatusChip } from './ResourceStatusChip';

interface BranchResourcePoolPanelProps {
  resources: BranchResourcePool[];
}

export const BranchResourcePoolPanel = ({ resources }: BranchResourcePoolPanelProps) => {
  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        군별 리소스 풀
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>군 구분</TableCell>
              <TableCell>리소스 유형</TableCell>
              <TableCell>전체 보유량</TableCell>
              <TableCell>할당량</TableCell>
              <TableCell>사용량</TableCell>
              <TableCell>예약량</TableCell>
              <TableCell>가용량</TableCell>
              <TableCell>사용률</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>담당자</TableCell>
              <TableCell>최근 변경일</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {resources.map(r => (
              <TableRow key={r.id}>
                <TableCell>
                  <BranchChip branch={r.branch} />
                </TableCell>
                <TableCell>{r.resourceType}</TableCell>
                <TableCell>{r.total}</TableCell>
                <TableCell>{r.allocated}</TableCell>
                <TableCell>{r.used}</TableCell>
                <TableCell>{r.reserved}</TableCell>
                <TableCell>{r.available}</TableCell>
                <TableCell style={{ minWidth: 120 }}>
                  <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                    <LinearProgress
                      variant="determinate"
                      value={r.usageRate}
                      style={{ flex: 1 }}
                    />
                    <Typography variant="caption">{r.usageRate}%</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <ResourceStatusChip status={r.status} />
                </TableCell>
                <TableCell>{r.owner}</TableCell>
                <TableCell>{r.lastChangedAt}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
