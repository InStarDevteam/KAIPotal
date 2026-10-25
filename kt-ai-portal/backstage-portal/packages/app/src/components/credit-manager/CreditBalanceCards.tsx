import Grid from '@material-ui/core/Grid';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import { ProjectCredit } from './types';

export const CreditBalanceCards = ({ credits }: { credits: ProjectCredit[] }) => {
  const totalGranted = credits.reduce((sum, c) => sum + c.totalCredits, 0);
  const totalUsed = credits.reduce((sum, c) => sum + c.usedCredits, 0);
  const totalRemaining = credits.reduce((sum, c) => sum + c.remainingCredits, 0);
  const avgUsageRate = credits.length
    ? Number((credits.reduce((sum, c) => sum + c.usageRate, 0) / credits.length).toFixed(1))
    : 0;
  const lowProjects = credits.filter(c => c.status === 'low' || c.status === 'exhausted' || c.status === 'suspended').length;
  const estimatedMonthlyUsage = Math.round(totalUsed / 26 * 30);

  const items = [
    { label: '총 부여 크레딧', value: totalGranted.toLocaleString() },
    { label: '총 사용 크레딧', value: totalUsed.toLocaleString() },
    { label: '총 잔여 크레딧', value: totalRemaining.toLocaleString() },
    { label: '평균 사용률', value: `${avgUsageRate}%` },
    { label: '크레딧 부족 프로젝트', value: `${lowProjects}개` },
    { label: '이번 달 예상 사용량', value: estimatedMonthlyUsage.toLocaleString() },
  ];

  return (
    <Grid container spacing={2} style={{ marginBottom: 24 }}>
      {items.map(item => (
        <Grid item xs={12} sm={6} md={4} key={item.label}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="textSecondary" variant="body2">
                {item.label}
              </Typography>
              <Typography variant="h5">{item.value}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};
