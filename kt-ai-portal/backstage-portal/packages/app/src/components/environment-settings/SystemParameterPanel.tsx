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
import { SystemParameter } from './types';
import {
  readDemoSystemParameters,
  saveDemoSystemParameters,
  readDemoSettingChangeHistory,
  saveDemoSettingChangeHistory,
  systemParameterStorageKey,
  settingChangeHistoryStorageKey,
} from './environmentSettingsDemoStore';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';

interface SystemParameterPanelProps {
  parameters: SystemParameter[];
}

const enabledLabel = (enabled: boolean) => (enabled ? '사용' : '미사용');

const formatOccurredAt = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')} ${String(
    date.getHours(),
  ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export const SystemParameterPanel = ({
  parameters,
}: SystemParameterPanelProps) => {
  const { tenantId, actorId, isDemo } = usePortalRuntime();
  const writable = isDemo && !!tenantId;
  const storageKey = systemParameterStorageKey(tenantId);
  const historyKey = settingChangeHistoryStorageKey(tenantId);
  const [loaded] = useState(() =>
    writable
      ? readDemoSystemParameters(storageKey, parameters)
      : { items: parameters },
  );
  const [items, setItems] = useState<SystemParameter[]>(loaded.items);
  const [savedItems, setSavedItems] = useState<SystemParameter[]>(loaded.items);
  const [notice, setNotice] = useState<{
    message: string;
    error: boolean;
  } | null>(loaded.error ? { message: loaded.error, error: true } : null);

  const dirty = JSON.stringify(items) !== JSON.stringify(savedItems);

  const updateValue = (id: string, value: string) => {
    setItems(prev => prev.map(p => (p.id === id ? { ...p, value } : p)));
  };

  const toggleEnabled = (id: string) => {
    setItems(prev =>
      prev.map(p => (p.id === id ? { ...p, enabled: !p.enabled } : p)),
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
      const changed = items.filter((item, index) => {
        const saved = savedItems[index];
        return (
          saved &&
          (saved.value !== item.value || saved.enabled !== item.enabled)
        );
      });
      saveDemoSystemParameters(storageKey, items);
      if (changed.length) {
        const now = new Date();
        const entries = changed.map((item, index) => {
          const saved = savedItems[savedItems.findIndex(p => p.id === item.id)];
          const parts: string[] = [];
          if (saved.value !== item.value) parts.push('값');
          if (saved.enabled !== item.enabled) parts.push('사용 여부');
          return {
            id: `demo-sp-${now.getTime()}-${index}`,
            occurredAt: formatOccurredAt(now),
            changedBy: actorId || 'demo-admin',
            category: '시스템 파라미터' as const,
            settingName: item.name,
            oldValue: [
              saved.value !== item.value ? saved.value : '',
              saved.enabled !== item.enabled ? enabledLabel(saved.enabled) : '',
            ]
              .filter(Boolean)
              .join(' / '),
            newValue: [
              saved.value !== item.value ? item.value : '',
              saved.enabled !== item.enabled ? enabledLabel(item.enabled) : '',
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
      setNotice({ message: '시스템 파라미터를 저장했습니다.', error: false });
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
        시스템 파라미터
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
              <TableCell>ID</TableCell>
              <TableCell>카테고리</TableCell>
              <TableCell>파라미터명</TableCell>
              <TableCell>현재 값</TableCell>
              <TableCell>기본값</TableCell>
              <TableCell>설명</TableCell>
              <TableCell>적용 범위</TableCell>
              <TableCell>변경 가능</TableCell>
              <TableCell>승인 필요</TableCell>
              <TableCell>사용 여부</TableCell>
              <TableCell>마지막 변경일</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(p => (
              <TableRow key={p.id}>
                <TableCell>{p.id}</TableCell>
                <TableCell>{p.category}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={p.value}
                    onChange={e => updateValue(p.id, e.target.value)}
                    disabled={!p.editable || !writable}
                    style={{ width: 120 }}
                  />
                </TableCell>
                <TableCell>{p.defaultValue}</TableCell>
                <TableCell>{p.description}</TableCell>
                <TableCell>{p.scope}</TableCell>
                <TableCell>{p.editable ? '예' : '아니오'}</TableCell>
                <TableCell>{p.requiresApproval ? '예' : '아니오'}</TableCell>
                <TableCell>
                  <Switch
                    checked={p.enabled}
                    onChange={() => toggleEnabled(p.id)}
                    disabled={!writable}
                  />
                </TableCell>
                <TableCell>{p.lastChangedAt}</TableCell>
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
