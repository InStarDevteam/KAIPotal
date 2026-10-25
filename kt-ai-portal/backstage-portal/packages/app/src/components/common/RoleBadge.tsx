import Chip from '@material-ui/core/Chip';
import { makeStyles } from '@material-ui/core/styles';
import { ROLE_LABELS, PortalRole } from '../authz';
import { colors, typographyTokens } from './designTokens';

const useStyles = makeStyles({
  chip: {
    ...typographyTokens.caption,
    fontWeight: 600,
    height: 24,
    backgroundColor: colors.primaryNavy,
    color: colors.surface,
  },
});

export interface RoleBadgeProps {
  /** 직접 라벨을 지정하거나 role 코드를 넘기면 ROLE_LABELS로 변환 */
  label?: string;
  role?: PortalRole;
}

export const RoleBadge = ({ label, role }: RoleBadgeProps) => {
  const classes = useStyles();
  const resolvedLabel = label ?? (role ? ROLE_LABELS[role] : '');
  return <Chip size="small" label={resolvedLabel} className={classes.chip} />;
};
