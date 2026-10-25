import { useState, useMemo } from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import MenuItem from '@material-ui/core/MenuItem';
import Grid from '@material-ui/core/Grid';
import Chip from '@material-ui/core/Chip';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import { ExternalSubmission, ControlItem } from './types';
import { EvidenceStatusChip } from './EvidenceStatusChip';
import { GatedButton, PermissionHint } from './KrmfPermissionGate';

export const ExternalSubmissionList = ({
  submissions,
  controls,
}: {
  submissions: ExternalSubmission[];
  controls: ControlItem[];
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [dialogAction, setDialogAction] = useState<string | null>(null);

  const controlMap = useMemo(() => {
    const map = new Map<string, ControlItem>();
    controls.forEach(c => map.set(c.id, c));
    return map;
  }, [controls]);

  const filtered = useMemo(() => {
    return submissions.filter(sub => {
      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
      const matchesSearch =
        search.trim() === '' ||
        sub.vendorName.includes(search) ||
        sub.evidenceName.includes(search) ||
        sub.controlItemId.includes(search);
      return matchesStatus && matchesSearch;
    });
  }, [submissions, statusFilter, search]);

  return (
    <Paper style={{ padding: 24 }}>
      <Typography variant="h6" gutterBottom>
        타 수행사 제출자료 관리
      </Typography>
      <Grid container spacing={2} style={{ marginBottom: 16 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
            variant="outlined"
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            select
            label="검토 상태"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            variant="outlined"
            size="small"
          >
            <MenuItem value="all">전체</MenuItem>
            <MenuItem value="not_submitted">미제출</MenuItem>
            <MenuItem value="submitted">제출완료</MenuItem>
            <MenuItem value="reviewing">검토중</MenuItem>
            <MenuItem value="revision_requested">보완요청</MenuItem>
            <MenuItem value="approved">승인</MenuItem>
            <MenuItem value="rejected">반려</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <GatedButton
          permission="krmf.review"
          label="검토 승인"
          onClick={() => setDialogAction('검토 승인')}
        />
        <GatedButton
          permission="krmf.review"
          label="보완 요청"
          color="secondary"
          onClick={() => setDialogAction('보완 요청')}
        />
        <PermissionHint
          permission="krmf.review"
          action="타 수행사 자료 검토"
        />
      </div>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>수행사</TableCell>
              <TableCell>증빙명</TableCell>
              <TableCell>통제항목</TableCell>
              <TableCell>제출일</TableCell>
              <TableCell>검토자</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>보완요청</TableCell>
              <TableCell>검토결과</TableCell>
              <TableCell>비고</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(sub => (
              <TableRow key={sub.id} hover>
                <TableCell>{sub.id}</TableCell>
                <TableCell>{sub.vendorName}</TableCell>
                <TableCell>{sub.evidenceName}</TableCell>
                <TableCell>
                  {controlMap.get(sub.controlItemId)?.id ?? sub.controlItemId}
                </TableCell>
                <TableCell>
                  {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>{sub.reviewer ?? '-'}</TableCell>
                <TableCell>
                  <EvidenceStatusChip status={sub.status} />
                </TableCell>
                <TableCell>
                  {sub.revisionRequested ? (
                    <Chip size="small" color="secondary" label="요청" />
                  ) : (
                    <Chip size="small" label="없음" />
                  )}
                </TableCell>
                <TableCell>{sub.reviewResult ?? '-'}</TableCell>
                <TableCell>{sub.note ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogAction !== null} onClose={() => setDialogAction(null)}>
        <DialogTitle>{dialogAction}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            기준 데이터 환경에서는 실제 저장이 수행되지 않습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogAction(null)} color="primary">
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
