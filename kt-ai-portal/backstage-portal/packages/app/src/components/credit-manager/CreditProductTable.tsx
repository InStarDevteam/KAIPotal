import { useEffect, useState } from 'react';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Chip from '@material-ui/core/Chip';
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
  CreditProductRow,
  classifyCreditFetchError,
  formatCreditAmount,
} from './creditServerData';

type ProductState =
  | { status: 'loading' }
  | { status: 'ready'; items: CreditProductRow[] }
  | { status: 'error'; failure: CreditFetchFailure };

const formatValidity = (row: CreditProductRow): string => {
  const from = row.valid_from ? new Date(row.valid_from).toLocaleDateString('ko-KR') : '—';
  const to = row.valid_to ? new Date(row.valid_to).toLocaleDateString('ko-KR') : '현재';
  return `${from} ~ ${to}`;
};

export const CreditProductTable = () => {
  const { request } = usePortalRuntime();
  const [state, setState] = useState<ProductState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    request<{ items: CreditProductRow[] }>('/v1/credits/products', {
      signal: controller.signal,
    })
      .then(response => {
        if (controller.signal.aborted) return;
        setState({ status: 'ready', items: response.data.items });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', failure: classifyCreditFetchError(error) });
      });
    return () => controller.abort();
  }, [request]);

  return (
    <Paper style={{ padding: 16 }}>
      <Typography variant="h6" gutterBottom>
        크레딧 상품 단가
      </Typography>
      <Typography color="textSecondary" variant="body2" paragraph>
        운영 단가는 서버 원장 기준 조회만 지원합니다.
      </Typography>
      {state.status === 'loading' && (
        <Box display="flex" justifyContent="center" padding={2}>
          <CircularProgress size={24} />
        </Box>
      )}
      {state.status === 'error' && (
        <Alert severity="error">{state.failure.message}</Alert>
      )}
      {state.status === 'ready' && state.items.length === 0 && (
        <Alert severity="info">등록된 크레딧 상품이 없습니다.</Alert>
      )}
      {state.status === 'ready' && state.items.length > 0 && (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>코드</TableCell>
                <TableCell>상품명</TableCell>
                <TableCell>과금 단위</TableCell>
                <TableCell>단가</TableCell>
                <TableCell>통화</TableCell>
                <TableCell>유효 기간</TableCell>
                <TableCell>적용</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {state.items.map(row => (
                <TableRow key={row.id}>
                  <TableCell>{row.code}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.unit}</TableCell>
                  <TableCell>{formatCreditAmount(row.unit_price)}</TableCell>
                  <TableCell>{row.currency}</TableCell>
                  <TableCell>{formatValidity(row)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={row.active ? '적용 중' : '미적용'}
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
