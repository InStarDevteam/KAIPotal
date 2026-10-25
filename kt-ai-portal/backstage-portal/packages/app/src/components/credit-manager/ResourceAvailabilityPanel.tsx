import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import Chip from '@material-ui/core/Chip';
import { ProjectCredit, ResourceType } from './types';
import { getResourceRestrictions } from './mockCredits';

const resourceLabels: Record<ResourceType, string> = {
  cpu: 'CPU',
  gpu: 'GPU',
  memory: 'Memory',
  storage: 'Storage',
  network: 'Network',
  notebook: 'Notebook',
  training_job: 'Training Job',
  inference_api: 'Inference API',
};

export const ResourceAvailabilityPanel = ({
  credit,
}: {
  credit: ProjectCredit;
}) => {
  const restrictions = getResourceRestrictions(credit.status);
  const additionalCreditsNeeded = Math.max(0, credit.usedCredits - credit.totalCredits + 10000);

  return (
    <Paper style={{ padding: 16 }}>
      <Typography variant="h6" gutterBottom>
        자원 사용 가능 상태
      </Typography>
      <Typography component="div">
        프로젝트: <strong>{credit.projectName}</strong> · 상태:{' '}
        <Chip size="small" label={credit.status.toUpperCase()} />
      </Typography>

      <Grid container spacing={2}>
        {restrictions.map(r => (
          <Grid item xs={12} sm={6} md={3} key={r.resourceType}>
            <Paper
              variant="outlined"
              style={{
                padding: 12,
                opacity: r.allowed ? 1 : 0.6,
                borderColor: r.allowed ? 'inherit' : '#f44336',
              }}
            >
              <Typography variant="subtitle2">{resourceLabels[r.resourceType]}</Typography>
              <Chip
                size="small"
                label={r.allowed ? '사용 가능' : '사용 제한'}
                color={r.allowed ? 'primary' : 'secondary'}
              />
              {r.reason && (
                <Typography variant="caption" display="block" color="textSecondary">
                  {r.reason}
                </Typography>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {(credit.status === 'low' || credit.status === 'exhausted' || credit.status === 'suspended') && (
        <div style={{ marginTop: 16 }}>
          <Typography color="error">
            필요한 추가 크레딧: 약 {additionalCreditsNeeded.toLocaleString()} credits
          </Typography>
          <Typography color="textSecondary" variant="body2">
            크레딧 충전 신청 후 승인 시 제한이 해제됩니다.
          </Typography>
        </div>
      )}
    </Paper>
  );
};
