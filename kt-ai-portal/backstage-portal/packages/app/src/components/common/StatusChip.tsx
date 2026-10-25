import Chip from '@material-ui/core/Chip';
import { makeStyles } from '@material-ui/core/styles';
import { colors, typographyTokens, StatusTone } from './designTokens';

const useStyles = makeStyles({
  chip: {
    ...typographyTokens.caption,
    fontWeight: 600,
    height: 24,
  },
});

export interface StatusChipProps {
  tone: StatusTone;
  label: string;
}

export const StatusChip = ({ tone, label }: StatusChipProps) => {
  const classes = useStyles();
  const toneColors = colors[tone];
  return (
    <Chip
      size="small"
      label={label}
      className={classes.chip}
      style={{
        backgroundColor: toneColors.bg,
        color: toneColors.text,
      }}
    />
  );
};
