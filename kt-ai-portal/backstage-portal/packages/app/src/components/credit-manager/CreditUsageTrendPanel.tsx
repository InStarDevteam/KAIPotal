import { useEffect, useState } from 'react';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import CircularProgress from '@material-ui/core/CircularProgress';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Alert from '@material-ui/lab/Alert';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import {
  CreditFetchFailure,
  CreditOwnerType,
  CreditUsageTrend,
  classifyCreditFetchError,
} from './creditServerData';

interface TrendOwner {
  type: CreditOwnerType;
  id: string;
}

type TrendState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: CreditUsageTrend }
  | { status: 'error'; failure: CreditFetchFailure };

export const CreditUsageTrendPanel = ({
  owner,
}: {
  owner: TrendOwner | null;
}) => {
  const { request } = usePortalRuntime();
  const [state, setState] = useState<TrendState>({ status: 'idle' });

  useEffect(() => {
    if (!owner) return undefined;
    const controller = new AbortController();
    setState({ status: 'loading' });
    request<CreditUsageTrend>(
      `/v1/credits/usage/trend?owner_type=${
        owner.type
      }&owner_id=${encodeURIComponent(owner.id)}`,
      { signal: controller.signal },
    )
      .then(response => {
        if (controller.signal.aborted) return;
        setState({ status: 'ready', data: response.data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', failure: classifyCreditFetchError(error) });
      });
    return () => controller.abort();
  }, [owner, request]);

  const renderTrend = () => {
    if (!owner || state.status === 'idle' || state.status === 'loading') {
      return (
        <Box display="flex" justifyContent="center" padding={2}>
          <CircularProgress size={24} />
        </Box>
      );
    }
    if (state.status === 'error') {
      return (
        <Alert
          severity={state.failure.kind === 'permission' ? 'warning' : 'error'}
        >
          {state.failure.message}
        </Alert>
      );
    }
    if (!state.data.measured) {
      return (
        <Alert severity="info">
          사용량 실측 미연동(미산출): 플랫폼 사용량 실측 연동 전이라 사용량
          추이를 집계할 수 없습니다. 연동 완료 후 표시됩니다.
        </Alert>
      );
    }
    if (state.data.items.length === 0) {
      return <Alert severity="info">집계된 사용량 기록이 없습니다.</Alert>;
    }
    return (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {Object.keys(state.data.items[0]).map(key => (
                <TableCell key={key}>{key}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {state.data.items.map((item, index) => (
              <TableRow key={index}>
                {Object.keys(state.data.items[0]).map(key => (
                  <TableCell key={key}>{String(item[key] ?? '—')}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };
  return (
    <Paper style={{ padding: 16 }}>
      <Typography variant="h6" gutterBottom>
        사용량 추이
      </Typography>
      {renderTrend()}
    </Paper>
  );
};
