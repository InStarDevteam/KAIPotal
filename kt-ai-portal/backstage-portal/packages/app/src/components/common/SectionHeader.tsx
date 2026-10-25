import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import { colors, spacingTokens, typographyTokens } from './designTokens';

const useStyles = makeStyles({
  root: {
    marginBottom: spacingTokens.cardGap,
  },
  title: {
    ...typographyTokens.sectionTitle,
    color: colors.textPrimary,
  },
  description: {
    ...typographyTokens.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export interface SectionHeaderProps {
  title: string;
  description?: string;
}

export const SectionHeader = ({ title, description }: SectionHeaderProps) => {
  const classes = useStyles();
  return (
    <Box className={classes.root}>
      <Typography component="h2" className={classes.title}>
        {title}
      </Typography>
      {description ? (
        <Typography className={classes.description}>{description}</Typography>
      ) : null}
    </Box>
  );
};
