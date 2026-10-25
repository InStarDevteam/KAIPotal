import { useEffect, useState } from 'react';
import Alert from '@material-ui/lab/Alert';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import AddIcon from '@material-ui/icons/Add';
import { useOptionalPortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import {
  createDemoApiKey,
  myPageApiKeysKey,
  readMyPageApiKeys,
  saveMyPageApiKeys,
} from './myPageProfileStore';
import { ApiKey } from './types';

interface PersonalApiKeyPanelProps {
  apiKeys: ApiKey[];
}

export const PersonalApiKeyPanel = ({ apiKeys }: PersonalApiKeyPanelProps) => {
  const runtime = useOptionalPortalRuntime();
  const writable =
    !!runtime?.isDemo && !!runtime.tenantId && !!runtime.actorId;
  const storageKey = runtime
    ? myPageApiKeysKey(runtime.tenantId, runtime.actorId)
    : '';
  const [items, setItems] = useState(apiKeys);
  const [name, setName] = useState('');
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<{
    name: string;
    fullKey: string;
  } | null>(null);
  const [notice, setNotice] = useState<{
    message: string;
    error: boolean;
  } | null>(null);

  useEffect(() => {
    if (!writable) return;
    const loaded = readMyPageApiKeys(storageKey, apiKeys);
    setItems(loaded.items);
    if (loaded.error) setNotice({ message: loaded.error, error: true });
  }, [writable, storageKey, apiKeys]);

  const commit = (next: ApiKey[], message: string): boolean => {
    if (!writable) {
      setNotice({
        message:
          '운영 환경에서는 개인 API Key 발급/폐기가 운영 서비스 연결 후 제공됩니다.',
        error: false,
      });
      return false;
    }
    try {
      // Persist before updating UI: a failed local write must never look successful.
      saveMyPageApiKeys(storageKey, next);
      setItems(next);
      setNotice({ message, error: false });
      return true;
    } catch (error) {
      setNotice({
        message:
          error instanceof Error ? error.message : '저장하지 못했습니다.',
        error: true,
      });
      return false;
    }
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    if (!writable) {
      commit(items, '');
      return;
    }
    // 전체 키 값은 이 화면에서 한 번만 표시하고, 목록에는 마스킹 값만 남긴다.
    const { apiKey, fullKey } = createDemoApiKey(name, '통합 카탈로그 조회 연동');
    if (commit([apiKey, ...items], `데모용 API Key "${apiKey.name}"을(를) 발급했습니다.`)) {
      setCreatedKey({ name: apiKey.name, fullKey });
      setName('');
    }
  };

  const handleRevoke = () => {
    const target = items.find(k => k.id === revokeId);
    if (!target) {
      setRevokeId(null);
      return;
    }
    if (
      commit(
        items.filter(k => k.id !== target.id),
        `API Key "${target.name}"을(를) 폐기했습니다.`,
      )
    )
      setRevokeId(null);
  };

  const handleCopy = () => {
    if (!createdKey) return;
    const write =
      navigator.clipboard?.writeText?.(createdKey.fullKey) ??
      Promise.reject(new Error('unsupported'));
    write.then(
      () => setNotice({ message: '데모용 키를 복사했습니다.', error: false }),
      () =>
        setNotice({
          message: '복사하지 못했습니다. 키 값을 직접 선택해 복사하세요.',
          error: true,
        }),
    );
  };

  const revokeTarget = items.find(k => k.id === revokeId);

  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        개인 API Key 관리
      </Typography>
      {notice && (
        <Box marginBottom={2}>
          <Alert severity={notice.error ? 'error' : 'info'}>{notice.message}</Alert>
        </Box>
      )}
      {createdKey && (
        <Box marginBottom={2}>
          <Alert severity="warning">
            <Box display="flex" flexDirection="column" style={{ gap: 8 }}>
              <Typography variant="body2">
                데모용 키 &quot;{createdKey.name}&quot; — 아래 키는 데모용이며
                이 창을 벗어나면 다시 표시되지 않습니다.
              </Typography>
              <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                <Typography variant="body2" style={{ fontFamily: 'monospace' }}>
                  {createdKey.fullKey}
                </Typography>
                <Button size="small" variant="outlined" onClick={handleCopy}>
                  복사
                </Button>
                <Button size="small" onClick={() => setCreatedKey(null)}>
                  닫기
                </Button>
              </Box>
            </Box>
          </Alert>
        </Box>
      )}
      <Box marginBottom={2} display="flex" alignItems="center" style={{ gap: 8 }}>
        <TextField size="small" label="Key 이름" value={name} onChange={e => setName(e.target.value)} />
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleCreate} disabled={!name}>
          생성
        </Button>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>이름</TableCell>
              <TableCell>설명</TableCell>
              <TableCell>Key</TableCell>
              <TableCell>사용 서비스</TableCell>
              <TableCell>권한 범위</TableCell>
              <TableCell>생성일</TableCell>
              <TableCell>만료일</TableCell>
              <TableCell>마지막 사용</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>조치</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(k => (
              <TableRow key={k.id}>
                <TableCell>{k.id}</TableCell>
                <TableCell>{k.name}</TableCell>
                <TableCell>{k.description}</TableCell>
                <TableCell>{k.maskedKey}</TableCell>
                <TableCell>{k.services.join(', ')}</TableCell>
                <TableCell>{k.scopes.join(', ')}</TableCell>
                <TableCell>{k.createdAt}</TableCell>
                <TableCell>{k.expiresAt}</TableCell>
                <TableCell>{k.lastUsedAt || '-'}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={k.status}
                    color={k.status === '활성' ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    color="secondary"
                    disabled={k.status !== '활성'}
                    onClick={() => setRevokeId(k.id)}
                  >
                    폐기
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog
        open={!!revokeId}
        onClose={() => setRevokeId(null)}
        aria-labelledby="api-key-revoke-title"
      >
        <DialogTitle id="api-key-revoke-title">
          API Key를 폐기할까요?
        </DialogTitle>
        <DialogContent>
          {revokeTarget
            ? `"${revokeTarget.name}" (${revokeTarget.maskedKey}) 키를 폐기하면 해당 키로는 더 이상 호출할 수 없습니다.`
            : ''}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeId(null)}>취소</Button>
          <Button color="secondary" onClick={handleRevoke}>
            폐기
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
