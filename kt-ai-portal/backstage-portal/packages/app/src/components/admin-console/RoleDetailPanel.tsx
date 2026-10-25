import Box from '@material-ui/core/Box';
import Chip from '@material-ui/core/Chip';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import { AdminRole } from './types';

interface RoleDetailPanelProps {
  role: AdminRole;
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

export const RoleDetailPanel = ({ role }: RoleDetailPanelProps) => {
  return (
    <Paper variant="outlined" style={{ padding: 16, height: '100%' }}>
      <Typography variant="h6" style={{ fontWeight: 600, marginBottom: 12 }}>
        역할 상세
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Item label="역할 ID" value={role.id} />
          <Item label="역할명" value={role.name} />
          <Item label="설명" value={role.description} />
          <Item label="적용 대상" value={role.target} />
          <Item label="사용 여부" value={role.enabled ? '사용' : '미사용'} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Item label="사용자 수" value={`${role.userCount}명`} />
          <Item label="그룹 수" value={`${role.groupCount ?? 0}개`} />
          <Item label="생성일" value={role.createdAt} />
          <Item label="수정일" value={role.updatedAt} />
        </Grid>
      </Grid>
      <Divider style={{ margin: '16px 0' }} />
      <Box marginBottom={1}>
        <Typography variant="caption" color="textSecondary">
          접근 가능 메뉴
        </Typography>
        <Box display="flex" flexWrap="wrap" marginTop={0.5}>
          {role.accessibleMenus.map(m => (
            <Box key={m} marginRight={0.5} marginBottom={0.5}>
              <Chip label={m} size="small" />
            </Box>
          ))}
        </Box>
      </Box>
      <Box marginBottom={1}>
        <Typography variant="caption" color="textSecondary">
          접근 가능 서비스
        </Typography>
        <Box display="flex" flexWrap="wrap" marginTop={0.5}>
          {(role.accessibleServices || []).map(s => (
            <Box key={s} marginRight={0.5} marginBottom={0.5}>
              <Chip label={s} size="small" color="primary" />
            </Box>
          ))}
        </Box>
      </Box>
      <Box marginBottom={1}>
        <Item label="데이터 등급" value={role.dataAccessLevel} />
        <Item label="프로젝트 권한" value={role.projectPermission} />
      </Box>
      <Box>
        <Typography variant="caption" color="textSecondary">
          승인 권한
        </Typography>
        <Box display="flex" flexWrap="wrap" marginTop={0.5}>
          {role.approvalAuthority.length === 0 && <Typography variant="body2">-</Typography>}
          {role.approvalAuthority.map(a => (
            <Box key={a} marginRight={0.5} marginBottom={0.5}>
              <Chip label={a} size="small" color="secondary" />
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
};
