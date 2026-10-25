import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import RefreshIcon from '@material-ui/icons/Refresh';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { classifyPortalClientError } from '../portal-runtime/portalClientError';
import {
  emptyWorkspaceDraft,
  ServerWorkspaceRequest,
  WorkspaceDraft,
  WorkspaceProjectOption,
  validateServerWorkspace,
  workspaceOnly,
  workspaceRequestPayload,
  workspaceStatusLabel,
} from './workspaceServerModel';

interface RequestPage {
  items: ServerWorkspaceRequest[];
  nextCursor: string | null;
}

/** Persists portal requests; an approval does not imply an external resource exists. */
export const ServerWorkRequests = () => {
  const runtime = usePortalRuntime();
  const currentRequest = useRef(runtime.request);
  currentRequest.current = runtime.request;
  const [params] = useSearchParams();
  const canRequest = runtime.permissions.includes('workspace.request');
  const canReview = runtime.permissions.some(permission =>
    ['workspace.approve', 'project.approve'].includes(permission),
  );
  const [projects, setProjects] = useState<WorkspaceProjectOption[]>([]);
  const [projectTotal, setProjectTotal] = useState(0);
  const [projectPage, setProjectPage] = useState(1);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsFailure, setProjectsFailure] = useState('');
  const [myRequests, setMyRequests] = useState<ServerWorkspaceRequest[]>([]);
  const [reviews, setReviews] = useState<ServerWorkspaceRequest[]>([]);
  const [myCursor, setMyCursor] = useState<string | null>(null);
  const [reviewCursor, setReviewCursor] = useState<string | null>(null);
  const [draft, setDraft] = useState<WorkspaceDraft>({
    ...emptyWorkspaceDraft,
    projectId: params.get('project') ?? '',
  });
  const selectedProject = useRef(draft.projectId);
  selectedProject.current = draft.projectId;
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState<{
    row: ServerWorkspaceRequest;
    value: 'approved' | 'rejected';
  } | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    let current = true;
    setLoading(true);
    setLoadError(null);
    setProjectsLoading(false);
    Promise.all([
      (async () => {
        const response = await runtime.request<{ items: WorkspaceProjectOption[]; pagination: { total: number } }>(
          '/v1/projects?mine=true&status=active&page=1&pageSize=50',
        );
        const selectedId = selectedProject.current;
        if (selectedId && !response.data.items.some(project => project.id === selectedId)) {
          try {
            const selected = await runtime.request<{ project: WorkspaceProjectOption; members: { user_id: string }[] }>(`/v1/projects/${encodeURIComponent(selectedId)}`);
            if (selected.data.project.status === 'active' && selected.data.members.some(member => member.user_id === runtime.actorId)) {
              response.data.items.push(selected.data.project);
            }
          } catch { /* A deleted or inaccessible selection is replaced below. */ }
        }
        return response;
      })(),
      runtime.request<RequestPage>('/v1/work/requests?limit=100'),
      canReview
        ? runtime.request<RequestPage>('/v1/work/approvals?limit=100')
        : Promise.resolve({ data: { items: [], nextCursor: null } }),
    ])
      .then(([projectResponse, mine, queue]) => {
        if (!current) return;
        const available = projectResponse.data.items.filter(
          project => project.status === 'active',
        );
        setProjects(available);
        setProjectTotal(projectResponse.data.pagination.total);
        setProjectPage(1);
        setProjectsFailure('');
        setMyRequests(workspaceOnly(mine.data.items));
        setMyCursor(mine.data.nextCursor);
        setReviews(workspaceOnly(queue.data.items));
        setReviewCursor(queue.data.nextCursor);
        setDraft(previous => ({
          ...previous,
          projectId: available.some(
            project => project.id === previous.projectId,
          )
            ? previous.projectId
            : available[0]?.id ?? '',
        }));
      })
      .catch(error => {
        if (current) setLoadError(classifyPortalClientError(error).message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [runtime, canReview, reload]);

  const loadMoreProjects = async () => {
    if (projectsLoading) return;
    setProjectsLoading(true);
    setProjectsFailure('');
    try {
      const response = await runtime.request<{ items: WorkspaceProjectOption[]; pagination: { total: number } }>(
        `/v1/projects?mine=true&status=active&page=${projectPage + 1}&pageSize=50`,
      );
      if (currentRequest.current !== runtime.request) return;
      setProjects(previous => Array.from(new Map([...previous, ...response.data.items].map(project => [project.id, project])).values()));
      setProjectTotal(response.data.pagination.total);
      setProjectPage(value => value + 1);
    } catch (error) {
      if (currentRequest.current === runtime.request) setProjectsFailure(classifyPortalClientError(error).message);
    } finally {
      if (currentRequest.current === runtime.request) setProjectsLoading(false);
    }
  };

  const setField = (field: keyof WorkspaceDraft, value: string) =>
    setDraft(previous => ({ ...previous, [field]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canRequest || busy) return;
    const validation = validateServerWorkspace(draft, projects);
    if (validation) {
      setNotice({ message: validation, error: true });
      return;
    }
    const project = projects.find(entry => entry.id === draft.projectId)!;
    setBusy(true);
    setNotice(null);
    try {
      await runtime.request('/v1/work/requests', {
        method: 'POST',
        body: JSON.stringify(workspaceRequestPayload(draft, project)),
      });
      setNotice({
        message:
          '작업환경 신청을 접수했습니다. 승인 후 플랫폼의 자원 생성 절차가 이어집니다.',
        error: false,
      });
      setDraft({ ...emptyWorkspaceDraft, projectId: project.id });
      setReload(value => value + 1);
    } catch (error) {
      setNotice({
        message: classifyPortalClientError(error).message,
        error: true,
      });
    } finally {
      setBusy(false);
    }
  };
  const decide = async () => {
    if (
      !decision ||
      !canReview ||
      busy ||
      (decision.value === 'rejected' && !reason.trim())
    )
      return;
    setBusy(true);
    setNotice(null);
    try {
      await runtime.request(
        `/v1/work/approvals/${encodeURIComponent(decision.row.id)}/decisions`,
        {
          method: 'POST',
          body: JSON.stringify({
            decision: decision.value,
            expectedVersion: decision.row.version,
            note: reason.trim(),
          }),
        },
      );
      setNotice({
        message:
          decision.value === 'approved'
            ? '신청을 승인했습니다. 실제 자원 생성은 플랫폼 연계 후 진행됩니다.'
            : '반려 사유와 처리 결과를 저장했습니다.',
        error: false,
      });
      setDecision(null);
      setReload(value => value + 1);
    } catch (error) {
      setNotice({
        message: classifyPortalClientError(error).message,
        error: true,
      });
      setDecision(null);
      setReload(value => value + 1);
    } finally {
      setBusy(false);
    }
  };
  const loadMore = async (review: boolean) => {
    const cursor = review ? reviewCursor : myCursor;
    if (!cursor || busy) return;
    setBusy(true);
    try {
      const result = await runtime.request<RequestPage>(
        `/v1/work/${
          review ? 'approvals' : 'requests'
        }?limit=100&cursor=${encodeURIComponent(cursor)}`,
      );
      if (review) {
        setReviews(previous => [
          ...previous,
          ...workspaceOnly(result.data.items),
        ]);
        setReviewCursor(result.data.nextCursor);
      } else {
        setMyRequests(previous => [
          ...previous,
          ...workspaceOnly(result.data.items),
        ]);
        setMyCursor(result.data.nextCursor);
      }
    } catch (error) {
      setNotice({
        message: classifyPortalClientError(error).message,
        error: true,
      });
    } finally {
      setBusy(false);
    }
  };
  const textField = (
    field: keyof WorkspaceDraft,
    label: string,
    required = false,
    type = 'text',
  ) => (
    <TextField
      fullWidth
      variant="outlined"
      size="small"
      id={`server-workspace-${field}`}
      label={label}
      required={required}
      type={type}
      value={draft[field]}
      onChange={event => setField(field, event.target.value)}
      disabled={busy}
      inputProps={{
        ...(type === 'number'
          ? { min: field === 'gpuCount' ? 0 : 1, step: 1 }
          : { maxLength: 2000 }),
      }}
      InputLabelProps={type === 'date' ? { shrink: true } : undefined}
    />
  );
  const requestTable = (rows: ServerWorkspaceRequest[], review = false) => (
    <TableContainer
      component={Paper}
      variant="outlined"
      className="project-table"
    >
      <Table
        size="small"
        aria-label={
          review ? '작업환경 승인 대기 목록' : '내 작업환경 신청 목록'
        }
      >
        <TableHead>
          <TableRow>
            <TableCell>신청 / 프로젝트</TableCell>
            <TableCell>요청 자원</TableCell>
            <TableCell>사용기간</TableCell>
            <TableCell>상태</TableCell>
            <TableCell>{review ? '검토' : '신청일'}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                {review
                  ? '현재 검토할 작업환경 신청이 없습니다.'
                  : '아직 접수한 작업환경 신청이 없습니다.'}
              </TableCell>
            </TableRow>
          ) : (
            rows.map(row => (
              <TableRow key={row.id}>
                <TableCell style={{ minWidth: 220 }}>
                  <Typography style={{ fontWeight: 700 }}>
                    {row.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {row.payload?.projectName ??
                      projects.find(project => project.id === row.project_id)
                        ?.name ??
                      '프로젝트 정보 확인 필요'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    CPU {row.payload?.cpuCores ?? '—'} · GPU{' '}
                    {row.payload?.gpuCount ?? '—'}
                  </Typography>
                  <Typography variant="body2">
                    메모리 {row.payload?.memoryGiB ?? '—'} GiB · 저장소{' '}
                    {row.payload?.storageGiB ?? '—'} GiB
                  </Typography>
                </TableCell>
                <TableCell style={{ whiteSpace: 'nowrap' }}>
                  {row.payload?.startDate ?? '—'}
                  <br />
                  {row.payload?.endDate ?? '—'}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={workspaceStatusLabel(row.status)}
                    color={row.status === 'approved' ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  {review ? (
                    <Box display="flex" style={{ gap: 8 }}>
                      <Button
                        size="small"
                        color="primary"
                        variant="outlined"
                        disabled={busy}
                        onClick={() => {
                          setDecision({ row, value: 'approved' });
                          setReason('');
                        }}
                      >
                        승인
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={busy}
                        onClick={() => {
                          setDecision({ row, value: 'rejected' });
                          setReason('');
                        }}
                      >
                        반려
                      </Button>
                    </Box>
                  ) : (
                    new Date(row.created_at).toLocaleDateString('ko-KR')
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      <Box className="project-toolbar" mb={2}>
        <Typography color="textSecondary">
          포털에서 신청·승인을 처리하고 실제 작업은 각 플랫폼에서 진행합니다.
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          disabled={loading || busy}
          onClick={() => setReload(value => value + 1)}
        >
          새로고침
        </Button>
      </Box>
      {notice && (
        <Box mb={2}>
          <Alert
            severity={notice.error ? 'error' : 'success'}
            onClose={() => setNotice(null)}
          >
            {notice.message}
          </Alert>
        </Box>
      )}
      {loadError && (
        <Box mb={2}>
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                onClick={() => setReload(value => value + 1)}
              >
                다시 시도
              </Button>
            }
          >
            {loadError}
          </Alert>
        </Box>
      )}
      {loading && (
        <Typography role="status">
          프로젝트와 신청 내역을 불러오는 중입니다.
        </Typography>
      )}
      {!loading && !loadError && (
        <>
          {canRequest &&
            (projects.length === 0 ? (
              <Paper
                variant="outlined"
                style={{ padding: 24, marginBottom: 24 }}
              >
                <Typography variant="h6" gutterBottom>
                  먼저 프로젝트에 참여하세요
                </Typography>
                <Typography color="textSecondary" paragraph>
                  진행 중인 참여 프로젝트가 있어야 작업환경을 신청할 수
                  있습니다.
                </Typography>
                <Button
                  component={Link}
                  role="link"
                  to="/project-workspace?tab=projects"
                  color="primary"
                  variant="contained"
                >
                  프로젝트 목록으로
                </Button>
              </Paper>
            ) : (
              <Paper
                variant="outlined"
                style={{ padding: 24, marginBottom: 24 }}
              >
                <form onSubmit={submit}>
                  <Typography
                    variant="h6"
                    style={{ fontWeight: 700 }}
                    gutterBottom
                  >
                    작업환경 신청
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        select
                        variant="outlined"
                        size="small"
                        id="server-workspace-project"
                        label="프로젝트 선택"
                        required
                        value={draft.projectId}
                        onChange={event =>
                          setField('projectId', event.target.value)
                        }
                        disabled={busy}
                      >
                        {projects.map(project => (
                          <MenuItem key={project.id} value={project.id}>
                            {project.name}
                          </MenuItem>
                        ))}
                      </TextField>
                      <Typography variant="caption" color="textSecondary" display="block">
                        참여 프로젝트 {projectTotal.toLocaleString()}개 중 {projects.length.toLocaleString()}개 표시
                      </Typography>
                      {projectsFailure && <Alert severity="warning">{projectsFailure}</Alert>}
                      {projects.length < projectTotal && (
                        <Button size="small" onClick={() => { void loadMoreProjects(); }} disabled={projectsLoading || busy}>
                          {projectsLoading ? '불러오는 중' : '프로젝트 더 불러오기'}
                        </Button>
                      )}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {textField('workspaceName', '워크스페이스명', true)}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        select
                        variant="outlined"
                        size="small"
                        id="server-workspace-type"
                        label="작업 유형"
                        value={draft.requestType}
                        onChange={event =>
                          setField('requestType', event.target.value)
                        }
                      >
                        <MenuItem value="ai">AI 작업환경</MenuItem>
                        <MenuItem value="data">데이터 작업환경</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        select
                        variant="outlined"
                        size="small"
                        id="server-workspace-security"
                        label="보안등급"
                        value={draft.securityLevel}
                        onChange={event =>
                          setField('securityLevel', event.target.value)
                        }
                      >
                        {['공개', '내부', '비밀'].map(level => (
                          <MenuItem key={level} value={level}>
                            {level}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    {(
                      [
                        ['cpuCores', 'CPU (Core)'],
                        ['gpuCount', 'GPU (개)'],
                        ['memoryGiB', '메모리 (GiB)'],
                        ['storageGiB', '저장소 (GiB)'],
                      ] as const
                    ).map(([field, label]) => (
                      <Grid key={field} item xs={6} md={3}>
                        {textField(field, label, true, 'number')}
                      </Grid>
                    ))}
                    <Grid item xs={12} sm={6}>
                      {textField('startDate', '사용 시작일', true, 'date')}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {textField('endDate', '사용 종료일', true, 'date')}
                    </Grid>
                    <Grid item xs={12}>
                      {textField('purpose', '이용목적')}
                    </Grid>
                  </Grid>
                  <Accordion
                    variant="outlined"
                    style={{ marginTop: 20, marginBottom: 20 }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>
                        데이터·모델·도구와 보관 정책 (선택)
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="textSecondary">
                            필요한 항목을 이름 또는 식별자로 입력하세요. 제공
                            가능 여부는 플랫폼 검토 단계에서 확인합니다.
                          </Typography>
                        </Grid>
                        {(
                          [
                            ['datasets', '활용 데이터셋'],
                            ['models', '활용 모델'],
                            ['frameworks', '프레임워크·라이브러리'],
                            ['labelingTools', '라벨링 도구'],
                            ['visualizationTools', '시각화 도구'],
                            ['trainingDataTools', '학습데이터 도구'],
                            ['persistenceLocation', '결과 보관 위치'],
                          ] as const
                        ).map(([field, label]) => (
                          <Grid key={field} item xs={12} sm={6}>
                            {textField(field, label)}
                          </Grid>
                        ))}
                        {(
                          [
                            ['usesCredit', '크레딧 사용'],
                            ['deidentificationRequired', '비식별화 필요'],
                            ['performanceLinkage', '성과등록·반출 연계'],
                          ] as const
                        ).map(([field, label]) => (
                          <Grid key={field} item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              select
                              size="small"
                              variant="outlined"
                              id={`server-workspace-${field}`}
                              label={label}
                              value={draft[field]}
                              onChange={event =>
                                setField(field, event.target.value)
                              }
                            >
                              <MenuItem value="yes">예</MenuItem>
                              <MenuItem value="no">아니오</MenuItem>
                            </TextField>
                          </Grid>
                        ))}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={busy}
                  >
                    {busy ? '접수 중…' : '신청 제출'}
                  </Button>
                </form>
              </Paper>
            ))}
          {canReview && (
            <Box mb={3}>
              <Typography variant="h6" gutterBottom>
                작업환경 승인 대기 <Chip size="small" label={reviews.length} />
              </Typography>
              {requestTable(reviews, true)}
              {reviewCursor && (
                <Button disabled={busy} onClick={() => void loadMore(true)}>
                  승인 대기 더 보기
                </Button>
              )}
            </Box>
          )}
          <Typography variant="h6" gutterBottom>
            내 신청 내역
          </Typography>
          {requestTable(myRequests)}
          {myCursor && (
            <Button disabled={busy} onClick={() => void loadMore(false)}>
              신청 내역 더 보기
            </Button>
          )}
        </>
      )}
      <Dialog
        open={!!decision}
        onClose={() => {
          if (!busy) setDecision(null);
        }}
        maxWidth="sm"
        fullWidth
        aria-labelledby="workspace-decision-title"
      >
        <DialogTitle id="workspace-decision-title">
          작업환경 신청 {decision?.value === 'approved' ? '승인' : '반려'}
        </DialogTitle>
        <DialogContent>
          <Typography style={{ fontWeight: 700 }} gutterBottom>
            {decision?.row.title}
          </Typography>
          {decision && (
            <Box className="workspace-step-summary">
              <Typography variant="body2">
                프로젝트: {decision.row.payload?.projectName ?? '확인 필요'} ·
                보안등급: {decision.row.payload?.securityLevel ?? '미입력'}
              </Typography>
              <Typography variant="body2">
                CPU {decision.row.payload?.cpuCores ?? '—'} / GPU{' '}
                {decision.row.payload?.gpuCount ?? '—'} / 메모리{' '}
                {decision.row.payload?.memoryGiB ?? '—'} GiB / 저장소{' '}
                {decision.row.payload?.storageGiB ?? '—'} GiB
              </Typography>
              <Typography variant="body2">
                사용기간: {decision.row.payload?.startDate ?? '—'} ~{' '}
                {decision.row.payload?.endDate ?? '—'}
              </Typography>
              {(
                [
                  'purpose',
                  'datasets',
                  'models',
                  'frameworks',
                  'labelingTools',
                  'visualizationTools',
                  'trainingDataTools',
                  'persistenceLocation',
                ] as const
              ).map(field =>
                decision.row.payload?.[field] ? (
                  <Typography variant="body2" key={field}>
                    {
                      (
                        {
                          purpose: '목적',
                          datasets: '데이터셋',
                          models: '모델',
                          frameworks: '프레임워크',
                          labelingTools: '라벨링',
                          visualizationTools: '시각화',
                          trainingDataTools: '학습데이터',
                          persistenceLocation: '보관 위치',
                        } as const
                      )[field]
                    }
                    : {decision.row.payload[field]}
                  </Typography>
                ) : null,
              )}
            </Box>
          )}
          <Typography color="textSecondary" paragraph>
            신청 승인과 실제 자원 생성은 별도 단계입니다. 처리 결과와 검토
            의견은 서버에 기록됩니다.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={2}
            variant="outlined"
            id="server-workspace-review-reason"
            label="검토 의견"
            required={decision?.value === 'rejected'}
            value={reason}
            onChange={event => setReason(event.target.value)}
            inputProps={{ maxLength: 500 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDecision(null)} disabled={busy}>
            취소
          </Button>
          <Button
            color="primary"
            disabled={
              busy || (decision?.value === 'rejected' && !reason.trim())
            }
            onClick={() => void decide()}
          >
            처리 확정
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
