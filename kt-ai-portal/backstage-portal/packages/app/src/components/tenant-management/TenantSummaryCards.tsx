import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import { TenantManagementSummary } from './types';

interface TenantSummaryCardsProps {
  summary: TenantManagementSummary;
}

const cardData: {
  label: string;
  key: keyof TenantManagementSummary;
  color: string;
}[] = [
  { label: '전체 테넌트', key: 'totalTenants', color: '#1976d2' },
  { label: '육군 프로젝트', key: 'armyProjects', color: '#2e7d32' },
  { label: '해군 프로젝트', key: 'navyProjects', color: '#1565c0' },
  { label: '공군 프로젝트', key: 'airForceProjects', color: '#6a1b9a' },
  { label: '전체 GPU 할당량', key: 'totalGpuQuota', color: '#d32f2f' },
  { label: '전체 GPU 사용량', key: 'totalGpuUsed', color: '#ed6c02' },
  { label: '전체 크레딧 잔액', key: 'totalCreditBalance', color: '#00695c' },
  { label: '쿼터 변경 대기', key: 'pendingQuotaChanges', color: '#455a64' },
  { label: '과다 사용 경고', key: 'overuseWarnings', color: '#c62828' },
  { label: '장애/점검 자원', key: 'maintenanceResources', color: '#757575' },
];

export const TenantSummaryCards = ({ summary }: TenantSummaryCardsProps) => {
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
