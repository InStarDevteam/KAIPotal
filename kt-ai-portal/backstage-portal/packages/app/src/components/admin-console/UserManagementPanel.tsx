import { useState } from 'react';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { AdminUser, UserStatusHistory } from './types';
import { UserAccountStatusChip } from './UserAccountStatusChip';
import { UserAccessServicePanel } from './UserAccessServicePanel';
import { UserStatusHistoryPanel } from './UserStatusHistoryPanel';

interface UserManagementPanelProps {
  users: AdminUser[];
  histories: UserStatusHistory[];
}

export const UserManagementPanel = ({ users: initialUsers, histories }: UserManagementPanelProps) => {
  const [users, setUsers] = useState(initialUsers);
  const [selectedId, setSelectedId] = useState<string | undefined>(initialUsers[0]?.id);

  const selected = users.find(u => u.id === selectedId);

  const handleSaveUser = (updated: AdminUser) => {
    setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
  };

  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        사용자 관리
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>사용자명</TableCell>
                  <TableCell>계정 ID</TableCell>
                  <TableCell>이메일</TableCell>
                  <TableCell>소속</TableCell>
                  <TableCell>역할</TableCell>
                  <TableCell>유형</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>마지막 로그인</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map(row => (
                  <TableRow
                    key={row.id}
                    selected={row.id === selectedId}
                    onClick={() => setSelectedId(row.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.accountId}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{row.organization}</TableCell>
                    <TableCell>{row.role}</TableCell>
                    <TableCell>{row.userType}</TableCell>
                    <TableCell>
                      <UserAccountStatusChip status={row.accountStatus} />
                    </TableCell>
                    <TableCell>{row.lastLoginAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
        <Grid item xs={12} lg={5}>
          {selected ? (
            <UserAccessServicePanel user={selected} onSave={handleSaveUser} />
          ) : (
            <Paper variant="outlined" style={{ padding: 24, textAlign: 'center' }}>
              <Typography color="textSecondary">사용자를 선택하면 설정 화면이 표시됩니다.</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {selected && (
        <Box marginTop={3}>
          <UserStatusHistoryPanel histories={histories} userId={selected.id} title={`${selected.name} 상태 변경 이력`} />
        </Box>
      )}
    </Box>
  );
};
