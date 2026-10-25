import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import {
  colors,
  layoutTokens,
  shadows,
  typographyTokens,
} from '../common';

const LIFECYCLE_STAGES = [
  '적용범위·통제기준',
  '이행계획',
  '통제 구현',
  '증적 제출·검토',
  '미흡사항 보완',
  '평가·인가 지원',
  '운영전환',
  '지속모니터링·변경영향',
];

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    alignItems: 'stretch',
    gap: theme.spacing(2),
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: layoutTokens.cardRadius,
    boxShadow: shadows.card,
  },
  caption: {
    ...typographyTokens.caption,
    fontWeight: 600,
    color: colors.primaryNavy,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    paddingLeft: theme.spacing(1.5),
    borderLeft: `3px solid ${colors.primaryNavy}`,
    whiteSpace: 'nowrap',
  },
  stepperWrap: {
    flex: 1,
    overflowX: 'auto',
  },
  stepper: {
    minWidth: 960,
    padding: 0,
  },
  activeLabel: {
    '& .MuiStepLabel-label': {
      color: colors.primaryBlue,
      fontWeight: 600,
    },
  },
}));

export const KrmfLifecycleStepper = ({
  activeStage = 4,
}: {
  activeStage?: number;
}) => {
  const classes = useStyles();
  const activeIndex = Math.min(Math.max(activeStage, 1), LIFECYCLE_STAGES.length) - 1;

  return (
    <Paper className={classes.root} data-testid="krmf-lifecycle-stepper">
      <Typography component="span" className={classes.caption}>
        K-RMF 이행 단계
      </Typography>
      <div className={classes.stepperWrap}>
        <Stepper
          className={classes.stepper}
          activeStep={activeIndex}
          alternativeLabel
        >
          {LIFECYCLE_STAGES.map((label, index) => (
            <Step key={label} completed={index < activeIndex}>
              <StepLabel
                className={index === activeIndex ? classes.activeLabel : undefined}
              >
                {`${index + 1} ${label}`}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </div>
    </Paper>
  );
};
