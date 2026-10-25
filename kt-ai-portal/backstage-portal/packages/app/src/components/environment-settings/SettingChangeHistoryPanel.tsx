import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { useState } from 'react';
import { SettingChangeHistory } from './types';
import {
  readDemoSettingChangeHistory,
  settingChangeHistoryStorageKey,
} from './environmentSettingsDemoStore';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';

interface SettingChangeHistoryPanelProps {
  history: SettingChangeHistory[];
}

export const SettingChangeHistoryPanel = ({ history }: SettingChangeHistoryPanelProps) => {
  const { tenantId, isDemo } = usePortalRuntime();
  const [stored] = useState(() =>
    isDemo && tenantId
      ? readDemoSettingChangeHistory(settingChangeHistoryStorageKey(tenantId))
      : { items: [] as SettingChangeHistory[], error: undefined },
  );
  const merged = [...stored.items, ...history];

  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        설정 변경 이력
      </Typography>
      {stored.error && (
        <Typography color="error" variant="body2" paragraph>
          {stored.error}
        </Typography>
      )}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>일시</TableCell>
              <TableCell>변경자</TableCell>
              <TableCell>카테고리</TableCell>
              <TableCell>설정명</TableCell>
              <TableCell>이전 값</TableCell>
              <TableCell>변경 값</TableCell>
              <TableCell>사유</TableCell>
              <TableCell>승인자</TableCell>
              <TableCell>적용 상태</TableCell>
              <TableCell>IP</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {merged.map(h => (
              <TableRow key={h.id}>
                <TableCell>{h.occurredAt}</TableCell>
                <TableCell>{h.changedBy}</TableCell>
                <TableCell>{h.category}</TableCell>
                <TableCell>{h.settingName}</TableCell>
                <TableCell>{h.oldValue}</TableCell>
                <TableCell>{h.newValue}</TableCell>
                <TableCell>{h.reason}</TableCell>
                <TableCell>{h.approver ?? '-'}</TableCell>
                <TableCell>{h.applyStatus}</TableCell>
                <TableCell>{h.ip}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
