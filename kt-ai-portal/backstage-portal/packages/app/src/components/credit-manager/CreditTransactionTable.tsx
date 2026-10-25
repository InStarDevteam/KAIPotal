import { formatPortalDateTime } from '../common/portalDate';
import { useEffect, useState } from 'react';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import CircularProgress from '@material-ui/core/CircularProgress';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
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
  CreditTransactionPage,
  CreditTransactionType,
  CREDIT_TRANSACTION_TYPE_LABELS,
  CREDIT_TRANSACTION_TYPES,
  classifyCreditFetchError,
  formatCreditAmount,
} from './creditServerData';

const PAGE_SIZE = 20;

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: CreditTransactionPage }
  | { status: 'error'; failure: CreditFetchFailure };

export const CreditTransactionTable = ({
  accountId,
  reloadToken,
}: {
  accountId: string;
  reloadToken: number;
}) => {
  const { request } = usePortalRuntime();
  const [typeFilter, setTypeFilter] = useState<CreditTransactionType | ''>('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    setPage(1);
  }, [accountId, typeFilter]);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (typeFilter) query.set('type', typeFilter);
    request<CreditTransactionPage>(
      `/v1/credits/accounts/${accountId}/transactions?${query.toString()}`,
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
  }, [accountId, typeFilter, page, reloadToken, request]);

  const totalPages =
    state.status === 'ready'
      ? Math.max(1, Math.ceil(state.data.pagination.total / PAGE_SIZE))
      : 1;

  return (
    <Paper style={{ padding: 16 }}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        style={{ marginBottom: 8 }}
      >
        <Typography variant="h6">크레딧 거래 내역</Typography>
        <FormControl variant="outlined" size="small" style={{ minWidth: 160 }}>
          <InputLabel id="credit-tx-type-label">거래 유형</InputLabel>
          <Select
            labelId="credit-tx-type-label"
            label="거래 유형"
            value={typeFilter}
            onChange={event =>
              setTypeFilter(event.target.value as CreditTransactionType | '')
            }
          >
            <MenuItem value="">전체</MenuItem>
            {CREDIT_TRANSACTION_TYPES.map(type => (
              <MenuItem key={type} value={type}>
                {CREDIT_TRANSACTION_TYPE_LABELS[type]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {state.status === 'loading' && (
        <Box display="flex" justifyContent="center" padding={2}>
          <CircularProgress size={24} />
        </Box>
      )}
      {state.status === 'error' && (
        <Alert severity="error">{state.failure.message}</Alert>
      )}
      {state.status === 'ready' && state.data.items.length === 0 && (
        <Alert severity="info">조회된 거래 내역이 없습니다.</Alert>
      )}
      {state.status === 'ready' && state.data.items.length > 0 && (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>일시</TableCell>
                  <TableCell>유형</TableCell>
                  <TableCell>금액</TableCell>
                  <TableCell>사유</TableCell>
                  <TableCell>참조</TableCell>
                  <TableCell>처리자</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {state.data.items.map(row => (
                  <TableRow key={row.id}>
                    <TableCell>
                      {formatPortalDateTime(row.created_at)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={
                          CREDIT_TRANSACTION_TYPE_LABELS[row.type] ?? row.type
                        }
                      />
                    </TableCell>
                    <TableCell
                      style={{
                        color: row.amount.trim().startsWith('-')
                          ? '#c62828'
                          : undefined,
                      }}
                    >
                      {formatCreditAmount(row.amount)}
                    </TableCell>
                    <TableCell>{row.reason}</TableCell>
                    <TableCell>
                      {row.ref_type
                        ? `${row.ref_type}${
                            row.ref_id ? ` · ${row.ref_id}` : ''
                          }`
                        : '—'}
                    </TableCell>
                    <TableCell>{row.created_by}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="flex-end"
            style={{ gap: 8, marginTop: 8 }}
          >
            <Typography variant="body2" color="textSecondary">
              {state.data.pagination.total.toLocaleString('ko-KR')}건 중 {page}/
              {totalPages} 페이지
            </Typography>
            <Button
              size="small"
              disabled={page <= 1}
              onClick={() => setPage(value => value - 1)}
            >
              이전
            </Button>
            <Button
              size="small"
              disabled={page >= totalPages}
              onClick={() => setPage(value => value + 1)}
            >
              다음
            </Button>
          </Box>
        </>
      )}
    </Paper>
  );
};
