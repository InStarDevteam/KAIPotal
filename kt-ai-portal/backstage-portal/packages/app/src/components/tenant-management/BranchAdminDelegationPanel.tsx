import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import Chip from '@material-ui/core/Chip';
import { DelegatedAdmin } from './types';

interface BranchAdminDelegationPanelProps {
  admins: DelegatedAdmin[];
}

export const BranchAdminDelegationPanel = ({ admins }: BranchAdminDelegationPanelProps) => {
  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        위임관리 체계
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>관리 계층</TableCell>
              <TableCell>조직</TableCell>
              <TableCell>관리자명</TableCell>
              <TableCell>계정 ID</TableCell>
              <TableCell>역할</TableCell>
              <TableCell>위임 범위</TableCell>
              <TableCell>관리 가능 테넌트</TableCell>
              <TableCell>승인 가능 업무</TableCell>
              <TableCell>권한 유효기간</TableCell>
              <TableCell>최근 활동</TableCell>
              <TableCell>상태</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {admins.map(a => (
              <TableRow key={a.id}>
                <TableCell>{a.level}</TableCell>
                <TableCell>{a.organization}</TableCell>
                <TableCell>{a.name}</TableCell>
                <TableCell>{a.accountId}</TableCell>
                <TableCell>{a.role}</TableCell>
                <TableCell>{a.scope}</TableCell>
                <TableCell>{a.manageableTenants.join(', ')}</TableCell>
                <TableCell>
                  {a.approvableTasks.map(task => (
                    <Chip key={task} size="small" label={task} style={{ margin: 2 }} />
                  ))}
                </TableCell>
                <TableCell>{a.validUntil}</TableCell>
                <TableCell>{a.lastActivity}</TableCell>
                <TableCell>{a.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
