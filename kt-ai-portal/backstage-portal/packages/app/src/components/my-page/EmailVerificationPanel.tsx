import { useEffect, useState } from 'react';
import Alert from '@material-ui/lab/Alert';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import { useOptionalPortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import {
  myPageEmailKey,
  readMyPageEmail,
  saveMyPageEmail,
} from './myPageProfileStore';
import { EmailVerification } from './types';

interface EmailVerificationPanelProps {
  verification: EmailVerification;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EmailVerificationPanel = ({ verification }: EmailVerificationPanelProps) => {
  const runtime = useOptionalPortalRuntime();
  const writable =
    !!runtime?.isDemo && !!runtime.tenantId && !!runtime.actorId;
  const storageKey = runtime
    ? myPageEmailKey(runtime.tenantId, runtime.actorId)
    : '';
  const [state, setState] = useState(verification);
  const [requestedEmail, setRequestedEmail] = useState(
    verification.requestedEmail || '',
  );
  const [notice, setNotice] = useState<{
    message: string;
    error: boolean;
  } | null>(null);

  useEffect(() => {
    if (!writable) return;
    const loaded = readMyPageEmail(storageKey, verification);
    setState(loaded.verification);
    setRequestedEmail(loaded.verification.requestedEmail || '');
    if (loaded.error) setNotice({ message: loaded.error, error: true });
  }, [writable, storageKey, verification]);

  const handleSend = () => {
    const email = requestedEmail.trim();
    if (!emailPattern.test(email)) {
      setNotice({ message: '이메일 형식을 확인하세요.', error: true });
      return;
    }
    if (!writable) {
      setNotice({
        message:
          '실제 확인 메일 발송은 운영 알림 서비스 연결 후 제공됩니다.',
        error: false,
      });
      return;
    }
    const next: EmailVerification = {
      ...state,
      requestedEmail: email,
      status: '대기중',
      sentAt: new Date().toISOString(),
    };
    try {
      // 실제 발송은 불가하므로 요청 내역만 로컬에 남기고 명시적으로 안내한다.
      saveMyPageEmail(storageKey, next);
      setState(next);
      setNotice({
        message:
          '변경 요청을 이 브라우저에 저장했습니다. 실제 확인 메일 발송은 운영 알림 서비스 연결 후 제공됩니다.',
        error: false,
      });
    } catch (error) {
      setNotice({
        message:
          error instanceof Error ? error.message : '저장하지 못했습니다.',
        error: true,
      });
    }
  };

  const handleConfirm = () => {
    // 실제 메일 확인 절차는 운영 알림 서비스 연결 전까지 제공하지 않는다.
    setNotice({
      message:
        '실제 이메일 인증 확인은 운영 알림 서비스 연결 후 제공됩니다. 데모 환경에서는 메일 확인 절차를 진행할 수 없습니다.',
      error: false,
    });
  };

  const handleCancel = () => {
    setRequestedEmail('');
    if (writable && state.requestedEmail) {
      const next: EmailVerification = {
        ...state,
        requestedEmail: undefined,
        sentAt: undefined,
        status: '확인됨',
      };
      try {
        saveMyPageEmail(storageKey, next);
        setState(next);
        setNotice({ message: '이메일 변경 요청을 취소했습니다.', error: false });
      } catch (error) {
        setNotice({
          message:
            error instanceof Error ? error.message : '저장하지 못했습니다.',
          error: true,
        });
      }
    } else {
      setNotice({ message: '변경 요청 입력을 취소했습니다.', error: false });
    }
  };

  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        이메일 확인
      </Typography>
      <Box marginBottom={2}>
        <Typography variant="body2" color="textSecondary">
          현재 이메일
        </Typography>
        <Typography variant="body1">{state.currentEmail}</Typography>
      </Box>
      <Box marginBottom={2}>
        <Typography variant="body2" color="textSecondary">
          확인 상태
        </Typography>
        <Typography variant="body1">{state.status}</Typography>
      </Box>
      <Box marginBottom={2}>
        <Typography variant="body2" color="textSecondary">
          마지막 확인 일시
        </Typography>
        <Typography variant="body1">{state.lastVerifiedAt}</Typography>
      </Box>
      {state.requestedEmail && (
        <Box marginBottom={2}>
          <Typography variant="body2" color="textSecondary">
            변경 요청 이메일
          </Typography>
          <Typography variant="body1">{state.requestedEmail}</Typography>
          <Typography variant="caption" color="textSecondary">
            발송 상태: {state.sentAt} / 반영 예정: {state.pendingStatus || '인증 대기'}
          </Typography>
        </Box>
      )}
      <Box marginTop={2}>
        <TextField
          fullWidth
          size="small"
          label="변경 요청 이메일"
          value={requestedEmail}
          onChange={e => setRequestedEmail(e.target.value)}
        />
      </Box>
      {notice && (
        <Box marginTop={2}>
          <Alert severity={notice.error ? 'error' : 'info'}>{notice.message}</Alert>
        </Box>
      )}
      <Box marginTop={2} display="flex" style={{ gap: 8 }}>
        <Button variant="contained" color="primary" disabled={!requestedEmail} onClick={handleSend}>
          확인 메일 발송
        </Button>
        <Button variant="outlined" disabled={!state.requestedEmail} onClick={handleConfirm}>
          확인 완료
        </Button>
        <Button variant="outlined" color="secondary" onClick={handleCancel}>
          변경 취소
        </Button>
      </Box>
    </Paper>
  );
};
