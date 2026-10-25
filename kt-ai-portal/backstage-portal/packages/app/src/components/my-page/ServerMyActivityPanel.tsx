import { useCallback, useEffect, useState } from 'react';
import Alert from '@material-ui/lab/Alert';
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
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import {
  MyPageFetchFailure,
  ServerAuditEvent,
  auditCategoryLabel,
  auditResultLabel,
  classifyMyPageFetchError,
  parseServerAuditEvents,
} from './myPageServerData';

const formatOccurredAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR', { hour12: false });
};

export const ServerMyActivityPanel = () => {
  const runtime = usePortalRuntime();
  const [events, setEvents] = useState<ServerAuditEvent[] | null>(null);
  const [failure, setFailure] = useState<MyPageFetchFailure | null>(null);

  const load = useCallback(() => {
    setFailure(null);
    runtime
      .request<unknown>('/v1/me/activity')
      .then(response => setEvents(parseServerAuditEvents(response.data)))
      .catch((error: unknown) =>
        setFailure(
          classifyMyPageFetchError(error, '활동 로그를 불러오지 못했습니다.'),
        ),
      );
  }, [runtime]);

  useEffect(() => {
    setEvents(null);
    load();
  }, [load]);

  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        내 활동 로그
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        현재 소속에서 내 계정의 최근 활동 50건을 조회합니다.
      </Typography>
      {failure?.kind === 'permission' && (
        <Alert severity="error">
          {failure.message || '현재 소속에서 활동 기록을 조회할 수 없습니다.'}
        </Alert>
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
      {!failure && events === null && (
        <Typography color="textSecondary">
          활동 로그를 불러오는 중입니다.
        </Typography>
      )}
      {!failure && events !== null && events.length === 0 && (
        <Typography color="textSecondary">
          조회된 내 활동 기록이 없습니다.
        </Typography>
      )}
      {!failure && events !== null && events.length > 0 && (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>발생 시각</TableCell>
                <TableCell>분류</TableCell>
                <TableCell>동작</TableCell>
                <TableCell>대상</TableCell>
                <TableCell>결과</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map(event => (
                <TableRow key={event.id}>
                  <TableCell>{formatOccurredAt(event.createdAt)}</TableCell>
                  <TableCell>{auditCategoryLabel(event.category)}</TableCell>
                  <TableCell>{event.action}</TableCell>
                  <TableCell>
                    {event.resourceType ?? '—'}
                    {event.resourceId ? ` / ${event.resourceId}` : ''}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={auditResultLabel(event.result)}
                      color={
                        event.result === 'success' ? 'primary' : 'secondary'
                      }
                    />
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
