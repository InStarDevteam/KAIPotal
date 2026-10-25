import { ReactNode } from 'react';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';
import { makeStyles } from '@material-ui/core/styles';
import { colors, spacingTokens, typographyTokens } from './designTokens';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: spacingTokens.sectionGap * 2,
    color: colors.textSecondary,
  },
  icon: {
    fontSize: 40,
    marginBottom: spacingTokens.base,
    color: colors.border,
  },
  message: {
    ...typographyTokens.sectionTitle,
    color: colors.textPrimary,
  },
  description: {
    ...typographyTokens.body,
    color: colors.textSecondary,
    marginTop: 4,
  },
});

export interface EmptyStateProps {
  /** 아이콘 슬롯 (기본: InfoOutlined 아이콘) */
  icon?: ReactNode;
  message: string;
  description?: string;
}

export const EmptyState = ({ icon, message, description }: EmptyStateProps) => {
  const classes = useStyles();
  return (
    <Box className={classes.root}>
      {icon ?? <InfoOutlinedIcon className={classes.icon} />}
      <Typography className={classes.message}>{message}</Typography>
      {description ? (
        <Typography className={classes.description}>{description}</Typography>
      ) : null}
    </Box>
  );
};
