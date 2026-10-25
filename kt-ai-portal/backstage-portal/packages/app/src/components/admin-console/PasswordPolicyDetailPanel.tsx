import Box from '@material-ui/core/Box';
import Chip from '@material-ui/core/Chip';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Switch from '@material-ui/core/Switch';
import Typography from '@material-ui/core/Typography';
import { PasswordPolicy } from './types';

interface PasswordPolicyDetailPanelProps {
  policy: PasswordPolicy;
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

export const PasswordPolicyDetailPanel = ({ policy }: PasswordPolicyDetailPanelProps) => {
  return (
    <Paper variant="outlined" style={{ padding: 16, height: '100%' }}>
      <Typography variant="h6" style={{ fontWeight: 600, marginBottom: 12 }}>
        비밀번호 정책 상세
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Item label="정책 ID" value={policy.id} />
          <Item label="정책명" value={policy.name} />
          <Item label="적용 대상" value={policy.target} />
          <Item label="최소 길이" value={`${policy.minLength}자`} />
          <Item label="변경 주기" value={`${policy.changeCycleDays}일`} />
          <Item label="만료 후 잠금" value={policy.expiredLockAction} />
          <Item label="유예기간" value={`${policy.gracePeriodDays}일`} />
          <Item label="재사용 제한" value={`${policy.reuseLimit}개`} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Item label="임시 비밀번호 만료" value={`${policy.tempPasswordExpiryMinutes}분`} />
          <Item label="복잡도 설명" value={policy.complexityDescription} />
          <Item label="생성일" value={policy.createdAt} />
          <Item label="수정일" value={policy.updatedAt} />
        </Grid>
      </Grid>
      <Divider style={{ margin: '16px 0' }} />
      <Box display="flex" flexWrap="wrap">
        <Box marginRight={2} marginBottom={1}>
          <Typography variant="caption" color="textSecondary">
            대문자 필요
          </Typography>
          <br />
          <Switch checked={policy.requireUppercase} size="small" disabled />
        </Box>
        <Box marginRight={2} marginBottom={1}>
          <Typography variant="caption" color="textSecondary">
            소문자 필요
          </Typography>
          <br />
          <Switch checked={policy.requireLowercase} size="small" disabled />
        </Box>
        <Box marginRight={2} marginBottom={1}>
          <Typography variant="caption" color="textSecondary">
            숫자 필요
          </Typography>
          <br />
          <Switch checked={policy.requireNumber} size="small" disabled />
        </Box>
        <Box marginRight={2} marginBottom={1}>
          <Typography variant="caption" color="textSecondary">
            특수문자 필요
          </Typography>
          <br />
          <Switch checked={policy.requireSpecialChar} size="small" disabled />
        </Box>
        <Box marginRight={2} marginBottom={1}>
          <Typography variant="caption" color="textSecondary">
            사용자 ID 금지
          </Typography>
          <br />
          <Switch checked={policy.forbidUserId} size="small" disabled />
        </Box>
        <Box marginBottom={1}>
          <Typography variant="caption" color="textSecondary">
            초기 로그인 시 변경
          </Typography>
          <br />
          <Switch checked={policy.requireChangeOnFirstLogin} size="small" disabled />
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
    </Paper>
  );
};
