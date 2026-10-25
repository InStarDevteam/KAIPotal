import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { AdminSummary } from './types';

interface AdminSummaryCardsProps {
  summary: AdminSummary;
}

const summaryItems: {
  key: keyof AdminSummary;
  label: string;
}[] = [
  { key: 'pendingRegistrations', label: '등록 신청 대기' },
  { key: 'pendingApprovals', label: '승인 대기 사용자' },
  { key: 'externalUsers', label: '외부 사용자' },
  { key: 'activeUsers', label: '활성 사용자' },
  { key: 'lockedAccounts', label: '잠금 계정' },
  { key: 'permissionGroups', label: '권한 그룹' },
  { key: 'loginPolicies', label: '로그인 정책' },
  { key: 'recentSecurityEvents', label: '최근 보안 이벤트' },
];

export const AdminSummaryCards = ({ summary }: AdminSummaryCardsProps) => {
  return (
    <Grid container spacing={2}>
      {summaryItems.map(item => (
        <Grid item xs={6} md={3} key={item.key}>
          <Card variant="outlined">
            <CardContent style={{ textAlign: 'center', padding: 16 }}>
              <Typography variant="h4" color="primary" style={{ fontWeight: 700 }}>
                {summary[item.key].toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary" style={{ marginTop: 4 }}>
                {item.label}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};
