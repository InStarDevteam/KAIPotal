import { useCallback, useEffect, useState } from 'react';
import Alert from '@material-ui/lab/Alert';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { formatPortalDateTime } from '../common/portalDate';
import {
  PortalSettingItem,
  SETTING_VALUE_TYPE_LABELS,
  SettingsFetchFailure,
  SettingsSaveFailure,
  classifySettingsFetchError,
  classifySettingsSaveError,
  maskSettingValue,
  parsePortalSettings,
  parseSettingEditText,
  ServerSettingCategory,
} from './portalSettingsServerData';

interface PortalSettingsServerPanelProps {
  category: ServerSettingCategory;
  title: string;
}

const formatUpdatedAt = formatPortalDateTime;

export const PortalSettingsServerPanel = ({
  category,
  title,
}: PortalSettingsServerPanelProps) => {
  const runtime = usePortalRuntime();
  const canManage = runtime.permissions.includes('settings.manage');
  const [items, setItems] = useState<PortalSettingItem[] | null>(null);
  const [failure, setFailure] = useState<SettingsFetchFailure | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    message: string;
    error: boolean;
  } | null>(null);

  const load = useCallback(() => {
    setFailure(null);
    setNotice(null);
    runtime
      .request<{ items: unknown }>(
        `/v1/portal-settings?category=${encodeURIComponent(category)}`,
      )
      .then(response => {
        setItems(parsePortalSettings(response.data));
        setDrafts({});
      })
      .catch((error: unknown) =>
        setFailure(
          classifySettingsFetchError(error, '설정을 불러오지 못했습니다.'),
        ),
      );
  }, [runtime, category]);

  useEffect(() => {
    setItems(null);
    setDrafts({});
    load();
  }, [load]);

  const updateDraft = (key: string, text: string) =>
    setDrafts(prev => ({ ...prev, [key]: text }));

  const handleSave = (item: PortalSettingItem) => {
    const text = drafts[item.key];
    if (text === undefined) return;
    const parsed = parseSettingEditText(text, item.valueType);
    if (!parsed.ok) {
      setNotice({ message: parsed.message, error: true });
      return;
    }
    setSavingKey(item.key);
    setNotice(null);
    runtime
      .request<unknown>(
        `/v1/portal-settings/${encodeURIComponent(
          item.category,
        )}/${encodeURIComponent(item.key)}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            value: parsed.value,
            expectedVersion: item.version,
          }),
        },
      )
      .then(response => {
        const updated = parsePortalSettings({ items: [response.data] })[0];
        if (!updated) throw new Error('저장 응답을 해석하지 못했습니다.');
        setItems(prev =>
          (prev ?? []).map(entry =>
            entry.key === updated.key ? updated : entry,
          ),
        );
        setDrafts(prev => {
          const next = { ...prev };
          delete next[item.key];
          return next;
        });
        setNotice({ message: '설정을 저장했습니다.', error: false });
      })
      .catch((error: unknown) => {
        const classified: SettingsSaveFailure = classifySettingsSaveError(
          error,
          '설정을 저장하지 못했습니다.',
        );
        setNotice({ message: classified.message, error: true });
        if (classified.kind === 'conflict') load();
      })
      .finally(() => setSavingKey(null));
  };

  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        {title}
      </Typography>
      {!canManage && (
        <Box marginBottom={2}>
          <Alert severity="info">
            환경설정 관리 권한이 없으면 값을 변경할 수 없습니다.
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
      {failure?.kind === 'permission' && (
        <Alert severity="error">{failure.message}</Alert>
      )}
      {failure?.kind === 'network' && (
        <Box marginBottom={2}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={load}>
                다시 시도
              </Button>
            }
          >
            {failure.message}
          </Alert>
        </Box>
      )}
      {!failure && items === null && (
        <Typography color="textSecondary">설정을 불러오는 중입니다.</Typography>
      )}
      {!failure && items !== null && items.length === 0 && (
        <Typography color="textSecondary">
          이 분류에 조회된 서버 설정이 없습니다.
        </Typography>
      )}
      {!failure && items !== null && items.length > 0 && (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>키</TableCell>
                <TableCell>설명</TableCell>
                <TableCell>유형</TableCell>
                <TableCell>값</TableCell>
                <TableCell>버전</TableCell>
                <TableCell>마지막 변경</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(item => {
                const display = maskSettingValue(item);
                const draft = drafts[item.key];
                const dirty = draft !== undefined && draft !== display;
                const editable = canManage && !item.sensitive;
                return (
                  <TableRow key={item.key}>
                    <TableCell style={{ fontWeight: 600 }}>
                      {item.key}
                    </TableCell>
                    <TableCell>{item.description ?? '—'}</TableCell>
                    <TableCell>
                      {SETTING_VALUE_TYPE_LABELS[item.valueType]}
                    </TableCell>
                    <TableCell>
                      {item.sensitive ? (
                        <Typography
                          component="span"
                          color="textSecondary"
                          variant="body2"
                        >
                          {display} (민감 값은 표시되지 않습니다)
                        </Typography>
                      ) : (
                        <TextField
                          size="small"
                          value={draft ?? display}
                          disabled={!editable}
                          onChange={event =>
                            updateDraft(item.key, event.target.value)
                          }
                          style={{ minWidth: 200 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>v{item.version}</TableCell>
                    <TableCell>
                      {item.updatedBy} · {formatUpdatedAt(item.updatedAt)}
                    </TableCell>
                    <TableCell>
                      {editable && (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          disabled={!dirty || savingKey !== null}
                          onClick={() => handleSave(item)}
                        >
                          {savingKey === item.key ? '저장 중' : '저장'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};
