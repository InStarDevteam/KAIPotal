import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import LinearProgress from '@material-ui/core/LinearProgress';
import { makeStyles } from '@material-ui/core/styles';
import { ControlItem, Evidence, RiskIssue } from './types';
import { summarizeKrmfProgress } from './mockKrmfEvidence';
import {
  colors,
  layoutTokens,
  shadows,
  spacingTokens,
  typographyTokens,
  MetricCard,
  SectionCard,
  MetricTone,
} from '../common';

const useStyles = makeStyles({
  primaryCard: {
    backgroundColor: colors.primaryNavy,
    borderRadius: layoutTokens.cardRadius,
    boxShadow: shadows.card,
    padding: spacingTokens.cardGap,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    height: '100%',
    boxSizing: 'border-box',
  },
  primaryLabel: {
    ...typographyTokens.caption,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  primaryValue: {
    fontSize: 26,
    fontWeight: 700,
    lineHeight: 1.2,
    color: colors.surface,
  },
  primaryProgress: {
    height: 6,
    borderRadius: 3,
    marginTop: spacingTokens.base,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  primaryProgressBar: {
    borderRadius: 3,
    backgroundColor: colors.surface,
  },
});

export const ProgressSummaryCards = ({
  controls,
  evidences,
  issues,
}: {
  controls: ControlItem[];
  evidences: Evidence[];
  issues: RiskIssue[];
}) => {
  const classes = useStyles();
  const summary = summarizeKrmfProgress(controls, evidences, issues);

  const secondaryItems: Array<{
    label: string;
    value: number;
    tone?: MetricTone;
  }> = [
    { label: '전체 통제항목', value: summary.totalControls },
    { label: '적용 대상', value: summary.appliedControls },
    { label: '증빙 제출 완료', value: summary.submittedEvidence },
    { label: '증빙 승인 완료', value: summary.approvedEvidence },
    { label: '미흡사항', value: summary.openIssues, tone: 'warning' },
    { label: '보완 진행', value: summary.remediatingControls },
    { label: '고위험 이슈', value: summary.highRiskIssues, tone: 'error' },
  ];

  return (
    <div style={{ marginBottom: spacingTokens.sectionGap }}>
      <SectionCard title="이행·증적 요약" compact>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <div className={classes.primaryCard}>
              <Typography className={classes.primaryLabel}>
                전체 진척률
              </Typography>
              <Typography className={classes.primaryValue}>
                {`${summary.progressPercent}%`}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={summary.progressPercent}
                className={classes.primaryProgress}
                classes={{ barColorPrimary: classes.primaryProgressBar }}
              />
            </div>
          </Grid>
          {secondaryItems.map(item => (
            <Grid item xs={12} sm={6} md={3} key={item.label}>
              <MetricCard
                label={item.label}
                value={item.value}
                size="secondary"
                tone={item.tone ?? 'default'}
              />
            </Grid>
          ))}
        </Grid>
      </SectionCard>
    </div>
  );
};
