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
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Alert from '@material-ui/lab/Alert';
import { useState } from 'react';
import { SecuritySetting } from './types';
import {
  readDemoSecuritySettings,
  saveDemoSecuritySettings,
  readDemoSettingChangeHistory,
  saveDemoSettingChangeHistory,
  securitySettingStorageKey,
  settingChangeHistoryStorageKey,
} from './environmentSettingsDemoStore';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';

interface SecuritySettingPanelProps {
  settings: SecuritySetting[];
}

const enabledLabel = (enabled: boolean) => (enabled ? '사용' : '미사용');

const formatOccurredAt = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')} ${String(
    date.getHours(),
  ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export const SecuritySettingPanel = ({
  settings,
}: SecuritySettingPanelProps) => {
  const { tenantId, actorId, isDemo } = usePortalRuntime();
  const writable = isDemo && !!tenantId;
  const storageKey = securitySettingStorageKey(tenantId);
  const historyKey = settingChangeHistoryStorageKey(tenantId);
  const [loaded] = useState(() =>
    writable
      ? readDemoSecuritySettings(storageKey, settings)
      : { items: settings },
  );
  const [items, setItems] = useState<SecuritySetting[]>(loaded.items);
  const [savedItems, setSavedItems] = useState<SecuritySetting[]>(loaded.items);
  const [notice, setNotice] = useState<{
    message: string;
    error: boolean;
  } | null>(loaded.error ? { message: loaded.error, error: true } : null);

  const dirty = JSON.stringify(items) !== JSON.stringify(savedItems);

  const updateValue = (id: string, value: string) => {
    setItems(prev => prev.map(s => (s.id === id ? { ...s, value } : s)));
  };

  const toggleEnabled = (id: string) => {
    setItems(prev =>
      prev.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    );
  };

  const handleSave = () => {
    if (!writable) {
      setNotice({
        message: '실제 설정 변경은 운영 승인 플로우 연결 후 제공됩니다.',
        error: true,
      });
      return;
    }
    try {
      const changed = items.filter(item => {
        const saved = savedItems.find(s => s.id === item.id);
        return (
          saved &&
          (saved.value !== item.value || saved.enabled !== item.enabled)
        );
      });
      saveDemoSecuritySettings(storageKey, items);
      if (changed.length) {
        const now = new Date();
        const entries = changed.map((item, index) => {
          const saved = savedItems.find(s => s.id === item.id);
          const parts: string[] = [];
          if (saved!.value !== item.value) parts.push('값');
          if (saved!.enabled !== item.enabled) parts.push('사용 여부');
          return {
            id: `demo-ss-${now.getTime()}-${index}`,
            occurredAt: formatOccurredAt(now),
            changedBy: actorId || 'demo-admin',
            category: '보안 정책' as const,
            settingName: item.name,
            oldValue: [
              saved!.value !== item.value ? saved!.value : '',
              saved!.enabled !== item.enabled
                ? enabledLabel(saved!.enabled)
                : '',
            ]
              .filter(Boolean)
              .join(' / '),
            newValue: [
              saved!.value !== item.value ? item.value : '',
              saved!.enabled !== item.enabled ? enabledLabel(item.enabled) : '',
            ]
              .filter(Boolean)
              .join(' / '),
            reason: `데모 저장 (${parts.join(', ')} 변경)`,
            applyStatus: '적용' as const,
            ip: '127.0.0.1',
          };
        });
        const existing = readDemoSettingChangeHistory(historyKey);
        saveDemoSettingChangeHistory(historyKey, [
          ...entries,
          ...existing.items,
        ]);
      }
      setSavedItems(items);
      setNotice({ message: '보안 정책을 저장했습니다.', error: false });
    } catch (error) {
      setNotice({
        message:
          error instanceof Error ? error.message : '저장하지 못했습니다.',
        error: true,
      });
    }
  };

  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        보안 정책
      </Typography>
      {!writable && (
        <Box marginBottom={2}>
          <Alert severity="info">
            실제 설정 변경은 운영 승인 플로우 연결 후 제공됩니다. 현재는 조회만
            가능합니다.
          </Alert>
        </Box>
      )}
      {notice && (
        <Box marginBottom={2}>
          <Alert
            severity={notice.error ? 'error' : 'success'}
            onClose={() => setNotice(null)}
          >
            {notice.message}
          </Alert>
        </Box>
      )}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>정책 ID</TableCell>
              <TableCell>유형</TableCell>
              <TableCell>정책명</TableCell>
              <TableCell>현재 값</TableCell>
              <TableCell>적용 대상</TableCell>
              <TableCell>MFA 필요</TableCell>
              <TableCell>감사 로그</TableCell>
              <TableCell>승인 필요</TableCell>
              <TableCell>사용 여부</TableCell>
              <TableCell>마지막 변경일</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(s => (
              <TableRow key={s.id}>
                <TableCell>{s.id}</TableCell>
                <TableCell>{s.type}</TableCell>
                <TableCell>{s.name}</TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={s.value}
                    onChange={e => updateValue(s.id, e.target.value)}
                    disabled={!writable}
                    style={{ width: 140 }}
                  />
                </TableCell>
                <TableCell>{s.target}</TableCell>
                <TableCell>{s.requiresMfa ? '예' : '아니오'}</TableCell>
                <TableCell>{s.auditLogged ? '예' : '아니오'}</TableCell>
                <TableCell>{s.requiresApproval ? '예' : '아니오'}</TableCell>
                <TableCell>
                  <Switch
                    checked={s.enabled}
                    onChange={() => toggleEnabled(s.id)}
                    disabled={!writable}
                  />
                </TableCell>
                <TableCell>{s.lastChangedAt}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box marginTop={2}>
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={handleSave}
          disabled={!writable || !dirty}
        >
          저장
        </Button>
        {writable && !dirty && (
          <Typography
            component="span"
            color="textSecondary"
            variant="body2"
            style={{ marginLeft: 12 }}
          >
            변경된 내용이 없습니다.
          </Typography>
        )}
      </Box>
    </Paper>
  );
};
