import Box from '@material-ui/core/Box';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Chip from '@material-ui/core/Chip';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import { DemoProject } from './types';

interface DemoProjectPanelProps {
  projects: DemoProject[];
}

const statusColor = (status: DemoProject['status']) => {
  if (status === '실증중') return 'primary';
  if (status === '실증완료') return 'default';
  return 'secondary';
};

export const DemoProjectPanel = ({ projects }: DemoProjectPanelProps) => {
  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        참여 실증 프로젝트
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        소요부대와 함께 수행 중인 실증 과제 현황입니다.
      </Typography>
      <Grid container spacing={2}>
        {projects.map(project => (
          <Grid item xs={12} md={6} key={project.id}>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" alignItems="center" style={{ gap: 8 }} marginBottom={1}>
                  <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                    {project.name}
                  </Typography>
                  <Chip size="small" color={statusColor(project.status)} label={project.status} />
                </Box>
                <Typography variant="body2" color="textSecondary" paragraph>
                  {project.description}
                </Typography>
                <Box display="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <Chip size="small" variant="outlined" label={`소요부대: ${project.requestingUnit}`} />
                  <Chip size="small" variant="outlined" label={`역할: ${project.myRole}`} />
                  <Chip size="small" variant="outlined" label={`기간: ${project.period}`} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};
