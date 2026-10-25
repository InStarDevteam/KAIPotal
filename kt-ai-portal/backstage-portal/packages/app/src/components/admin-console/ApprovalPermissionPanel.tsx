import Box from '@material-ui/core/Box';
import Chip from '@material-ui/core/Chip';
import Paper from '@material-ui/core/Paper';
import Switch from '@material-ui/core/Switch';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { ApprovalPermission } from './types';

interface ApprovalPermissionPanelProps {
  permissions: ApprovalPermission[];
}

export const ApprovalPermissionPanel = ({ permissions }: ApprovalPermissionPanelProps) => {
  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        승인 권한 관리
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>승인 유형</TableCell>
              <TableCell>1차 승인 역할</TableCell>
              <TableCell>2차 승인 역할</TableCell>
              <TableCell>최종 승인 역할</TableCell>
              <TableCell align="center">대리 승인</TableCell>
              <TableCell align="center">외부 사용자 승인</TableCell>
              <TableCell align="center">감사로그</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {permissions.map(row => (
              <TableRow key={row.type}>
                <TableCell style={{ fontWeight: 500 }}>{row.type}</TableCell>
                <TableCell>
                  {row.primaryApproverRoles.map(r => (
                    <Box key={r} component="span" marginRight={0.5}>
                      <Chip label={r} size="small" />
                    </Box>
                  ))}
                </TableCell>
                <TableCell>
                  {row.secondaryApproverRoles.map(r => (
                    <Box key={r} component="span" marginRight={0.5}>
                      <Chip label={r} size="small" />
                    </Box>
                  ))}
                </TableCell>
                <TableCell>
                  {row.finalApproverRoles.map(r => (
                    <Box key={r} component="span" marginRight={0.5}>
                      <Chip label={r} size="small" color="secondary" />
                    </Box>
                  ))}
                </TableCell>
                <TableCell align="center">
                  <Switch checked={row.delegationAllowed} size="small" disabled />
                </TableCell>
                <TableCell align="center">
                  <Switch checked={row.externalApproverAllowed} size="small" disabled />
                </TableCell>
                <TableCell align="center">
                  <Switch checked={row.auditLogged} size="small" disabled />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
