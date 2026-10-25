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
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import { Evidence, EvidenceType, ControlItem } from './types';
import { EvidenceStatusChip } from './EvidenceStatusChip';
import { GatedButton, PermissionHint } from './KrmfPermissionGate';

const evidenceTypeLabels: Record<EvidenceType, string> = {
  policy_document: '정책문서',
  config_capture: '설정캡처',
  log_file: '로그파일',
  scan_report: '스캔보고서',
  approval_history: '승인이력',
  training_material: '교육자료',
  architecture_doc: '아키텍처',
  operational_procedure: '운영절차',
};

export const EvidenceList = ({
  evidences,
  controls,
}: {
  evidences: Evidence[];
  controls: ControlItem[];
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [dialogAction, setDialogAction] = useState<string | null>(null);

  const controlMap = useMemo(() => {
    const map = new Map<string, ControlItem>();
    controls.forEach(c => map.set(c.id, c));
    return map;
  }, [controls]);

  const filtered = useMemo(() => {
    return evidences.filter(ev => {
      const matchesStatus = statusFilter === 'all' || ev.status === statusFilter;
      const matchesType = typeFilter === 'all' || ev.type === typeFilter;
      const matchesSearch =
        search.trim() === '' ||
        ev.name.includes(search) ||
        ev.submitter.includes(search) ||
        ev.controlItemId.includes(search);
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [evidences, statusFilter, typeFilter, search]);

  return (
    <Paper style={{ padding: 24 }}>
      <Typography variant="h6" gutterBottom>
        증빙자료 현황
      </Typography>
      <Grid container spacing={2} style={{ marginBottom: 16 }}>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
            variant="outlined"
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            select
            label="증빙 상태"
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
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            select
            label="증빙 유형"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            variant="outlined"
            size="small"
          >
            <MenuItem value="all">전체</MenuItem>
            {Object.entries(evidenceTypeLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
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
          permission="krmf.evidence.submit"
          label="증빙 등록"
          variant="contained"
          onClick={() => setDialogAction('증빙 등록')}
        />
        <GatedButton
          permission="krmf.review"
          label="검토 시작"
          onClick={() => setDialogAction('검토 시작')}
        />
        <GatedButton
          permission="krmf.review"
          label="승인"
          onClick={() => setDialogAction('승인')}
        />
        <GatedButton
          permission="krmf.review"
          label="반려"
          color="secondary"
          onClick={() => setDialogAction('반려')}
        />
        <PermissionHint permission="krmf.evidence.submit" action="증빙 등록" />
        <PermissionHint permission="krmf.review" action="검토·승인·반려" />
      </div>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>통제항목</TableCell>
              <TableCell>증빙명</TableCell>
              <TableCell>유형</TableCell>
              <TableCell>제출자</TableCell>
              <TableCell>제출일</TableCell>
              <TableCell>검토자</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>파일</TableCell>
              <TableCell>버전</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(ev => (
              <TableRow key={ev.id} hover>
                <TableCell>{ev.id}</TableCell>
                <TableCell>
                  {controlMap.get(ev.controlItemId)?.id ?? ev.controlItemId}
                </TableCell>
                <TableCell>{ev.name}</TableCell>
                <TableCell>{evidenceTypeLabels[ev.type]}</TableCell>
                <TableCell>{ev.submitter}</TableCell>
                <TableCell>
                  {new Date(ev.submittedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>{ev.reviewer ?? '-'}</TableCell>
                <TableCell>
                  <EvidenceStatusChip status={ev.status} />
                </TableCell>
                <TableCell>{ev.filename}</TableCell>
                <TableCell>{ev.version}</TableCell>
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
