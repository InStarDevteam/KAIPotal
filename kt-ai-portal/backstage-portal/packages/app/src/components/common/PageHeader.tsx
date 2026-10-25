import { ReactNode } from 'react';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import { colors, spacingTokens, typographyTokens } from './designTokens';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacingTokens.cardGap,
    marginBottom: spacingTokens.sectionGap,
  },
  title: {
    ...typographyTokens.pageTitle,
    color: colors.textPrimary,
  },
  description: {
    ...typographyTokens.body,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: spacingTokens.base,
  },
});

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** 우측 액션 슬롯 (버튼 등) */
  actions?: ReactNode;
  'data-testid'?: string;
}

export const PageHeader = ({
  title,
  description,
  actions,
  'data-testid': testId,
}: PageHeaderProps) => {
  const classes = useStyles();
  return (
    <Box className={classes.root} data-testid={testId}>
      <Box>
        <Typography component="h1" className={classes.title}>
          {title}
        </Typography>
        {description ? (
          <Typography className={classes.description}>{description}</Typography>
        ) : null}
      </Box>
      {actions ? <Box className={classes.actions}>{actions}</Box> : null}
    </Box>
  );
};
