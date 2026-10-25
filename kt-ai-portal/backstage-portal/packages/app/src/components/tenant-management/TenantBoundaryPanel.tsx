import Paper from '@material-ui/core/Paper';
import Switch from '@material-ui/core/Switch';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { useState } from 'react';
import { TenantBoundaryPolicy } from './types';
import { BranchChip } from './BranchChip';

interface TenantBoundaryPanelProps {
  policies: TenantBoundaryPolicy[];
}

export const TenantBoundaryPanel = ({ policies }: TenantBoundaryPanelProps) => {
  const [items, setItems] = useState(policies);

  const toggleStatus = (id: string) => {
    setItems(prev =>
      prev.map(p =>
        p.id === id ? { ...p, status: p.status === '활성' ? '비활성' : '활성' } : p
      )
    );
  };

  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        테넌트 경계/분리 정책
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>정책 ID</TableCell>
              <TableCell>정책명</TableCell>
              <TableCell>적용 군</TableCell>
              <TableCell>분리 대상</TableCell>
              <TableCell>분리 방식</TableCell>
              <TableCell>접근 가능 역할</TableCell>
              <TableCell>데이터 접근 등급</TableCell>
              <TableCell>외부 사용자 접근</TableCell>
              <TableCell>교차 접근 허용</TableCell>
              <TableCell>감사로그 필수</TableCell>
              <TableCell>상태</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(p => (
              <TableRow key={p.id}>
                <TableCell>{p.id}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>
                  <BranchChip branch={p.branch} />
                </TableCell>
                <TableCell>{p.target}</TableCell>
                <TableCell>{p.method}</TableCell>
                <TableCell>{p.allowedRoles.join(', ')}</TableCell>
                <TableCell>{p.dataAccessLevel}</TableCell>
                <TableCell>{p.externalUserAllowed ? '예' : '아니오'}</TableCell>
                <TableCell>{p.crossAccessAllowed ? '예' : '아니오'}</TableCell>
                <TableCell>{p.auditLogRequired ? '예' : '아니오'}</TableCell>
                <TableCell>
                  <Switch
                    checked={p.status === '활성'}
                    onChange={() => toggleStatus(p.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
