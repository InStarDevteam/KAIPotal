import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import LinearProgress from '@material-ui/core/LinearProgress';
import { makeStyles } from '@material-ui/core/styles';
import { ControlItem, Evidence, RiskIssue, ControlArea, RiskSeverity, RISK_LEVEL_LABELS } from './types';
import { ProgressSummaryCards } from './ProgressSummaryCards';
import { IssueStatusChip } from './IssueStatusChip';
import {
  colors,
  spacingTokens,
  typographyTokens,
  SectionCard,
  StatusChip,
  StatusTone,
} from '../common';

const areaLabels: Record<ControlArea, string> = {
  access_control: '접근통제',
  account_management: '계정관리',
  log_management: '로그관리',
  encryption: '암호화',
  network_security: '네트워크 보안',
  vulnerability_management: '취약점 관리',
  data_protection: '데이터 보호',
  backup_recovery: '백업/복구',
  change_management: '변경관리',
  security_audit: '보안감사',
  security_requirement_plan: '보안요구사항 이행계획',
  krmf_standard: 'K-RMF 적용기준 관리',
  control_implementation: '보안통제항목 이행관리',
  security_plan: '보안계획서',
  evidence_submission: '구현증적 제출',
  security_evaluation: '보안평가·후속조치·인가',
  operational_transition: '운영전환·모니터링 준비',
};

const severityTones: Record<RiskSeverity, StatusTone> = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  critical: 'error',
};

const useStyles = makeStyles({
  progressRow: {
    marginBottom: spacingTokens.cardGap,
  },
  progressMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressPercent: {
    ...typographyTokens.body,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.neutral.bg,
  },
  barIdle: {
    borderRadius: 3,
    backgroundColor: colors.neutral.text,
  },
  barActive: {
    borderRadius: 3,
    backgroundColor: colors.primaryBlue,
  },
  barDone: {
    borderRadius: 3,
    backgroundColor: colors.success.text,
  },
  issueRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottom: `1px solid ${colors.border}`,
    '&:last-child': {
      borderBottom: 'none',
      paddingBottom: 0,
    },
    '&:first-child': {
      paddingTop: 0,
    },
  },
  issueMeta: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacingTokens.base,
  },
  issueMetaText: {
    ...typographyTokens.caption,
    color: colors.textSecondary,
  },
});

type ProgressBarClasses = ReturnType<typeof useStyles>;

const resolveBarClass = (
  progress: number,
  classes: ProgressBarClasses,
): string => {
  if (progress === 0) return classes.barIdle;
  if (progress === 100) return classes.barDone;
  return classes.barActive;
};

export const KrmfDashboard = ({
  controls,
  evidences,
  issues,
}: {
  controls: ControlItem[];
  evidences: Evidence[];
  issues: RiskIssue[];
}) => {
  const classes = useStyles();
  const areaProgress = Object.entries(areaLabels).map(([area, label]) => {
    const areaControls = controls.filter(c => c.area === area);
    const total = areaControls.length;
    const completed = areaControls.filter(
      c => c.checkStatus === 'compliant' || c.checkStatus === 'completed',
    ).length;
    return {
      area,
      label,
      total,
      completed,
      progress: total ? Math.round((completed / total) * 100) : 0,
    };
  });

  const recentIssues = [...issues]
    .sort((a, b) => new Date(b.foundAt).getTime() - new Date(a.foundAt).getTime())
    .slice(0, 5);

  return (
    <div>
      <ProgressSummaryCards controls={controls} evidences={evidences} issues={issues} />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <SectionCard title="영역별 진척률">
            {areaProgress.map(item => (
              <div key={item.area} className={classes.progressRow}>
                <div className={classes.progressMeta}>
                  <Typography variant="body2">
                    {item.label} ({item.completed}/{item.total})
                  </Typography>
                  <Typography className={classes.progressPercent}>
                    {item.progress}%
                  </Typography>
                </div>
                <LinearProgress
                  variant="determinate"
                  value={item.progress}
                  className={classes.progressTrack}
                  classes={{
                    barColorPrimary: resolveBarClass(item.progress, classes),
                  }}
                />
              </div>
            ))}
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <SectionCard title="최근 미흡사항">
            {recentIssues.length === 0 && (
              <Typography color="textSecondary">최근 미흡사항이 없습니다.</Typography>
            )}
            {recentIssues.map(issue => (
              <div key={issue.id} className={classes.issueRow}>
                <Typography variant="subtitle2">{issue.title}</Typography>
                <div className={classes.issueMeta}>
                  <Typography className={classes.issueMetaText}>
                    {issue.owner} · {new Date(issue.foundAt).toLocaleDateString()}
                  </Typography>
                  <IssueStatusChip status={issue.status} />
                  <StatusChip
                    tone={severityTones[issue.severity]}
                    label={RISK_LEVEL_LABELS[issue.severity]}
                  />
                </div>
              </div>
            ))}
          </SectionCard>
        </Grid>
      </Grid>
    </div>
  );
};
