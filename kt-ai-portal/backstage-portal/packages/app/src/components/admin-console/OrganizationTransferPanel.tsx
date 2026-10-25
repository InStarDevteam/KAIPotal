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
import { OrganizationTransfer, OrganizationTransferStatus } from './types';

interface OrganizationTransferPanelProps {
  transfers: OrganizationTransfer[];
}

const statusColor = (status: OrganizationTransferStatus): 'default' | 'primary' | 'secondary' => {
  switch (status) {
    case '처리완료':
    case '인계완료':
      return 'primary';
    case '회수예정':
      return 'secondary';
    default:
      return 'default';
  }
};

export const OrganizationTransferPanel = ({ transfers }: OrganizationTransferPanelProps) => {
  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        조직 상태 변경에 따른 권한 회수 / 인계
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>사용자</TableCell>
              <TableCell>변경 유형</TableCell>
              <TableCell>기존 소속</TableCell>
              <TableCell>변경 소속</TableCell>
              <TableCell>기존 역할</TableCell>
              <TableCell>회수 대상 권한</TableCell>
              <TableCell>인계 대상자</TableCell>
              <TableCell>처리 상태</TableCell>
              <TableCell>처리 예정일</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transfers.map(row => (
              <TableRow key={row.id}>
                <TableCell>
                  {row.userName}
                  <br />
                  <Typography variant="caption" color="textSecondary">
                    {row.accountId}
                  </Typography>
                </TableCell>
                <TableCell>{row.changeType}</TableCell>
                <TableCell>{row.prevOrganization}</TableCell>
                <TableCell>{row.newOrganization}</TableCell>
                <TableCell>{row.prevRoles.join(', ')}</TableCell>
                <TableCell>
                  {row.revokedPermissions.map(p => (
                    <Box key={p} component="span" marginRight={0.5}>
                      <Chip label={p} size="small" />
                    </Box>
                  ))}
                </TableCell>
                <TableCell>{row.transferTargetUser || '-'}</TableCell>
                <TableCell>
                  <Chip label={row.status} size="small" color={statusColor(row.status)} />
                </TableCell>
                <TableCell>{row.scheduledAt}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
