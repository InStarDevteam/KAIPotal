import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { AdminGroup } from './types';

interface GroupManagementPanelProps {
  groups: AdminGroup[];
}

export const GroupManagementPanel = ({ groups }: GroupManagementPanelProps) => {
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={2}>
        <Typography variant="h6" style={{ fontWeight: 600 }}>
          그룹 관리
        </Typography>
        <Button variant="outlined" size="small" disabled>
          그룹 생성
        </Button>
      </Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>그룹 ID</TableCell>
              <TableCell>그룹명</TableCell>
              <TableCell>설명</TableCell>
              <TableCell>소속 조직</TableCell>
              <TableCell>적용 역할</TableCell>
              <TableCell align="right">사용자 수</TableCell>
              <TableCell>접근 서비스</TableCell>
              <TableCell>데이터 등급</TableCell>
              <TableCell>사용 여부</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell style={{ fontWeight: 600 }}>{row.name}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell>{row.organization}</TableCell>
                <TableCell>
                  {row.appliedRoles.map(r => (
                    <Box key={r} component="span" marginRight={0.5}>
                      <Chip label={r} size="small" />
                    </Box>
                  ))}
                </TableCell>
                <TableCell align="right">{row.userCount}</TableCell>
                <TableCell>
                  {row.accessibleServices.map(s => (
                    <Box key={s} component="span" marginRight={0.5}>
                      <Chip label={s} size="small" color="primary" />
                    </Box>
                  ))}
                </TableCell>
                <TableCell>{row.dataAccessLevel}</TableCell>
                <TableCell>
                  <Chip label={row.enabled ? '사용' : '미사용'} size="small" color={row.enabled ? 'primary' : 'default'} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box display="flex" marginTop={2}>
        <Box marginRight={1}>
          <Button variant="outlined" size="small" disabled>
            그룹 수정
          </Button>
        </Box>
        <Box marginRight={1}>
          <Button variant="outlined" size="small" disabled>
            사용자 매핑
          </Button>
        </Box>
        <Box marginRight={1}>
          <Button variant="outlined" size="small" disabled>
            역할 매핑
          </Button>
        </Box>
        <Button variant="outlined" size="small" disabled>
          비활성화
        </Button>
      </Box>
    </Box>
  );
};
