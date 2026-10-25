import { useMemo, useState } from 'react';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import MenuItem from '@material-ui/core/MenuItem';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import {
  discoveryApiRef,
  DiscoveryApi,
  IdentityApi,
  identityApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { MetricCard, PageHeader, SectionCard } from '../common';
import { useAuthz } from '../authz';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import {
  KrmfBaseline,
  KrmfRequest,
  getKrmfBaselines,
  getKrmfOverview,
} from './krmfApi';
import {
  formatDate,
  implementationRateLabel,
  normalizeRecentChanges,
} from './krmfLabels';
import { KrmfQueryBoundary } from './KrmfQueryView';
import { KrmfStatusTab } from './KrmfStatusTab';
import { KrmfEvidenceTab } from './KrmfEvidenceTab';
import { KrmfActionsTab } from './KrmfActionsTab';
import { useKrmfQuery } from './useKrmfQuery';
import Alert from '@material-ui/lab/Alert';

const useStyles = makeStyles({
  filters: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
  },
  filterField: {
    minWidth: 220,
  },
  recentChanges: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  recentChangeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
  },
});

export interface KrmfTabContext {
  fileStorageConfigured?: boolean;
  request: KrmfRequest;
  tenantId: string;
  baselineId: string;
  projectId: string;
  canReview: boolean;
  canSubmit: boolean;
  canManage: boolean;
  rawDeps: { identity: IdentityApi; discovery: DiscoveryApi };
}

const overviewTone = (total: number, rate: number | null) => {
  if (total === 0) return 'neutral' as const;
  if (rate !== null && rate >= 80) return 'success' as const;
  return 'warning' as const;
};

const TAB_LABELS = ['현황', '통제·증적', '조치·변경'] as const;
type KrmfMonitorTab = (typeof TAB_LABELS)[number];

export const KrmfMonitorPage = () => {
  const classes = useStyles();
  const runtime = usePortalRuntime();
  const { hasPermission } = useAuthz();
  const identity = useApi(identityApiRef);
  const discovery = useApi(discoveryApiRef);
  const [baselineId, setBaselineId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [tab, setTab] = useState<KrmfMonitorTab>('현황');

  const baselinesState = useKrmfQuery<KrmfBaseline[]>(
    () => getKrmfBaselines(runtime.request),
    [runtime.tenantId],
  );
  const baselines = useMemo(
    () => baselinesState.data ?? [],
    [baselinesState.data],
  );
  const effectiveBaseline = baselines.some(b => b.id === baselineId)
    ? baselineId
    : '';
  const effectiveProject = projectId;
  const overviewState = useKrmfQuery(
    () =>
      getKrmfOverview(runtime.request, {
        baselineId: effectiveBaseline || undefined,
        projectId: effectiveProject || undefined,
      }),
    [runtime.tenantId, effectiveBaseline, effectiveProject],
  );

  const projectOptions = useMemo(() => {
    const names = new Map<string, string>();
    baselines.forEach(baseline => {
      if (baseline.project_id) {
        names.set(baseline.project_id, baseline.project_name?.trim() || '이름이 등록되지 않은 프로젝트');
      }
    });
    return Array.from(names, ([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [baselines]);

  const context: KrmfTabContext = {
    fileStorageConfigured: overviewState.data?.file_storage_configured,
    request: runtime.request,
    tenantId: runtime.tenantId,
    baselineId: effectiveBaseline,
    projectId: effectiveProject,
    canReview: hasPermission('krmf.review'),
    canSubmit: hasPermission('krmf.evidence.submit'),
    canManage: hasPermission('krmf.manage'),
    rawDeps: { identity, discovery },
  };

  return (
    <Box padding={3}>
      <PageHeader
        title="K-RMF 현황"
        description="기준선별 통제 이행 현황과 증적·조치·변경을 모니터링합니다."
      />
      {context.fileStorageConfigured === false && (
        <Alert severity="info" style={{ marginBottom: 16 }}>
          증적 파일 저장소 연결을 준비 중입니다. 증적은 참조 URI로 등록할 수 있습니다.
        </Alert>
      )}
      <KrmfQueryBoundary state={overviewState}>
        {overview => (
          <Grid container spacing={2}>
            <Grid item xs={12} md>
              <MetricCard
                label="이행률"
                value={implementationRateLabel(overview)}
                tone={overviewTone(
                  overview.total_controls,
                  overview.implementation_rate,
                )}
                subtext={`통제 ${overview.total_controls}건 (적용 ${overview.applied} / 제외 ${overview.excluded} / 대체 ${overview.alternative})`}
              />
            </Grid>
            <Grid item xs={12} md>
              <MetricCard
                label="증적 검토대기"
                value={overview.review_pending}
                tone={overview.review_pending > 0 ? 'warning' : 'success'}
                subtext={`증적 미등록 통제 ${overview.evidence_missing}건`}
              />
            </Grid>
            <Grid item xs={12} md>
              <MetricCard
                label="조치기한 초과"
                value={overview.actions_overdue}
                tone={overview.actions_overdue > 0 ? 'error' : 'success'}
                subtext={`미완료 조치 ${overview.actions_open}건`}
              />
            </Grid>
            <Grid item xs={12} md>
              <MetricCard
                label="변경 재검토 대기"
                value={overview.changes_reassess_pending}
                tone={
                  overview.changes_reassess_pending > 0 ? 'info' : 'success'
                }
              />
            </Grid>
            <Grid item xs={12} md>
              <MetricCard
                label="다음 점검일"
                value={formatDate(overview.next_due)}
                subtext={
                  overview.computed_at
                    ? `기준 시각 ${formatDate(overview.computed_at)}`
                    : undefined
                }
              />
            </Grid>
          </Grid>
        )}
      </KrmfQueryBoundary>

      <Box marginTop={2} className={classes.filters}>
        <TextField
          id="krmf-baseline-filter"
          SelectProps={{ labelId: 'krmf-baseline-filter-label' }}
          select
          size="small"
          label="기준선"
          className={classes.filterField}
          value={effectiveBaseline}
          onChange={event => setBaselineId(event.target.value)}
        >
          <MenuItem value="">전체 기준선</MenuItem>
          {baselines.map(baseline => (
            <MenuItem key={baseline.id} value={baseline.id}>
              {baseline.name} v{baseline.version}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          id="krmf-project-filter"
          SelectProps={{ labelId: 'krmf-project-filter-label' }}
          select
          size="small"
          label="프로젝트"
          className={classes.filterField}
          value={projectId}
          onChange={event => setProjectId(event.target.value)}
        >
          <MenuItem value="">전체 프로젝트</MenuItem>
          {projectOptions.map(project => (
            <MenuItem key={project.id} value={project.id}>
              {project.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box marginTop={2}>
        <SectionCard title="최근 변경" compact>
          <KrmfQueryBoundary state={overviewState}>
            {overview => {
              const recent = normalizeRecentChanges(overview.recent_changes);
              if (!recent.length)
                return (
                  <Typography variant="body2" color="textSecondary">
                    최근 등록된 변경이 없습니다.
                  </Typography>
                );
              return (
                <Box className={classes.recentChanges}>
                  {recent.slice(0, 5).map(item => (
                    <Box key={item.id} className={classes.recentChangeRow}>
                      <Typography variant="body2">{item.label}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {formatDate(item.at) || '—'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              );
            }}
          </KrmfQueryBoundary>
        </SectionCard>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value as KrmfMonitorTab)}
        indicatorColor="primary"
        textColor="primary"
        variant="scrollable"
        scrollButtons="auto"
      >
        {TAB_LABELS.map(label => (
          <Tab key={label} label={label} value={label} />
        ))}
      </Tabs>
      <Box marginTop={2}>
        {tab === '현황' ? <KrmfStatusTab context={context} /> : null}
        {tab === '통제·증적' ? <KrmfEvidenceTab context={context} /> : null}
        {tab === '조치·변경' ? <KrmfActionsTab context={context} /> : null}
      </Box>
    </Box>
  );
};
