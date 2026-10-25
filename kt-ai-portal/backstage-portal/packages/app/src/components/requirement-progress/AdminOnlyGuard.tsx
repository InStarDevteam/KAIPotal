import React from 'react';
import { Box, Button, Card, CardContent, Typography, CircularProgress } from '@material-ui/core';
import { Link } from 'react-router-dom';
import { useDemoAdmin } from '../preview-auth';
import { ROLE_LABELS, useAuthz } from '../authz';

export const AdminOnlyGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isLoading } = useDemoAdmin();
  const { isAdminArea, primaryRole } = useAuthz();

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAdminArea) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
        p={2}
      >
        <Card style={{ maxWidth: 480, width: '100%' }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              접근 권한이 없습니다
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
              이 화면은 권한이 부여된 관리자만 사용할 수 있습니다.
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              현재 역할: {ROLE_LABELS[primaryRole]}
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
  }

  return <>{children}</>;
};
