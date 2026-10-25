import { useState } from 'react';
import Alert from '@material-ui/lab/Alert';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import { PasswordPolicyInfo } from './types';

interface PasswordChangePanelProps {
  policy: PasswordPolicyInfo;
}

export const PasswordChangePanel = ({ policy }: PasswordChangePanelProps) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = () => {
    // 실제 인증 시스템 연결 전에는 저장 성공을 표시하지 않고 명시적으로 안내한다.
    setNotice(
      '실제 비밀번호 변경은 기관 인증 시스템(IdP) 연결 후 제공됩니다. 입력한 내용은 저장되지 않으며 화면에 유지됩니다.',
    );
  };

  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        비밀번호 변경
      </Typography>
      <Box marginBottom={2}>
        <Typography variant="subtitle2">적용 비밀번호 정책</Typography>
        <Typography variant="body2" color="textSecondary">
          최소 길이: {policy.minLength}자
        </Typography>
        <Typography variant="body2" color="textSecondary">
          복잡도: {policy.complexity}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          재사용 제한: 최근 {policy.reuseLimit}회
        </Typography>
        <Typography variant="body2" color="textSecondary">
          변경 주기: {policy.changeCycleDays}일
        </Typography>
        <Typography variant="body2" color="textSecondary">
          만료 예정일: {policy.expiredAt}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          마지막 변경일: {policy.lastChangedAt}
        </Typography>
      </Box>
      <Box display="flex" flexDirection="column" style={{ gap: 16 }} maxWidth={400}>
        <TextField
          fullWidth
          size="small"
          type="password"
          label="현재 비밀번호"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
        />
        <TextField
          fullWidth
          size="small"
          type="password"
          label="새 비밀번호"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
        />
        <TextField
          fullWidth
          size="small"
          type="password"
          label="새 비밀번호 확인"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
        />
      </Box>
      <Box marginTop={2}>
        <Button
          variant="contained"
          color="primary"
          disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}
          onClick={handleSubmit}
        >
          비밀번호 변경
        </Button>
      </Box>
      {notice && (
        <Box marginTop={2}>
          <Alert severity="info">{notice}</Alert>
        </Box>
      )}
    </Paper>
  );
};
