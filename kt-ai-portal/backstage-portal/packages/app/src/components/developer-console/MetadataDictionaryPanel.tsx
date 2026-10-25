import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  TextField,
  Typography,
  makeStyles,
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { formatPortalDateTime } from '../common/portalDate';
import { downloadCsv } from '../common/csvDownload';

interface Column {
  table_name: string;
  column_name: string;
  logical_name: string;
  definition: string;
  domain_id: string;
  data_type: string;
  is_nullable: boolean;
  is_primary_key: boolean;
  references: { name: string; definition: string }[];
  sensitivity: string;
  retention_policy: string;
  source_migration: string;
  mapping_status: string;
}
interface Dictionary {
  release: {
    version: string;
    mapping_status: string;
    imported_at: string;
    source_hash: string;
  } | null;
  summary: Record<string, number> | null;
  tables: { table_name: string; column_count: number }[];
  items: Column[];
  pagination: { page: number; pageSize: number; total: number };
}
const useStyles = makeStyles(theme => ({
  panel: {
    padding: 28,
    minWidth: 0,
    [theme.breakpoints.down('sm')]: { padding: 16 },
  },
  tools: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    margin: '20px 0',
  },
  select: { flex: '1 1 250px', minWidth: 0 },
  query: { flex: '1 1 240px', minWidth: 0 },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
    [theme.breakpoints.down('sm')]: { gridTemplateColumns: 'minmax(0, 1fr)' },
  },
  card: { padding: 18, minWidth: 0, overflowWrap: 'anywhere' },
  code: {
    fontFamily: 'ui-monospace, monospace',
    fontSize: 12,
    color: '#52637b',
    overflowWrap: 'anywhere',
  },
  detail: { fontSize: 12, color: '#667589', marginTop: 7, lineHeight: 1.7 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 6, margin: '12px 0' },
}));
export function MetadataDictionaryPanel() {
  const classes = useStyles();
  const { request, tenantId, actorId } = usePortalRuntime();
  const [data, setData] = useState<Dictionary | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [table, setTable] = useState('');
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError('');
    const params = new URLSearchParams({ page: String(page), pageSize: '30' });
    if (q) params.set('q', q);
    if (table) params.set('table', table);
    request<Dictionary>(`/v1/metadata/dictionary?${params}`)
      .then(result => {
        if (active) setData(result.data);
      })
      .catch(e => {
        if (active) {
          setData(null);
          setError(
            e instanceof Error
              ? e.message
              : '데이터 사전을 조회하지 못했습니다.',
          );
        }
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [request, tenantId, actorId, page, q, table, retry]);
  const total = data?.pagination.total ?? 0;
  const maxPage = Math.max(1, Math.ceil(total / 30));
  const submit = () => {
    setQ(input.trim());
    setPage(1);
  };
  let resultMessage =
    '등록된 사전이 없습니다. 최신 스키마 검증 후 관리자가 사전을 적재하면 표시됩니다.';
  if (error) resultMessage = '조회 결과를 표시할 수 없습니다.';
  else if (data?.release)
    resultMessage = `조회 결과 ${total.toLocaleString()}개 컬럼 · ${page} / ${maxPage} 페이지`;
  return (
    <div className={classes.panel}>
      <Typography variant="h6" component="h2">
        포털 데이터 사전
      </Typography>
      <Box my={2}>
        <Alert severity="info">
          기관 MDR 원본 사전은 아직 수령하지 않았습니다. 이 사전은 실제
          PostgreSQL 스키마에서 추출한 프로젝트 임시 기준이며, 기관 승인
          표준·보안등급을 의미하지 않습니다.
        </Alert>
      </Box>
      {error && (
        <Box my={2}>
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setRetry(r => r + 1)}
              >
                다시 시도
              </Button>
            }
          >
            {error}
          </Alert>
        </Box>
      )}
      {data?.release && (
        <>
          <Typography variant="body2">
            {data.release.version} ·{' '}
            {formatPortalDateTime(data.release.imported_at)} ·{' '}
            {data.release.mapping_status === 'confirmed'
              ? '기관 매핑 확정'
              : '기관 매핑 대기'}
          </Typography>
          <div className={classes.chips}>
            {Object.entries({
              tables: '테이블',
              columns: '컬럼',
              words: '단어',
              terms: '용어',
              domains: '도메인',
              codes: '코드 값',
            }).map(([key, label]) => (
              <Chip
                key={key}
                size="small"
                variant="outlined"
                label={`${label} ${data.summary?.[key] ?? 0}`}
              />
            ))}
          </div>
        </>
      )}
      <form
        className={classes.tools}
        onSubmit={event => {
          event.preventDefault();
          submit();
        }}
      >
        <TextField
          id="portal-metadata-table"
          SelectProps={{ labelId: 'portal-metadata-table-label' }}
          className={classes.select}
          select
          variant="outlined"
          size="small"
          label="사전 테이블"
          value={table}
          onChange={e => {
            setTable(e.target.value);
            setPage(1);
          }}
        >
          <MenuItem value="">전체 테이블</MenuItem>
          {(data?.tables ?? []).map(t => (
            <MenuItem key={t.table_name} value={t.table_name}>
              {t.table_name} ({t.column_count})
            </MenuItem>
          ))}
        </TextField>
        <TextField
          id="portal-metadata-query"
          className={classes.query}
          variant="outlined"
          size="small"
          label="테이블·컬럼·한글명 검색"
          value={input}
          onChange={e => setInput(e.target.value)}
          inputProps={{ maxLength: 100 }}
        />
        <Button
          variant="contained"
          color="primary"
          type="submit"
          disabled={busy}
        >
          검색
        </Button>
        <Button
          variant="outlined"
          disabled={busy || !data?.items.length}
          onClick={() =>
            downloadCsv(
              '포털_데이터사전_현재페이지.csv',
              [
                { key: 'table_name', label: '테이블' },
                { key: 'column_name', label: '컬럼' },
                { key: 'logical_name', label: '한글명(임시)' },
                { key: 'data_type', label: '자료형' },
                { key: 'sensitivity', label: '개인정보 구분(임시)' },
                { key: 'mapping_status', label: '매핑 상태' },
              ],
              data?.items.map(item => ({ ...item })) ?? [],
            )
          }
        >
          현재 페이지 내려받기
        </Button>
      </form>
      {busy ? (
        <Box py={4} display="flex" justifyContent="center">
          <CircularProgress size={28} aria-label="데이터 사전 조회 중" />
        </Box>
      ) : (
        <>
          <Typography role="status" variant="body2">
            {resultMessage}
          </Typography>
          <Box my={2} className={classes.cards}>
            {data?.items.map(item => (
              <Paper
                key={`${item.table_name}.${item.column_name}`}
                variant="outlined"
                className={classes.card}
              >
                <div className={classes.code}>
                  {item.table_name}.{item.column_name}
                </div>
                <Typography component="h3" variant="subtitle1">
                  {item.logical_name}
                </Typography>
                <Typography variant="body2">{item.definition}</Typography>
                <div className={classes.chips}>
                  <Chip size="small" label={item.data_type} />
                  {item.is_primary_key && <Chip size="small" label="기본키" />}
                  <Chip
                    size="small"
                    variant="outlined"
                    label={item.is_nullable ? 'NULL 허용' : '필수 값'}
                  />
                  {item.references.length > 0 && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`참조 ${item.references.length}`}
                    />
                  )}
                </div>
                <div className={classes.detail}>
                  {item.sensitivity} · {item.retention_policy}
                </div>
                <div className={classes.code}>
                  기술 도메인: {item.domain_id}
                </div>
                <div className={classes.detail}>
                  기관 매핑:{' '}
                  {item.mapping_status === 'confirmed'
                    ? '확정'
                    : '미수령 / 임시 정의'}
                  <br />
                  원천: {item.source_migration}
                </div>
              </Paper>
            ))}
          </Box>
          {data?.release && total === 0 && (
            <Box py={2}>
              <Typography variant="body2">
                조건에 맞는 컬럼이 없습니다. 검색어나 테이블을 변경해 주세요.
              </Typography>
            </Box>
          )}
          <div className={classes.tools}>
            <Button
              variant="outlined"
              disabled={busy || page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              사전 이전 페이지
            </Button>
            <Button
              variant="outlined"
              disabled={busy || page >= maxPage}
              onClick={() => setPage(p => p + 1)}
            >
              사전 다음 페이지
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
