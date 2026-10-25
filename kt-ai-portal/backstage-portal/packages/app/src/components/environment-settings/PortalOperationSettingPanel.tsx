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
import { useState } from 'react';
import { PortalOperationSetting } from './types';

interface PortalOperationSettingPanelProps {
  settings: PortalOperationSetting[];
}

export const PortalOperationSettingPanel = ({ settings }: PortalOperationSettingPanelProps) => {
  const [items, setItems] = useState(settings);

  const updateValue = (id: string, value: string) => {
    setItems(prev => prev.map(s => (s.id === id ? { ...s, value } : s)));
  };

  const toggleEnabled = (id: string) => {
    setItems(prev => prev.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        포털 운영 설정
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>설정명</TableCell>
              <TableCell>설명</TableCell>
              <TableCell>값</TableCell>
              <TableCell>적용 화면</TableCell>
              <TableCell>담당자</TableCell>
              <TableCell>변경 가능</TableCell>
              <TableCell>승인 필요</TableCell>
              <TableCell>사용 여부</TableCell>
              <TableCell>마지막 변경일</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(s => (
              <TableRow key={s.id}>
                <TableCell>{s.id}</TableCell>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.description}</TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={s.value}
                    onChange={e => updateValue(s.id, e.target.value)}
                    disabled={!s.editable}
                    style={{ width: 160 }}
                  />
                </TableCell>
                <TableCell>{s.screen}</TableCell>
                <TableCell>{s.owner}</TableCell>
                <TableCell>{s.editable ? '예' : '아니오'}</TableCell>
                <TableCell>{s.requiresApproval ? '예' : '아니오'}</TableCell>
                <TableCell>
                  <Switch checked={s.enabled} onChange={() => toggleEnabled(s.id)} />
                </TableCell>
                <TableCell>{s.lastChangedAt}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
