import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import { useAuthz, PERMISSION_LABELS } from '../authz';
import type { PortalPermission } from '../authz/types';

export const GatedButton = ({
  permission,
  label,
  onClick,
  color = 'primary',
  variant = 'outlined',
}: {
  permission: PortalPermission;
  label: string;
  onClick: () => void;
  color?: 'primary' | 'secondary' | 'default';
  variant?: 'text' | 'outlined' | 'contained';
}) => {
  const { hasPermission } = useAuthz();
  if (!hasPermission(permission)) {
    return null;
  }
  return (
    <Button size="small" color={color} variant={variant} onClick={onClick}>
      {label}
    </Button>
  );
};

export const PermissionHint = ({
  permission,
  action,
}: {
  permission: PortalPermission;
  action: string;
}) => {
  const { hasPermission } = useAuthz();
  if (hasPermission(permission)) {
    return null;
  }
  return (
    <Typography variant="caption" color="textSecondary">
      {action} 작업은 '{PERMISSION_LABELS[permission]}' 권한이 필요합니다.
    </Typography>
  );
};
