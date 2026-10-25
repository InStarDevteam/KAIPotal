import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import { EnvironmentSettingsSummary } from './types';

interface EnvironmentSettingsSummaryCardsProps {
  summary: EnvironmentSettingsSummary;
}

const cardData: {
  label: string;
  key: keyof EnvironmentSettingsSummary;
  color: string;
}[] = [
  { label: '전체 파라미터', key: 'totalParameters', color: '#1976d2' },
  { label: '활성 파라미터', key: 'activeParameters', color: '#2e7d32' },
  { label: '변경 대기', key: 'pendingChanges', color: '#ed6c02' },
  { label: '보안 정책', key: 'securityPolicies', color: '#d32f2f' },
  { label: '자원할당 정책', key: 'resourcePolicies', color: '#7b1fa2' },
  { label: '운영 설정', key: 'operationSettings', color: '#00695c' },
  { label: '최근 변경', key: 'recentChanges', color: '#455a64' },
];

export const EnvironmentSettingsSummaryCards = ({ summary }: EnvironmentSettingsSummaryCardsProps) => {
  return (
    <Grid container spacing={2} style={{ marginBottom: 24 }}>
      {cardData.map(({ label, key, color }) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={key}>
          <Paper variant="outlined" style={{ padding: 16, borderLeft: `4px solid ${color}` }}>
            <Typography variant="body2" color="textSecondary">
              {label}
            </Typography>
            <Typography variant="h5" style={{ fontWeight: 700, color }}>
              {summary[key].toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};
