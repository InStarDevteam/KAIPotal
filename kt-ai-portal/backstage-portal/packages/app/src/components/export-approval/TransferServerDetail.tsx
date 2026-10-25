import { formatPortalDateTime } from '../common/portalDate';
import { ChangeEvent, useRef, useState } from 'react';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import Grid from '@material-ui/core/Grid';
import Divider from '@material-ui/core/Divider';
import Alert from '@material-ui/lab/Alert';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import GetAppIcon from '@material-ui/icons/GetApp';
import PublishIcon from '@material-ui/icons/Publish';
import {
  canCancelTransfer,
  canDecideTransferStatus,
  formatFileSize,
  isTransferFileDownloadable,
  shortSha256,
  validateTransferFile,
  TransferDecision,
  TransferFileRow,
  TransferRequestDetail,
  TRANSFER_DECISION_LABELS,
  TRANSFER_GRADE_LABELS,
  TRANSFER_KIND_LABELS,
  TRANSFER_SCOPE_LABELS,
  TRANSFER_STATUS_LABELS,
  TRANSFER_SUBJECT_LABELS,
  TRANSFER_USAGE_PERMISSIONS,
} from './transferServerData';

const formatDateTime = (value: string | null | undefined): string =>
  value ? formatPortalDateTime(value) : '—';

export const TransferServerDetail = ({
  detail,
  actorId,
  canReview,
  uploading,
  onDecide,
  onCancel,
  onDownload,
  onUploadFile,
}: {
  detail: TransferRequestDetail;
  actorId: string;
  canReview: boolean;
  uploading: boolean;
  onDecide: (decision: TransferDecision) => void;
  onCancel: () => void;
  onDownload: (file: TransferFileRow) => void;
  onUploadFile: (file: File) => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const decideable = canReview && canDecideTransferStatus(detail.status);
  const cancellable = canCancelTransfer(detail, actorId);
  const isRequester = detail.requested_by === actorId;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const error = validateTransferFile(file);
    if (error) {
      setFileError(error);
      return;
    }
    setFileError(null);
    onUploadFile(file);
  };

  const infoItems = [
    { label: '구분', value: TRANSFER_KIND_LABELS[detail.kind] ?? detail.kind },
    {
      label: '대상 유형',
      value:
        TRANSFER_SUBJECT_LABELS[detail.subject_type] ?? detail.subject_type,
    },
    {
      label: '상태',
      value: TRANSFER_STATUS_LABELS[detail.status] ?? detail.status,
    },
    {
      label: '보안등급',
      value:
        TRANSFER_GRADE_LABELS[detail.security_grade] ?? detail.security_grade,
    },
    {
      label: '공개 동의',
      value: detail.public_consent ? '동의' : '미동의',
    },
    {
      label: '공개 범위',
      value: TRANSFER_SCOPE_LABELS[detail.public_scope] ?? detail.public_scope,
    },
    {
      label: '사용권한',
      value:
        (detail.usage_permission &&
          TRANSFER_USAGE_PERMISSIONS[detail.usage_permission]) ||
        '—',
    },
    { label: '신청일', value: formatDateTime(detail.requested_at) },
    { label: '신청자', value: detail.requested_by },
    {
      label: '결정자 / 결정일',
      value:
        detail.decided_at && detail.decided_by
          ? `${detail.decided_by} / ${formatDateTime(detail.decided_at)}`
          : '—',
    },
  ];

  return (
    <Paper style={{ padding: 24 }}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        style={{ marginBottom: 8 }}
      >
        <Typography variant="h5">{detail.title}</Typography>
        <Chip
          size="small"
          label={TRANSFER_STATUS_LABELS[detail.status] ?? detail.status}
        />
      </Box>

      {detail.staleApproval && detail.staleApprovalMessage && (
        <Alert severity="warning" style={{ marginBottom: 16 }}>
          {detail.staleApprovalMessage}
        </Alert>
      )}
      {detail.status === 'supplement_requested' && detail.decision_reason && (
        <Alert severity="warning" style={{ marginBottom: 16 }}>
          보완 요청 내용: {detail.decision_reason}
        </Alert>
      )}

      <Grid container spacing={2} style={{ marginBottom: 8 }}>
        {infoItems.map(item => (
          <Grid item xs={12} sm={6} md={4} key={item.label}>
            <Typography color="textSecondary" variant="body2">
              {item.label}
            </Typography>
            <Typography variant="body1">{item.value}</Typography>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" gutterBottom>
        신청 목적
      </Typography>
      <Typography paragraph>{detail.purpose}</Typography>

      {detail.decision_reason && detail.status !== 'supplement_requested' && (
        <>
          <Typography variant="h6" gutterBottom>
            결정 사유
          </Typography>
          <Typography paragraph>{detail.decision_reason}</Typography>
        </>
      )}

      <Divider style={{ margin: '16px 0' }} />

      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        style={{ marginBottom: 8 }}
      >
        <Typography variant="h6">첨부 파일 이력</Typography>
        {isRequester && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<PublishIcon />}
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? '업로드 중' : '새 버전 파일 등록'}
            </Button>
          </>
        )}
      </Box>
      <Typography color="textSecondary" variant="body2" paragraph>
        PDF·ZIP·TAR·GZ·TXT·CSV·PNG·JPG, 최대 100MB까지 첨부할 수 있습니다. 승인
        후 파일을 교체하면 재승인이 필요합니다.
      </Typography>
      {fileError && (
        <Alert
          severity="error"
          style={{ marginBottom: 8 }}
          onClose={() => setFileError(null)}
        >
          {fileError}
        </Alert>
      )}
      {detail.files.length === 0 ? (
        <Typography color="textSecondary">첨부된 파일이 없습니다.</Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>버전</TableCell>
                <TableCell>파일명</TableCell>
                <TableCell>크기</TableCell>
                <TableCell>SHA-256</TableCell>
                <TableCell>등록일</TableCell>
                <TableCell>다운로드</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...detail.files]
                .sort((a, b) => b.version - a.version)
                .map(file => {
                  const downloadable = isTransferFileDownloadable(file, detail);
                  return (
                    <TableRow key={file.id}>
                      <TableCell>v{file.version}</TableCell>
                      <TableCell>{file.original_name}</TableCell>
                      <TableCell>
                        {formatFileSize(Number(file.size_bytes))}
                      </TableCell>
                      <TableCell title={file.sha256}>
                        {shortSha256(file.sha256)}
                      </TableCell>
                      <TableCell>{formatDateTime(file.created_at)}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<GetAppIcon />}
                          disabled={!downloadable}
                          title={
                            downloadable
                              ? '승인된 버전 다운로드'
                              : '승인된 버전만 다운로드할 수 있습니다.'
                          }
                          onClick={() => onDownload(file)}
                        >
                          받기
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Divider style={{ margin: '16px 0' }} />

      <Box display="flex" alignItems="center" style={{ gap: 8 }}>
        {canReview ? (
          <>
            {(
              [
                'approved',
                'rejected',
                'request_supplement',
              ] as TransferDecision[]
            ).map(decision => (
              <Button
                key={decision}
                variant={decision === 'approved' ? 'contained' : 'outlined'}
                color={decision === 'approved' ? 'primary' : 'secondary'}
                disabled={!decideable || uploading}
                onClick={() => onDecide(decision)}
              >
                {TRANSFER_DECISION_LABELS[decision]}
              </Button>
            ))}
            {!decideable && (
              <Typography variant="body2" color="textSecondary">
                현재 상태(
                {TRANSFER_STATUS_LABELS[detail.status] ?? detail.status}
                )에서는 결정할 수 없습니다.
              </Typography>
            )}
          </>
        ) : (
          <Chip
            variant="outlined"
            label="승인 권한이 필요합니다"
            title="반입·반출 검토(export.review) 권한이 있는 사용자만 결정할 수 있습니다."
          />
        )}
        {cancellable && (
          <Button color="secondary" disabled={uploading} onClick={onCancel}>
            신청 취소
          </Button>
        )}
      </Box>
    </Paper>
  );
};
