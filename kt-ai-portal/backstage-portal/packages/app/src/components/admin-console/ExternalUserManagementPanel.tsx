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
import { ExternalUser } from './types';
import { UserAccountStatusChip } from './UserAccountStatusChip';

interface ExternalUserManagementPanelProps {
  externalUsers: ExternalUser[];
}

export const ExternalUserManagementPanel = ({ externalUsers }: ExternalUserManagementPanelProps) => {
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={2}>
        <Typography variant="h6" style={{ fontWeight: 600 }}>
          외부 사용자 관리
        </Typography>
        <Button variant="outlined" size="small" disabled>
          외부 사용자 신규 등록
        </Button>
      </Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>사용자명</TableCell>
              <TableCell>이메일</TableCell>
              <TableCell>소속기관</TableCell>
              <TableCell>계약/수행사</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>접속 시작</TableCell>
              <TableCell>접속 종료</TableCell>
              <TableCell>부여 역할</TableCell>
              <TableCell>접근 서비스</TableCell>
              <TableCell>마지막 로그인</TableCell>
              <TableCell align="center">액션</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {externalUsers.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>{row.organization}</TableCell>
                <TableCell>{row.company}</TableCell>
                <TableCell>
                  <UserAccountStatusChip status={row.accountStatus} />
                  {row.expiryWarning && (
                    <Chip label="만료임박" size="small" color="secondary" style={{ marginLeft: 4 }} />
                  )}
                </TableCell>
                <TableCell>{row.accessStart}</TableCell>
                <TableCell>{row.accessEnd}</TableCell>
                <TableCell>{row.role}</TableCell>
                <TableCell>{row.accessibleServices.join(', ')}</TableCell>
                <TableCell>{row.lastLoginAt || '-'}</TableCell>
                <TableCell align="center">
                  <Button size="small" variant="outlined" style={{ marginRight: 4 }} disabled>
                    수정
                  </Button>
                  <Button size="small" variant="outlined" style={{ marginRight: 4 }} disabled>
                    연장
                  </Button>
                  <Button size="small" variant="outlined" color="secondary" disabled>
                    잠금
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
