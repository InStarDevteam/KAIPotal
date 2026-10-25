import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import {
  colors,
  layoutTokens,
  shadows,
  spacingTokens,
  typographyTokens,
  StatusTone,
} from './designTokens';

export type MetricTone = 'default' | StatusTone;

const useStyles = makeStyles({
  root: {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: layoutTokens.cardRadius,
    boxShadow: shadows.card,
    padding: spacingTokens.cardGap,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  labelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    ...typographyTokens.caption,
    color: colors.textSecondary,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  valuePrimary: {
    fontSize: 26,
    fontWeight: 700,
    lineHeight: 1.2,
    color: colors.textPrimary,
  },
  valueSecondary: {
    fontSize: 20,
    fontWeight: 600,
    lineHeight: 1.2,
    color: colors.textPrimary,
  },
  subtext: {
    ...typographyTokens.caption,
    color: colors.textSecondary,
  },
});

const toneDotColor: Record<StatusTone, string> = {
  success: colors.success.text,
  warning: colors.warning.text,
  error: colors.error.text,
  info: colors.info.text,
  neutral: colors.neutral.text,
};

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  subtext?: string;
  /** default가 아니면 라벨 앞에 상태 색상 점을 표시 */
  tone?: MetricTone;
  size?: 'primary' | 'secondary';
  'data-testid'?: string;
}

export const MetricCard = ({
  label,
  value,
  subtext,
  tone = 'default',
  size = 'primary',
  'data-testid': testId,
}: MetricCardProps) => {
  const classes = useStyles();
  const valueClass =
    size === 'primary' ? classes.valuePrimary : classes.valueSecondary;
  return (
    <Box className={classes.root} data-testid={testId}>
      <Box className={classes.labelRow}>
        {tone !== 'default' ? (
          <Box
            className={classes.dot}
            style={{ backgroundColor: toneDotColor[tone] }}
          />
        ) : null}
        <Typography className={classes.label}>{label}</Typography>
      </Box>
      <Typography className={valueClass}>{value}</Typography>
      {subtext ? (
        <Typography className={classes.subtext}>{subtext}</Typography>
      ) : null}
    </Box>
  );
};
