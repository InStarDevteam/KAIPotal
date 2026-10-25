import Box from '@material-ui/core/Box';
import Chip from '@material-ui/core/Chip';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Switch from '@material-ui/core/Switch';
import Typography from '@material-ui/core/Typography';
import { LoginPolicy } from './types';

interface LoginPolicyDetailPanelProps {
  policy: LoginPolicy;
}

const Item = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box marginBottom={1.5}>
    <Typography variant="caption" color="textSecondary">
      {label}
    </Typography>
    <Typography variant="body2" style={{ fontWeight: 500 }}>
      {value || '-'}
    </Typography>
  </Box>
);

export const LoginPolicyDetailPanel = ({ policy }: LoginPolicyDetailPanelProps) => {
  return (
    <Paper variant="outlined" style={{ padding: 16, height: '100%' }}>
      <Typography variant="h6" style={{ fontWeight: 600, marginBottom: 12 }}>
        로그인 정책 상세
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Item label="정책 ID" value={policy.id} />
          <Item label="정책명" value={policy.name} />
          <Item label="적용 대상" value={policy.target} />
          <Item label="로그인 허용 시작일" value={policy.allowedStartDate} />
          <Item label="로그인 허용 종료일" value={policy.allowedEndDate} />
          <Item label="로그인 허용 시간대" value={policy.allowedPeriod} />
          <Item label="실패 허용 횟수" value={`${policy.maxFailedAttempts}회`} />
          <Item label="일일 실패 허용 횟수" value={`${policy.dailyMaxFailedAttempts}회`} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Item label="계정 차단 시간" value={`${policy.blockDurationMinutes}분`} />
          <Item label="차단 방식" value={policy.blockMethod} />
          <Item label="제한 해제 방식" value={policy.unlockMethod} />
          <Item label="동시 세션 허용 수" value={`${policy.maxConcurrentSessions}개`} />
          <Item label="기존 세션 종료 방식" value={policy.existingSessionAction} />
          <Item label="생성일" value={policy.createdAt} />
          <Item label="수정일" value={policy.updatedAt} />
        </Grid>
      </Grid>
      <Divider style={{ margin: '16px 0' }} />
      <Box display="flex" flexWrap="wrap">
        <Box marginRight={2} marginBottom={1}>
          <Typography variant="caption" color="textSecondary">
            관리자 알림
          </Typography>
          <br />
          <Switch checked={policy.notifyAdmin} size="small" disabled />
        </Box>
        <Box marginRight={2} marginBottom={1}>
          <Typography variant="caption" color="textSecondary">
            사용자 보안 확인
          </Typography>
          <br />
          <Switch checked={policy.requireUserVerification} size="small" disabled />
        </Box>
        <Box marginRight={2} marginBottom={1}>
          <Typography variant="caption" color="textSecondary">
            중복 로그인 허용
          </Typography>
          <br />
          <Switch checked={policy.allowDuplicateLogin} size="small" disabled />
        </Box>
        <Box marginRight={2} marginBottom={1}>
          <Typography variant="caption" color="textSecondary">
            관리자 예외
          </Typography>
          <br />
          <Switch checked={policy.adminException} size="small" disabled />
        </Box>
        <Box marginRight={2} marginBottom={1}>
          <Typography variant="caption" color="textSecondary">
            외부 사용자 예외
          </Typography>
          <br />
          <Switch checked={policy.externalUserException} size="small" disabled />
        </Box>
        <Box marginRight={2} marginBottom={1}>
          <Typography variant="caption" color="textSecondary">
            감사로그 기록
          </Typography>
          <br />
          <Switch checked={policy.auditLogged} size="small" disabled />
        </Box>
        <Box marginBottom={1}>
          <Typography variant="caption" color="textSecondary">
            MFA 필요
          </Typography>
          <br />
          <Switch checked={policy.mfaRequired} size="small" disabled />
        </Box>
      </Box>
      <Box marginTop={2}>
        <Typography variant="caption" color="textSecondary">
          적용 역할
        </Typography>
        <Box display="flex" flexWrap="wrap" marginTop={0.5}>
          {policy.appliedRoles.map(r => (
            <Box key={r} marginRight={0.5} marginBottom={0.5}>
              <Chip label={r} size="small" />
            </Box>
          ))}
        </Box>
      </Box>
      <Box marginTop={1}>
        <Typography variant="caption" color="textSecondary">
          적용 그룹
        </Typography>
        <Box display="flex" flexWrap="wrap" marginTop={0.5}>
          {policy.appliedGroups.map(g => (
            <Box key={g} marginRight={0.5} marginBottom={0.5}>
              <Chip label={g} size="small" color="primary" />
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
};
