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
import { MenuItem } from './types';

interface MenuPermissionPanelProps {
  menuItems: MenuItem[];
}

export const MenuPermissionPanel = ({ menuItems }: MenuPermissionPanelProps) => {
  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        메뉴 별 권한 연결
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>메뉴</TableCell>
              <TableCell>접근 가능 역할</TableCell>
              <TableCell>접근 가능 그룹</TableCell>
              <TableCell align="center">외부 사용자</TableCell>
              <TableCell align="center">숨김</TableCell>
              <TableCell>읽기/쓰기/관리</TableCell>
              <TableCell align="center">적용 상태</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {menuItems.map(row => (
              <TableRow key={row.id}>
                <TableCell style={{ fontWeight: 500 }}>{row.name}</TableCell>
                <TableCell>
                  {row.accessRoles.map(r => (
                    <Box key={r} component="span" marginRight={0.5}>
                      <Chip label={r} size="small" />
                    </Box>
                  ))}
                </TableCell>
                <TableCell>-</TableCell>
                <TableCell align="center">
                  <Switch checked={row.accessRoles.includes('external-user')} size="small" disabled />
                </TableCell>
                <TableCell align="center">
                  <Switch checked={row.hidden || false} size="small" disabled />
                </TableCell>
                <TableCell>{row.readWrite || '읽기'}</TableCell>
                <TableCell align="center">
                  <Chip label={row.enabled ? '적용' : '미적용'} size="small" color={row.enabled ? 'primary' : 'default'} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
