import Chip from '@material-ui/core/Chip';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { BranchProjectUsage } from './types';
import { BranchChip } from './BranchChip';

interface BranchProjectUsagePanelProps {
  usages: BranchProjectUsage[];
}

export const BranchProjectUsagePanel = ({ usages }: BranchProjectUsagePanelProps) => {
  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        군별 프로젝트 사용량
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>군 구분</TableCell>
              <TableCell>프로젝트명</TableCell>
              <TableCell>워크스페이스</TableCell>
              <TableCell>PM</TableCell>
              <TableCell>참여자 수</TableCell>
              <TableCell>프로젝트 상태</TableCell>
              <TableCell>GPU</TableCell>
              <TableCell>CPU</TableCell>
              <TableCell>스토리지</TableCell>
              <TableCell>네트워크</TableCell>
              <TableCell>사용 크레딧</TableCell>
              <TableCell>잔여 크레딧</TableCell>
              <TableCell>유효기간</TableCell>
              <TableCell>최근 활동</TableCell>
              <TableCell>과다 사용</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usages.map(u => (
              <TableRow key={u.id}>
                <TableCell>
                  <BranchChip branch={u.branch} />
                </TableCell>
                <TableCell>{u.projectName}</TableCell>
                <TableCell>{u.workspaceName}</TableCell>
                <TableCell>{u.pm}</TableCell>
                <TableCell>{u.memberCount}</TableCell>
                <TableCell>{u.projectStatus}</TableCell>
                <TableCell>
                  {u.gpuUsed}/{u.gpuAllocated}
                </TableCell>
                <TableCell>
                  {u.cpuUsed}/{u.cpuAllocated}
                </TableCell>
                <TableCell>{u.storageUsed}</TableCell>
                <TableCell>{u.networkUsed}</TableCell>
                <TableCell>{u.usedCredit.toLocaleString()}</TableCell>
                <TableCell>{u.remainingCredit.toLocaleString()}</TableCell>
                <TableCell>{u.validUntil}</TableCell>
                <TableCell>{u.lastActivityAt}</TableCell>
                <TableCell>
                  {u.overused ? (
                    <Chip size="small" label="예" color="secondary" />
                  ) : (
                    <Chip size="small" label="아니오" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
