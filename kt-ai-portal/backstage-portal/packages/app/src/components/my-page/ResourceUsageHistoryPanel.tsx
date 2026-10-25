import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { ResourceUsage } from './types';

interface ResourceUsageHistoryPanelProps {
  usages: ResourceUsage[];
}

export const ResourceUsageHistoryPanel = ({ usages }: ResourceUsageHistoryPanelProps) => {
  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        자원 사용 이력
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>사용일시</TableCell>
              <TableCell>프로젝트</TableCell>
              <TableCell>워크스페이스</TableCell>
              <TableCell>자원 유형</TableCell>
              <TableCell>사용량</TableCell>
              <TableCell>단위</TableCell>
              <TableCell>사용 시간</TableCell>
              <TableCell>환산 크레딧</TableCell>
              <TableCell>상태</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usages.map(u => (
              <TableRow key={u.id}>
                <TableCell>{u.usedAt}</TableCell>
                <TableCell>{u.projectName}</TableCell>
                <TableCell>{u.workspaceName}</TableCell>
                <TableCell>{u.resourceType}</TableCell>
                <TableCell>{u.amount}</TableCell>
                <TableCell>{u.unit}</TableCell>
                <TableCell>{u.duration}</TableCell>
                <TableCell>{u.creditEquivalent.toLocaleString()}</TableCell>
                <TableCell>{u.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
