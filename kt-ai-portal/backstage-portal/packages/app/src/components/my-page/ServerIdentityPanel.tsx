import { useCallback, useEffect, useState } from 'react';
import Alert from '@material-ui/lab/Alert';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import {
  MyPageFetchFailure,
  ServerIdentity,
  classifyMyPageFetchError,
  parseServerIdentity,
} from './myPageServerData';

export const ServerIdentityPanel = () => {
  const runtime = usePortalRuntime();
  const [identity, setIdentity] = useState<ServerIdentity | null>(null);
  const [failure, setFailure] = useState<MyPageFetchFailure | null>(null);

  const load = useCallback(() => {
    setFailure(null);
    runtime
      .request<unknown>('/v1/me')
      .then(response => setIdentity(parseServerIdentity(response.data)))
      .catch((error: unknown) =>
        setFailure(
          classifyMyPageFetchError(error, '계정 정보를 불러오지 못했습니다.'),
        ),
      );
  }, [runtime]);

  useEffect(() => {
    setIdentity(null);
    load();
  }, [load]);

  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        프로필
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        계정 정보는 서버에서 조회합니다. 프로필 수정은 계정 관리 시스템 연결 후
        제공됩니다.
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
      {!failure && identity === null && (
        <Typography color="textSecondary">
          계정 정보를 불러오는 중입니다.
        </Typography>
      )}
      {identity && (
        <TableContainer>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell component="th" scope="row" style={{ width: 160 }}>
                  사용자 ID
                </TableCell>
                <TableCell>{identity.userId}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">
                  이름
                </TableCell>
                <TableCell>{identity.displayName}</TableCell>
              </TableRow>
              {identity.memberships.map(membership => (
                <TableRow key={membership.tenantId}>
                  <TableCell component="th" scope="row">
                    소속 ({membership.tenantName})
                  </TableCell>
                  <TableCell>
                    {membership.roles.length
                      ? membership.roles.join(', ')
                      : '부여된 역할이 없습니다'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};
