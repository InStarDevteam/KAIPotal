import { useEffect, useState } from 'react';
import Alert from '@material-ui/lab/Alert';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Switch from '@material-ui/core/Switch';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import SaveIcon from '@material-ui/icons/Save';
import { useOptionalPortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import {
  myPageProfileKey,
  readMyPageProfile,
  saveMyPageProfile,
} from './myPageProfileStore';
import { UserProfile } from './types';

interface ProfilePanelProps {
  profile: UserProfile;
}

export const ProfilePanel = ({ profile }: ProfilePanelProps) => {
  const runtime = useOptionalPortalRuntime();
  const writable =
    !!runtime?.isDemo && !!runtime.tenantId && !!runtime.actorId;
  const storageKey = runtime
    ? myPageProfileKey(runtime.tenantId, runtime.actorId)
    : '';
  const [form, setForm] = useState(profile);
  const [notice, setNotice] = useState<{
    message: string;
    error: boolean;
  } | null>(null);

  useEffect(() => {
    if (!writable) return;
    const loaded = readMyPageProfile(storageKey, profile);
    setForm(loaded.profile);
    if (loaded.error) setNotice({ message: loaded.error, error: true });
  }, [writable, storageKey, profile]);

  const handleChange = (field: keyof UserProfile, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!writable) {
      setNotice({
        message:
          '운영 환경에서는 프로필 저장이 계정 관리 시스템 연결 후 제공됩니다.',
        error: false,
      });
      return;
    }
    try {
      // Persist before updating UI: a failed local write must never look successful.
      saveMyPageProfile(storageKey, form);
      setNotice({ message: '프로필을 저장했습니다.', error: false });
    } catch (error) {
      setNotice({
        message:
          error instanceof Error ? error.message : '저장하지 못했습니다.',
        error: true,
      });
    }
  };

  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        프로필 조회/수정
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="사용자 ID" value={form.userId} disabled />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="이름" value={form.name} onChange={e => handleChange('name', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="이메일" value={form.email} disabled />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="연락처" value={form.contact} onChange={e => handleChange('contact', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="소속기관" value={form.organization} onChange={e => handleChange('organization', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="부서" value={form.department} onChange={e => handleChange('department', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="직급/직책" value={form.position} onChange={e => handleChange('position', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="사용자 유형" value={form.userType} disabled />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="역할" value={form.roles.join(', ')} disabled />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="그룹" value={form.groups.join(', ')} disabled />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="계정 상태" value={form.accountStatus} disabled />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="마지막 로그인" value={form.lastLoginAt} disabled />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="가입일" value={form.createdAt} disabled />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="접속 가능 기간" value={form.accessPeriod} disabled />
        </Grid>
      </Grid>
      <Box marginTop={2} display="flex" alignItems="center">
        <Typography variant="body2">정보 공개 여부</Typography>
        <Switch checked={form.isProfilePublic} onChange={e => handleChange('isProfilePublic', e.target.checked)} />
      </Box>
      {notice && (
        <Box marginTop={2}>
          <Alert severity={notice.error ? 'error' : 'info'}>{notice.message}</Alert>
        </Box>
      )}
      <Box marginTop={2}>
        <Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={handleSave}>
          프로필 저장
        </Button>
      </Box>
    </Paper>
  );
};
