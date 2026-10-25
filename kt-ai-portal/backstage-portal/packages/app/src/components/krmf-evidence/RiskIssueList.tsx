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
import { RiskIssue, ControlItem } from './types';
import { RiskSeverityChip } from './RiskSeverityChip';
import { IssueStatusChip } from './IssueStatusChip';
import { GatedButton, PermissionHint } from './KrmfPermissionGate';

export const RiskIssueList = ({
  issues,
  controls,
}: {
  issues: RiskIssue[];
  controls: ControlItem[];
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [dialogAction, setDialogAction] = useState<string | null>(null);

  const controlMap = useMemo(() => {
    const map = new Map<string, ControlItem>();
    controls.forEach(c => map.set(c.id, c));
    return map;
  }, [controls]);

  const filtered = useMemo(() => {
    return issues.filter(issue => {
      const matchesSeverity =
        severityFilter === 'all' || issue.severity === severityFilter;
      const matchesStatus =
        statusFilter === 'all' || issue.status === statusFilter;
      const matchesSearch =
        search.trim() === '' ||
        issue.title.includes(search) ||
        issue.owner.includes(search) ||
        issue.controlItemId.includes(search);
      return matchesSeverity && matchesStatus && matchesSearch;
    });
  }, [issues, severityFilter, statusFilter, search]);

  return (
    <Paper style={{ padding: 24 }}>
      <Typography variant="h6" gutterBottom>
        보안 미흡사항 조치관리
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
            label="위험도"
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            variant="outlined"
            size="small"
          >
            <MenuItem value="all">전체</MenuItem>
            <MenuItem value="low">낮음</MenuItem>
            <MenuItem value="medium">보통</MenuItem>
            <MenuItem value="high">높음</MenuItem>
            <MenuItem value="critical">긴급</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            select
            label="조치 상태"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            variant="outlined"
            size="small"
          >
            <MenuItem value="all">전체</MenuItem>
            <MenuItem value="registered">등록</MenuItem>
            <MenuItem value="in_progress">조치중</MenuItem>
            <MenuItem value="resolved">조치완료</MenuItem>
            <MenuItem value="reviewing">검토중</MenuItem>
            <MenuItem value="closed">종결</MenuItem>
            <MenuItem value="deferred">보류</MenuItem>
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
          label="조치 검토"
          onClick={() => setDialogAction('조치 검토')}
        />
        <GatedButton
          permission="krmf.review"
          label="종결 처리"
          onClick={() => setDialogAction('종결 처리')}
        />
        <PermissionHint permission="krmf.review" action="미흡사항 검토·종결" />
      </div>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>통제항목</TableCell>
              <TableCell>미흡사항</TableCell>
              <TableCell>위험도</TableCell>
              <TableCell>발견일</TableCell>
              <TableCell>담당자</TableCell>
              <TableCell>조치기한</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>조치내용</TableCell>
              <TableCell>잔여위험</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(issue => (
              <TableRow key={issue.id} hover>
                <TableCell>{issue.id}</TableCell>
                <TableCell>
                  {controlMap.get(issue.controlItemId)?.id ?? issue.controlItemId}
                </TableCell>
                <TableCell>{issue.title}</TableCell>
                <TableCell>
                  <RiskSeverityChip severity={issue.severity} />
                </TableCell>
                <TableCell>
                  {new Date(issue.foundAt).toLocaleDateString()}
                </TableCell>
                <TableCell>{issue.owner}</TableCell>
                <TableCell>{issue.dueDate}</TableCell>
                <TableCell>
                  <IssueStatusChip status={issue.status} />
                </TableCell>
                <TableCell>{issue.actionContent ?? '-'}</TableCell>
                <TableCell>{issue.residualRisk ?? '-'}</TableCell>
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
