import { formatPortalDateTime } from '../common/portalDate';
import { useEffect, useState } from 'react';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import CircularProgress from '@material-ui/core/CircularProgress';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
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
import TextField from '@material-ui/core/TextField';
import Alert from '@material-ui/lab/Alert';
import {
  PortalResponse,
  usePortalRuntime,
} from '../portal-runtime/PortalRuntimeContext';
import {
  conflictRefetchMessage,
  CreditFetchFailure,
  CreditOwnerType,
  CreditRequestRow,
  CreditRequestType,
  CREDIT_REQUEST_STATUS_LABELS,
  CREDIT_REQUEST_TYPE_LABELS,
  classifyCreditFetchError,
  formatCreditAmount,
  isPendingCreditRequest,
  newIdempotencyKey,
  validateCreditAmountInput,
  validateCreditReason,
} from './creditServerData';
import './creditManager.css';

interface PanelOwner {
  type: CreditOwnerType;
  id: string;
  label: string;
}

type ListState =
  | { status: 'loading' }
  | { status: 'ready'; mine: CreditRequestRow[]; inbox: CreditRequestRow[] }
  | { status: 'error'; failure: CreditFetchFailure };

interface Notice {
  message: string;
  error: boolean;
}

type PendingDecision = {
  row: CreditRequestRow;
  decision: 'approved' | 'rejected';
};

export const CreditRequestPanel = ({
  owner,
  canViewAll,
  canApprove,
  onChanged,
}: {
  owner: PanelOwner | null;
  canViewAll: boolean;
  canApprove: boolean;
  onChanged: () => void;
}) => {
  const { request } = usePortalRuntime();
  const [state, setState] = useState<ListState>({ status: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [requestType, setRequestType] = useState<CreditRequestType>('charge');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    newIdempotencyKey(),
  );

  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustKey, setAdjustKey] = useState(() => newIdempotencyKey());

  const [pendingDecision, setPendingDecision] =
    useState<PendingDecision | null>(null);
  const [decisionReason, setDecisionReason] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    const minePromise = request<{ items: CreditRequestRow[] }>(
      '/v1/credits/requests?mine=true',
      { signal: controller.signal },
    );
    const inboxPromise = canViewAll
      ? request<{ items: CreditRequestRow[] }>(
          '/v1/credits/requests?status=requested',
          { signal: controller.signal },
        )
      : Promise.resolve<PortalResponse<{ items: CreditRequestRow[] }>>({
          data: { items: [] },
          meta: {},
        });
    Promise.all([minePromise, inboxPromise])
      .then(([mineResponse, inboxResponse]) => {
        if (controller.signal.aborted) return;
        setState({
          status: 'ready',
          mine: mineResponse.data.items,
          inbox: inboxResponse.data.items,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', failure: classifyCreditFetchError(error) });
      });
    return () => controller.abort();
  }, [canViewAll, request, reloadToken]);

  const refetch = () => setReloadToken(token => token + 1);

  const handleCreate = () => {
    if (!owner || submitting) return;
    const amountError = validateCreditAmountInput(amount);
    if (amountError) {
      setNotice({ message: amountError, error: true });
      return;
    }
    const reasonError = validateCreditReason(reason);
    if (reasonError) {
      setNotice({ message: reasonError, error: true });
      return;
    }
    setSubmitting(true);
    setNotice(null);
    request<CreditRequestRow>('/v1/credits/requests', {
      method: 'POST',
      body: JSON.stringify({
        type: requestType,
        owner_type: owner.type,
        owner_id: owner.id,
        amount: amount.trim(),
        reason: reason.trim(),
        idempotency_key: idempotencyKey,
      }),
    })
      .then(() => {
        setNotice({ message: '크레딧 신청을 접수했습니다.', error: false });
        setAmount('');
        setReason('');
        setIdempotencyKey(newIdempotencyKey());
        refetch();
        onChanged();
      })
      .catch((error: unknown) => {
        const failure = classifyCreditFetchError(error);
        setNotice({
          message:
            failure.kind === 'conflict'
              ? `${failure.message} ${conflictRefetchMessage}`
              : failure.message,
          error: true,
        });
      })
      .finally(() => setSubmitting(false));
  };

  const handleAdjust = () => {
    if (!owner || submitting) return;
    const amountError = validateCreditAmountInput(adjustAmount, {
      allowNegative: true,
    });
    if (amountError) {
      setNotice({ message: amountError, error: true });
      return;
    }
    const reasonError = validateCreditReason(adjustReason);
    if (reasonError) {
      setNotice({ message: reasonError, error: true });
      return;
    }
    setSubmitting(true);
    setNotice(null);
    request('/v1/credits/transactions', {
      method: 'POST',
      body: JSON.stringify({
        owner_type: owner.type,
        owner_id: owner.id,
        amount: adjustAmount.trim(),
        reason: adjustReason.trim(),
        idempotency_key: adjustKey,
      }),
    })
      .then(() => {
        setNotice({ message: '크레딧 정정을 반영했습니다.', error: false });
        setAdjustAmount('');
        setAdjustReason('');
        setAdjustKey(newIdempotencyKey());
        onChanged();
      })
      .catch((error: unknown) => {
        const failure = classifyCreditFetchError(error);
        setNotice({
          message:
            failure.kind === 'conflict'
              ? `${failure.message} ${conflictRefetchMessage}`
              : failure.message,
          error: true,
        });
      })
      .finally(() => setSubmitting(false));
  };

  const handleDecisionConfirm = () => {
    if (!pendingDecision || submitting) return;
    const reasonError = validateCreditReason(decisionReason);
    if (reasonError) {
      setNotice({ message: reasonError, error: true });
      return;
    }
    const { row, decision } = pendingDecision;
    setSubmitting(true);
    setNotice(null);
    request<CreditRequestRow>(`/v1/credits/requests/${row.id}/decision`, {
      method: 'POST',
      body: JSON.stringify({
        decision,
        reason: decisionReason.trim(),
        expectedVersion: row.version,
      }),
    })
      .then(() => {
        setNotice({
          message: `크레딧 신청을 ${
            decision === 'approved' ? '승인' : '반려'
          } 처리했습니다.`,
          error: false,
        });
        setPendingDecision(null);
        setDecisionReason('');
        refetch();
        onChanged();
      })
      .catch((error: unknown) => {
        const failure = classifyCreditFetchError(error);
        setNotice({
          message:
            failure.kind === 'conflict'
              ? `${failure.message} ${conflictRefetchMessage}`
              : failure.message,
          error: true,
        });
        if (failure.kind === 'conflict') refetch();
      })
      .finally(() => setSubmitting(false));
  };

  const renderRow = (row: CreditRequestRow, actions: boolean) => (
    <TableRow key={row.id}>
      <TableCell>{CREDIT_REQUEST_TYPE_LABELS[row.type] ?? row.type}</TableCell>
      <TableCell>
        {CREDIT_REQUEST_STATUS_LABELS[row.status] ?? row.status}
      </TableCell>
      <TableCell>{formatCreditAmount(row.amount)}</TableCell>
      <TableCell>{row.reason}</TableCell>
      <TableCell>{formatPortalDateTime(row.requested_at)}</TableCell>
      <TableCell>
        {row.decided_at
          ? `${row.decided_by ?? '—'} · ${formatPortalDateTime(
              row.decided_at,
            )}${row.decision_reason ? ` · ${row.decision_reason}` : ''}`
          : '—'}
      </TableCell>
      {actions && (
        <TableCell>
          <Button
            size="small"
            color="primary"
            disabled={submitting}
            onClick={() => {
              setPendingDecision({ row, decision: 'approved' });
              setDecisionReason('');
            }}
          >
            승인
          </Button>
          <Button
            size="small"
            color="secondary"
            disabled={submitting}
            onClick={() => {
              setPendingDecision({ row, decision: 'rejected' });
              setDecisionReason('');
            }}
          >
            반려
          </Button>
        </TableCell>
      )}
    </TableRow>
  );

  return (
    <Paper style={{ padding: 16 }}>
      <Typography variant="h6" gutterBottom>
        크레딧 신청 · 승인
      </Typography>

      {notice && (
        <Alert
          severity={notice.error ? 'error' : 'success'}
          style={{ marginBottom: 12 }}
          onClose={() => setNotice(null)}
        >
          {notice.message}
        </Alert>
      )}

      <Typography
        variant="subtitle2"
        gutterBottom
        className="credit-form-heading"
      >
        신청 등록{owner ? ` — 대상: ${owner.label}` : ''}
      </Typography>
      <Box className="credit-form-row credit-request-form">
        <FormControl variant="outlined" size="small" fullWidth>
          <InputLabel id="credit-request-type-label">신청 유형</InputLabel>
          <Select
            labelId="credit-request-type-label"
            label="신청 유형"
            value={requestType}
            onChange={event =>
              setRequestType(event.target.value as CreditRequestType)
            }
          >
            {Object.entries(CREDIT_REQUEST_TYPE_LABELS).map(
              ([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ),
            )}
          </Select>
        </FormControl>
        <TextField
          label="금액"
          size="small"
          variant="outlined"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={amount}
          onChange={event => setAmount(event.target.value)}
          helperText="소수점 4자리 이내, 0보다 큰 값"
        />
        <TextField
          label="신청 사유"
          size="small"
          variant="outlined"
          fullWidth
          InputLabelProps={{ shrink: true }}
          className="credit-reason-field"
          value={reason}
          onChange={event => setReason(event.target.value)}
          helperText="1~500자"
        />
        <Button
          variant="contained"
          color="primary"
          disabled={!owner || submitting}
          onClick={handleCreate}
        >
          {submitting ? '처리 중' : '신청'}
        </Button>
      </Box>

      {state.status === 'loading' && (
        <Box display="flex" justifyContent="center" padding={2}>
          <CircularProgress size={24} />
        </Box>
      )}
      {state.status === 'error' && (
        <Alert
          severity={state.failure.kind === 'permission' ? 'warning' : 'error'}
          style={{ marginBottom: 12 }}
          action={
            state.failure.kind !== 'permission' ? (
              <Button color="inherit" size="small" onClick={refetch}>
                다시 시도
              </Button>
            ) : undefined
          }
        >
          {state.failure.message}
        </Alert>
      )}

      {state.status === 'ready' && (
        <>
          <Typography variant="subtitle2" gutterBottom>
            내 신청
          </Typography>
          {state.mine.length === 0 ? (
            <Alert
              severity="info"
              className="credit-empty-state"
              style={{ marginBottom: 20 }}
            >
              접수한 크레딧 신청이 없습니다.
            </Alert>
          ) : (
            <TableContainer style={{ marginBottom: 16 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>유형</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>금액</TableCell>
                    <TableCell>사유</TableCell>
                    <TableCell>신청일</TableCell>
                    <TableCell>결정</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {state.mine.map(row => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {CREDIT_REQUEST_TYPE_LABELS[row.type] ?? row.type}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={
                            CREDIT_REQUEST_STATUS_LABELS[row.status] ??
                            row.status
                          }
                        />
                      </TableCell>
                      <TableCell>{formatCreditAmount(row.amount)}</TableCell>
                      <TableCell>{row.reason}</TableCell>
                      <TableCell>
                        {formatPortalDateTime(row.requested_at)}
                      </TableCell>
                      <TableCell>
                        {row.decided_at
                          ? `${row.decided_by ?? '—'} · ${formatPortalDateTime(
                              row.decided_at,
                            )}${
                              row.decision_reason
                                ? ` · ${row.decision_reason}`
                                : ''
                            }`
                          : '검토 대기'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {canViewAll && (
            <>
              <Typography variant="subtitle2" gutterBottom>
                승인함(검토 대기)
              </Typography>
              {state.inbox.length === 0 ? (
                <Alert severity="info" className="credit-empty-state">
                  검토 대기 중인 크레딧 신청이 없습니다.
                </Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>유형</TableCell>
                        <TableCell>상태</TableCell>
                        <TableCell>금액</TableCell>
                        <TableCell>사유</TableCell>
                        <TableCell>신청일</TableCell>
                        <TableCell>결정</TableCell>
                        {canApprove && <TableCell>처리</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {state.inbox
                        .filter(isPendingCreditRequest)
                        .map(row => renderRow(row, canApprove))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </>
      )}

      {canApprove && (
        <>
          <Typography
            variant="subtitle2"
            gutterBottom
            style={{ marginTop: 16 }}
          >
            관리자 정정(승인 권한 필요)
          </Typography>
          <Box className="credit-form-row credit-adjust-form">
            <TextField
              label="정정 금액"
              size="small"
              variant="outlined"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={adjustAmount}
              onChange={event => setAdjustAmount(event.target.value)}
              helperText="음수 허용, 소수점 4자리 이내"
            />
            <TextField
              label="정정 사유"
              size="small"
              variant="outlined"
              fullWidth
              InputLabelProps={{ shrink: true }}
              className="credit-reason-field"
              value={adjustReason}
              onChange={event => setAdjustReason(event.target.value)}
              helperText="1~500자(필수)"
            />
            <Button
              variant="outlined"
              color="primary"
              disabled={!owner || submitting}
              onClick={handleAdjust}
            >
              {submitting ? '처리 중' : '정정 반영'}
            </Button>
          </Box>
        </>
      )}

      <Dialog
        open={Boolean(pendingDecision)}
        onClose={() => setPendingDecision(null)}
      >
        <DialogTitle>
          크레딧 신청{' '}
          {pendingDecision?.decision === 'approved' ? '승인' : '반려'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="결정 사유"
            value={decisionReason}
            onChange={event => setDecisionReason(event.target.value)}
            helperText="1~500자(필수)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDecision(null)}>취소</Button>
          <Button
            color="primary"
            variant="contained"
            disabled={submitting}
            onClick={handleDecisionConfirm}
          >
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
