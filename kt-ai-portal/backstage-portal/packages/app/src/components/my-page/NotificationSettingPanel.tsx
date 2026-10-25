import { useEffect, useState } from 'react';
import Alert from '@material-ui/lab/Alert';
import Box from '@material-ui/core/Box';
import Checkbox from '@material-ui/core/Checkbox';
import Paper from '@material-ui/core/Paper';
import Switch from '@material-ui/core/Switch';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import { useOptionalPortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import {
  myPageNotificationsKey,
  readMyPageNotificationSettings,
  saveMyPageNotificationSettings,
} from './myPageProfileStore';
import { MyNotification, NotificationSetting, NotificationChannel } from './types';

interface NotificationSettingPanelProps {
  settings: NotificationSetting[];
  notifications?: MyNotification[];
}

const channels: NotificationChannel[] = ['포털 알림', '이메일', 'SMS', '메신저'];

export const NotificationSettingPanel = ({ settings, notifications = [] }: NotificationSettingPanelProps) => {
  const runtime = useOptionalPortalRuntime();
  const writable =
    !!runtime?.isDemo && !!runtime.tenantId && !!runtime.actorId;
  const storageKey = runtime
    ? myPageNotificationsKey(runtime.tenantId, runtime.actorId)
    : '';
  const [items, setItems] = useState(settings);
  const [notice, setNotice] = useState<{
    message: string;
    error: boolean;
  } | null>(null);

  useEffect(() => {
    if (!writable) return;
    const loaded = readMyPageNotificationSettings(storageKey, settings);
    setItems(loaded.items);
    if (loaded.error) setNotice({ message: loaded.error, error: true });
  }, [writable, storageKey, settings]);

  const countBy = (category: MyNotification['category']) =>
    notifications.filter(n => n.category === category).length;

  const commit = (next: NotificationSetting[]) => {
    if (!writable) {
      // 비데모 모드: 기존처럼 화면 상태만 바꾸고 실제 저장 안내를 유지한다.
      setItems(next);
      return;
    }
    try {
      // Persist before updating UI: a failed local write must never look successful.
      saveMyPageNotificationSettings(storageKey, next);
      setItems(next);
      setNotice({ message: '알림 설정을 저장했습니다.', error: false });
    } catch (error) {
      setNotice({
        message:
          error instanceof Error ? error.message : '저장하지 못했습니다.',
        error: true,
      });
    }
  };

  const toggleChannel = (id: string, channel: NotificationChannel) => {
    commit(
      items.map(item => {
        if (item.id !== id) return item;
        const exists = item.channels.includes(channel);
        return {
          ...item,
          channels: exists ? item.channels.filter(c => c !== channel) : [...item.channels, channel],
        };
      }),
    );
  };

  const toggleEnabled = (id: string) => {
    commit(
      items.map(item => (item.id === id ? { ...item, enabled: !item.enabled } : item)),
    );
  };

  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        알림 설정
      </Typography>
      {notifications.length > 0 && (
        <Box marginBottom={2}>
          <Alert severity="info">
            알림 요약 — 승인대기 {countBy('승인대기')}건 · 기한임박 {countBy('기한임박')}건 · 반려 {countBy('반려')}건
          </Alert>
        </Box>
      )}
      {notice && (
        <Box marginBottom={2}>
          <Alert severity={notice.error ? 'error' : 'info'}>{notice.message}</Alert>
        </Box>
      )}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>알림 유형</TableCell>
              <TableCell>사용</TableCell>
              {channels.map(c => (
                <TableCell key={c}>{c}</TableCell>
              ))}
              <TableCell>임계치/시간대</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell>{item.type}</TableCell>
                <TableCell>
                  <Switch checked={item.enabled} onChange={() => toggleEnabled(item.id)} />
                </TableCell>
                {channels.map(c => (
                  <TableCell key={c}>
                    <Checkbox
                      checked={item.channels.includes(c)}
                      onChange={() => toggleChannel(item.id, c)}
                      disabled={!item.enabled}
                    />
                  </TableCell>
                ))}
                <TableCell>
                  {item.threshold !== undefined ? (
                    <TextField
                      size="small"
                      value={item.threshold}
                      disabled={!item.enabled}
                      style={{ width: 80 }}
                    />
                  ) : (
                    item.timeWindow || '-'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {!writable && (
        <Box marginTop={2}>
          <Typography variant="body2" color="textSecondary">
            실제 알림 저장은 현재 동작하지 않습니다.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
