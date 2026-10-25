import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
  makeStyles,
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import GetAppIcon from '@material-ui/icons/GetApp';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import LinkIcon from '@material-ui/icons/Link';
import { PermissionGuard, useAuthz } from '../authz';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { downloadCsv } from '../common/csvDownload';
import { MetadataDictionaryPanel } from './MetadataDictionaryPanel';
import {
  fieldName,
  contractSchema,
  integrationContracts,
  platforms,
  PlatformKey,
  readHistory,
  resolveReadPath,
  sampleRequest,
  sampleResponse,
  saveHistory,
  TestMode,
  TestResult,
  validateContract,
} from './integrationModel';

const useStyles = makeStyles(theme => ({
  page: {
    maxWidth: 1520,
    margin: '0 auto',
    padding: '36px 36px 60px',
    color: '#24324a',
    [theme.breakpoints.down('sm')]: { padding: '24px 16px' },
  },
  eyebrow: {
    color: '#637899',
    fontWeight: 700,
    letterSpacing: '0.16em',
    fontSize: 11,
    marginBottom: 8,
  },
  top: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  title: { fontSize: 30, fontWeight: 700, letterSpacing: '-0.05em' },
  muted: { color: '#718099', fontSize: 13, lineHeight: 1.8 },
  platforms: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 14,
    margin: '24px 0',
    [theme.breakpoints.down('sm')]: { gridTemplateColumns: 'repeat(2, 1fr)' },
  },
  platform: {
    textAlign: 'left',
    background: '#fff',
    padding: 20,
    borderRadius: 18,
    border: '1px solid #e1e7ef',
    cursor: 'pointer',
    transition: 'border-color 150ms, transform 150ms',
    '&:hover': { transform: 'translateY(-2px)', borderColor: '#8ba1c2' },
  },
  platformIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    display: 'grid',
    placeItems: 'center',
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 14,
  },
  flow: {
    background: '#eef3f9',
    borderRadius: 14,
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  body: {
    border: '1px solid #e1e7ef',
    borderRadius: 18,
    overflow: 'hidden',
    boxShadow: '0 10px 35px #31445e06',
  },
  tabs: {
    padding: '0 16px',
    background: '#fff',
    borderBottom: '1px solid #e8edf3',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(260px, 0.8fr) minmax(0, 1.6fr)',
    [theme.breakpoints.down('sm')]: { gridTemplateColumns: '1fr' },
  },
  catalog: {
    background: '#f8fafd',
    borderRight: '1px solid #e6ecf3',
    padding: 18,
  },
  list: {
    maxHeight: 800,
    overflowY: 'auto',
    marginTop: 14,
    display: 'grid',
    gap: 8,
  },
  item: {
    padding: '15px 13px',
    background: '#fff',
    border: '1px solid transparent',
    borderRadius: 12,
    textAlign: 'left',
    cursor: 'pointer',
    color: '#24324a',
    '&:hover': { borderColor: '#bac9dd' },
  },
  selected: { borderColor: '#738fb6', background: '#edf3fd' },
  method: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#386fb0',
    fontWeight: 700,
    marginRight: 8,
  },
  inspector: {
    padding: 28,
    minWidth: 0,
    background: '#fff',
    [theme.breakpoints.down('xs')]: { padding: 18 },
  },
  code: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
    background: '#172337',
    color: '#c9d9ef',
    padding: 20,
    borderRadius: 12,
    overflow: 'auto',
    maxHeight: 360,
    lineHeight: 1.65,
  },
  label: { fontSize: 12, color: '#718099', marginBottom: 6, fontWeight: 600 },
  facts: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 18,
    margin: '22px 0',
    [theme.breakpoints.down('xs')]: { gridTemplateColumns: '1fr' },
  },
  section: { marginTop: 22 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  actions: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 },
  history: {
    padding: '18px 24px',
    borderBottom: '1px solid #e8edf3',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  connection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 18,
    padding: 24,
    [theme.breakpoints.down('sm')]: { gridTemplateColumns: '1fr' },
  },
}));
interface Target {
  id: PlatformKey;
  configured: boolean;
  baseUrl: string;
  healthPath: string;
  readPaths: string[];
  authentication: string;
}
const json = (value: unknown) => JSON.stringify(value, null, 2);
const outcomeLabel = { passed: '통과', failed: '실패', blocked: '실행 불가' };
const outcomeSeverity = {
  passed: 'success',
  blocked: 'warning',
  failed: 'error',
} as const;
const exportJson = (filename: string, value: unknown) => {
  const url = URL.createObjectURL(
    new Blob([json(value)], { type: 'application/json;charset=utf-8' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const Console = () => {
  const classes = useStyles();
  const runtime = usePortalRuntime();
  const { hasPermission } = useAuthz();
  const [tab, setTab] = useState(0);
  const [detailTab, setDetailTab] = useState(0);
  const [platform, setPlatform] = useState<PlatformKey | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('PAI-004');
  const [mode, setMode] = useState<TestMode>('sample');
  const [scenario, setScenario] = useState('success');
  const [requestText, setRequestText] = useState('');
  const [history, setHistory] = useState<TestResult[]>([]);
  const [result, setResult] = useState<TestResult | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const scope = `${runtime.tenantId}:${runtime.actorId}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const selected = integrationContracts.find(item => item.id === selectedId)!;
  const selectedPlatform = platforms.find(
    item => item.id === selected.platform,
  )!;
  const target = targets.find(item => item.id === selected.platform);
  const rows = useMemo(
    () =>
      integrationContracts.filter(
        item =>
          (platform === 'all' || item.platform === platform) &&
          `${item.name} ${item.endpointCandidate} ${item.category}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [platform, search],
  );
  const loadTargets = async () => {
    if (runtime.isDemo) {
      setTargets([]);
      return;
    }
    const currentScope = scope;
    try {
      const response = await runtime.request<Target[]>(
        '/v1/integrations/targets',
      );
      if (scopeRef.current === currentScope) {
        setTargets(response.data);
        setNotice('');
      }
    } catch (error) {
      if (scopeRef.current === currentScope)
        setNotice(
          error instanceof Error
            ? error.message
            : '연결 설정을 불러오지 못했습니다.',
        );
    }
  };
  useEffect(() => {
    setHistory(readHistory(runtime.tenantId, runtime.actorId));
    setResult(null);
    setTargets([]);
    setNotice('');
    setBusy(false);
    void loadTargets();
  }, [scope, runtime.isDemo]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setRequestText(json(sampleRequest(selected, runtime.tenantId)));
    setResult(null);
  }, [selected, runtime.tenantId]);

  const record = (test: TestResult) => {
    setResult(test);
    setHistory(previous => {
      const next = [test, ...previous].slice(0, 40);
      try {
        saveHistory(runtime.tenantId, runtime.actorId, next);
      } catch {
        setNotice(
          '브라우저 저장 공간이 부족하여 테스트 이력은 현재 화면에서만 유지됩니다.',
        );
      }
      return next;
    });
  };
  const runTest = async (kind: 'contract' | 'connection') => {
    const currentScope = scope;
    const started = performance.now();
    const base: TestResult = {
      id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      occurredAt: new Date().toISOString(),
      contractName: selected.name,
      platform: selected.platform,
      kind,
      mode: kind === 'connection' ? 'live' : mode,
      outcome: 'failed',
      status: null,
      elapsedMs: 0,
      message: '',
      checks: [],
    };
    setBusy(true);
    setNotice('');
    try {
      if (base.mode === 'live' && runtime.isDemo)
        throw new Error(
          '검토 환경에는 실제 연결 설정이 없습니다. 운영 인증 후 등록된 플랫폼을 테스트하세요.',
        );
      let request: Record<string, unknown> = {};
      if (kind === 'contract') {
        try {
          request = JSON.parse(requestText);
        } catch {
          throw new Error(
            '요청 JSON 문법이 올바르지 않습니다. 쉼표와 따옴표를 확인하세요.',
          );
        }
        const issues = validateContract(request, selected.requestData);
        if (issues.length) {
          record({
            ...base,
            message: '요청 계약 검증 실패',
            checks: issues,
            elapsedMs: Math.round(performance.now() - started),
          });
          return;
        }
      }
      if (base.mode === 'sample') {
        const response = sampleResponse(selected);
        if (scenario === 'schema-error')
          delete response[fieldName(selected.responseData[0])];
        const checks = validateContract(response, selected.responseData);
        const sample: TestResult = {
          ...base,
          outcome: checks.length ? 'failed' : 'passed',
          status: 200,
          elapsedMs: Math.round(performance.now() - started),
          message: checks.length
            ? '샘플 응답에서 필수 필드 누락을 확인했습니다.'
            : '샘플 요청·응답의 초안 필드 계약을 검증했습니다. 외부 접속 결과가 아닙니다.',
          checks: checks.length
            ? checks
            : ['요청 필수 필드 및 타입 확인', '응답 필수 필드 및 타입 확인'],
          response,
        };
        if (scenario === 'timeout') {
          sample.outcome = 'failed';
          sample.status = null;
          sample.response = undefined;
          sample.message =
            '시간 초과 오류 처리 예시입니다. 외부 요청은 실행하지 않았습니다.';
          sample.checks = ['시간 초과 오류 안내 확인'];
        }
        if (scenario === 'unauthorized') {
          sample.outcome = 'failed';
          sample.status = 401;
          sample.message =
            '인증 만료 응답 예시입니다. 외부 요청은 실행하지 않았습니다.';
          sample.checks = ['HTTP 401 오류 응답 안내 확인'];
          sample.response = {
            error: { code: 'unauthenticated', message: '샘플 인증 만료' },
          };
        }
        record(sample);
      } else {
        if (!hasPermission('settings.manage'))
          throw new Error(
            '실제 테스트에는 시스템 설정 관리 권한이 필요합니다.',
          );
        if (kind === 'contract' && selected.method !== 'GET')
          throw new Error(
            '실제 API 테스트는 승인된 GET 조회만 실행합니다. 변경·파일·이벤트 인터페이스는 샘플 계약을 검증하세요.',
          );
        const requestPath =
          kind === 'contract' ? resolveReadPath(selected, request) : {};
        const response = await runtime.request<
          Omit<
            TestResult,
            'id' | 'occurredAt' | 'contractName' | 'platform' | 'kind' | 'mode'
          >
        >('/v1/integrations/test', {
          method: 'POST',
          body: json({ platform: selected.platform, kind, ...requestPath }),
        });
        if (scopeRef.current !== currentScope) return;
        const data = response.data;
        const issues =
          kind === 'contract' && data.outcome === 'passed'
            ? validateContract(data.response, selected.responseData)
            : [];
        record({
          ...base,
          ...data,
          ...(issues.length
            ? {
                outcome: 'failed' as const,
                message:
                  'HTTPS 응답은 수신했지만 초안 응답 계약과 구조가 다릅니다.',
                checks: [...data.checks, ...issues],
              }
            : {}),
        });
      }
    } catch (error) {
      if (scopeRef.current === currentScope)
        record({
          ...base,
          outcome: 'blocked',
          message:
            error instanceof Error
              ? error.message
              : '테스트를 완료하지 못했습니다.',
          elapsedMs: Math.round(performance.now() - started),
        });
    } finally {
      if (scopeRef.current === currentScope) setBusy(false);
    }
  };
  const exportContracts = () =>
    exportJson('platform-contracts-draft.json', {
      version: 'draft-1',
      status: '플랫폼 담당자 검토 전 초안',
      contracts: integrationContracts.map(item => ({
        name: item.name,
        platform: item.platform,
        method: item.method,
        path: item.endpointCandidate,
        description: item.description,
        requestSchema: contractSchema(item.requestData),
        responseSchema: contractSchema(item.responseData),
        questions: item.followUpQuestions,
        security: item.securityConsiderations,
        portalRole: item.portalRole,
        platformRole: item.platformRole,
      })),
    });
  const exportHistory = () =>
    downloadCsv(
      '플랫폼_테스트_이력.csv',
      [
        { key: 'occurredAt', label: '실행 시각' },
        { key: 'contractName', label: 'API' },
        { key: 'platform', label: '플랫폼' },
        { key: 'mode', label: '실행 모드' },
        { key: 'kind', label: '유형' },
        { key: 'outcome', label: '결과' },
        { key: 'status', label: 'HTTP' },
        { key: 'elapsedMs', label: '소요 ms' },
        { key: 'message', label: '메시지' },
      ],
      history.map(item => ({
        ...item,
        mode: item.mode === 'sample' ? '샘플 계약 검증' : '실제 HTTPS 요청',
        outcome: outcomeLabel[item.outcome],
      })),
    );

  return (
    <div className={classes.page}>
      <div className={classes.top}>
        <div>
          <div className={classes.eyebrow}>DEVELOPER WORKSPACE</div>
          <Typography component="h1" className={classes.title}>
            플랫폼 연계 개발 콘솔
          </Typography>
          <Typography className={classes.muted}>
            API 계약을 함께 검토하고, 연결과 응답을 확인하는 공간입니다.
          </Typography>
        </div>
        <Button
          variant="outlined"
          startIcon={<GetAppIcon />}
          onClick={exportContracts}
        >
          연계 명세 내보내기
        </Button>
      </div>
      <div className={classes.platforms}>
        {platforms.slice(0, 4).map(item => (
          <button
            key={item.id}
            className={classes.platform}
            style={{
              borderColor: platform === item.id ? item.color : undefined,
            }}
            onClick={() => {
              setPlatform(item.id);
              setTab(0);
              const first = integrationContracts.find(
                contract => contract.platform === item.id,
              );
              if (first) setSelectedId(first.id);
            }}
          >
            <div
              className={classes.platformIcon}
              style={{ color: item.color, background: `${item.color}12` }}
            >
              {item.short}
            </div>
            <Typography style={{ fontSize: 15, fontWeight: 700 }}>
              {item.label}
            </Typography>
            <Typography className={classes.muted}>
              {item.responsibility}
            </Typography>
            <Typography
              style={{ fontSize: 11, color: '#78869b', marginTop: 12 }}
            >
              {
                integrationContracts.filter(
                  contract => contract.platform === item.id,
                ).length
              }
              개 연계 항목 ·{' '}
              {targets.find(t => t.id === item.id)?.configured
                ? '연결 설정 등록됨'
                : '실연동 미설정'}
            </Typography>
          </button>
        ))}
      </div>
      <div className={classes.flow}>
        <Typography variant="body2">
          <strong>포털</strong> 접근 통제 · 신청 · 승인 · 요약 조회
        </Typography>
        <Typography className={classes.muted}>
          ← API · 이벤트 · 파일 →
        </Typography>
        <Typography variant="body2">
          <strong>각 플랫폼</strong> 분석 · 학습 · 자원 운영 · 상세 작업
        </Typography>
      </div>
      {notice && (
        <Box mb={2}>
          <Alert severity="warning">{notice}</Alert>
        </Box>
      )}
      <Paper elevation={0} className={classes.body}>
        <Tabs
          className={classes.tabs}
          value={tab}
          onChange={(_, value) => setTab(value)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label={`API 카탈로그 ${integrationContracts.length}`} />
          <Tab label={`테스트 이력 ${history.length}`} />
          <Tab label="연결 설정" />
          <Tab label="데이터 사전" />
        </Tabs>
        {tab === 0 && (
          <div className={classes.grid}>
            <div className={classes.catalog}>
              <TextField
                id="integration-search"
                size="small"
                variant="outlined"
                label="API 이름 또는 경로 검색"
                value={search}
                onChange={event => setSearch(event.target.value)}
                fullWidth
              />
              <Box mt={2}>
                <TextField
                  id="integration-platform"
                  select
                  variant="outlined"
                  size="small"
                  label="플랫폼"
                  fullWidth
                  value={platform}
                  onChange={event =>
                    setPlatform(event.target.value as PlatformKey | 'all')
                  }
                >
                  <MenuItem value="all">모든 플랫폼</MenuItem>
                  {platforms.map(item => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <div className={classes.list}>
                {rows.map(item => (
                  <button
                    key={item.id}
                    aria-pressed={selected.id === item.id}
                    className={`${classes.item} ${
                      selected.id === item.id ? classes.selected : ''
                    }`}
                    onClick={() => {
                      setSelectedId(item.id);
                      setDetailTab(0);
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: '#7e8ba0',
                        marginBottom: 7,
                      }}
                    >
                      <span className={classes.method}>{item.method}</span>
                      {platforms.find(p => p.id === item.platform)?.label}
                    </div>
                    <Typography
                      style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.6 }}
                    >
                      {item.name}
                    </Typography>
                    <div
                      style={{
                        fontSize: 10,
                        fontFamily: 'monospace',
                        marginTop: 7,
                        overflowWrap: 'anywhere',
                        color: '#8190a5',
                      }}
                    >
                      {item.endpointCandidate}
                    </div>
                  </button>
                ))}
                {!rows.length && (
                  <Typography className={classes.muted}>
                    검색 결과가 없습니다. 다른 이름이나 플랫폼을 선택하세요.
                  </Typography>
                )}
              </div>
            </div>
            <div className={classes.inspector}>
              <div className={classes.chips}>
                <Chip size="small" label={selectedPlatform.label} />
                <Chip size="small" variant="outlined" label="협의용 API 초안" />
                <Chip size="small" variant="outlined" label={selected.status} />
              </div>
              <Typography
                component="h2"
                style={{
                  fontSize: 21,
                  fontWeight: 700,
                  margin: '18px 0 12px',
                  letterSpacing: '-0.03em',
                }}
              >
                {selected.name}
              </Typography>
              <Typography className={classes.muted}>
                {selected.description}
              </Typography>
              <pre className={classes.code} style={{ padding: '14px 18px' }}>
                {selected.method} {selected.endpointCandidate}
              </pre>
              <Tabs
                value={detailTab}
                onChange={(_, value) => setDetailTab(value)}
                indicatorColor="primary"
                textColor="primary"
              >
                <Tab label="연계 계약" />
                <Tab label="API 테스트" />
              </Tabs>
              <Divider />
              {detailTab === 0 ? (
                <>
                  <div className={classes.facts}>
                    <div>
                      <div className={classes.label}>포털에서 할 일</div>
                      <Typography variant="body2">
                        {selected.portalRole ||
                          '권한 확인, 요청 접수, 연계 결과 요약 표시'}
                      </Typography>
                    </div>
                    <div>
                      <div className={classes.label}>플랫폼에서 할 일</div>
                      <Typography variant="body2">
                        {selected.platformRole ||
                          selectedPlatform.responsibility}
                      </Typography>
                    </div>
                  </div>
                  {selected.responsibilityBoundary && (
                    <Alert severity="info" icon={<LinkIcon />}>
                      {selected.responsibilityBoundary}
                    </Alert>
                  )}
                  <div className={classes.section}>
                    <div className={classes.label}>요청 → 응답 필드</div>
                    <Typography
                      variant="body2"
                      style={{ overflowWrap: 'anywhere' }}
                    >
                      {selected.requestData.join(', ')}
                    </Typography>
                    <Typography className={classes.muted}>↓</Typography>
                    <Typography
                      variant="body2"
                      style={{ overflowWrap: 'anywhere' }}
                    >
                      {selected.responseData.join(', ')}
                    </Typography>
                  </div>
                  <div className={classes.section}>
                    <div className={classes.label}>사용 화면</div>
                    <div className={classes.chips}>
                      {selected.relatedMenus.map(item => (
                        <Chip
                          key={item}
                          label={item}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </div>
                  </div>
                  <div className={classes.section}>
                    <div className={classes.label}>인증 · 보안 · 처리 조건</div>
                    {selected.securityConsiderations.map(item => (
                      <Typography key={item} className={classes.muted}>
                        • {item}
                      </Typography>
                    ))}
                  </div>
                  <div className={classes.section}>
                    <div className={classes.label}>
                      플랫폼 담당자와 확인할 내용
                    </div>
                    {[
                      ...selected.followUpQuestions,
                      ...(selected.followUpConditions || []),
                    ].map((item, index) => (
                      <Typography
                        key={`${index}-${item}`}
                        className={classes.muted}
                      >
                        • {item}
                      </Typography>
                    ))}
                  </div>
                  {selected.errorHandling && (
                    <div className={classes.section}>
                      <div className={classes.label}>오류 · 재처리 기준</div>
                      {selected.errorHandling.map(item => (
                        <Typography key={item} className={classes.muted}>
                          • {item}
                        </Typography>
                      ))}
                    </div>
                  )}
                  {selected.auditLog && (
                    <div className={classes.section}>
                      <div className={classes.label}>감사 기록 항목</div>
                      <Typography className={classes.muted}>
                        {selected.auditLog.join(' · ')}
                      </Typography>
                    </div>
                  )}
                  <div className={classes.actions}>
                    <Button
                      variant="contained"
                      color="primary"
                      disableElevation
                      startIcon={<PlayArrowIcon />}
                      onClick={() => setDetailTab(1)}
                    >
                      계약 테스트 열기
                    </Button>
                    <Button
                      onClick={() =>
                        exportJson('api-contract-draft.json', {
                          name: selected.name,
                          method: selected.method,
                          path: selected.endpointCandidate,
                          requestSchema: contractSchema(selected.requestData),
                          responseSchema: contractSchema(selected.responseData),
                          status: '초안 · 필수 여부와 타입은 플랫폼 합의 필요',
                        })
                      }
                    >
                      이 API 명세 저장
                    </Button>
                  </div>
                </>
              ) : (
                <div className={classes.section}>
                  <Alert severity="info">
                    샘플 테스트는 브라우저에서 초안 JSON 계약을 검증합니다. 실제
                    접속은 서버에 등록된 HTTPS 주소로만 실행됩니다. 필드 타입과
                    필수 여부는 플랫폼 담당자 합의가 필요합니다.
                  </Alert>
                  <div className={classes.facts}>
                    <TextField
                      id="integration-mode"
                      select
                      label="테스트 모드"
                      variant="outlined"
                      size="small"
                      value={mode}
                      onChange={event => {
                        setMode(event.target.value as TestMode);
                        setResult(null);
                      }}
                    >
                      <MenuItem value="sample">샘플 계약 검증</MenuItem>
                      <MenuItem value="live">실제 API 조회 (GET)</MenuItem>
                    </TextField>
                    {mode === 'sample' ? (
                      <TextField
                        id="integration-scenario"
                        select
                        label="검증 시나리오"
                        variant="outlined"
                        size="small"
                        value={scenario}
                        onChange={event => setScenario(event.target.value)}
                      >
                        <MenuItem value="success">정상 응답</MenuItem>
                        <MenuItem value="schema-error">응답 필드 누락</MenuItem>
                        <MenuItem value="unauthorized">
                          인증 만료 (401)
                        </MenuItem>
                        <MenuItem value="timeout">응답 시간 초과</MenuItem>
                      </TextField>
                    ) : (
                      <div>
                        <div className={classes.label}>등록된 주소</div>
                        <Typography
                          variant="body2"
                          style={{ overflowWrap: 'anywhere' }}
                        >
                          {target?.baseUrl ||
                            '이 테넌트에는 실연동 주소가 없습니다.'}
                        </Typography>
                      </div>
                    )}
                  </div>
                  <TextField
                    id="integration-request"
                    label={
                      selected.method === 'GET'
                        ? '요청 파라미터 (JSON)'
                        : '요청 데이터 (JSON)'
                    }
                    value={requestText}
                    onChange={event => setRequestText(event.target.value)}
                    multiline
                    rows={8}
                    fullWidth
                    variant="outlined"
                    InputProps={{
                      style: { fontFamily: 'monospace', fontSize: 12 },
                    }}
                  />
                  <div className={classes.actions}>
                    <Button
                      variant="contained"
                      color="primary"
                      disableElevation
                      disabled={
                        busy ||
                        (mode === 'live' &&
                          (!target?.configured ||
                            !hasPermission('settings.manage') ||
                            selected.method !== 'GET'))
                      }
                      startIcon={
                        busy ? (
                          <CircularProgress size={16} />
                        ) : (
                          <PlayArrowIcon />
                        )
                      }
                      onClick={() => void runTest('contract')}
                    >
                      {mode === 'sample' ? '샘플 계약 검증' : '실제 GET 실행'}
                    </Button>
                    <Button
                      variant="outlined"
                      disabled={
                        busy ||
                        !target?.configured ||
                        !hasPermission('settings.manage')
                      }
                      startIcon={<LinkIcon />}
                      onClick={() => void runTest('connection')}
                    >
                      접속 테스트
                    </Button>
                    <Button
                      disabled={busy}
                      onClick={() =>
                        setRequestText(
                          json(sampleRequest(selected, runtime.tenantId)),
                        )
                      }
                    >
                      샘플 값 채우기
                    </Button>
                  </div>
                  {mode === 'live' && (
                    <Typography
                      className={classes.muted}
                      style={{ marginTop: 10 }}
                    >
                      테넌트는 서버가 지정합니다. GET 이외의 호출, 미등록 경로와
                      리다이렉트는 차단됩니다. 제한 시간 8초 · 응답 최대 64KB.
                    </Typography>
                  )}
                  {result && (
                    <div className={classes.section} role="status">
                      <Alert severity={outcomeSeverity[result.outcome]}>
                        <strong>
                          {result.mode === 'sample' ? '샘플 검증' : '실제 요청'}{' '}
                          · {outcomeLabel[result.outcome]}
                        </strong>
                        <br />
                        {result.message}
                      </Alert>
                      <Typography
                        className={classes.muted}
                        style={{ marginTop: 10 }}
                      >
                        {result.status !== null
                          ? `HTTP ${result.status} · `
                          : ''}
                        {result.elapsedMs}ms ·{' '}
                        {new Date(result.occurredAt).toLocaleTimeString(
                          'ko-KR',
                        )}
                      </Typography>
                      {result.checks.map(item => (
                        <Typography key={item} className={classes.muted}>
                          • {item}
                        </Typography>
                      ))}
                      {result.response !== undefined && (
                        <>
                          <div
                            className={classes.label}
                            style={{ marginTop: 12 }}
                          >
                            {result.mode === 'sample'
                              ? '샘플 응답'
                              : '실제 응답 구조 · 값 비식별화'}
                          </div>
                          <pre className={classes.code}>
                            {json(result.response)}
                          </pre>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {tab === 1 && (
          <>
            <div className={classes.history}>
              <div>
                <Typography style={{ fontWeight: 700 }}>최근 테스트</Typography>
                <Typography className={classes.muted}>
                  현재 사용자 · 테넌트별 최근 40건. 브라우저에는 요청과 응답
                  원문을 저장하지 않습니다.
                </Typography>
              </div>
              <Button
                startIcon={<GetAppIcon />}
                disabled={!history.length}
                onClick={exportHistory}
              >
                이력 CSV
              </Button>
            </div>
            {history.length ? (
              history.map(item => (
                <div key={item.id} className={classes.history}>
                  <div>
                    <Typography variant="body2" style={{ fontWeight: 600 }}>
                      {item.kind === 'connection'
                        ? `${
                            platforms.find(p => p.id === item.platform)?.label
                          } 접속 테스트`
                        : item.contractName}
                    </Typography>
                    <Typography className={classes.muted}>
                      {item.message}
                    </Typography>
                    <Typography className={classes.muted}>
                      {new Date(item.occurredAt).toLocaleString('ko-KR')} ·{' '}
                      {item.elapsedMs}ms{' '}
                      {item.status !== null ? `· HTTP ${item.status}` : ''}
                    </Typography>
                  </div>
                  <div className={classes.chips}>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={item.mode === 'sample' ? '샘플' : '실제 요청'}
                    />
                    <Chip
                      size="small"
                      label={outcomeLabel[item.outcome]}
                      color={item.outcome === 'passed' ? 'primary' : 'default'}
                    />
                  </div>
                </div>
              ))
            ) : (
              <Box p={6} textAlign="center">
                <Typography className={classes.muted}>
                  실행된 테스트가 없습니다. API 카탈로그에서 첫 계약을
                  검증하세요.
                </Typography>
              </Box>
            )}
          </>
        )}
        {tab === 2 && (
          <>
            <Box p={3}>
              <Alert severity="info">
                연결 주소와 인증 토큰은 배포 서버에서 테넌트별로 등록합니다.
                여기에는 등록 상태만 표시하며, 플랫폼 담당자와 합의한 조회
                경로만 테스트할 수 있습니다.
              </Alert>
              <div className={classes.actions}>
                <Button variant="outlined" onClick={() => void loadTargets()}>
                  설정 다시 불러오기
                </Button>
              </div>
            </Box>
            <div className={classes.connection}>
              {platforms.map(item => {
                const config = targets.find(t => t.id === item.id);
                return (
                  <Paper
                    key={item.id}
                    elevation={0}
                    style={{
                      border: '1px solid #e5eaf2',
                      borderRadius: 14,
                      padding: 20,
                    }}
                  >
                    <Typography style={{ fontWeight: 700 }}>
                      {item.label}
                    </Typography>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={
                        config?.configured
                          ? '실연동 설정 등록됨'
                          : '실연동 미설정'
                      }
                      style={{ margin: '12px 0' }}
                    />
                    <Typography
                      className={classes.muted}
                      style={{ overflowWrap: 'anywhere' }}
                    >
                      {config?.baseUrl ||
                        (runtime.isDemo
                          ? '검토 환경 · 실제 주소를 사용하지 않습니다.'
                          : '배포 담당자에게 플랫폼 주소 등록을 요청하세요.')}
                    </Typography>
                    {config?.configured && (
                      <>
                        <Typography className={classes.muted}>
                          접속 확인: GET {config.healthPath}
                        </Typography>
                        <Typography className={classes.muted}>
                          인증:{' '}
                          {config.authentication === 'server-token'
                            ? '서버 보관 토큰'
                            : '네트워크 정책 / 플랫폼 정책'}
                        </Typography>
                        <Typography className={classes.muted}>
                          허용 조회 경로:{' '}
                          {config.readPaths.join(', ') || '없음'}
                        </Typography>
                      </>
                    )}
                  </Paper>
                );
              })}
            </div>
            <Box px={3} pb={3}>
              <Typography className={classes.muted}>
                배포 설정: PORTAL_INTEGRATION_TARGETS → 테넌트 ID → 플랫폼 ID →
                baseUrl / healthPath / readPaths / tokenEnv. 실제 테스트 결과는
                서버 감사 이력에도 기록됩니다.
              </Typography>
            </Box>
          </>
        )}
        {tab === 3 && <MetadataDictionaryPanel />}
      </Paper>
    </div>
  );
};

export const DeveloperConsolePage = () => (
  <PermissionGuard allOf={['integration.view']}>
    <Console />
  </PermissionGuard>
);
