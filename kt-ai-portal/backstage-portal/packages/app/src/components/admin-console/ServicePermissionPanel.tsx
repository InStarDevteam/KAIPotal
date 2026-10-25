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
import { ServicePermission } from './types';

interface ServicePermissionPanelProps {
  permissions: ServicePermission[];
}

export const ServicePermissionPanel = ({ permissions }: ServicePermissionPanelProps) => {
  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        서비스별 권한 관리
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>서비스명</TableCell>
              <TableCell>접근 가능 역할</TableCell>
              <TableCell>접근 가능 그룹</TableCell>
              <TableCell align="center">인증 필요</TableCell>
              <TableCell align="center">MFA 필요</TableCell>
              <TableCell align="center">외부 사용자</TableCell>
              <TableCell align="center">감사로그</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {permissions.map(row => (
              <TableRow key={row.service}>
                <TableCell style={{ fontWeight: 500 }}>{row.service}</TableCell>
                <TableCell>
                  {row.allowedRoles.map(r => (
                    <Box key={r} component="span" marginRight={0.5}>
                      <Chip label={r} size="small" />
                    </Box>
                  ))}
                </TableCell>
                <TableCell>
                  {row.allowedGroups.map(g => (
                    <Box key={g} component="span" marginRight={0.5}>
                      <Chip label={g} size="small" color="primary" />
                    </Box>
                  ))}
                </TableCell>
                <TableCell align="center">
                  <Switch checked={row.authRequired} size="small" disabled />
                </TableCell>
                <TableCell align="center">
                  <Switch checked={row.mfaRequired} size="small" disabled />
                </TableCell>
                <TableCell align="center">
                  <Switch checked={row.externalAllowed} size="small" disabled />
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
