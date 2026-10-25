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
import { Program } from './types';

interface ProgramRegistryPanelProps {
  programs: Program[];
}

export const ProgramRegistryPanel = ({ programs }: ProgramRegistryPanelProps) => {
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={2}>
        <Typography variant="h6" style={{ fontWeight: 600 }}>
          프로그램 관리
        </Typography>
        <Button variant="outlined" size="small" disabled>
          신규 프로그램 등록
        </Button>
      </Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>프로그램 ID</TableCell>
              <TableCell>프로그램명</TableCell>
              <TableCell>설명</TableCell>
              <TableCell>유형</TableCell>
              <TableCell>연결 경로</TableCell>
              <TableCell>담당자</TableCell>
              <TableCell>사용 여부</TableCell>
              <TableCell>접근 역할</TableCell>
              <TableCell>등록일</TableCell>
              <TableCell>수정일</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {programs.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell style={{ fontWeight: 600 }}>{row.name}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell>
                  <Chip label={row.type} size="small" color="primary" />
                </TableCell>
                <TableCell>{row.path}</TableCell>
                <TableCell>{row.owner}</TableCell>
                <TableCell>
                  <Chip label={row.enabled ? '사용' : '미사용'} size="small" color={row.enabled ? 'primary' : 'default'} />
                </TableCell>
                <TableCell>
                  {row.accessRoles.map(r => (
                    <Box key={r} component="span" marginRight={0.5}>
                      <Chip label={r} size="small" />
                    </Box>
                  ))}
                </TableCell>
                <TableCell>{row.createdAt}</TableCell>
                <TableCell>{row.updatedAt}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
