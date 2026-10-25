import { createContext, useContext, useState, ReactNode } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import { Link } from 'react-router-dom';
import { usePlatformAccess } from '../tenant-settings';
import { useAuthz } from '../authz';
import { PlatformIcon } from './PlatformIcon';

const LaunchContext = createContext<(id: string) => void>(() => {});
export const usePlatformLaunch = () => useContext(LaunchContext);
export function PlatformLaunchProvider({ children }: { children: ReactNode }) {
  const { platforms, launchPlatform } = usePlatformAccess();
  const { hasPermission } = useAuthz();
  const [selected, setSelected] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const platform = platforms.find(p => p.id === selected);
  const launch = async (id: string) => {
    const target = platforms.find(p => p.id === id);
    if (!target || loading) return;
    setSelected(id);
    setMessage('');
    setLoading(true);
    try {
      const href = await launchPlatform(target.id);
      if (href) {
        window.location.assign(href);
        return;
      }
      setMessage(
        '아직 서비스 접속 주소가 연결되지 않았습니다. 소속 관리자에게 연결 설정을 요청해 주세요.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : '서비스에 연결하지 못했습니다.',
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <LaunchContext.Provider value={id => void launch(id)}>
      {children}
      <Dialog
        open={!!selected}
        onClose={() => !loading && setSelected('')}
        maxWidth="xs"
        fullWidth
        aria-labelledby="platform-launch-title"
      >
        <DialogTitle id="platform-launch-title">
          {platform?.name} 연결
        </DialogTitle>
        <DialogContent>
          <div className="launch-platform">
            <PlatformIcon id={selected} />
            <Typography>{platform?.description}</Typography>
          </div>
          <Alert severity={loading ? 'info' : 'warning'}>
            {loading
              ? '현재 소속과 서비스 접근 권한을 확인하고 있습니다.'
              : message}
          </Alert>
          <Typography
            variant="body2"
            style={{ marginTop: 18, color: '#64748b', lineHeight: 1.8 }}
          >
            상세 작업은 해당 플랫폼에서 진행합니다. 포털에서는 자산 검색,
            작업환경 신청과 승인 내역을 관리할 수 있습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          {hasPermission('settings.manage') && (
            <Button
              component={Link}
              to="/tenant-settings"
              onClick={() => setSelected('')}
            >
              연결 설정
            </Button>
          )}
          <Button
            onClick={() => setSelected('')}
            disabled={loading}
            color="primary"
          >
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </LaunchContext.Provider>
  );
}
