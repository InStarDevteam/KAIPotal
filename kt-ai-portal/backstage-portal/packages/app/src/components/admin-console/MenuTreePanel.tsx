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
import { MenuItem } from './types';

interface MenuTreePanelProps {
  menuItems: MenuItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const MenuTreePanel = ({ menuItems, selectedId, onSelect }: MenuTreePanelProps) => {
  const sorted = [...menuItems].sort((a, b) => {
    if (a.parent === b.parent) return a.displayOrder - b.displayOrder;
    return a.parent.localeCompare(b.parent);
  });

  const indent = (item: MenuItem) => {
    if (item.parent === '-') return 0;
    if (item.parent === '국방지능형플랫폼포털') return 1;
    return 2;
  };

  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        메뉴 트리 관리
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>메뉴</TableCell>
              <TableCell>메뉴 ID</TableCell>
              <TableCell>상위 메뉴</TableCell>
              <TableCell>경로</TableCell>
              <TableCell>연결 기능</TableCell>
              <TableCell align="right">순서</TableCell>
              <TableCell>사용 여부</TableCell>
              <TableCell>접근 역할</TableCell>
              <TableCell>유형</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map(row => (
              <TableRow
                key={row.id}
                selected={row.id === selectedId}
                onClick={() => onSelect(row.id)}
                style={{ cursor: 'pointer' }}
              >
                <TableCell style={{ paddingLeft: 16 + indent(row) * 24, fontWeight: indent(row) === 0 ? 700 : 400 }}>
                  {row.name}
                </TableCell>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.parent}</TableCell>
                <TableCell>{row.path}</TableCell>
                <TableCell>{row.connectedFeature}</TableCell>
                <TableCell align="right">{row.displayOrder}</TableCell>
                <TableCell>
                  <Chip label={row.enabled ? '사용' : '미사용'} size="small" color={row.enabled ? 'primary' : 'default'} />
                </TableCell>
                <TableCell>{row.accessRoles.join(', ')}</TableCell>
                <TableCell>{row.menuType}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
