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
import { UserRegistration, UserStatusHistory } from './types';
import { UserIdentityVerificationChip } from './UserIdentityVerificationChip';
import { UserApprovalStatusChip } from './UserApprovalStatusChip';
import { UserRegistrationDetail } from './UserRegistrationDetail';

interface UserRegistrationPanelProps {
  registrations: UserRegistration[];
  onRegistrationsChange: (next: UserRegistration[]) => void;
  onHistoriesChange: (
    next: UserStatusHistory[] | ((prev: UserStatusHistory[]) => UserStatusHistory[]),
  ) => void;
}

export const UserRegistrationPanel = ({
  registrations,
  onRegistrationsChange,
  onHistoriesChange,
}: UserRegistrationPanelProps) => {
  const [selectedId, setSelectedId] = useState<string | undefined>(registrations[0]?.id);

  const selected = registrations.find(r => r.id === selectedId);

  const handleUpdate = (updated: UserRegistration, history: UserStatusHistory) => {
    const nextRegistrations = registrations.map(r => (r.id === updated.id ? updated : r));
    onRegistrationsChange(nextRegistrations);
    onHistoriesChange((prev: UserStatusHistory[]) => [history, ...prev]);
  };

  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        사용자 등록 신청
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>신청 ID</TableCell>
                  <TableCell>신청자명</TableCell>
                  <TableCell>유형</TableCell>
                  <TableCell>소속</TableCell>
                  <TableCell>이메일</TableCell>
                  <TableCell>본인확인</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>신청일</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {registrations.map(row => (
                  <TableRow
                    key={row.id}
                    selected={row.id === selectedId}
                    onClick={() => setSelectedId(row.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell>{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.userType}</TableCell>
                    <TableCell>{row.organization}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>
                      <UserIdentityVerificationChip status={row.identityStatus} />
                    </TableCell>
                    <TableCell>
                      <UserApprovalStatusChip status={row.status} />
                    </TableCell>
                    <TableCell>{row.appliedAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
        <Grid item xs={12} lg={5}>
          {selected ? (
            <UserRegistrationDetail registration={selected} onUpdate={handleUpdate} />
          ) : (
            <Paper variant="outlined" style={{ padding: 24, textAlign: 'center' }}>
              <Typography color="textSecondary">신청자를 선택하면 상세 화면이 표시됩니다.</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};
