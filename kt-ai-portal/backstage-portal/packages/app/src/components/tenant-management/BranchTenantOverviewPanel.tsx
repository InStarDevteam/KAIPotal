import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { BranchTenantOverview } from './types';
import { BranchChip } from './BranchChip';

interface BranchTenantOverviewPanelProps {
  tenants: BranchTenantOverview[];
}

export const BranchTenantOverviewPanel = ({ tenants }: BranchTenantOverviewPanelProps) => {
  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        군별 테넌트 개요
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>테넌트 ID</TableCell>
              <TableCell>군 구분</TableCell>
              <TableCell>테넌트명</TableCell>
              <TableCell>관리자 조직</TableCell>
              <TableCell>대표 관리자</TableCell>
              <TableCell>위임 관리자 수</TableCell>
              <TableCell>프로젝트</TableCell>
              <TableCell>워크스페이스</TableCell>
              <TableCell>사용자</TableCell>
              <TableCell>외부 사용자</TableCell>
              <TableCell>GPU</TableCell>
              <TableCell>CPU</TableCell>
              <TableCell>스토리지</TableCell>
              <TableCell>크레딧 잔액</TableCell>
              <TableCell>상태</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tenants.map(t => (
              <TableRow key={t.id}>
                <TableCell>{t.id}</TableCell>
                <TableCell>
                  <BranchChip branch={t.branch} />
                </TableCell>
                <TableCell>{t.name}</TableCell>
                <TableCell>{t.adminOrganization}</TableCell>
                <TableCell>{t.representativeAdmin}</TableCell>
                <TableCell>{t.delegatedAdminCount}</TableCell>
                <TableCell>{t.projectCount}</TableCell>
                <TableCell>{t.workspaceCount}</TableCell>
                <TableCell>{t.userCount}</TableCell>
                <TableCell>{t.externalUserCount}</TableCell>
                <TableCell>
                  {t.gpuUsed}/{t.gpuTotal}
                </TableCell>
                <TableCell>
                  {t.cpuUsed}/{t.cpuTotal}
                </TableCell>
                <TableCell>
                  {t.storageUsed}/{t.storageTotal}
                </TableCell>
                <TableCell>{t.creditBalance.toLocaleString()}</TableCell>
                <TableCell>{t.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
