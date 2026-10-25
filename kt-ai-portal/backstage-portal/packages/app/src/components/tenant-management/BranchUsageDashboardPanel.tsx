import Box from '@material-ui/core/Box';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Chip from '@material-ui/core/Chip';
import Grid from '@material-ui/core/Grid';
import LinearProgress from '@material-ui/core/LinearProgress';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { UsageSummary } from './types';

interface BranchUsageDashboardPanelProps {
  summary: UsageSummary;
}

const branchLabels = {
  '국방부 공통': '국방부 공통',
  육군: '육군',
  해군: '해군',
  공군: '공군',
};

export const BranchUsageDashboardPanel = ({ summary }: BranchUsageDashboardPanelProps) => {
  const renderMetric = (label: string, value: number) => (
    <Card variant="outlined" style={{ marginBottom: 12 }}>
      <CardContent style={{ padding: 12 }}>
        <Typography variant="body2" color="textSecondary">
          {label}
        </Typography>
        <Box display="flex" alignItems="center" style={{ gap: 8, marginTop: 4 }}>
          <LinearProgress variant="determinate" value={value} style={{ flex: 1 }} />
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            {value}%
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        사용량 대시보드
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          {renderMetric('전체 자원 사용률', summary.overallUsageRate)}
          {renderMetric('육군 자원 사용률', summary.armyUsageRate)}
          {renderMetric('해군 자원 사용률', summary.navyUsageRate)}
          {renderMetric('공군 자원 사용률', summary.airForceUsageRate)}
        </Grid>
        <Grid item xs={12} md={6}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>군 구분</TableCell>
                  <TableCell>GPU</TableCell>
                  <TableCell>CPU</TableCell>
                  <TableCell>Storage</TableCell>
                  <TableCell>크레딧</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(Object.keys(branchLabels) as Array<keyof typeof branchLabels>).map(branch => (
                  <TableRow key={branch}>
                    <TableCell>{branch}</TableCell>
                    <TableCell>{summary.gpuUsageByBranch[branch]}%</TableCell>
                    <TableCell>{summary.cpuUsageByBranch[branch]}%</TableCell>
                    <TableCell>{summary.storageUsageByBranch[branch]}%</TableCell>
                    <TableCell>{summary.creditUsageByBranch[branch]}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      <Box marginTop={3}>
        <Typography variant="subtitle2" gutterBottom>
          과다 사용 테넌트
        </Typography>
        {summary.overusedTenants.map(t => (
          <Chip key={t} size="small" label={t} color="secondary" style={{ margin: 2 }} />
        ))}
      </Box>

      <Box marginTop={2}>
        <Typography variant="subtitle2" gutterBottom>
          장애/점검 자원
        </Typography>
        {summary.maintenanceResources.map(r => (
          <Chip key={r} size="small" label={r} style={{ margin: 2 }} />
        ))}
      </Box>

      <Box marginTop={3}>
        <Typography variant="subtitle2" gutterBottom>
          최근 7일 사용량 추이
        </Typography>
        <Box display="flex" alignItems="flex-end" style={{ gap: 8, height: 120 }}>
          {summary.last7DaysTrend.map(d => (
            <Box key={d.date} style={{ flex: 1, textAlign: 'center' }}>
              <Box
                style={{
                  height: `${d.value * 1.5}px`,
                  backgroundColor: '#1976d2',
                  borderRadius: 4,
                  marginBottom: 4,
                }}
              />
              <Typography variant="caption">{d.date}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
};
