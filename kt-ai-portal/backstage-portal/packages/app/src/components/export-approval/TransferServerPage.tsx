import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Snackbar from '@material-ui/core/Snackbar';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import Alert from '@material-ui/lab/Alert';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { useTransferFileHttp } from './transferFileHttp';
import { TransferServerList } from './TransferServerList';
import { TransferServerDetail } from './TransferServerDetail';
import { TransferServerForm } from './TransferServerForm';
import {
  conflictRefetchMessage,
  TransferDecision,
  TransferFetchFailure,
  TransferFileRow,
  TransferRequestDetail,
  TransferRequestRow,
  TRANSFER_DECISION_LABELS,
  TRANSFER_STATUS_LABELS,
  buildTransferFileForm,
  classifyTransferFetchError,
  validateTransferReason,
} from './transferServerData';

type ListState =
  | { status: 'loading' }
  | { status: 'ready'; items: TransferRequestRow[] }
  | { status: 'error'; failure: TransferFetchFailure };

type DetailState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: TransferRequestDetail }
  | { status: 'error'; failure: TransferFetchFailure };

interface PendingDecision {
  decision: TransferDecision;
}

export const TransferServerPage = () => {
  const runtime = usePortalRuntime();
  const { actorId, permissions, request } = runtime;
  const canReview = permissions.includes('export.review');
  const { uploadForm, downloadFile } = useTransferFileHttp();

  const [listState, setListState] = useState<ListState>({ status: 'loading' });
  const [detailState, setDetailState] = useState<DetailState>({
    status: 'idle',
  });
  const [reloadToken, setReloadToken] = useState(0);
  const [detailToken, setDetailToken] = useState(0);
  const [tabIndex, setTabIndex] = useState(0);
  const [params, setParams] = useSearchParams();
  const [notice, setNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [pendingDecision, setPendingDecision] =
    useState<PendingDecision | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setListState({ status: 'loading' });
    request<{ items: TransferRequestRow[] }>('/v1/transfer-requests', {
      signal: controller.signal,
    })
      .then(response => {
        if (controller.signal.aborted) return;
        setListState({ status: 'ready', items: response.data.items });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setListState({
          status: 'error',
          failure: classifyTransferFetchError(error),
        });
      });
    return () => controller.abort();
  }, [request, reloadToken]);

  const items = listState.status === 'ready' ? listState.items : [];
  const selectedId = params.get('request') ?? items[0]?.id ?? '';
  const setSelectedId = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('request', id);
    setParams(next);
  };
  const selectedRequest = items.find(item => item.id === selectedId);

  useEffect(() => {
    if (!selectedId) return undefined;
    const controller = new AbortController();
    setDetailState({ status: 'loading' });
    request<TransferRequestDetail>(`/v1/transfer-requests/${selectedId}`, {
      signal: controller.signal,
    })
      .then(response => {
        if (controller.signal.aborted) return;
        setDetailState({ status: 'ready', data: response.data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const failure = classifyTransferFetchError(error);
        setDetailState({
          status: 'error',
          failure:
            failure.kind === 'conflict'
              ? {
                  ...failure,
                  message: `${failure.message} ${conflictRefetchMessage}`,
                }
              : failure,
        });
      });
    return () => controller.abort();
  }, [selectedId, request, detailToken, reloadToken]);

  const refetch = () => {
    setReloadToken(token => token + 1);
    setDetailToken(token => token + 1);
  };

  const describeFailure = (failure: TransferFetchFailure): string =>
    failure.kind === 'conflict'
      ? `${failure.message} ${conflictRefetchMessage}`
      : failure.message;

  const handleDecisionConfirm = () => {
    if (!pendingDecision || !selectedRequest || submitting) return;
    const reasonError = validateTransferReason(decisionReason);
    if (reasonError) {
      setErrorNotice(reasonError);
      return;
    }
    setSubmitting(true);
    setErrorNotice(null);
    request<TransferRequestRow>(
      `/v1/transfer-requests/${selectedRequest.id}/decision`,
      {
        method: 'POST',
        body: JSON.stringify({
          decision: pendingDecision.decision,
          reason: decisionReason.trim(),
          expectedVersion: selectedRequest.version,
        }),
      },
    )
      .then(() => {
        setNotice(
          `신청을 ${
            TRANSFER_DECISION_LABELS[pendingDecision.decision]
          } 처리했습니다.`,
        );
        setPendingDecision(null);
        setDecisionReason('');
        refetch();
      })
      .catch((error: unknown) => {
        const failure = classifyTransferFetchError(error);
        setErrorNotice(describeFailure(failure));
        if (failure.kind === 'conflict') refetch();
      })
      .finally(() => setSubmitting(false));
  };

  const handleCancel = () => {
    if (!selectedRequest || submitting) return;
    setSubmitting(true);
    setErrorNotice(null);
    request<TransferRequestRow>(
      `/v1/transfer-requests/${selectedRequest.id}/cancel`,
      {
        method: 'POST',
      },
    )
      .then(() => {
        setNotice('신청을 취소했습니다.');
        refetch();
      })
      .catch((error: unknown) => {
        const failure = classifyTransferFetchError(error);
        setErrorNotice(describeFailure(failure));
        if (failure.kind === 'conflict') refetch();
      })
      .finally(() => setSubmitting(false));
  };

  const handleDownload = (file: TransferFileRow) => {
    setDownloadingId(file.id);
    setErrorNotice(null);
    downloadFile(
      `/v1/transfer-requests/files/${file.id}/download`,
      file.original_name,
    )
      .then(({ blob, filename }) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      })
      .catch((error: unknown) => {
        const failure = classifyTransferFetchError(error);
        setErrorNotice(describeFailure(failure));
      })
      .finally(() => setDownloadingId(null));
  };

  const handleUploadFile = (file: File) => {
    if (!selectedRequest || uploading) return;
    setUploading(true);
    setErrorNotice(null);
    uploadForm<{
      staleApproval: boolean;
      previousApprovedVersion: number | null;
    }>(
      `/v1/transfer-requests/${selectedRequest.id}/files`,
      buildTransferFileForm(file),
    )
      .then(response => {
        setNotice('새 버전 파일을 등록했습니다.');
        if (response.data.staleApproval) {
          setErrorNotice(
            '승인 후 파일이 변경되었습니다. 다운로드는 이전 승인 버전만 허용되며 재승인이 필요합니다.',
          );
        }
        setDetailToken(token => token + 1);
        setReloadToken(token => token + 1);
      })
      .catch((error: unknown) => {
        const failure = classifyTransferFetchError(error);
        setErrorNotice(describeFailure(failure));
      })
      .finally(() => setUploading(false));
  };

  const handleSubmitted = (id: string) => {
    setNotice('신청을 접수했습니다.');
    setTabIndex(0);
    refetch();
    setSelectedId(id);
  };

  return (
    <Box padding={3}>
      <Typography variant="h4" gutterBottom>
        반입·반출 승인
      </Typography>
      <Typography color="textSecondary" paragraph>
        반입·반출 신청과 승인 처리를 서버에서 관리합니다.
      </Typography>

      {errorNotice && (
        <Alert
          severity="error"
          style={{ marginBottom: 16 }}
          onClose={() => setErrorNotice(null)}
        >
          {errorNotice}
        </Alert>
      )}

      <Tabs
        value={tabIndex}
        onChange={(_, value) => setTabIndex(value)}
        indicatorColor="primary"
        textColor="primary"
        style={{ marginBottom: 16 }}
      >
        <Tab label="신청 목록" />
        <Tab label="신청 등록" />
      </Tabs>

      {tabIndex === 0 && (
        <Box>
          {listState.status === 'loading' && (
            <Box display="flex" justifyContent="center" padding={2}>
              <CircularProgress size={24} />
            </Box>
          )}
          {listState.status === 'error' && (
            <Alert
              severity={
                listState.failure.kind === 'permission' ? 'warning' : 'error'
              }
              style={{ marginBottom: 16 }}
              action={
                listState.failure.kind !== 'permission' ? (
                  <Button color="inherit" size="small" onClick={refetch}>
                    다시 시도
                  </Button>
                ) : undefined
              }
            >
              {listState.failure.message}
            </Alert>
          )}
          {listState.status === 'ready' && items.length === 0 && (
            <Alert severity="info" style={{ marginBottom: 16 }}>
              조회된 반입·반출 신청이 없습니다. 신청 등록 탭에서 새 신청을
              접수하세요.
            </Alert>
          )}
          {listState.status === 'ready' && items.length > 0 && (
            <TransferServerList
              requests={items}
              selectedId={selectedId}
              onSelect={item => setSelectedId(item.id)}
            />
          )}

          {selectedRequest && (
            <Box marginTop={3}>
              {detailState.status === 'loading' && (
                <Box display="flex" justifyContent="center" padding={2}>
                  <CircularProgress size={24} />
                </Box>
              )}
              {detailState.status === 'error' && (
                <Alert
                  severity={
                    detailState.failure.kind === 'permission'
                      ? 'warning'
                      : 'error'
                  }
                  action={
                    detailState.failure.kind !== 'permission' ? (
                      <Button color="inherit" size="small" onClick={refetch}>
                        다시 시도
                      </Button>
                    ) : undefined
                  }
                >
                  {detailState.failure.message}
                </Alert>
              )}
              {detailState.status === 'ready' && (
                <TransferServerDetail
                  detail={detailState.data}
                  actorId={actorId}
                  canReview={canReview}
                  uploading={uploading || downloadingId !== null}
                  onDecide={decision => {
                    setPendingDecision({ decision });
                    setDecisionReason('');
                  }}
                  onCancel={handleCancel}
                  onDownload={handleDownload}
                  onUploadFile={handleUploadFile}
                />
              )}
            </Box>
          )}
        </Box>
      )}

      {tabIndex === 1 && <TransferServerForm onSubmitted={handleSubmitted} />}

      <Dialog
        open={Boolean(pendingDecision)}
        onClose={() => setPendingDecision(null)}
      >
        <DialogTitle>
          반입·반출 신청{' '}
          {pendingDecision
            ? TRANSFER_DECISION_LABELS[pendingDecision.decision]
            : ''}
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
          {selectedRequest && (
            <Typography
              color="textSecondary"
              variant="body2"
              style={{ marginTop: 8 }}
            >
              현재 상태:{' '}
              {TRANSFER_STATUS_LABELS[selectedRequest.status] ??
                selectedRequest.status}
            </Typography>
          )}
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

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
        message={notice}
      />
    </Box>
  );
};
