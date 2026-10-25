import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import GetAppIcon from '@material-ui/icons/GetApp';
import { EmptyState, SectionCard, StatusChip } from '../common';
import {
  KrmfEvidence,
  downloadKrmfEvidenceFile,
  getKrmfEvidences,
  reviewKrmfEvidence,
  saveBlob,
  uploadKrmfEvidence,
} from './krmfApi';
import { formatDate, reviewStatusLabel } from './krmfLabels';
import { KrmfQueryBoundary } from './KrmfQueryView';
import { KrmfTabContext } from './KrmfMonitorPage';
import { useKrmfQuery } from './useKrmfQuery';

const reviewTone = (status: string) => {
  if (status === 'approved') return 'success' as const;
  if (status === 'rejected') return 'error' as const;
  return 'warning' as const;
};

const EvidencePanelBody = ({
  context,
  controlId,
  evidences,
  reload,
}: {
  context: KrmfTabContext;
  controlId: string;
  evidences: KrmfEvidence[];
  reload: () => void;
}) => {
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('');
  const [mode, setMode] = useState<'file' | 'uri'>('file');
  useEffect(() => {
    if (context.fileStorageConfigured === false) setMode('uri');
  }, [context.fileStorageConfigured]);
  const [file, setFile] = useState<File | null>(null);
  const [uri, setUri] = useState('');
  const [idempotencyKey] = useState(() =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [reviewTarget, setReviewTarget] = useState<KrmfEvidence | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>(
    'approved',
  );
  const [reviewComment, setReviewComment] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [downloadError, setDownloadError] = useState('');

  const latestVersion = useMemo(
    () => evidences.reduce((max, item) => Math.max(max, item.version), 0),
    [evidences],
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setFormError('증적 제목을 입력하세요.');
      return;
    }
    if (mode === 'file' && !file) {
      setFormError('업로드할 파일을 선택하세요.');
      return;
    }
    if (mode === 'uri' && !uri.trim()) {
      setFormError('참조 URI를 입력하세요.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    setNotice('');
    try {
      const form = new FormData();
      form.set('title', title.trim());
      if (scope.trim()) form.set('scope_text', scope.trim());
      form.set('idempotency_key', idempotencyKey);
      form.set('control_id', controlId);
      if (mode === 'file' && file) form.set('file', file);
      else form.set('reference_uri', uri.trim());
      await uploadKrmfEvidence(context.rawDeps, context.tenantId, form);
      setTitle('');
      setScope('');
      setFile(null);
      setUri('');
      setNotice(
        latestVersion > 0
          ? `등록되었습니다. 다음 버전은 v${
              latestVersion + 2
            }로 자동 증가합니다.`
          : '등록되었습니다. 버전은 자동으로 증가합니다.',
      );
      reload();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : '증적 등록에 실패했습니다.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (evidence: KrmfEvidence) => {
    setDownloadError('');
    try {
      const result = await downloadKrmfEvidenceFile(
        context.rawDeps,
        context.tenantId,
        evidence.id,
      );
      saveBlob(result.blob, result.filename);
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : '파일 다운로드에 실패했습니다.',
      );
    }
  };

  const handleReview = async () => {
    if (!reviewTarget) return;
    setReviewing(true);
    setReviewError('');
    try {
      await reviewKrmfEvidence(context.request, reviewTarget.id, {
        decision: reviewDecision,
        comment: reviewComment.trim() || undefined,
      });
      setReviewTarget(null);
      setReviewComment('');
      reload();
    } catch (error) {
      setReviewError(
        error instanceof Error ? error.message : '검토 처리에 실패했습니다.',
      );
    } finally {
      setReviewing(false);
    }
  };

  return (
    <Box display="flex" flexDirection="column" gridGap={2}>
      {context.canSubmit ? (
        <Box display="flex" flexDirection="column" gridGap={1}>
          <Box display="flex" gridGap={1} flexWrap="wrap" alignItems="center">
            <TextField
              size="small"
              label="증적 제목"
              value={title}
              onChange={event => setTitle(event.target.value)}
              style={{ minWidth: 220 }}
            />
            <TextField
              size="small"
              label="범위"
              value={scope}
              onChange={event => setScope(event.target.value)}
              style={{ minWidth: 140 }}
            />
            <RadioGroup
              row
              value={mode}
              onChange={event =>
                setMode(event.target.value === 'uri' ? 'uri' : 'file')
              }
            >
              <FormControlLabel value="file" control={<Radio />} label="파일"
                disabled={context.fileStorageConfigured === false} />
              <FormControlLabel
                value="uri"
                control={<Radio />}
                label="참조 URI"
              />
            </RadioGroup>
            {mode === 'file' ? (
              <input type="file" onChange={handleFileChange} />
            ) : (
              <TextField
                size="small"
                label="참조 URI"
                value={uri}
                onChange={event => setUri(event.target.value)}
                style={{ minWidth: 260 }}
              />
            )}
            <Button
              size="small"
              variant="contained"
              color="primary"
              disabled={submitting || (mode === 'file' && context.fileStorageConfigured === false)}
              onClick={() => void handleSubmit()}
            >
              등록
            </Button>
          </Box>
          <Typography variant="caption" color="textSecondary">
            같은 통제에 증적을 다시 등록하면 버전이 자동으로 증가합니다 (현재
            최신 v{latestVersion || '없음'}).
          </Typography>
          {formError ? (
            <Typography variant="body2" color="error">
              {formError}
            </Typography>
          ) : null}
          {notice ? (
            <Typography variant="body2" color="primary">
              {notice}
            </Typography>
          ) : null}
        </Box>
      ) : (
        <Typography variant="body2" color="textSecondary">
          증적 등록 권한(krmf.evidence.submit)이 필요합니다.
        </Typography>
      )}

      {downloadError ? (
        <Typography variant="body2" color="error">
          {downloadError}
        </Typography>
      ) : null}

      {evidences.length ? (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>버전</TableCell>
                <TableCell>제목</TableCell>
                <TableCell>검토상태</TableCell>
                <TableCell>검토자</TableCell>
                <TableCell>등록일</TableCell>
                <TableCell>첨부</TableCell>
                <TableCell>조치</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {evidences
                .slice()
                .sort((a, b) => b.version - a.version)
                .map(evidence => (
                  <TableRow key={evidence.id}>
                    <TableCell>v{evidence.version}</TableCell>
                    <TableCell>{evidence.title}</TableCell>
                    <TableCell>
                      <StatusChip
                        tone={reviewTone(evidence.review_status)}
                        label={reviewStatusLabel(evidence.review_status)}
                      />
                    </TableCell>
                    <TableCell>
                      {evidence.reviewer_name || evidence.reviewed_by || '—'}
                    </TableCell>
                    <TableCell>{formatDate(evidence.created_at)}</TableCell>
                    <TableCell>
                      {evidence.file_id
                        ? '첨부 파일'
                        : evidence.reference_uri || '—'}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gridGap={1}>
                        {evidence.file_id ? (
                          <Button
                            size="small"
                            startIcon={<GetAppIcon />}
                            onClick={() => void handleDownload(evidence)}
                          >
                            다운로드
                          </Button>
                        ) : null}
                        {context.canReview &&
                        evidence.review_status === 'pending' ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              setReviewTarget(evidence);
                              setReviewDecision('approved');
                              setReviewComment('');
                              setReviewError('');
                            }}
                          >
                            검토
                          </Button>
                        ) : null}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyState
          message="등록된 증적이 없습니다"
          description="파일 업로드 또는 참조 URI로 증적을 등록하세요."
        />
      )}

      <Dialog
        open={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>증적 검토</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gridGap={2}>
            <Typography variant="body2">
              {reviewTarget
                ? `v${reviewTarget.version} ${reviewTarget.title}`
                : ''}
            </Typography>
            <RadioGroup
              row
              value={reviewDecision}
              onChange={event =>
                setReviewDecision(
                  event.target.value === 'rejected' ? 'rejected' : 'approved',
                )
              }
            >
              <FormControlLabel
                value="approved"
                control={<Radio />}
                label="승인"
              />
              <FormControlLabel
                value="rejected"
                control={<Radio />}
                label="반려"
              />
            </RadioGroup>
            <TextField
              size="small"
              label="검토 의견"
              multiline
              rows={2}
              value={reviewComment}
              onChange={event => setReviewComment(event.target.value)}
              fullWidth
            />
            {reviewError ? (
              <Typography variant="body2" color="error">
                {reviewError}
              </Typography>
            ) : null}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewTarget(null)}>취소</Button>
          <Button
            color="primary"
            variant="contained"
            disabled={reviewing}
            onClick={() => void handleReview()}
          >
            확정
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export const EvidencePanel = ({
  context,
  controlId,
}: {
  context: KrmfTabContext;
  controlId: string;
}) => {
  const evidencesState = useKrmfQuery<KrmfEvidence[]>(
    () => getKrmfEvidences(context.request, { controlId }),
    [context.tenantId, controlId],
  );
  return (
    <SectionCard title="증적" compact>
      <KrmfQueryBoundary state={evidencesState}>
        {evidences => (
          <EvidencePanelBody
            context={context}
            controlId={controlId}
            evidences={evidences}
            reload={evidencesState.reload}
          />
        )}
      </KrmfQueryBoundary>
    </SectionCard>
  );
};
