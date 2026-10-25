import { formatPortalDateTime } from '../common/portalDate';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
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
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import RefreshIcon from '@material-ui/icons/Refresh';
import GetAppIcon from '@material-ui/icons/GetApp';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import {
  ActivityEvent,
  csvCell,
  readDemoActivity,
} from '../portal-runtime/demoActivity';
import { portalMenuDefinitions } from '../navigation';

type Event = ActivityEvent & { source?: 'client' | 'server' };
interface AuditData {
  items: Event[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    snapshot?: string;
  };
  summary: {
    total: number;
    success: number;
    denied: number;
    failed: number;
    uniqueActors: number;
    byCategory: Record<string, number>;
  };
}
const emptyFilters = {
  from: '',
  to: '',
  category: '',
  result: '',
  actor: '',
  search: '',
};
const categories: Record<string, string> = {
  access: '접속',
  usage: '사용',
  admin: '관리 작업',
  security: '보안',
};
const results: Record<string, string> = {
  success: '성공',
  denied: '거부',
  failed: '실패',
};
const actions: Record<string, string> = {
  'client.page.view': '화면 조회',
  'client.session.start': '포털 접속',
  'client.session.end': '포털 종료',
  'context.tenant.select': '소속 선택',
  'tenant.settings.update': '포털 설정 변경',
  'tenant.branding.update': '브랜드 변경',
  'tenant.menus.update': '메뉴 변경',
  'rbac.role.assign': '역할 부여',
  'rbac.role.revoke': '역할 회수',
  'audit.export': '이력 내보내기',
  'audit.history.read': '이력 조회',
  'audit.history.export': '이력 내보내기',
};
const displayAction = (row: Event) => actions[row.action] || row.action;
function displaySource(row: Event, isDemo: boolean) {
  if (isDemo) return '데모 기록';
  return row.source === 'client' ? '사용자 화면 활동' : '서버 처리';
}
const displayResource = (row: Event) =>
  portalMenuDefinitions.find(m => m.id === row.resourceId)?.title ||
  row.resourceId ||
  '—';
function query(filters: typeof emptyFilters, page: number, pageSize: number) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  Object.entries(filters).forEach(([key, value]) => {
    if (!value) return;
    let formatted = value;
    if (key === 'from') formatted = new Date(`${value}T00:00:00`).toISOString();
    if (key === 'to')
      formatted = new Date(`${value}T23:59:59.999`).toISOString();
    params.set(key, formatted);
  });
  return params.toString();
}

export function AuditHistoryPage() {
  const {
    tenantId,
    tenants,
    request,
    isDemo,
    loading: runtimeLoading,
  } = usePortalRuntime();
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loaded, setLoaded] = useState<{
    scope: string;
    data: AuditData;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Event | null>(null);
  const [exporting, setExporting] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const snapshot = useRef({ scope: '', value: '' });
  const currentScope = JSON.stringify([tenantId, filters, refresh]);
  const scopeRef = useRef(currentScope);
  scopeRef.current = currentScope;
  const data = loaded?.scope === currentScope ? loaded.data : null;
  useEffect(
    () => () => {
      scopeRef.current = '';
    },
    [],
  );
  const tenantName = tenants.find(t => t.id === tenantId)?.name || '현재 소속';
  const read = useCallback(
    async (
      requestedPage: number,
      size: number,
      exportSnapshot?: string,
    ): Promise<AuditData> => {
      if (!isDemo) {
        const scope = JSON.stringify([tenantId, filters, refresh]);
        if (exportSnapshot === undefined && snapshot.current.scope !== scope)
          snapshot.current = { scope, value: '' };
        const cutoff = exportSnapshot ?? snapshot.current.value;
        const suffix = `${
          cutoff ? `&snapshot=${encodeURIComponent(cutoff)}` : ''
        }${exportSnapshot !== undefined ? '&purpose=export' : ''}`;
        const result = (
          await request<AuditData>(
            `/v1/audit-events?${query(filters, requestedPage, size)}${suffix}`,
          )
        ).data;
        if (
          exportSnapshot === undefined &&
          snapshot.current.scope === scope &&
          result.pagination.snapshot
        )
          snapshot.current.value = result.pagination.snapshot;
        return result;
      }
      const rows = readDemoActivity()
        .filter(row => row.tenantId === tenantId)
        .filter(
          row =>
            !filters.from ||
            Date.parse(row.createdAt) >=
              new Date(`${filters.from}T00:00:00`).getTime(),
        )
        .filter(
          row =>
            !filters.to ||
            Date.parse(row.createdAt) <=
              new Date(`${filters.to}T23:59:59.999`).getTime(),
        )
        .filter(row => !filters.category || row.category === filters.category)
        .filter(row => !filters.result || row.result === filters.result)
        .filter(
          row =>
            !filters.actor ||
            `${row.actorId} ${row.actorName}`
              .toLowerCase()
              .includes(filters.actor.toLowerCase()),
        )
        .filter(
          row =>
            !filters.search ||
            `${row.action} ${displayAction(row)} ${
              row.resourceId
            } ${displayResource(row)} ${row.requestId}`
              .toLowerCase()
              .includes(filters.search.toLowerCase()),
        );
      return {
        items: rows.slice((requestedPage - 1) * size, requestedPage * size),
        pagination: {
          page: requestedPage,
          pageSize: size,
          total: rows.length,
          totalPages: Math.ceil(rows.length / size),
        },
        summary: {
          total: rows.length,
          success: rows.filter(r => r.result === 'success').length,
          denied: rows.filter(r => r.result === 'denied').length,
          failed: rows.filter(r => r.result === 'failed').length,
          uniqueActors: new Set(rows.map(r => r.actorId)).size,
          byCategory: {},
        },
      };
    },
    [isDemo, request, tenantId, filters, refresh],
  );
  useEffect(() => {
    setPage(0);
    setSelected(null);
  }, [tenantId, filters]);
  useEffect(() => {
    let active = true;
    setLoaded(null);
    if (!tenantId || runtimeLoading) return undefined;
    setLoading(true);
    setError('');
    read(page + 1, pageSize)
      .then(result => {
        if (active) setLoaded({ scope: currentScope, data: result });
      })
      .catch(e => {
        if (active) setError(e.message || '이력을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [read, page, pageSize, refresh, tenantId, runtimeLoading, currentScope]);
  const exportCsv = async () => {
    setExporting(true);
    setError('');
    const exportScope = currentScope;
    try {
      // The server collects the whole bounded export in one database snapshot.
      const first = await read(
        1,
        10000,
        snapshot.current.scope === exportScope ? snapshot.current.value : '',
      );
      if (scopeRef.current !== exportScope) return;
      if (first.pagination.total > 10000)
        throw new Error(
          '한 번에 10,000건까지 내려받을 수 있습니다. 조회 기간이나 필터를 좁혀 주세요.',
        );
      const rows = [...first.items];
      if (rows.length !== first.pagination.total)
        throw new Error(
          '전체 이력을 내려받지 못했습니다. 새로고침 후 다시 시도하세요.',
        );
      if (scopeRef.current !== exportScope) return;
      const header = [
        '시각',
        '소속',
        '사용자',
        '구분',
        '행위',
        '대상',
        '결과',
        '기록 출처',
        '요청 식별자',
      ];
      const lines = [
        header,
        ...rows.map(r => [
          formatPortalDateTime(r.createdAt),
          tenantName,
          r.actorName || r.actorId,
          categories[r.category],
          displayAction(r),
          displayResource(r),
          results[r.result],
          displaySource(r, isDemo),
          r.requestId,
        ]),
      ];
      const blob = new Blob(
        ['\uFEFF', lines.map(line => line.map(csvCell).join(',')).join('\r\n')],
        { type: 'text/csv;charset=utf-8;' },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `접속사용이력_${tenantId}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      if (scopeRef.current === exportScope)
        setError(e instanceof Error ? e.message : '내보내기에 실패했습니다.');
    } finally {
      setExporting(false);
    }
  };
  return (
    <Box>
      <Box
        display="flex"
        flexWrap="wrap"
        alignItems="center"
        justifyContent="space-between"
        mb={3}
        style={{ gap: 16 }}
      >
        <div>
          <Typography variant="h4" component="h1" style={{ fontWeight: 700 }}>
            접속·사용 이력
          </Typography>
          <Typography color="textSecondary" style={{ marginTop: 8 }}>
            {tenantName}의 접속, 화면 이용, 권한 및 설정 변경 내역을 확인하세요.
          </Typography>
        </div>
        <Box display="flex" style={{ gap: 8 }}>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            disabled={loading || exporting}
            onClick={() => setRefresh(v => v + 1)}
          >
            새로고침
          </Button>
          <Button
            startIcon={<GetAppIcon />}
            color="primary"
            variant="contained"
            disabled={loading || exporting || !data?.pagination.total}
            onClick={exportCsv}
          >
            {exporting ? '내보내는 중…' : 'CSV 내려받기'}
          </Button>
        </Box>
      </Box>
      {isDemo && (
        <Box mb={2}>
          <Alert severity="info">
            데모 이력입니다. 이 브라우저에서 수행한 활동과 설정 변경만 표시되며
            운영 감사 기록과 별도로 보관됩니다.
          </Alert>
        </Box>
      )}
      <Grid container spacing={2} style={{ marginBottom: 16 }}>
        {[
          ['전체 기록', data?.summary.total],
          ['이용 사용자', data?.summary.uniqueActors],
          ['처리 성공', data?.summary.success],
          [
            '거부·실패',
            data ? data.summary.denied + data.summary.failed : undefined,
          ],
        ].map(([label, value]) => (
          <Grid item xs={6} md={3} key={label}>
            <Paper variant="outlined" style={{ padding: 20, borderRadius: 12 }}>
              <Typography color="textSecondary" variant="body2">
                {label}
              </Typography>
              <Typography
                variant="h4"
                style={{ marginTop: 8, fontWeight: 700 }}
              >
                {value ?? '—'}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
      <Paper
        variant="outlined"
        style={{ padding: 20, borderRadius: 12, marginBottom: 20 }}
      >
        <form
          onSubmit={e => {
            e.preventDefault();
            if (draft.from && draft.to && draft.from > draft.to) {
              setError('조회 시작일은 종료일보다 늦을 수 없습니다.');
              return;
            }
            setPage(0);
            setFilters({ ...draft });
          }}
        >
          <Grid container spacing={2}>
            {(['from', 'to'] as const).map(key => (
              <Grid item xs={6} md={2} key={key}>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  id={`audit-${key}`}
                  label={key === 'from' ? '시작일' : '종료일'}
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={draft[key]}
                  onChange={e => setDraft({ ...draft, [key]: e.target.value })}
                />
              </Grid>
            ))}
            <Grid item xs={6} md={2}>
              <TextField
                select
                fullWidth
                variant="outlined"
                size="small"
                id="audit-category"
                label="활동 구분"
                value={draft.category}
                onChange={e => setDraft({ ...draft, category: e.target.value })}
              >
                <MenuItem value="">전체</MenuItem>
                {Object.entries(categories).map(([key, title]) => (
                  <MenuItem key={key} value={key}>
                    {title}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                select
                fullWidth
                variant="outlined"
                size="small"
                id="audit-result"
                label="처리 결과"
                value={draft.result}
                onChange={e => setDraft({ ...draft, result: e.target.value })}
              >
                <MenuItem value="">전체</MenuItem>
                {Object.entries(results).map(([key, title]) => (
                  <MenuItem key={key} value={key}>
                    {title}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                id="audit-actor"
                label="사용자 이름 또는 식별자"
                value={draft.actor}
                onChange={e => setDraft({ ...draft, actor: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                id="audit-search"
                label="행위, 대상, 요청 식별자 검색"
                value={draft.search}
                onChange={e => setDraft({ ...draft, search: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" style={{ gap: 8 }}>
                <Button
                  type="submit"
                  color="primary"
                  variant="contained"
                  disabled={loading}
                >
                  조회
                </Button>
                <Button
                  onClick={() => {
                    setDraft(emptyFilters);
                    setFilters(emptyFilters);
                    setPage(0);
                  }}
                >
                  초기화
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
      {error && (
        <Box mb={2}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}
      <Paper
        variant="outlined"
        style={{ borderRadius: 12, overflow: 'hidden' }}
      >
        <Box px={2} py={2}>
          <Typography variant="h6">상세 이력</Typography>
          <Typography variant="body2" color="textSecondary">
            시간은 현재 기기의 시간대로 표시됩니다. 화면 접속 기록은 인증
            시스템의 로그인 성공 기록과 구분됩니다.
          </Typography>
        </Box>
        {loading ? (
          <Box p={4} textAlign="center">
            <CircularProgress size={28} aria-label="이력 조회 중" />
          </Box>
        ) : (
          <TableContainer style={{ maxHeight: 640 }}>
            <Table
              stickyHeader
              size="small"
              style={{ minWidth: 850 }}
              aria-label="접속 및 사용 이력"
            >
              <TableHead>
                <TableRow>
                  {[
                    '시각',
                    '사용자',
                    '구분',
                    '행위 / 대상',
                    '결과',
                    '상세',
                  ].map(title => (
                    <TableCell key={title}>{title}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.items.map(row => (
                  <TableRow key={row.id} hover>
                    <TableCell style={{ whiteSpace: 'nowrap' }}>
                      {formatPortalDateTime(row.createdAt)}
                    </TableCell>
                    <TableCell>
                      {row.actorName || row.actorId || '시스템'}
                    </TableCell>
                    <TableCell>
                      {categories[row.category] || row.category}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {displayAction(row)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {displayResource(row)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={results[row.result]}
                        style={{
                          background:
                            row.result === 'success' ? '#E7F4EA' : '#FDECEA',
                          color:
                            row.result === 'success' ? '#1E6B34' : '#B3261E',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => setSelected(row)}
                        aria-label={`${displayAction(row)} 상세 보기`}
                      >
                        보기
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.items.length && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Box p={5} textAlign="center">
                        <Typography>
                          조회 조건에 맞는 이력이 없습니다.
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          기간과 필터를 변경하거나 새로고침하세요.
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <TablePagination
          component="div"
          count={data?.pagination.total || 0}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[25, 50, 100]}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={e => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          labelRowsPerPage="페이지당"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} / ${count}건`
          }
        />
      </Paper>
      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>활동 상세</DialogTitle>
        <DialogContent>
          {selected && (
            <Box style={{ overflowWrap: 'anywhere' }}>
              {[
                ['시각', formatPortalDateTime(selected.createdAt)],
                ['소속', tenantName],
                ['사용자', selected.actorName || selected.actorId],
                ['행위', displayAction(selected)],
                ['대상', displayResource(selected)],
                ['결과', results[selected.result]],
                ['사유', selected.reasonCode || '—'],
                ['출처', displaySource(selected, isDemo)],
                ['요청 식별자', selected.requestId],
              ].map(([label, value]) => (
                <Box mb={2} key={label}>
                  <Typography variant="caption" color="textSecondary">
                    {label}
                  </Typography>
                  <Typography variant="body2">{value}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
