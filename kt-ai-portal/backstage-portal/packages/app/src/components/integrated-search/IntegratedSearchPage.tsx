import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import Alert from '@material-ui/lab/Alert';
import Button from '@material-ui/core/Button';
import LinearProgress from '@material-ui/core/LinearProgress';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { SearchBox } from './SearchBox';
import { SearchFilterPanel } from './SearchFilterPanel';
import { SearchResultList } from './SearchResultList';
import { SearchResultDetail } from './SearchResultDetail';
import { SearchIndexStatusBar } from './SearchIndexStatusBar';
import {
  fetchSearchSources,
  searchPortal,
  suggestPortal,
  toSearchErrorInfo,
  validateSearchQuery,
} from './SearchApiClient';
import {
  SearchFilters,
  SearchResultItem,
  SearchSourcesState,
  SearchState,
} from './types';

const PAGE_SIZE = 50;
const searchTypes = ['menu', 'project', 'organization', 'user'];

export const IntegratedSearchPage = () => {
  const [params, setParams] = useSearchParams();
  const runtime = usePortalRuntime();
  const query = params.get('q') ?? '';
  const typeParam = params.get('type') ?? 'all';
  const type = searchTypes.includes(typeParam)
    ? (typeParam as SearchFilters['type'])
    : 'all';
  const pageParam = Number(params.get('page') ?? 1);
  const page = Number.isSafeInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const filters = useMemo<SearchFilters>(
    () => ({ query, type }),
    [query, type],
  );
  const [refresh, setRefresh] = useState(0);
  const [sourcesRefresh, setSourcesRefresh] = useState(0);
  const [searchState, setSearchState] = useState<SearchState>({
    status: 'idle',
  });
  const [sourcesState, setSourcesState] = useState<SearchSourcesState>({
    status: 'loading',
  });
  const [selected, setSelected] = useState<SearchResultItem>();

  useEffect(() => {
    if (runtime.loading) return undefined;
    let active = true;
    setSourcesState({ status: 'loading' });
    fetchSearchSources(runtime.request)
      .then(sources => {
        if (active) setSourcesState({ status: 'success', sources });
      })
      .catch(() => {
        if (active) setSourcesState({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, [runtime.loading, runtime.request, sourcesRefresh]);

  useEffect(() => {
    let active = true;
    setSelected(undefined);
    if (runtime.loading || !query.trim()) {
      setSearchState({ status: 'idle' });
      return undefined;
    }
    const message = validateSearchQuery(query);
    if (message) {
      setSearchState({
        status: 'error',
        message,
        kind: 'validation',
        retryable: false,
      });
      return undefined;
    }
    setSearchState({ status: 'loading' });
    searchPortal(runtime.request, {
      q: query,
      types: type === 'all' ? undefined : [type],
      page,
      pageSize: PAGE_SIZE,
    })
      .then(data => {
        if (active) setSearchState({ status: 'success', data });
      })
      .catch(error => {
        if (active)
          setSearchState({ status: 'error', ...toSearchErrorInfo(error) });
      });
    // A late result from another search or tenant must never restore old data.
    return () => {
      active = false;
    };
  }, [query, type, page, refresh, runtime.loading, runtime.request]);

  const updateQuery = (next: SearchFilters, nextPage = 1) => {
    setParams(previous => {
      const updated = new URLSearchParams(previous);
      if (next.query.trim()) updated.set('q', next.query.trim());
      else updated.delete('q');
      if (next.type !== 'all') updated.set('type', next.type);
      else updated.delete('type');
      if (nextPage > 1) updated.set('page', String(nextPage));
      else updated.delete('page');
      return updated;
    });
  };
  const handleSearch = (value: string) => {
    updateQuery({ ...filters, query: value });
    setRefresh(previous => previous + 1);
  };
  const handleSuggest = useCallback(
    (value: string) => suggestPortal(runtime.request, value),
    [runtime.request],
  );
  const data = searchState.status === 'success' ? searchState.data : undefined;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  let connectionState: 'connected' | 'unavailable' | 'checking' = 'checking';
  if (sourcesState.status === 'success') connectionState = 'connected';
  if (sourcesState.status === 'error') connectionState = 'unavailable';
  let resultLabel = '검색어를 2자 이상 입력해 주세요.';
  if (searchState.status === 'loading')
    resultLabel = '검색 결과를 불러오고 있습니다.';
  if (data)
    resultLabel = `검색 결과 ${data.total.toLocaleString('ko-KR')}건 · ${
      data.page
    } / ${totalPages}페이지`;

  return (
    <div className="portal-search-page" style={{ padding: 24 }}>
      <Typography variant="h4" gutterBottom>
        통합검색
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        포털 메뉴, 프로젝트, 조직, 사용자를 통합해 검색합니다. 데이터셋, AI
        모델, Docker 이미지, PyPI 패키지 등 외부 원천은 연동 예정입니다.
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <SearchBox
            value={query}
            onSearch={handleSearch}
            onSuggest={handleSuggest}
          />
        </Grid>
        <Grid item xs={12}>
          <SearchFilterPanel
            filters={filters}
            onChange={next => updateQuery(next)}
          />
        </Grid>
        {searchState.status === 'loading' && (
          <Grid item xs={12}>
            <LinearProgress aria-label="검색 결과 조회 중" />
          </Grid>
        )}
        {searchState.status === 'error' && (
          <Grid item xs={12}>
            <Alert
              severity={searchState.kind === 'validation' ? 'warning' : 'error'}
            >
              {searchState.message}
              {searchState.requestId &&
                ` (문의 번호: ${searchState.requestId})`}
              {searchState.retryable && (
                <Button
                  size="small"
                  onClick={() => setRefresh(previous => previous + 1)}
                >
                  다시 시도
                </Button>
              )}
            </Alert>
          </Grid>
        )}
        <Grid item xs={12}>
          <SearchIndexStatusBar
            state={connectionState}
            sources={sourcesState}
            tookMs={data?.took_ms}
          />
          {sourcesState.status === 'error' && (
            <Button
              size="small"
              onClick={() => setSourcesRefresh(previous => previous + 1)}
            >
              연결 상태 다시 확인
            </Button>
          )}
        </Grid>
        <Grid item xs={12}>
          <Typography
            role="status"
            aria-live="polite"
            variant="body2"
            color="textSecondary"
          >
            {resultLabel}
          </Typography>
        </Grid>
        {data && (
          <>
            <Grid item xs={12} md={7}>
              <SearchResultList
                results={data.results}
                selectedId={
                  selected ? `${selected.type}:${selected.id}` : undefined
                }
                onSelect={setSelected}
              />
              {data.total > PAGE_SIZE && (
                <nav
                  aria-label="검색 결과 페이지"
                  style={{
                    display: 'flex',
                    gap: 12,
                    justifyContent: 'space-between',
                    paddingTop: 16,
                  }}
                >
                  <Button
                    variant="outlined"
                    disabled={page <= 1}
                    onClick={() => updateQuery(filters, page - 1)}
                  >
                    이전 결과
                  </Button>
                  <Button
                    variant="outlined"
                    disabled={page >= totalPages}
                    onClick={() => updateQuery(filters, page + 1)}
                  >
                    다음 결과
                  </Button>
                </nav>
              )}
            </Grid>
            <Grid item xs={12} md={5}>
              {selected ? (
                <SearchResultDetail result={selected} />
              ) : (
                <Typography color="textSecondary">
                  검색 결과를 선택하면 상세 정보가 표시됩니다.
                </Typography>
              )}
            </Grid>
          </>
        )}
      </Grid>
    </div>
  );
};
