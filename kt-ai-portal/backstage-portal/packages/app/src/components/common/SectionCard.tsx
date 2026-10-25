import { ReactNode } from 'react';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import {
  colors,
  layoutTokens,
  shadows,
  spacingTokens,
  typographyTokens,
} from './designTokens';

const useStyles = makeStyles({
  root: {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: layoutTokens.cardRadius,
    boxShadow: shadows.card,
    padding: spacingTokens.sectionGap,
  },
  compact: {
    padding: spacingTokens.cardGap,
  },
  title: {
    ...typographyTokens.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacingTokens.cardGap,
  },
});

export interface SectionCardProps {
  title?: ReactNode;
  /** true면 padding 16, 기본 24 */
  compact?: boolean;
  children: ReactNode;
  'data-testid'?: string;
}

export const SectionCard = ({
  title,
  compact,
  children,
  'data-testid': testId,
}: SectionCardProps) => {
  const classes = useStyles();
  const rootClass = compact
    ? `${classes.root} ${classes.compact}`
    : classes.root;
  return (
    <Box className={rootClass} data-testid={testId}>
      {title ? (
        <Typography component="h2" className={classes.title}>
          {title}
        </Typography>
      ) : null}
      {children}
    </Box>
  );
};
