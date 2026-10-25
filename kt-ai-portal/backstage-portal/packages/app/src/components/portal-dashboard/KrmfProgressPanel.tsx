import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import LinearProgress from '@material-ui/core/LinearProgress';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import { Link } from 'react-router-dom';
import VerifiedUserIcon from '@material-ui/icons/VerifiedUser';
import { MetricCard, SectionCard, StatusChip } from '../common';
import type { StatusTone } from '../common';
import { KrmfProgress, Severity } from './types';

interface KrmfProgressPanelProps {
  progress: KrmfProgress;
}

const severityTone = (severity: Severity): StatusTone => {
  switch (severity) {
    case 'critical':
      return 'error';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    default:
      return 'neutral';
  }
};

export const KrmfProgressPanel = ({ progress }: KrmfProgressPanelProps) => {
  return (
    <SectionCard
      title={
        <Box component="span" display="flex" justifyContent="space-between" alignItems="center">
          K-RMF 증적 진행
          <Button
            variant="outlined"
            color="primary"
            size="small"
            component={Link}
            to="/krmf-evidence"
            startIcon={<VerifiedUserIcon />}
          >
            증적 관리
          </Button>
        </Box>
      }
    >
      <Box marginBottom={2}>
        <Box display="flex" justifyContent="space-between" marginBottom={0.5}>
          <Typography variant="body2" color="textSecondary">
            전체 진행률
          </Typography>
          <Typography variant="body2" style={{ fontWeight: 600 }}>
            {progress.progressRate}%
          </Typography>
        </Box>
        <LinearProgress variant="determinate" value={progress.progressRate} />
      </Box>
      <Box marginBottom={2}>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <MetricCard label="통제항목" value={progress.totalControls} size="secondary" />
          </Grid>
          <Grid item xs={6}>
            <MetricCard label="제출" value={progress.submitted} size="secondary" />
          </Grid>
          <Grid item xs={6}>
            <MetricCard label="승인" value={progress.approved} size="secondary" />
          </Grid>
          <Grid item xs={6}>
            <MetricCard label="취약점" value={progress.weakPoints} size="secondary" tone="error" />
          </Grid>
        </Grid>
      </Box>
      {progress.highRiskIssues.length > 0 && (
        <Box>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            고위험 이슈
          </Typography>
          {progress.highRiskIssues.map(issue => (
            <Box key={issue.id} display="flex" alignItems="center" marginBottom={0.5}>
              <Box marginRight={1} flexShrink={0}>
                <StatusChip tone={severityTone(issue.severity)} label={issue.severity.toUpperCase()} />
              </Box>
              <Typography variant="body2">{issue.title}</Typography>
            </Box>
          ))}
        </Box>
      )}
    </SectionCard>
  );
};
