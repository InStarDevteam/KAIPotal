import { useState } from 'react';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TextField from '@material-ui/core/TextField';
import Switch from '@material-ui/core/Switch';
import Alert from '@material-ui/lab/Alert';
import { ResourcePrice, ResourceType } from './types';
import {
  creditPriceStorageKey,
  readCreditPrices,
  saveCreditPrices,
  validateCreditPrice,
} from './creditPriceStore';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';

const resourceLabels: Record<ResourceType, string> = {
  cpu: 'CPU',
  gpu: 'GPU',
  memory: 'Memory',
  storage: 'Storage',
  network: 'Network',
  notebook: 'Notebook',
  training_job: 'Training Job',
  inference_api: 'Inference API',
};

export const ResourcePriceTable = ({ prices }: { prices: ResourcePrice[] }) => {
  const { tenantId, actorId, isDemo } = usePortalRuntime();
  const writable = isDemo && !!tenantId && !!actorId;
  const storageKey = creditPriceStorageKey(tenantId, actorId);
  const [loaded] = useState(() =>
    writable ? readCreditPrices(storageKey, prices) : { items: prices },
  );
  const [items, setItems] = useState<ResourcePrice[]>(loaded.items);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(loaded.items.map(item => [item.resourceType, String(item.price)])),
  );
  const [notice, setNotice] = useState<{
    message: string;
    error: boolean;
  } | null>(loaded.error ? { message: loaded.error, error: true } : null);

  const dirty = items.filter(
    item => drafts[item.resourceType] !== String(item.price),
  );

  const updateDraft = (resourceType: ResourceType, value: string) => {
    setDrafts(prev => ({ ...prev, [resourceType]: value }));
  };

  const persist = (next: ResourcePrice[], message: string): boolean => {
    try {
      saveCreditPrices(storageKey, next);
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

  const handleSave = () => {
    if (!writable || !dirty.length) return;
    for (const item of dirty) {
      const error = validateCreditPrice(drafts[item.resourceType]);
      if (error) {
        setNotice({
          message: `${resourceLabels[item.resourceType]}: ${error}`,
          error: true,
        });
        return;
      }
    }
    const next = items.map(item =>
      dirty.some(d => d.resourceType === item.resourceType)
        ? { ...item, price: Number(drafts[item.resourceType]) }
        : item,
    );
    if (persist(next, '단가를 저장했습니다.')) {
      setDrafts(
        Object.fromEntries(next.map(item => [item.resourceType, String(item.price)])),
      );
    }
  };

  const toggleActive = (index: number) => {
    if (!writable) return;
    const next = [...items];
    next[index] = { ...next[index], active: !next[index].active };
    persist(
      next,
      `${resourceLabels[next[index].resourceType]} 적용 여부를 ${
        next[index].active ? '활성' : '비활성'
      }으로 저장했습니다.`,
    );
  };

  return (
    <Paper style={{ padding: 16 }}>
      <Typography variant="h6" gutterBottom>
        자원별 단가 설정
      </Typography>
      {writable ? (
        <Typography color="textSecondary" variant="body2" paragraph>
          * 단가와 적용 여부는 현재 브라우저에 소속과 사용자별로 저장됩니다.
        </Typography>
      ) : (
        <Box marginBottom={2}>
          <Alert severity="info">
            단가 수정은 현재 저장되지 않습니다. 실제 단가 변경은 운영 승인 플로우
            연결 후 제공됩니다.
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
              <TableCell>자원 유형</TableCell>
              <TableCell>과금 단위</TableCell>
              <TableCell>단가</TableCell>
              <TableCell>설명</TableCell>
              <TableCell>적용 여부</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((row, index) => (
              <TableRow key={row.resourceType}>
                <TableCell>{resourceLabels[row.resourceType]}</TableCell>
                <TableCell>{row.unit}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={drafts[row.resourceType] ?? String(row.price)}
                    onChange={e => updateDraft(row.resourceType, e.target.value)}
                    disabled={!writable}
                  />
                </TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell>
                  <Switch
                    checked={row.active}
                    onChange={() => toggleActive(index)}
                    size="small"
                    disabled={!writable}
                  />
                </TableCell>
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
          disabled={!writable || !dirty.length}
        >
          저장
        </Button>
        {writable && !dirty.length && (
          <Typography
            component="span"
            color="textSecondary"
            variant="body2"
            style={{ marginLeft: 12 }}
          >
            변경된 단가가 없습니다.
          </Typography>
        )}
      </Box>
    </Paper>
  );
};
