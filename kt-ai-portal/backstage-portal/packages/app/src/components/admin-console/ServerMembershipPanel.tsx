import { useCallback, useEffect, useState } from 'react';
import Alert from '@material-ui/lab/Alert';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import {
  AdminFetchFailure,
  ServerMembership,
  classifyAdminFetchError,
  membershipStatusLabel,
  parseMemberships,
} from './adminConsoleServerData';

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ko-KR');
};

export const ServerMembershipPanel = () => {
  const runtime = usePortalRuntime();
  const [members, setMembers] = useState<ServerMembership[] | null>(null);
  const [failure, setFailure] = useState<AdminFetchFailure | null>(null);

  const load = useCallback(() => {
    setFailure(null);
    runtime
      .request<unknown>('/v1/memberships')
      .then(response => setMembers(parseMemberships(response.data)))
      .catch((error: unknown) =>
        setFailure(
          classifyAdminFetchError(error, '사용자 목록을 불러오지 못했습니다.'),
        ),
      );
  }, [runtime]);

  useEffect(() => {
    setMembers(null);
    load();
  }, [load]);

  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        사용자 관리
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        현재 소속의 등록 사용자와 소속 정보는 서버에서 조회합니다.
      </Typography>
      {failure?.kind === 'permission' && (
        <Alert severity="error">{failure.message}</Alert>
      )}
      {failure?.kind === 'network' && (
        <Box marginBottom={2}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={load}>
                다시 시도
              </Button>
            }
          >
            {failure.message}
          </Alert>
        </Box>
      )}
      {!failure && members === null && (
        <Typography color="textSecondary">사용자 목록을 불러오는 중입니다.</Typography>
      )}
      {!failure && members !== null && members.length === 0 && (
        <Typography color="textSecondary">
          현재 소속에 조회된 사용자가 없습니다.
        </Typography>
      )}
      {!failure && members !== null && members.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>사용자명</TableCell>
                <TableCell>계정 ID</TableCell>
                <TableCell>이메일</TableCell>
                <TableCell>소속</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>유효 기간</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map(member => (
                <TableRow key={member.membershipId}>
                  <TableCell style={{ fontWeight: 600 }}>
                    {member.displayName}
                  </TableCell>
                  <TableCell>{member.userId}</TableCell>
                  <TableCell>{member.email ?? '—'}</TableCell>
                  <TableCell>{member.organizationName ?? '—'}</TableCell>
                  <TableCell>{membershipStatusLabel(member.status)}</TableCell>
                  <TableCell>
                    {formatDate(member.validFrom)} ~{' '}
                    {formatDate(member.validUntil)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};
