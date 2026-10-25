import { ReactNode } from 'react';
import { Box, Button, Card, CardContent, Typography } from '@material-ui/core';
import { Link } from 'react-router-dom';
import { useAuthz } from './AuthzContext';
import { PERMISSION_LABELS, PortalPermission, ROLE_LABELS } from './types';

const AccessDeniedCard = ({
  requiredPermissions,
}: {
  requiredPermissions: PortalPermission[];
}) => {
  const { primaryRole } = useAuthz();
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="60vh"
      p={2}
      data-testid="permission-denied"
    >
      <Card style={{ maxWidth: 480, width: '100%' }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            접근 권한이 필요합니다
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            현재 역할: {ROLE_LABELS[primaryRole]}
          </Typography>
          {requiredPermissions.length > 0 && (
            <Typography variant="body2" color="textSecondary" paragraph>
              필요 권한:{' '}
              {requiredPermissions
                .map(permission => PERMISSION_LABELS[permission])
                .join(', ')}
            </Typography>
          )}
          <Typography variant="body2" color="textSecondary" paragraph>
            필요한 권한은 관리자에게 문의하세요.
          </Typography>
          <Box mt={2}>
            <Button
              variant="contained"
              color="primary"
              component={Link}
              to="/"
              fullWidth
            >
              통합 대시보드로 이동
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export interface PermissionGuardProps {
  anyOf?: PortalPermission[];
  allOf?: PortalPermission[];
  children: ReactNode;
  fallback?: ReactNode;
}

export const PermissionGuard = ({
  anyOf,
  allOf,
  children,
  fallback,
}: PermissionGuardProps) => {
  const { hasAnyPermission, hasAllPermissions } = useAuthz();

  const allowed =
    (!anyOf || anyOf.length === 0 || hasAnyPermission(anyOf)) &&
    (!allOf || allOf.length === 0 || hasAllPermissions(allOf));

  if (allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return <AccessDeniedCard requiredPermissions={[...(anyOf ?? []), ...(allOf ?? [])]} />;
};
