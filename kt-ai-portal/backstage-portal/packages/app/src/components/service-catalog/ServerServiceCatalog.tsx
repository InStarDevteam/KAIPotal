import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PortalPagination } from '../common/PortalPagination';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Chip from '@material-ui/core/Chip';
import Divider from '@material-ui/core/Divider';
import FormControl from '@material-ui/core/FormControl';
import Grid from '@material-ui/core/Grid';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import Select from '@material-ui/core/Select';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import Alert from '@material-ui/lab/Alert';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import {
  classifyPortalClientError,
  PortalClientError,
} from '../portal-runtime/portalClientError';
import {
  ServerCatalogApplication,
  ServerCatalogItem,
  describeApplicationExecution,
  mapServerCatalogApplication,
  mapServerCatalogItem,
} from './catalogServerData';
import {
  ServerProjectSummary,
  mapServerProjectSummary,
} from '../project-workspace/projectServerData';

interface ListResponse {
  summary?: { total: number; applicable: number; categories: Record<string, number> };
  items: Array<Record<string, unknown>>;
  pagination: { page: number; pageSize: number; total: number };
}

type ServerCatalogTab = '전체' | '내 신청 이력' | string;

const CATEGORY_TABS = ['analysis', 'development', 'data', 'visualization', 'labeling'];
const CATEGORY_LABELS: Record<string, string> = {
  analysis: '분석',
  development: '개발',
  data: '데이터',
  visualization: '시각화',
  labeling: '라벨링',
};

const newIdempotencyKey = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const ServerServiceCatalog = () => {
  const runtime = usePortalRuntime();
  const currentRequest = useRef(runtime.request);
  currentRequest.current = runtime.request;
  const canDecide =
    runtime.permissions.includes('workspace.approve') ||
    runtime.permissions.includes('project.approve');
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get('tab') || '전체';
  const activeTab: ServerCatalogTab = ['전체', '내 신청 이력', ...CATEGORY_TABS].includes(requestedTab)
    ? requestedTab : '전체';
  const requestedPage = Number(params.get('page') || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [itemTotal, setItemTotal] = useState(0);
  const [applicationTotal, setApplicationTotal] = useState(0);
  const [summary, setSummary] = useState<ListResponse['summary']>();
  const [items, setItems] = useState<ServerCatalogItem[]>([]);
  const [applications, setApplications] = useState<ServerCatalogApplication[]>([]);
  const [projects, setProjects] = useState<ServerProjectSummary[]>([]);
  const [projectTotal, setProjectTotal] = useState(0);
  const [projectPage, setProjectPage] = useState(1);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsFailure, setProjectsFailure] = useState('');
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<PortalClientError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applyProjectId, setApplyProjectId] = useState('');
  const [applyReason, setApplyReason] = useState('');
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailure(null);
    const category = CATEGORY_TABS.includes(activeTab) ? `&category=${activeTab}` : '';
    Promise.all([
      runtime.request<ListResponse>(`/v1/catalog/items?active=true&page=${activeTab === '내 신청 이력' ? 1 : page}&pageSize=20${category}`),
      runtime.request<ListResponse>(`/v1/catalog/applications?page=${activeTab === '내 신청 이력' ? page : 1}&pageSize=20`),
    ])
      .then(([itemsResponse, applicationsResponse]) => {
        if (!active) return;
        setItems(
          (itemsResponse.data.items ?? [])
            .map(mapServerCatalogItem)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
        );
        setApplications(
          (applicationsResponse.data.items ?? []).map(mapServerCatalogApplication),
        );
        setItemTotal(itemsResponse.data.pagination.total);
        setApplicationTotal(applicationsResponse.data.pagination.total);
        setSummary(itemsResponse.data.summary);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setFailure(classifyPortalClientError(error));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [runtime, reloadToken, activeTab, page]);

  useEffect(() => {
    let active = true;
    setProjectsLoading(true);
    setProjectsFailure('');
    setProjects([]);
    setApplyProjectId('');
    setProjectPage(1);
    runtime.request<ListResponse>('/v1/projects?mine=true&status=active&page=1&pageSize=50')
      .then(response => {
        if (!active) return;
        setProjects(response.data.items.map(mapServerProjectSummary));
        setProjectTotal(response.data.pagination.total);
      })
      .catch(error => { if (active) setProjectsFailure(classifyPortalClientError(error).message); })
      .finally(() => { if (active) setProjectsLoading(false); });
    return () => { active = false; };
  }, [runtime]);

  const loadMoreProjects = async (requestedProjectPage = projectPage + 1) => {
    if (projectsLoading) return;
    setProjectsLoading(true);
    setProjectsFailure('');
    try {
      const response = await runtime.request<ListResponse>(`/v1/projects?mine=true&status=active&page=${requestedProjectPage}&pageSize=50`);
      if (currentRequest.current !== runtime.request) return;
      setProjects(previous => [...(requestedProjectPage === 1 ? [] : previous), ...response.data.items.map(mapServerProjectSummary)]);
      setProjectTotal(response.data.pagination.total);
      setProjectPage(requestedProjectPage);
    } catch (error) {
      if (currentRequest.current === runtime.request) setProjectsFailure(classifyPortalClientError(error).message);
    } finally {
      if (currentRequest.current === runtime.request) setProjectsLoading(false);
    }
  };

  const refresh = () => setReloadToken(token => token + 1);

  const run = async (action: string, work: () => Promise<string>) => {
    if (busy) return;
    setBusy(action);
    setNotice(null);
    try {
      const message = await work();
      setNotice({ message, error: false });
    } catch (error) {
      const clientError = classifyPortalClientError(error);
      setNotice({ message: clientError.message, error: true });
    } finally {
      setBusy(null);
    }
  };

  const reloadApplications = async () => {
    const response = await runtime.request<ListResponse>(
      `/v1/catalog/applications?page=${activeTab === '내 신청 이력' ? page : 1}&pageSize=20`,
    );
    setApplications(
      (response.data.items ?? []).map(mapServerCatalogApplication),
    );
    setApplicationTotal(response.data.pagination.total);
  };

  const handleApply = () => {
    const item = items.find(entry => entry.id === selectedId);
    if (!item) return;
    const reason = applyReason.trim();
    if (!reason) {
      setNotice({ message: '신청 사유를 입력하세요.', error: true });
      return;
    }
    const itemId = item.id;
    const projectId = applyProjectId || undefined;
    void run(`apply-${itemId}`, async () => {
      await runtime.request<Record<string, unknown>>('/v1/catalog/applications', {
        method: 'POST',
        body: JSON.stringify({
          itemId,
          ...(projectId ? { projectId } : {}),
          reason,
          idempotencyKey: newIdempotencyKey(),
        }),
      });
      setApplyReason('');
      await reloadApplications();
      return '사용 신청을 접수했습니다. 승인 여부는 신청 이력에서 확인하세요.';
    });
  };

  const handleDecision = (applicationId: string, decision: 'approved' | 'rejected') => {
    void run(`decision-${applicationId}`, async () => {
      try {
        await runtime.request(`/v1/catalog/applications/${applicationId}/decision`, {
          method: 'POST',
          body: JSON.stringify({ decision }),
        });
      } catch (error) {
        const clientError = classifyPortalClientError(error);
        if (clientError.code === 'already_decided') {
          await reloadApplications();
          throw new Error('이미 결정된 신청입니다. 최신 상태로 갱신했습니다.');
        }
        throw error;
      }
      await reloadApplications();
      return decision === 'approved' ? '신청을 승인했습니다.' : '신청을 반려했습니다.';
    });
  };

  const visibleItems = items;
  const selected = items.find(item => item.id === selectedId) ?? null;

  const summaryItems = [
    { label: '전체 항목', value: summary?.total ?? '—' },
    ...CATEGORY_TABS.map(category => ({
      label: `${CATEGORY_LABELS[category]} 항목`,
      value: summary ? summary.categories[category] ?? 0 : '—',
    })),
    { label: '신청 가능', value: summary?.applicable ?? '—' },
    { label: canDecide ? '전체 신청' : '내 신청', value: applicationTotal },
  ];

  return (
    <Box>
      {notice && (
        <Box mb={2}>
          <Alert severity={notice.error ? 'error' : 'success'} onClose={() => setNotice(null)}>
            {notice.message}
          </Alert>
        </Box>
      )}
      <Typography variant="body2" color="textSecondary" gutterBottom>
        서버에 등록된 카탈로그 항목입니다. 신청 후 실행환경은 플랫폼 연동을 통해 생성됩니다.
      </Typography>

      <Grid container spacing={2} style={{ marginTop: 8, marginBottom: 16 }}>
        {summaryItems.map(item => (
          <Grid item xs={6} sm={4} md={2} key={item.label}>
            <Card variant="outlined">
              <CardContent style={{ padding: 12 }}>
                <Typography variant="caption" color="textSecondary">
                  {item.label}
                </Typography>
                <Box marginTop={0.5}>
                  <Typography variant="h5" style={{ fontWeight: 600 }}>
                    {item.value}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Tabs
        value={activeTab}
        onChange={(_, value) => {
          const next = new URLSearchParams(params);
          next.set('tab', value as string);
          next.delete('page');
          setParams(next);
          setSelectedId(null);
        }}
        indicatorColor="primary"
        textColor="primary"
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="전체" value="전체" />
        {CATEGORY_TABS.map(category => (
          <Tab key={category} label={CATEGORY_LABELS[category]} value={category} />
        ))}
        <Tab label={canDecide ? '신청·승인 이력' : '내 신청 이력'} value="내 신청 이력" />
      </Tabs>

      {loading && (
        <Box mt={2}>
          <Typography color="textSecondary">카탈로그를 불러오는 중입니다.</Typography>
        </Box>
      )}
      {!loading && failure && (
        <Box mt={2}>
          <Alert
            severity={failure.kind === 'permission' ? 'warning' : 'error'}
            action={
              failure.kind !== 'permission' ? (
                <Button color="inherit" size="small" onClick={refresh}>
                  다시 시도
                </Button>
              ) : undefined
            }
          >
            {failure.message}
          </Alert>
        </Box>
      )}

      {!loading && !failure && (
        <PortalPagination label={activeTab === '내 신청 이력' ? '카탈로그 신청' : '카탈로그'}
          page={page} pageSize={20} total={activeTab === '내 신청 이력' ? applicationTotal : itemTotal}
          onPage={value => {
            const next = new URLSearchParams(params);
            next.set('page', String(value));
            setParams(next);
            setSelectedId(null);
          }} />
      )}

      {!loading && !failure && activeTab === '내 신청 이력' && (
        <Box mt={2}>
          <Paper variant="outlined" style={{ padding: 24 }}>
            <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
              신청 이력
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>항목</TableCell>
                    <TableCell>사유</TableCell>
                    <TableCell>신청 상태</TableCell>
                    <TableCell>실행환경 상태</TableCell>
                    {canDecide && <TableCell>결정</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {applications.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canDecide ? 5 : 4} align="center">
                        <Typography color="textSecondary">신청 이력이 없습니다.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {applications.map(application => {
                    const execution = describeApplicationExecution(application);
                    return (
                      <TableRow key={application.id}>
                        <TableCell>{application.itemName}</TableCell>
                        <TableCell style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{application.reason}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={application.statusLabel}
                            color={application.status === 'approved' ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          {execution ? (
                            <Chip size="small" variant="outlined" label={execution} />
                          ) : (
                            <Typography variant="body2" color="textSecondary">
                              -
                            </Typography>
                          )}
                        </TableCell>
                        {canDecide && (
                          <TableCell>
                            {application.status === 'requested' ? (
                              <Box display="flex" style={{ gap: 4 }}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  disabled={busy === `decision-${application.id}`}
                                  onClick={() => handleDecision(application.id, 'approved')}
                                >
                                  승인
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  disabled={busy === `decision-${application.id}`}
                                  onClick={() => handleDecision(application.id, 'rejected')}
                                >
                                  반려
                                </Button>
                              </Box>
                            ) : (
                              <Typography variant="body2" color="textSecondary">
                                결정 완료
                              </Typography>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {!loading && !failure && activeTab !== '내 신청 이력' && (
        <Grid container spacing={3} style={{ marginTop: 8 }}>
          <Grid item xs={12} md={7}>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>이름</TableCell>
                    <TableCell>종류</TableCell>
                    <TableCell>분류</TableCell>
                    <TableCell>접근 방식</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Box padding={2}>
                          <Typography color="textSecondary">표시할 항목이 없습니다.</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                  {visibleItems.map(item => (
                    <TableRow
                      key={item.id}
                      hover
                      selected={selectedId === item.id}
                      onClick={() => setSelectedId(item.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <TableCell><Button color="primary" onClick={() => setSelectedId(item.id)}>{item.name}</Button></TableCell>
                      <TableCell>
                        <Chip size="small" label={item.kindLabel} />
                      </TableCell>
                      <TableCell>{item.categoryLabel}</TableCell>
                      <TableCell>{item.accessTypeLabel}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          <Grid item xs={12} md={5}>
            {!selected && (
              <Paper variant="outlined" style={{ padding: 24, height: '100%' }}>
                <Typography color="textSecondary" align="center">
                  목록에서 항목을 선택하세요.
                </Typography>
              </Paper>
            )}
            {selected && (
              <Paper variant="outlined" style={{ padding: 24 }}>
                <Box display="flex" alignItems="center" flexWrap="wrap" style={{ gap: 8 }} mb={2}>
                  <Typography variant="h6" style={{ fontWeight: 600 }}>
                    {selected.name}
                  </Typography>
                  <Chip size="small" label={selected.kindLabel} />
                  <Chip size="small" variant="outlined" label={selected.categoryLabel} />
                </Box>
                <Divider style={{ marginBottom: 16 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="textSecondary">설명</Typography>
                    <Typography variant="body2" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{selected.description || selected.summary || '-'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">제공자</Typography>
                    <Typography variant="body2">{selected.provider || '-'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">접근 방식</Typography>
                    <Typography variant="body2">{selected.accessTypeLabel}</Typography>
                  </Grid>
                </Grid>
                {selected.accessType === 'direct_link' && selected.linkUrl && (
                  <Box mt={2}>
                    <Button
                      size="small"
                      variant="contained"
                      href={selected.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      서비스 바로가기
                    </Button>
                  </Box>
                )}
                {selected.accessType === 'apply' && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      사용 신청
                    </Typography>
                    <FormControl fullWidth size="small" style={{ marginBottom: 8 }}>
                      <InputLabel id="apply-project-label">프로젝트(선택)</InputLabel>
                      <Select
                        labelId="apply-project-label"
                        value={applyProjectId}
                        onChange={e => setApplyProjectId(e.target.value as string)}
                      >
                        <MenuItem value="">소속 없이 신청</MenuItem>
                        {projects.map(project => (
                          <MenuItem key={project.id} value={project.id}>
                            {project.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Typography variant="caption" color="textSecondary" display="block">
                      참여 프로젝트 {projectTotal.toLocaleString()}개 중 {projects.length.toLocaleString()}개 표시
                    </Typography>
                    {projectsFailure && <Alert severity="warning">{projectsFailure}</Alert>}
                    {projects.length < projectTotal && (
                      <Button size="small" onClick={() => { void loadMoreProjects(); }} disabled={projectsLoading}>
                        {projectsLoading ? '불러오는 중' : '프로젝트 더 불러오기'}
                      </Button>
                    )}
                    {projectsFailure && !projects.length && (
                      <Button size="small" onClick={() => { void loadMoreProjects(1); }} disabled={projectsLoading}>프로젝트 목록 다시 시도</Button>
                    )}
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      size="small"
                      label="신청 사유"
                      value={applyReason}
                      onChange={e => setApplyReason(e.target.value)}
                    />
                    <Box mt={1}>
                      <Button
                        variant="contained"
                        color="primary"
                        disabled={!applyReason.trim() || busy === `apply-${selected.id}`}
                        onClick={handleApply}
                      >
                        {busy === `apply-${selected.id}` ? '신청 중' : '사용 신청'}
                      </Button>
                    </Box>
                  </Box>
                )}
              </Paper>
            )}
          </Grid>
        </Grid>
      )}
    </Box>
  );
};
