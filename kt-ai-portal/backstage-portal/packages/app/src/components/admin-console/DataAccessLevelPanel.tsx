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
import { DataAccessPermission } from './types';

interface DataAccessLevelPanelProps {
  permissions: DataAccessPermission[];
}

export const DataAccessLevelPanel = ({ permissions }: DataAccessLevelPanelProps) => {
  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        데이터 접근 등급 관리
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>데이터 등급</TableCell>
              <TableCell>접근 가능 역할</TableCell>
              <TableCell>접근 가능 그룹</TableCell>
              <TableCell align="center">반출 가능</TableCell>
              <TableCell align="center">추가 인증</TableCell>
              <TableCell align="center">감사로그 필수</TableCell>
              <TableCell>보관 정책</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {permissions.map(row => (
              <TableRow key={row.level}>
                <TableCell style={{ fontWeight: 600 }}>
                  <Chip label={row.level} size="small" color={row.level === '비밀' ? 'secondary' : 'primary'} />
                </TableCell>
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
                  <Switch checked={row.exportAllowed} size="small" disabled />
                </TableCell>
                <TableCell align="center">
                  <Switch checked={row.additionalAuthRequired} size="small" disabled />
                </TableCell>
                <TableCell align="center">
                  <Switch checked={row.auditRequired} size="small" disabled />
                </TableCell>
                <TableCell>{row.retentionPolicy}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
