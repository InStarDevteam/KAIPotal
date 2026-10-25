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
import { ResourceAllocationPolicy } from './types';

interface ResourceAllocationPolicyPanelProps {
  policies: ResourceAllocationPolicy[];
}

export const ResourceAllocationPolicyPanel = ({ policies }: ResourceAllocationPolicyPanelProps) => {
  const [items, setItems] = useState(policies);

  const updateField = (id: string, field: keyof ResourceAllocationPolicy, value: string) => {
    setItems(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const toggleEnabled = (id: string) => {
    setItems(prev => prev.map(p => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  };

  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        자원할당 기준
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>정책명</TableCell>
              <TableCell>적용 대상</TableCell>
              <TableCell>CPU 기본</TableCell>
              <TableCell>GPU 기본</TableCell>
              <TableCell>Memory 기본</TableCell>
              <TableCell>Storage 기본</TableCell>
              <TableCell>Network 한도</TableCell>
              <TableCell>기본 크레딧</TableCell>
              <TableCell>승인 필요</TableCell>
              <TableCell>사용 여부</TableCell>
              <TableCell>마지막 변경일</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(p => (
              <TableRow key={p.id}>
                <TableCell>{p.id}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.target}</TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={p.cpu}
                    onChange={e => updateField(p.id, 'cpu', e.target.value)}
                    style={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={p.gpu}
                    onChange={e => updateField(p.id, 'gpu', e.target.value)}
                    style={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={p.memory}
                    onChange={e => updateField(p.id, 'memory', e.target.value)}
                    style={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={p.storage}
                    onChange={e => updateField(p.id, 'storage', e.target.value)}
                    style={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={p.network}
                    onChange={e => updateField(p.id, 'network', e.target.value)}
                    style={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>{p.defaultCredit.toLocaleString()}</TableCell>
                <TableCell>{p.requiresApproval ? '예' : '아니오'}</TableCell>
                <TableCell>
                  <Switch checked={p.enabled} onChange={() => toggleEnabled(p.id)} />
                </TableCell>
                <TableCell>{p.lastChangedAt}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
