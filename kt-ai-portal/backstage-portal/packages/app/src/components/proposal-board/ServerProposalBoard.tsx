import { useEffect, useState } from 'react';
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
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import ThumbUpAltIcon from '@material-ui/icons/ThumbUpAlt';
import Alert from '@material-ui/lab/Alert';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import {
  classifyPortalClientError,
  PortalClientError,
} from '../portal-runtime/portalClientError';
import {
  REVIEW_DECISION_LABELS,
  ServerProposalDetailView,
  ServerProposalSummary,
  formatProposalDate,
  mapServerProposalDetail,
  mapServerProposalSummary,
} from './proposalServerData';
import {
  ServerProposalForm,
  ServerProposalFormValues,
} from './ServerProposalForm';

interface ProposalListResponse {
  summary?: Record<string, number>;
  items: Array<Record<string, unknown>>;
  pagination: { page: number; pageSize: number; total: number };
}

type ServerProposalTab =
  | '전체 제안'
  | '기능 제안'
  | '개선 제안'
  | '오류 수정'
  | '운영 개선'
  | '내 제안'
  | '관리자 검토';

const TAB_TYPES: Partial<Record<ServerProposalTab, string>> = {
  '기능 제안': 'feature',
  '개선 제안': 'improvement',
  '오류 수정': 'bug',
  '운영 개선': 'operation',
};

const SERVER_TABS: ServerProposalTab[] = [
  '전체 제안',
  '기능 제안',
  '개선 제안',
  '오류 수정',
  '운영 개선',
  '내 제안',
  '관리자 검토',
];

const newIdempotencyKey = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const ReviewRow = ({
  proposal,
  submitting,
  onReview,
}: {
  proposal: ServerProposalSummary;
  submitting: boolean;
  onReview: (id: string, decision: string, body: string) => void;
}) => {
  const [decision, setDecision] = useState('answer');
  const [body, setBody] = useState('');
  return (
    <TableRow>
      <TableCell>{proposal.title}</TableCell>
      <TableCell>
        <Chip size="small" label={proposal.typeLabel} />
      </TableCell>
      <TableCell>
        <Chip size="small" label={proposal.statusLabel} />
      </TableCell>
      <TableCell>
        <FormControl size="small" fullWidth>
          <InputLabel id={`review-decision-${proposal.id}`}>결정</InputLabel>
          <Select
            labelId={`review-decision-${proposal.id}`}
            value={decision}
            onChange={e => setDecision(e.target.value as string)}
          >
            {Object.entries(REVIEW_DECISION_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </TableCell>
      <TableCell>
        <TextField
          fullWidth
          size="small"
          label="답변 내용"
          value={body}
          onChange={e => setBody(e.target.value)}
        />
      </TableCell>
      <TableCell>
        <Button
          size="small"
          variant="contained"
          disabled={submitting || !body.trim()}
          onClick={() => onReview(proposal.id, decision, body.trim())}
        >
          등록
        </Button>
      </TableCell>
    </TableRow>
  );
};

export const ServerProposalBoard = () => {
  const runtime = usePortalRuntime();
  const canReview = runtime.permissions.includes('tenant.manage');
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get('tab') as ServerProposalTab;
  const activeTab = SERVER_TABS.includes(requestedTab) && (requestedTab !== '관리자 검토' || canReview)
    ? requestedTab : '전체 제안';
  const sort = params.get('sort') === 'sympathy' ? 'sympathy' : 'latest';
  const requestedPage = Number(params.get('page') || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const updateFilters = (values: Record<string, string>) => {
    const next = new URLSearchParams(params);
    next.delete('page');
    Object.entries(values).forEach(([key, value]) => next.set(key, value));
    setParams(next);
  };
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [items, setItems] = useState<ServerProposalSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listFailure, setListFailure] = useState<PortalClientError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ServerProposalDetailView | null>(null);
  const [detailFailure, setDetailFailure] = useState<PortalClientError | null>(
    null,
  );
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(
    null,
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let active = true;
    setListLoading(true);
    setListFailure(null);
    const type = TAB_TYPES[activeTab];
    const query = `page=${page}&pageSize=20&sort=${sort}${type ? `&type=${type}` : ''}${activeTab === '내 제안' ? '&mine=true' : ''}`;
    runtime
      .request<ProposalListResponse>(`/v1/proposals?${query}`)
      .then(response => {
        if (!active) return;
        const nextItems = (response.data.items ?? []).map(
          mapServerProposalSummary,
        );
        setItems(nextItems);
        setTotal(response.data.pagination?.total ?? nextItems.length);
        setSummary(response.data.summary ?? null);
        setListLoading(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setListFailure(classifyPortalClientError(error));
        setListLoading(false);
      });
    return () => {
      active = false;
    };
  }, [runtime, activeTab, sort, reloadToken, page]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setDetailFailure(null);
      return undefined;
    }
    let active = true;
    setDetailFailure(null);
    setDetail(null);
    runtime
      .request<{
        proposal: Record<string, unknown>;
        sympathyCount: number;
        mySympathy: boolean;
        reviews: Array<Record<string, unknown>>;
      }>(`/v1/proposals/${selectedId}`)
      .then(response => {
        if (!active) return;
        setDetail(mapServerProposalDetail(response.data));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setDetail(null);
        setDetailFailure(classifyPortalClientError(error));
      });
    return () => {
      active = false;
    };
  }, [runtime, selectedId]);

  const visibleItems = items;

  const run = async (action: string, work: () => Promise<string>) => {
    if (busy) return;
    setBusy(action);
    setNotice(null);
    try {
      const message = await work();
      setNotice({ message, error: false });
    } catch (error) {
      const failure = classifyPortalClientError(error);
      setNotice({ message: failure.message, error: true });
    } finally {
      setBusy(null);
    }
  };

  const refreshList = () => setReloadToken(token => token + 1);

  const reloadSelected = async () => {
    if (!selectedId) return;
    const response = await runtime.request<{
      proposal: Record<string, unknown>;
      sympathyCount: number;
      mySympathy: boolean;
      reviews: Array<Record<string, unknown>>;
    }>(`/v1/proposals/${selectedId}`);
    setDetail(mapServerProposalDetail(response.data));
  };

  const handleCreate = (values: ServerProposalFormValues) => {
    void run('create', async () => {
      await runtime.request<Record<string, unknown>>('/v1/proposals', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          attachmentUri: values.attachmentUri || null,
          idempotencyKey: newIdempotencyKey(),
        }),
      });
      setFormOpen(false);
      refreshList();
      return '제안을 등록했습니다.';
    });
  };

  const handleUpdate = (values: ServerProposalFormValues) => {
    if (!detail) return;
    const target = detail;
    void run('update', async () => {
      await runtime.request<Record<string, unknown>>(`/v1/proposals/${target.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...values,
          attachmentUri: values.attachmentUri || null,
          expectedVersion: target.version,
        }),
      });
      setEditing(false);
      await reloadSelected();
      refreshList();
      return '제안을 수정했습니다.';
    });
  };

  const handleDelete = () => {
    if (!detail) return;
    const target = detail;
    void run('delete', async () => {
      await runtime.request(`/v1/proposals/${target.id}`, { method: 'DELETE' });
      setSelectedId(null);
      setDetail(null);
      refreshList();
      return '제안을 삭제했습니다.';
    });
  };

  const handleSympathy = () => {
    if (!detail) return;
    const target = detail;
    void run('sympathy', async () => {
      try {
        const response = await runtime.request<{
          sympathyCount: number;
          mySympathy: boolean;
        }>(`/v1/proposals/${target.id}/sympathy`, {
          method: 'POST',
          body: JSON.stringify({}),
        });
        setDetail(prev =>
          prev
            ? { ...prev, sympathyCount: response.data.sympathyCount, mySympathy: response.data.mySympathy }
            : prev,
        );
        setItems(prev =>
          prev.map(item =>
            item.id === target.id
              ? { ...item, sympathyCount: response.data.sympathyCount }
              : item,
          ),
        );
        return response.data.mySympathy ? '공감했습니다.' : '공감을 취소했습니다.';
      } catch (error) {
        const failure = classifyPortalClientError(error);
        if (failure.code === 'sympathy_conflict') {
          await reloadSelected();
          throw new Error('동시에 공감 처리되었습니다. 현재 공감 수로 갱신했습니다.');
        }
        throw error;
      }
    });
  };

  const handleReview = (id: string, decision: string, body: string) => {
    void run(`review-${id}`, async () => {
      await runtime.request(`/v1/proposals/${id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ decision, body }),
      });
      refreshList();
      if (selectedId === id) await reloadSelected();
      return '검토 답변을 등록했습니다.';
    });
  };

  const canEditSelected =
    !!detail &&
    (detail.authorId === runtime.actorId || canReview) &&
    !editing;

  const summaryItems = [
    { label: '전체 제안', value: summary?.total ?? '—' },
    { label: '등록', value: summary?.submitted ?? '—' },
    { label: '검토중', value: summary?.under_review ?? '—' },
    { label: '답변완료', value: summary?.answered ?? '—' },
    { label: '공지', value: summary?.notice ?? '—' },
    { label: '내 제안', value: summary?.mine ?? '—' },
    {
      label: '내 공감',
      value: summary?.my_sympathy ?? '—',
    },
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
        서버에 등록된 제안입니다. 비공개 제안은 본인과 관리자만 조회할 수 있습니다.
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

      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap">
        <Tabs
          value={activeTab}
          onChange={(_, value) => {
            updateFilters({ tab: value as string });
            setSelectedId(null);
            setEditing(false);
          }}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          {SERVER_TABS.filter(tab => tab !== '관리자 검토' || canReview).map(tab => (
            <Tab key={tab} label={tab} value={tab} />
          ))}
        </Tabs>
        <Box display="flex" style={{ gap: 4 }}>
          <Button
            size="small"
            variant={sort === 'latest' ? 'contained' : 'outlined'}
            onClick={() => updateFilters({ sort: 'latest' })}
          >
            최신순
          </Button>
          <Button
            size="small"
            variant={sort === 'sympathy' ? 'contained' : 'outlined'}
            onClick={() => updateFilters({ sort: 'sympathy' })}
          >
            공감순
          </Button>
        </Box>
      </Box>

      {listLoading && (
        <Box mt={2}>
          <Typography color="textSecondary">제안 목록을 불러오는 중입니다.</Typography>
        </Box>
      )}
      {!listLoading && listFailure && (
        <Box mt={2}>
          <Alert
            severity={listFailure.kind === 'permission' ? 'warning' : 'error'}
            action={
              listFailure.kind !== 'permission' ? (
                <Button color="inherit" size="small" onClick={refreshList}>
                  다시 시도
                </Button>
              ) : undefined
            }
          >
            {listFailure.message}
          </Alert>
        </Box>
      )}

      {!listLoading && !listFailure && (
        <PortalPagination label="제안" page={page} pageSize={20} total={total}
          onPage={value => {
            const next = new URLSearchParams(params);
            next.set('page', String(value));
            setParams(next);
            setSelectedId(null);
            setEditing(false);
          }} />
      )}

      {!listLoading && !listFailure && activeTab === '관리자 검토' && canReview && (
        <Box mt={2}>
          <Paper variant="outlined" style={{ padding: 24 }}>
            <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
              관리자 검토
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>제목</TableCell>
                    <TableCell>유형</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>결정</TableCell>
                    <TableCell>답변 내용</TableCell>
                    <TableCell>조치</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="textSecondary">검토할 제안이 없습니다.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {visibleItems.map(proposal => (
                    <ReviewRow
                      key={proposal.id}
                      proposal={proposal}
                      submitting={busy === `review-${proposal.id}`}
                      onReview={handleReview}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {!listLoading && !listFailure && activeTab !== '관리자 검토' && (
        <Grid container spacing={3} style={{ marginTop: 8 }}>
          <Grid item xs={12} md={7}>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>제목</TableCell>
                    <TableCell>유형</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>공개범위</TableCell>
                    <TableCell>공감</TableCell>
                    <TableCell>조회</TableCell>
                    <TableCell>등록일</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Box padding={2}>
                          <Typography color="textSecondary">
                            {activeTab === '내 제안'
                              ? '내가 등록한 제안이 없습니다.'
                              : '제안이 없습니다.'}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                  {visibleItems.map(proposal => (
                    <TableRow
                      key={proposal.id}
                      hover
                      selected={selectedId === proposal.id}
                      onClick={() => {
                        setSelectedId(proposal.id);
                        setEditing(false);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Button color="primary" onClick={() => { setSelectedId(proposal.id); setEditing(false); }}>
                          {proposal.title}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={proposal.typeLabel} />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={proposal.statusLabel} />
                      </TableCell>
                      <TableCell>{proposal.visibilityLabel}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" style={{ gap: 4 }}>
                          <ThumbUpAltIcon fontSize="small" color="action" />
                          {proposal.sympathyCount}
                        </Box>
                      </TableCell>
                      <TableCell>{proposal.viewCount}</TableCell>
                      <TableCell>{formatProposalDate(proposal.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          <Grid item xs={12} md={5}>
            {selectedId && detailFailure && (
              <Alert
                severity={detailFailure.kind === 'permission' ? 'warning' : 'error'}
                action={
                  detailFailure.kind === 'conflict' ? (
                    <Button color="inherit" size="small" onClick={() => void reloadSelected()}>
                      최신 내용 다시 불러오기
                    </Button>
                  ) : undefined
                }
              >
                {detailFailure.message}
              </Alert>
            )}
            {selectedId && !detail && !detailFailure && (
              <Typography color="textSecondary">제안 상세를 불러오는 중입니다.</Typography>
            )}
            {detail && !editing && (
              <Paper variant="outlined" style={{ padding: 24, height: '100%' }}>
                <Box display="flex" alignItems="center" flexWrap="wrap" style={{ gap: 8 }} mb={2}>
                  <Typography variant="h6" style={{ fontWeight: 600 }}>
                    {detail.title}
                  </Typography>
                  <Chip size="small" label={detail.typeLabel} />
                  <Chip
                    size="small"
                    label={detail.statusLabel}
                    color={detail.status === 'notice' ? 'primary' : 'default'}
                  />
                </Box>
                {canEditSelected && (
                  <Box mb={2} display="flex" style={{ gap: 8 }}>
                    <Button size="small" variant="outlined" onClick={() => setEditing(true)}>
                      제안 수정
                    </Button>
                    <Button
                      size="small"
                      color="secondary"
                      disabled={busy === 'delete'}
                      onClick={handleDelete}
                    >
                      제안 삭제
                    </Button>
                  </Box>
                )}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">공개범위</Typography>
                    <Typography variant="body2">{detail.visibilityLabel}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">조회수</Typography>
                    <Typography variant="body2">{detail.viewCount}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="textSecondary">제안 배경/필요성</Typography>
                    <Typography variant="body2" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{detail.necessity || '-'}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="textSecondary">활용 계획</Typography>
                    <Typography variant="body2" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{detail.utilizationPlan || '-'}</Typography>
                  </Grid>
                  {detail.attachmentUri && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="textSecondary">첨부 링크</Typography>
                      <Typography variant="body2">
                        <a href={detail.attachmentUri} target="_blank" rel="noreferrer">
                          {detail.attachmentUri}
                        </a>
                      </Typography>
                    </Grid>
                  )}
                </Grid>
                <Box mt={2}>
                  <Button
                    size="small"
                    variant={detail.mySympathy ? 'contained' : 'outlined'}
                    color="primary"
                    startIcon={<ThumbUpAltIcon />}
                    disabled={busy === 'sympathy'}
                    onClick={handleSympathy}
                  >
                    공감 {detail.sympathyCount}
                  </Button>
                </Box>
                {detail.reviews.length > 0 && (
                  <>
                    <Divider style={{ margin: '16px 0' }} />
                    <Typography variant="subtitle2" gutterBottom>
                      검토 답변/공지
                    </Typography>
                    {detail.reviews.map(review => (
                      <Box key={review.id} mb={1}>
                        <Typography variant="caption" color="textSecondary">
                          {review.decisionLabel} · {formatProposalDate(review.createdAt)}
                        </Typography>
                        <Typography variant="body2" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{review.body}</Typography>
                      </Box>
                    ))}
                  </>
                )}
              </Paper>
            )}
            {detail && editing && (
              <ServerProposalForm
                initial={detail}
                submitting={busy === 'update'}
                onSubmit={handleUpdate}
                onCancel={() => setEditing(false)}
              />
            )}
          </Grid>
        </Grid>
      )}

      {activeTab !== '관리자 검토' && (
        <Box mt={3}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setFormOpen(open => !open);
              setEditing(false);
            }}
          >
            {formOpen ? '등록 닫기' : '제안 등록'}
          </Button>
          {formOpen && !editing && (
            <Box mt={2}>
              <ServerProposalForm
                submitting={busy === 'create'}
                onSubmit={handleCreate}
                onCancel={() => setFormOpen(false)}
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};
