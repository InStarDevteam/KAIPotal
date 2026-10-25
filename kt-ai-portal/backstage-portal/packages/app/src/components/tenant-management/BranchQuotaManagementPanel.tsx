import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { useState } from 'react';
import { BranchQuota } from './types';
import { BranchChip } from './BranchChip';
import { QuotaStatusChip } from './QuotaStatusChip';

interface BranchQuotaManagementPanelProps {
  quotas: BranchQuota[];
}

export const BranchQuotaManagementPanel = ({ quotas }: BranchQuotaManagementPanelProps) => {
  const [items, setItems] = useState(quotas);

  const handleApprove = (id: string) => {
    setItems(prev => prev.map(q => (q.id === id ? { ...q, processStatus: '승인' as const } : q)));
  };

  const handleReject = (id: string) => {
    setItems(prev => prev.map(q => (q.id === id ? { ...q, processStatus: '반려' as const } : q)));
  };

  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        군별 쿼터 관리
      </Typography>
      <Box marginBottom={2}>
        <Button variant="contained" color="primary" disabled>
          쿼터 변경 요청
        </Button>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>쿼터 ID</TableCell>
              <TableCell>군 구분</TableCell>
              <TableCell>적용 대상</TableCell>
              <TableCell>리소스 유형</TableCell>
              <TableCell>현재 쿼터</TableCell>
              <TableCell>요청 쿼터</TableCell>
              <TableCell>변경 유형</TableCell>
              <TableCell>변경 사유</TableCell>
              <TableCell>요청자</TableCell>
              <TableCell>승인자</TableCell>
              <TableCell>요청일</TableCell>
              <TableCell>처리 상태</TableCell>
              <TableCell>조치</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(q => (
              <TableRow key={q.id}>
                <TableCell>{q.id}</TableCell>
                <TableCell>
                  <BranchChip branch={q.branch} />
                </TableCell>
                <TableCell>{q.target}</TableCell>
                <TableCell>{q.resourceType}</TableCell>
                <TableCell>{q.currentQuota}</TableCell>
                <TableCell>{q.requestedQuota}</TableCell>
                <TableCell>{q.changeType}</TableCell>
                <TableCell>{q.reason}</TableCell>
                <TableCell>{q.requester}</TableCell>
                <TableCell>{q.approver ?? '-'}</TableCell>
                <TableCell>{q.requestedAt}</TableCell>
                <TableCell>
                  <QuotaStatusChip status={q.processStatus} />
                </TableCell>
                <TableCell>
                  <Box display="flex" style={{ gap: 8 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={q.processStatus !== '요청' && q.processStatus !== '검토중'}
                      onClick={() => handleApprove(q.id)}
                    >
                      승인
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      disabled={q.processStatus !== '요청' && q.processStatus !== '검토중'}
                      onClick={() => handleReject(q.id)}
                    >
                      반려
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
