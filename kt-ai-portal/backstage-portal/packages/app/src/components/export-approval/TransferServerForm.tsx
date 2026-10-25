import { ChangeEvent, FormEvent, useState } from 'react';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Grid from '@material-ui/core/Grid';
import Divider from '@material-ui/core/Divider';
import MenuItem from '@material-ui/core/MenuItem';
import TextField from '@material-ui/core/TextField';
import Alert from '@material-ui/lab/Alert';
import {
  buildTransferSubmitForm,
  newIdempotencyKey,
  validateTransferFile,
  TransferKind,
  TransferPublicScope,
  TransferSecurityGrade,
  TransferSubjectType,
  TRANSFER_GRADE_LABELS,
  TRANSFER_KIND_LABELS,
  TRANSFER_SCOPE_LABELS,
  TRANSFER_SUBJECT_LABELS,
  TRANSFER_USAGE_PERMISSIONS,
} from './transferServerData';
import { useTransferFileHttp } from './transferFileHttp';

const kinds = Object.entries(TRANSFER_KIND_LABELS) as Array<
  [TransferKind, string]
>;
const subjectTypes = Object.entries(TRANSFER_SUBJECT_LABELS) as Array<
  [TransferSubjectType, string]
>;
const grades = Object.entries(TRANSFER_GRADE_LABELS) as Array<
  [TransferSecurityGrade, string]
>;
const scopes = Object.entries(TRANSFER_SCOPE_LABELS) as Array<
  [TransferPublicScope, string]
>;

export const TransferServerForm = ({
  onSubmitted,
}: {
  onSubmitted: (id: string) => void;
}) => {
  const { uploadForm } = useTransferFileHttp();
  const [kind, setKind] = useState<TransferKind>('export');
  const [subjectType, setSubjectType] = useState<TransferSubjectType>('artifact');
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [securityGrade, setSecurityGrade] = useState<TransferSecurityGrade>('internal');
  const [publicConsent, setPublicConsent] = useState(false);
  const [publicScope, setPublicScope] = useState<TransferPublicScope>('none');
  const [usagePermission, setUsagePermission] = useState('approved_users');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => newIdempotencyKey());

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] ?? null;
    if (next) {
      const validationError = validateTransferFile(next);
      if (validationError) {
        setFile(null);
        setError(validationError);
        setIdempotencyKey(newIdempotencyKey());
        return;
      }
      setError(null);
    }
    setFile(next);
    setIdempotencyKey(newIdempotencyKey());
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!file) {
      setError('첨부 파일이 필요합니다.');
      return;
    }
    if (publicScope !== 'none' && !publicConsent) {
      setError('공개 범위를 지정하려면 공개 동의가 필요합니다.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const form = buildTransferSubmitForm(
      {
        kind,
        subjectType,
        title,
        purpose,
        securityGrade,
        publicConsent,
        publicScope,
        usagePermission,
      },
      file,
      idempotencyKey,
    );
    uploadForm<{ id: string }>('/v1/transfer-requests', form)
      .then(response => {
        setKind('export');
        setSubjectType('artifact');
        setTitle('');
        setPurpose('');
        setSecurityGrade('internal');
        setPublicConsent(false);
        setPublicScope('none');
        setUsagePermission('approved_users');
        setFile(null);
        setIdempotencyKey(newIdempotencyKey());
        onSubmitted(response.data.id);
      })
      .catch((submitError: unknown) => {
        setError(
          submitError instanceof Error
            ? submitError.message
            : '신청 접수 중 오류가 발생했습니다.',
        );
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <Paper style={{ padding: 24 }}>
      <Typography variant="h5" gutterBottom>
        반입·반출 신청 등록
      </Typography>
      <Typography color="textSecondary" paragraph>
        신청 내용은 보안 검토와 승인 절차를 거쳐 처리되며, 진행 상태는 신청 목록에서
        확인할 수 있습니다.
      </Typography>

      {error && (
        <Alert severity="error" style={{ marginBottom: 16 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              required
              label="반출/반입 구분"
              value={kind}
              onChange={event => setKind(event.target.value as TransferKind)}
            >
              {kinds.map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              required
              label="대상 유형"
              value={subjectType}
              onChange={event =>
                setSubjectType(event.target.value as TransferSubjectType)
              }
            >
              {subjectTypes.map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="제목"
              value={title}
              onChange={event => setTitle(event.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              multiline
              rows={3}
              label="신청 목적"
              value={purpose}
              onChange={event => setPurpose(event.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              required
              label="보안등급"
              value={securityGrade}
              onChange={event =>
                setSecurityGrade(event.target.value as TransferSecurityGrade)
              }
            >
              {grades.map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              required
              label="공개 범위"
              value={publicScope}
              onChange={event =>
                setPublicScope(event.target.value as TransferPublicScope)
              }
              helperText="공개 범위를 지정하면 공개 동의가 필요합니다."
            >
              {scopes.map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={publicConsent}
                  onChange={event => setPublicConsent(event.target.checked)}
                />
              }
              label="공개 동의"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              required
              label="사용권한"
              value={usagePermission}
              onChange={event => setUsagePermission(event.target.value)}
            >
              {Object.entries(TRANSFER_USAGE_PERMISSIONS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <Button variant="outlined" component="label">
              첨부 파일 선택
              <input
                type="file"
                hidden
                onChange={handleFileChange}
              />
            </Button>
            <Typography component="span" style={{ marginLeft: 12 }}>
              {file ? file.name : '파일을 선택하세요.'}
            </Typography>
            <Typography color="textSecondary" variant="body2">
              PDF·ZIP·TAR·GZ·TXT·CSV·PNG·JPG 형식, 최대 100MB까지 첨부할 수
              있습니다. 첨부 파일은 승인 절차의 필수 증빙자료로 사용됩니다.
            </Typography>
          </Grid>
        </Grid>

        <Divider style={{ margin: '24px 0' }} />

        <Button
          variant="contained"
          color="primary"
          type="submit"
          size="large"
          disabled={submitting}
        >
          {submitting ? '접수 중' : '신청 등록'}
        </Button>
      </form>
    </Paper>
  );
};
