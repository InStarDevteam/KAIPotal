import { ReactNode } from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import RefreshIcon from '@material-ui/icons/Refresh';
import { EmptyState } from '../common';
import { KrmfQueryError } from './useKrmfQuery';

export const KrmfLoading = () => (
  <Box display="flex" justifyContent="center" padding={4}>
    <CircularProgress size={28} />
  </Box>
);

export const KrmfErrorPanel = ({
  error,
  onRetry,
}: {
  error: KrmfQueryError;
  onRetry?: () => void;
}) => (
  <Box padding={2}>
    {error.kind === 'permission' ? (
      <EmptyState
        message="조회 권한이 없습니다"
        description={error.message || 'K-RMF 조회 권한이 필요합니다.'}
      />
    ) : (
      <EmptyState
        message="K-RMF 연동 서비스를 준비 중입니다"
        description={`현재 데이터를 불러올 수 없습니다. ${error.message}`}
      />
    )}
    {error.kind !== 'permission' && onRetry ? (
      <Box display="flex" justifyContent="center">
        <Button size="small" startIcon={<RefreshIcon />} onClick={onRetry}>
          다시 시도
        </Button>
      </Box>
    ) : null}
  </Box>
);

export const KrmfQueryBoundary = <T,>({
  state,
  children,
}: {
  state: {
    data: T | null;
    loading: boolean;
    error: KrmfQueryError | null;
    reload: () => void;
  };
  children: (data: T) => ReactNode;
}) => {
  if (state.loading) return <KrmfLoading />;
  if (state.error) return <KrmfErrorPanel error={state.error} onRetry={state.reload} />;
  if (state.data === null) return null;
  return <>{children(state.data)}</>;
};
