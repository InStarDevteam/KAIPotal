import Box from '@material-ui/core/Box';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';

interface MyPageSummaryCardsProps {
  projectCount: number;
  workspaceCount: number;
  activeSessionCount: number;
  remainingCredit: number;
  monthlyResourceUsage: number;
  unreadNotificationCount: number;
  activeApiKeyCount: number;
  recentSecurityEventCount: number;
}

export const MyPageSummaryCards = (props: MyPageSummaryCardsProps) => {
  const items = [
    { label: '내 프로젝트', value: props.projectCount },
    { label: '내 워크스페이스', value: props.workspaceCount },
    { label: '활성 세션', value: props.activeSessionCount },
    { label: '남은 크레딧', value: props.remainingCredit.toLocaleString() },
    { label: '이번 달 자원 사용량', value: props.monthlyResourceUsage.toLocaleString() },
    { label: '읽지 않은 알림', value: props.unreadNotificationCount },
    { label: '활성 API Key', value: props.activeApiKeyCount },
    { label: '최근 보안 이벤트', value: props.recentSecurityEventCount },
  ];

  return (
    <Grid container spacing={2}>
      {items.map(item => (
        <Grid item xs={6} sm={4} md={3} key={item.label}>
          <Card variant="outlined">
            <CardContent style={{ padding: 12 }}>
              <Typography variant="caption" color="textSecondary">
                {item.label}
              </Typography>
              <Box marginTop={0.5}>
                <Typography variant="h5" style={{ fontWeight: 600 }}>
                  {item.value}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};
