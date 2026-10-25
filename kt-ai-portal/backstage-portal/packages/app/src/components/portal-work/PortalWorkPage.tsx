import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import RefreshIcon from '@material-ui/icons/Refresh';
import SearchIcon from '@material-ui/icons/Search';
import WorkOutlineIcon from '@material-ui/icons/WorkOutline';
import MemoryIcon from '@material-ui/icons/Memory';
import AssignmentTurnedInOutlinedIcon from '@material-ui/icons/AssignmentTurnedInOutlined';
import VerifiedUserOutlinedIcon from '@material-ui/icons/VerifiedUserOutlined';
import { useAuthz, ROLE_LABELS } from '../authz';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { readDemoActivity } from '../portal-runtime/demoActivity';
import { usePlatformAccess, useTenantSettings } from '../tenant-settings';
import { portalMenuDefinitions } from '../navigation';
import { mockProjects } from '../project-workspace/mockProjects';
import {
  readWorkspaceRequests,
  workspaceStorageKey,
} from '../project-workspace/workspaceDemoStore';
import { mockExportRequests } from '../export-approval/mockExportRequests';
import {
  readDemoExportRequests,
  exportRequestStorageKey,
} from '../export-approval/exportRequestStore';
import {
  readExportDecisions,
  exportDecisionStorageKey,
  applyExportDecision,
} from '../export-approval/exportDecisionStore';
import {
  mockChargeHistory,
  mockProjectCredits,
} from '../credit-manager/mockCredits';
import {
  branchResourcePools,
  branchTenantOverviews,
} from '../tenant-management/mockTenantManagementData';
import { PlatformIcon } from '../portal-home/PlatformIcon';
import { usePlatformLaunch } from '../portal-home/PlatformLaunch';
import {
  resolveWorkProfile,
  isDemoProjectInTenant,
  relativeRoute,
} from './workProfiles';
import {
  WorkOverviewData,
  WorkOverviewMeta,
  WorkOverviewSection,
  workSectionReady,
  unavailableWorkSections,
  approvalCount,
  mapMyRequestsToQueue,
  SERVER_PROJECT_LABELS,
  auditExclusionMessage,
  classifyWorkFetchError,
  describeObservation,
  mapApprovalQueueToQueue,
} from './workServerData';
import './portalWork.css';

interface QueueItem {
  id: string;
  name: string;
  detail: string;
  type: string;
  status: string;
  route: string;
}
const projectLabels: Record<string, string> = {
  running: '진행 중',
  pending_approval: '승인 대기',
  approved: '승인 완료',
  completed: '완료',
  rejected: '반려',
  requested: '신청',
  suspended: '중지',
  draft: '작성 중',
};
const exportLabels: Record<string, string> = {
  requested: '신청',
  reviewing: '검토 중',
  need_revision: '보완 요청',
  approved: '승인',
  rejected: '반려',
  export_completed: '반출 완료',
  import_completed: '반입 완료',
};
const formatNumber = (value: number | null) =>
  value === null ? '—' : value.toLocaleString('ko-KR');

/** 내 프로젝트 그리드에 쓰이는 최소 모델. 데모 목 데이터는 그대로 호환된다. */
interface WorkProjectCardModel {
  id: string;
  name: string;
  description: string;
  status: string;
  ownerOrganization: string;
  quota?: { gpuCount: number; cpuCores: number };
  memberRole?: string;
}

function WorkContent() {
  const { permissions, primaryRole, hasPermission } = useAuthz();
  const runtime = usePortalRuntime();
  const { settings } = useTenantSettings();
  const { platforms, loading: platformsLoading } = usePlatformAccess();
  const launch = usePlatformLaunch();
  const profile = resolveWorkProfile(permissions);
  const { tenantId, actorId, isDemo, tenants } = runtime;
  const tenant = tenants.find(t => t.id === tenantId);
  const tenantName = tenant?.name || settings.branding.shortName;
  const canOpen = (id: string) => {
    const menu = portalMenuDefinitions.find(m => m.id === id);
    return (
      !!menu &&
      menu.requiredAnyPermissions.some(p => permissions.has(p)) &&
      settings.menus.find(m => m.id === id)?.visible !== false
    );
  };
  const [query, setQuery] = useState('');
  const [queueType, setQueueType] = useState('전체');
  const [snapshot, setSnapshot] = useState(() => Date.now());
  const [feedback, setFeedback] = useState('');
  const [catalogQuery, setCatalogQuery] = useState('');
  // 서버 모드(!isDemo): /v1/work/overview을 한 번 호출해 화면을 구성한다.
  // 데모 모드는 아래 브라우저 저장소·목 데이터 경로를 그대로 사용한다.
  const [serverOverview, setServerOverview] = useState<WorkOverviewData | null>(
    null,
  );
  const [serverMeta, setServerMeta] = useState<WorkOverviewMeta | null>(null);
  const [serverLoading, setServerLoading] = useState(!isDemo);
  const [serverFailure, setServerFailure] = useState<ReturnType<
    typeof classifyWorkFetchError
  > | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  useEffect(() => {
    if (isDemo) return undefined;
    const controller = new AbortController();
    setServerLoading(true);
    setServerFailure(null);
    setServerOverview(null);
    setServerMeta(null);
    runtime
      .request<WorkOverviewData>('/v1/work/overview', {
        signal: controller.signal,
      })
      .then(response => {
        if (controller.signal.aborted) return;
        setServerOverview(response.data);
        setServerMeta((response.meta as WorkOverviewMeta) ?? null);
        setServerLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setServerFailure(classifyWorkFetchError(error));
        setServerLoading(false);
      });
    return () => controller.abort();
  }, [isDemo, runtime, reloadToken]);
  const serverPending = !isDemo && serverLoading;
  const serverReady = !isDemo && !serverLoading && !serverFailure;
  // 요약 수치는 서버 준비 전이거나 실패 상태면 '—'로 둔다 — 수치를 만들어내지 않는다.
  const sectionReady = (section: WorkOverviewSection) =>
    isDemo || (serverReady && workSectionReady(serverOverview, section));
  const serverValue = (value: number, section: WorkOverviewSection) =>
    sectionReady(section) ? value : null;
  const unavailableSections = unavailableWorkSections(serverOverview);
  const retryServerFetch = () => setReloadToken(token => token + 1);
  const ownedProjects: WorkProjectCardModel[] = isDemo
    ? mockProjects.filter(p => isDemoProjectInTenant(p.id, tenantId))
    : (serverOverview?.myProjects ?? []).map(project => ({
        id: project.id,
        name: project.name,
        description: '',
        status: project.status,
        ownerOrganization: '',
        memberRole: project.memberRole,
      }));
  const projects = canOpen('project-workspace') ? ownedProjects : [];
  const visibleProjects = projects.filter(p =>
    `${p.name} ${p.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  const workspace =
    isDemo && canOpen('project-workspace')
      ? readWorkspaceRequests(workspaceStorageKey(tenantId, actorId))
      : { items: [], error: undefined };
  const exports =
    isDemo && canOpen('export-approval')
      ? readDemoExportRequests(exportRequestStorageKey(tenantId, actorId))
      : { items: [], error: undefined };
  const decisions =
    isDemo && canOpen('export-approval')
      ? readExportDecisions(exportDecisionStorageKey(tenantId, actorId))
      : { items: [], error: undefined };
  const storedDecisions = new Map(decisions.items.map(d => [d.requestId, d]));
  const sampleExports =
    isDemo && hasPermission('export.review')
      ? mockExportRequests.filter(r =>
          isDemoProjectInTenant(r.projectId, tenantId),
        )
      : [];
  const exportRows = [...exports.items, ...sampleExports].map(row => {
    const decision = storedDecisions.get(row.id);
    return decision ? applyExportDecision(row, decision) : row;
  });
  const queue: QueueItem[] = [];
  if (isDemo) {
    if (canOpen('project-workspace')) {
      workspace.items
        .filter(item => item.status === '신청')
        .forEach(item =>
          queue.push({
            id: item.id,
            name: item.workspaceName,
            detail: item.projectName,
            type: '작업환경',
            status: item.status,
            route: '/project-workspace?tab=request',
          }),
        );
      if (hasPermission('project.approve'))
        projects
          .filter(p => ['requested', 'pending_approval'].includes(p.status))
          .forEach(p =>
            queue.push({
              id: p.id,
              name: p.name,
              detail: p.ownerOrganization,
              type: '프로젝트',
              status: '승인 대기',
              route: relativeRoute('/project-workspace', 'project', p.id),
            }),
          );
    }
    if (canOpen('export-approval'))
      exportRows
        .filter(r =>
          ['requested', 'reviewing', 'need_revision'].includes(r.status),
        )
        .forEach(r =>
          queue.push({
            id: r.id,
            name: r.targetName,
            detail: r.projectName,
            type: '반입·반출',
            status: exportLabels[r.status],
            route: relativeRoute('/export-approval', 'request', r.id),
          }),
        );
    if (hasPermission('credit.approve') && canOpen('credit-manager'))
      mockChargeHistory
        .filter(
          c =>
            c.status === 'requested' &&
            ownedProjects.some(p => p.name === c.projectName),
        )
        .forEach(c =>
          queue.push({
            id: c.id,
            name: c.projectName,
            detail: `${c.credits.toLocaleString()} 크레딧 · ${c.reason}`,
            type: '크레딧',
            status: '충전 요청',
            route: '/credit-manager',
          }),
        );
  } else {
    // 서버는 유형별 검토 대기 건수만 집계해 주므로, 개별 신청 행이 아닌 유형 요약 링크로 구성한다.
    queue.push(
      ...(profile.id === 'personal'
        ? mapMyRequestsToQueue(serverOverview?.myRequests)
        : mapApprovalQueueToQueue(serverOverview?.approvalQueue)),
    );
  }
  const resources =
    isDemo && canOpen('tenant-management')
      ? branchResourcePools.filter(r => r.branch === tenantName)
      : [];
  const tenantOverview =
    isDemo && canOpen('tenant-management')
      ? branchTenantOverviews.find(t => t.branch === tenantName)
      : undefined;
  const activity =
    isDemo && canOpen('audit-history')
      ? readDemoActivity()
          .filter(a => a.tenantId === tenantId)
          .slice(0, 6)
      : [];
  // 서버 감사 최근 기록: audit.view 권한이 있으면 최근 10건, 없으면 null + 사유 코드.
  const serverActivity = !isDemo
    ? (serverOverview?.recentAudit ?? []).map(event => ({
        id: String(event.event_id ?? ''),
        action: String(event.action ?? ''),
        resourceType: String(event.resource_type ?? ''),
        result: String(event.result ?? ''),
        createdAt: String(event.occurred_at ?? ''),
      }))
    : [];
  const denied = activity.filter(a => a.result !== 'success').length;
  const serverDenied = serverActivity.filter(
    a => a.result !== 'success',
  ).length;
  const credits =
    isDemo && canOpen('credit-manager')
      ? mockProjectCredits
          .filter(c => ownedProjects.some(p => p.id === c.projectId))
          .reduce((sum, c) => sum + c.remainingCredits, 0)
      : null;
  const operations = ['tenant', 'operations'].includes(profile.id);
  const security = ['security', 'audit'].includes(profile.id);
  const queueSection =
    profile.id === 'personal' ? 'myRequests' : 'approvalQueue';
  let queueTotal = queue.length;
  if (!isDemo) {
    queueTotal =
      profile.id === 'personal'
        ? serverOverview?.myRequestTotal ??
          serverOverview?.myRequests.length ??
          0
        : approvalCount(serverOverview?.approvalQueue);
  }
  const queueTitle =
    profile.id === 'personal' ? '내 신청 현황' : '확인이 필요한 업무';
  const availableMenus = portalMenuDefinitions
    .filter(
      m => !['portal-dashboard', 'portal-work'].includes(m.id) && canOpen(m.id),
    )
    .sort(
      (a, b) =>
        (settings.menus.find(m => m.id === a.id)?.order ?? 999) -
        (settings.menus.find(m => m.id === b.id)?.order ?? 999),
    );
  const metrics = [
    {
      label: '참여 프로젝트',
      value: canOpen('project-workspace')
        ? serverValue(
            isDemo
              ? projects.length
              : serverOverview?.myProjectTotal ?? projects.length,
            'myProjects',
          )
        : null,
      suffix: '개',
      detail: '내 프로젝트 멤버십 기준',
      icon: <WorkOutlineIcon />,
    },
    {
      label: queueTitle,
      value: serverValue(queueTotal, queueSection),
      suffix: '건',
      detail:
        profile.id === 'personal' ? '내 계정의 신청' : '부여된 검토 권한 기준',
      icon: <AssignmentTurnedInOutlinedIcon />,
    },
    {
      label: operations ? '할당 GPU 사용' : '잔여 크레딧',
      value: credits,
      suffix: 'C',
      // 크레딧·자원 사용량 원천(플랫폼) 미연동 시 수치 대신 '—'와 연동 대기를 표시한다.
      detail: isDemo ? '프로젝트별 합계' : '연동 대기',
      icon: <MemoryIcon />,
    },
    {
      label: security ? '확인할 접속 기록' : '접근 가능 플랫폼',
      value: platformsLoading
        ? null
        : platforms.filter(p => p.canAccess).length,
      suffix: '개',
      detail: '현재 테넌트 접근 정책',
      icon: <VerifiedUserOutlinedIcon />,
    },
  ];
  if (operations)
    metrics[2] = {
      ...metrics[2],
      value: tenantOverview?.gpuUsed ?? null,
      suffix: tenantOverview ? `/ ${tenantOverview.gpuTotal}` : '장',
      detail: isDemo
        ? '예시 자원 현황 · 실시간 아님'
        : '클라우드 플랫폼 연동 대기',
    };
  if (security) {
    let recentActivityCount: number | null = null;
    if (isDemo) {
      recentActivityCount = canOpen('audit-history') ? activity.length : null;
    } else if (sectionReady('recentAudit') && serverOverview?.recentAudit) {
      recentActivityCount = serverOverview.recentAudit.length;
    }
    let exportReviewCount: number | null = null;
    if (isDemo) {
      exportReviewCount = canOpen('export-approval')
        ? queue.filter(q => q.type === '반입·반출').length
        : null;
    } else {
      exportReviewCount = serverValue(
        approvalCount(serverOverview?.approvalQueue, 'export'),
        'approvalQueue',
      );
    }
    let deniedCount: number | null = null;
    if (isDemo) {
      deniedCount = canOpen('audit-history') ? denied : null;
    } else if (sectionReady('recentAudit') && serverOverview?.recentAudit) {
      deniedCount = serverDenied;
    }
    metrics[0] = {
      ...metrics[0],
      label: '최근 접속·활동',
      value: recentActivityCount,
      suffix: '건',
      detail: isDemo ? '최근 6건 기준' : '최근 10건 기준',
    };
    metrics[2] = {
      ...metrics[2],
      label: '반입·반출 검토',
      value: exportReviewCount,
      suffix: '건',
      detail: '부여된 검토 권한 기준',
    };
    metrics[3] = {
      ...metrics[3],
      value: deniedCount,
      suffix: '건',
      detail: '최근 기록의 거부·실패',
    };
  }
  const refresh = () => {
    setSnapshot(Date.now());
    if (isDemo) {
      setFeedback('현재 소속의 저장 내역을 다시 불러왔습니다.');
    } else {
      retryServerFetch();
      setFeedback('서버 업무 현황을 새로 조회합니다.');
    }
  };
  const staleInfo = !isDemo ? describeObservation(serverMeta) : null;
  let auditPanelNote = '포털 감사 원장의 최근 기록입니다.';
  if (isDemo) {
    auditPanelNote =
      '현재 테넌트의 브라우저 활동 기록입니다. 기관 인증 로그와는 별도로 구분됩니다.';
  } else if (serverOverview && serverOverview.recentAudit === null) {
    auditPanelNote =
      auditExclusionMessage(serverOverview.auditExcludedReason) ??
      '감사 기록을 조회할 수 없습니다.';
  }
  let projectEmptyTitle = query
    ? '검색 결과가 없습니다'
    : '참여 중인 프로젝트가 없습니다';
  let projectEmptyDescription = query
    ? '다른 검색어를 입력해 보세요.'
    : '프로젝트 목록을 확인하거나 작업환경을 신청하세요.';
  if (!sectionReady('myProjects')) {
    projectEmptyTitle = serverPending
      ? '프로젝트를 불러오는 중입니다'
      : '프로젝트를 불러오지 못했습니다';
    projectEmptyDescription =
      '조회가 완료되면 내 프로젝트를 확인할 수 있습니다.';
  }
  let queueEmptyTitle = '현재 확인할 신청이 없습니다';
  if (!sectionReady(queueSection)) {
    queueEmptyTitle = serverPending
      ? '신청 현황을 불러오는 중입니다'
      : '신청 현황을 불러오지 못했습니다';
  }
  return (
    <div
      className={`portal-work work-profile-${profile.id}`}
      data-testid="portal-work"
      data-profile={profile.id}
      data-snapshot={snapshot}
    >
      <div className="work-topline">
        <nav aria-label="현재 위치">
          <Link to="/">플랫폼 홈</Link>
          <span>/</span>
          <span>{profile.label}</span>
        </nav>
        <div>
          <span className="work-scope">
            {tenantName} · {ROLE_LABELS[primaryRole]}
          </span>
          {isDemo && <span className="work-demo">예시 데이터</span>}
        </div>
      </div>
      <header className="work-heading">
        <div>
          <span className="work-eyebrow">{profile.eyebrow}</span>
          <h1>{profile.title}</h1>
          <p>{profile.description}</p>
        </div>
        <div className="work-heading-actions">
          <button
            className="work-refresh"
            onClick={refresh}
            aria-label="업무 현황 새로고침"
          >
            <RefreshIcon />
          </button>
          {canOpen(profile.primaryMenu) && (
            <Link className="work-primary" to={profile.primaryRoute}>
              {profile.primaryLabel}
              <ArrowForwardIcon />
            </Link>
          )}
        </div>
      </header>
      <div className="work-feedback" role="status">
        {feedback}
      </div>
      {(workspace.error || exports.error || decisions.error) && (
        <p role="alert" className="work-alert">
          {workspace.error || exports.error || decisions.error}
        </p>
      )}
      {!isDemo && serverPending && (
        <p className="work-live-note">업무 현황을 불러오는 중입니다.</p>
      )}
      {!isDemo && serverFailure?.kind === 'permission' && (
        <p role="alert" className="work-alert">
          {serverFailure.message || '이 업무 현황을 조회할 권한이 없습니다.'}
        </p>
      )}
      {!isDemo && serverFailure?.kind === 'network' && (
        <div role="alert" className="work-alert work-alert-retry">
          <span>{serverFailure.message}</span>
          <button type="button" onClick={retryServerFetch}>
            다시 시도
          </button>
        </div>
      )}
      {!isDemo && serverReady && unavailableSections.length > 0 && (
        <div role="alert" className="work-alert work-alert-retry">
          <span>
            {unavailableSections.join(' · ')} 정보를 불러오지 못했습니다. 확인된
            항목만 표시합니다.
          </span>
          <button type="button" onClick={retryServerFetch}>
            다시 시도
          </button>
        </div>
      )}
      {staleInfo?.stale && (
        <p className="work-stale-note">
          관측 시각 {staleInfo.observedAt} · 지연될 수 있음
        </p>
      )}
      <section className="work-metrics" aria-label="나의 업무 요약">
        {metrics.map(m => (
          <div className="work-metric" key={m.label}>
            <div>
              <span>{m.label}</span>
              {m.icon}
            </div>
            <strong>
              {formatNumber(m.value)} <small>{m.suffix}</small>
            </strong>
            <p>{m.detail}</p>
          </div>
        ))}
      </section>
      <div className="work-columns">
        <div className="work-main-column">
          {operations && canOpen('tenant-management') && (
            <section className="work-panel">
              <div className="work-panel-heading">
                <div>
                  <span className="work-section-tag">INFRASTRUCTURE</span>
                  <h2>서버·자원 현황</h2>
                </div>
                <Link to="/tenant-management?tab=resources">
                  자세히 <ArrowForwardIcon />
                </Link>
              </div>
              <p className="work-panel-note">
                {isDemo
                  ? '기존 자원 풀의 예시 스냅샷입니다. 실시간 모니터링은 클라우드 API 연동이 필요합니다.'
                  : '클라우드 플랫폼의 자원 정보 연동을 기다리고 있습니다.'}
              </p>
              <div className="resource-overview">
                {resources.length ? (
                  resources.map(r => (
                    <Link
                      to="/tenant-management?tab=resources"
                      className="resource-row"
                      key={r.id}
                    >
                      <div className="resource-meta">
                        <span>
                          <MemoryIcon />
                          {r.resourceType}
                        </span>
                        <b>
                          {r.used}{' '}
                          <small>
                            / {r.total}{' '}
                            {String(r.total).includes(r.unit) ? '' : r.unit}
                          </small>
                        </b>
                      </div>
                      <div
                        className="resource-meter"
                        role="meter"
                        aria-label={`${r.resourceType} 사용률`}
                        aria-valuenow={r.usageRate}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <i
                          style={{
                            width: `${Math.min(100, r.usageRate)}%`,
                            background:
                              r.usageRate >= 85 ? '#c48c45' : undefined,
                          }}
                        />
                      </div>
                      <div className="resource-caption">
                        <span>{r.status}</span>
                        <span>{r.usageRate}% 사용</span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="work-empty">
                    <MemoryIcon />
                    <h3>표시할 자원 현황이 없습니다</h3>
                    <p>이 테넌트에 연결된 자원 풀이 등록되면 표시됩니다.</p>
                  </div>
                )}
              </div>
            </section>
          )}
          {!operations && !security && canOpen('project-workspace') && (
            <section className="work-panel">
              <div className="work-panel-heading">
                <div>
                  <span className="work-section-tag">CONTINUE YOUR WORK</span>
                  <h2>
                    {profile.id === 'project' ? '담당 프로젝트' : '내 프로젝트'}
                  </h2>
                </div>
                <Link to="/project-workspace">
                  전체 보기 <ArrowForwardIcon />
                </Link>
              </div>
              <label className="work-search">
                <SearchIcon />
                <input
                  aria-label="내 프로젝트 검색"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="프로젝트 이름으로 찾기"
                />
              </label>
              <div className="work-project-grid">
                {visibleProjects.map((project, index) => (
                  <Link
                    to={relativeRoute(
                      '/project-workspace',
                      'project',
                      project.id,
                    )}
                    key={project.id}
                    className={`work-project-card project-color-${index % 3}`}
                  >
                    <div className="project-card-top">
                      <span>
                        <WorkOutlineIcon />
                      </span>
                      <b>
                        {projectLabels[project.status] ||
                          SERVER_PROJECT_LABELS[project.status] ||
                          project.status}
                      </b>
                    </div>
                    <h3>{project.name}</h3>
                    {project.description && <p>{project.description}</p>}
                    <div className="project-card-footer">
                      <span>
                        {project.quota ? (
                          <>
                            {project.quota.gpuCount} GPU <b>·</b>{' '}
                            {project.quota.cpuCores} CPU
                          </>
                        ) : (
                          <>역할 {project.memberRole}</>
                        )}
                      </span>
                      <ArrowForwardIcon />
                    </div>
                  </Link>
                ))}
              </div>
              {!visibleProjects.length && (
                <div className="work-empty">
                  <WorkOutlineIcon />
                  <h3>{projectEmptyTitle}</h3>
                  <p>{projectEmptyDescription}</p>
                  {!query && (
                    <Link to="/project-workspace?tab=request">
                      작업환경 신청 <ArrowForwardIcon />
                    </Link>
                  )}
                </div>
              )}
            </section>
          )}
          {profile.id !== 'audit' && (
            <section className="work-panel">
              <div className="work-panel-heading">
                <div>
                  <span className="work-section-tag">
                    {profile.id === 'personal' ? 'MY REQUESTS' : 'REVIEW QUEUE'}
                  </span>
                  <h2>
                    {queueTitle}
                    <span className="work-count">
                      {formatNumber(serverValue(queueTotal, queueSection))}
                    </span>
                  </h2>
                </div>
              </div>
              <div className="work-queue-filters" aria-label="업무 유형 필터">
                {['전체', ...new Set(queue.map(item => item.type))].map(
                  type => (
                    <button
                      key={type}
                      aria-pressed={queueType === type}
                      onClick={() => setQueueType(type)}
                    >
                      {type}
                    </button>
                  ),
                )}
              </div>
              <div className="work-queue-list">
                {queue
                  .filter(q => queueType === '전체' || q.type === queueType)
                  .map(q => (
                    <Link
                      to={q.route}
                      key={`${q.type}-${q.id}`}
                      className="work-queue-row"
                    >
                      <span className="queue-type">{q.type}</span>
                      <div>
                        <strong>{q.name}</strong>
                        <small>{q.detail}</small>
                      </div>
                      <span className="queue-status">{q.status}</span>
                      <ArrowForwardIcon />
                    </Link>
                  ))}
                {!queue.filter(
                  q => queueType === '전체' || q.type === queueType,
                ).length && (
                  <div className="work-empty compact">
                    <AssignmentTurnedInOutlinedIcon />
                    <h3>{queueEmptyTitle}</h3>
                    <p>
                      {!sectionReady(queueSection)
                        ? '상단에서 새로고침하여 다시 확인해 주세요.'
                        : '새로운 신청이 생기면 이곳에서 확인할 수 있습니다.'}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
          {security && canOpen('audit-history') && (
            <section className="work-panel">
              <div className="work-panel-heading">
                <div>
                  <span className="work-section-tag">ACCESS & ACTIVITY</span>
                  <h2>최근 접속·활동 기록</h2>
                </div>
                <Link to="/audit-history">
                  이력 조회 <ArrowForwardIcon />
                </Link>
              </div>
              <p className="work-panel-note">{auditPanelNote}</p>
              <div className="work-activity-list">
                {isDemo &&
                  activity.map(event => (
                    <Link
                      to="/audit-history"
                      key={event.id}
                      className="work-activity-row"
                    >
                      <span className={`activity-dot result-${event.result}`} />
                      <div>
                        <strong>
                          {event.category === 'admin'
                            ? '관리 설정 변경'
                            : '포털 접속·이용'}
                        </strong>
                        <span>
                          {event.actorName} ·{' '}
                          {portalMenuDefinitions.find(
                            menu => menu.id === event.resourceId,
                          )?.title || '관리 항목'}
                        </span>
                      </div>
                      <time>
                        {new Date(event.createdAt).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                      <b>
                        {event.result === 'success' ? '기록됨' : '확인 필요'}
                      </b>
                    </Link>
                  ))}
                {!isDemo &&
                  serverActivity.map(event => (
                    <Link
                      to="/audit-history"
                      key={event.id}
                      className="work-activity-row"
                    >
                      <span className={`activity-dot result-${event.result}`} />
                      <div>
                        <strong>{event.action}</strong>
                        <span>{event.resourceType}</span>
                      </div>
                      <time>
                        {new Date(event.createdAt).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                      <b>
                        {event.result === 'success' ? '기록됨' : '확인 필요'}
                      </b>
                    </Link>
                  ))}
                {!(isDemo ? activity.length : serverActivity.length) && (
                  <div className="work-empty">
                    <VerifiedUserOutlinedIcon />
                    {!isDemo && serverOverview?.recentAudit === null ? (
                      <>
                        <h3>
                          {auditExclusionMessage(
                            serverOverview.auditExcludedReason,
                          ) ?? '감사 기록을 조회할 수 없습니다'}
                        </h3>
                        <p>
                          감사 이력은 감사 조회 권한이 부여된 역할에서 확인할 수
                          있습니다.
                        </p>
                      </>
                    ) : (
                      <>
                        <h3>표시할 최근 기록이 없습니다</h3>
                        <p>
                          감사 이력에서 기간과 사용자 조건을 설정해 조회하세요.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
        <aside className="work-side-column" aria-label="업무 바로가기">
          <section className="work-panel work-service-panel">
            <div className="work-panel-heading">
              <div>
                <span className="work-section-tag">MY PLATFORMS</span>
                <h2>플랫폼 바로가기</h2>
              </div>
            </div>
            {platforms.map(p => (
              <button
                key={p.id}
                className="work-platform"
                onClick={() => launch(p.id)}
                aria-label={`${p.name} 열기`}
                aria-disabled={!p.canAccess}
              >
                <PlatformIcon id={p.id} />
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.canAccess ? '이용 권한 있음' : '접근 제한'}</small>
                </span>
                <ArrowForwardIcon />
              </button>
            ))}
          </section>
          {canOpen('integrated-search') && (
            <section className="work-discover">
              <span className="work-section-tag">FIND YOUR NEXT IDEA</span>
              <h2>
                필요한 자산을
                <br />더 빠르게 찾으세요.
              </h2>
              <form action="/integrated-search">
                <label>
                  <SearchIcon />
                  <input
                    name="q"
                    aria-label="업무 자산 검색"
                    placeholder="데이터, 모델, 도구 검색"
                    value={catalogQuery}
                    onChange={event => setCatalogQuery(event.target.value)}
                  />
                  <button type="submit" aria-label="자산 검색 실행">
                    <ArrowForwardIcon />
                  </button>
                </label>
              </form>
            </section>
          )}
          {operations && canOpen('tenant-settings') && (
            <Link className="work-config-link" to="/tenant-settings">
              <span>우리 조직에 맞게</span>
              <strong>
                테넌트 포털 설정 <ArrowForwardIcon />
              </strong>
              <p>로고·색상·메뉴·플랫폼 연결</p>
            </Link>
          )}
        </aside>
      </div>
      <section className="work-directory">
        <div className="work-panel-heading">
          <div>
            <span className="work-section-tag">YOUR TOOLKIT</span>
            <h2>모든 포털 업무</h2>
          </div>
          <span className="work-directory-caption">현재 소속과 권한 기준</span>
        </div>
        <div className="work-directory-grid">
          {availableMenus.map(menu => {
            const Icon = menu.icon;
            return (
              <Link to={menu.route} key={menu.id}>
                <Icon />
                <span>
                  {settings.menus.find(m => m.id === menu.id)?.label ||
                    menu.title}
                </span>
                <ArrowForwardIcon />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
export function PortalWorkPage() {
  const { tenantId, actorId } = usePortalRuntime();
  return <WorkContent key={`${tenantId}:${actorId}`} />;
}
