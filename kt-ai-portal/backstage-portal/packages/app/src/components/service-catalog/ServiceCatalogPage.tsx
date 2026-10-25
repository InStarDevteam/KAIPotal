import { useState } from 'react';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import Snackbar from '@material-ui/core/Snackbar';
import Typography from '@material-ui/core/Typography';
import Alert from '@material-ui/lab/Alert';
import { useAuthz } from '../authz';
import { ROLE_LABELS } from '../authz/types';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { mockServiceCatalogData } from './mockServiceCatalogData';
import { ServerServiceCatalog } from './ServerServiceCatalog';
import { ServiceCatalogSummaryCards } from './ServiceCatalogSummaryCards';
import { ToolCategoryTabs } from './ToolCategoryTabs';
import { ToolCatalogList } from './ToolCatalogList';
import { ToolCatalogDetail } from './ToolCatalogDetail';
import { ToolSelectionPanel } from './ToolSelectionPanel';
import { DirectToolRequestForm } from './DirectToolRequestForm';
import { DirectRequestList } from './DirectRequestList';
import {
  createDirectToolRequest,
  createSelectionToolRequest,
  readServiceCatalogRequests,
  saveServiceCatalogRequests,
  serviceCatalogRequestStorageKey,
  DirectToolRequestInput,
} from './serviceCatalogRequestStore';
import { ServiceCatalogTab, Tool, SelectedTool } from './types';

const ServiceCatalogDemoContent = ({
  tenantId,
  actorId,
  showAdminPanel,
}: {
  tenantId: string;
  actorId: string;
  showAdminPanel: boolean;
}) => {
  const { isDemo, roles } = usePortalRuntime();
  const writable = isDemo && !!tenantId && !!actorId;
  const storageKey = serviceCatalogRequestStorageKey(tenantId, actorId);
  const [loaded] = useState(() =>
    writable
      ? readServiceCatalogRequests(storageKey)
      : { items: [], error: undefined },
  );
  const [storedRequests, setStoredRequests] = useState(loaded.items);
  const [storageError, setStorageError] = useState<string | null>(
    loaded.error || null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const { tools, directRequests, projects, workspaces } =
    mockServiceCatalogData;
  const [activeTab, setActiveTab] = useState<ServiceCatalogTab>('전체');
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  const requester = `${actorId}(${
    roles.map(role => ROLE_LABELS[role] ?? role).join(', ') || '역할 없음'
  })`;

  const visibleTools = tools.filter(t => !t.adminOnly || showAdminPanel);

  const filteredTools = visibleTools.filter(tool => {
    if (activeTab === '전체') return true;
    if (activeTab === '직접 입력 요청') return false;
    return tool.category === activeTab;
  });

  const persist = (next: typeof storedRequests): boolean => {
    if (!writable) return false;
    try {
      saveServiceCatalogRequests(storageKey, next);
      setStoredRequests(next);
      setStorageError(null);
      return true;
    } catch (error) {
      setStorageError(
        error instanceof Error ? error.message : '저장하지 못했습니다.',
      );
      return false;
    }
  };

  const handleRequestSubmit = (values: DirectToolRequestInput): boolean => {
    try {
      const request = createDirectToolRequest(values, requester);
      if (writable && !persist([request, ...storedRequests])) return false;
      if (!writable) setStoredRequests(prev => [request, ...prev]);
      setNotice(
        writable
          ? '도구 요청을 저장했습니다. 실제 반입·승인 절차는 플랫폼 연결 후 진행됩니다.'
          : '요청을 목록에 반영했습니다. 서버가 연결되지 않아 새로고침 시 유지되지 않습니다.',
      );
      return true;
    } catch (error) {
      setStorageError(
        error instanceof Error ? error.message : '요청을 저장하지 못했습니다.',
      );
      return false;
    }
  };

  const handleCreateRequest = (
    selections: SelectedTool[],
    project: string,
  ): boolean => {
    try {
      const request = createSelectionToolRequest(
        selections,
        project,
        requester,
      );
      if (writable && !persist([request, ...storedRequests])) return false;
      if (!writable) setStoredRequests(prev => [request, ...prev]);
      setNotice(
        writable
          ? '선택 도구 신청서를 저장했습니다. 실제 반입·승인 절차는 플랫폼 연결 후 진행됩니다.'
          : '신청서를 목록에 반영했습니다. 서버가 연결되지 않아 새로고침 시 유지되지 않습니다.',
      );
      return true;
    } catch (error) {
      setStorageError(
        error instanceof Error
          ? error.message
          : '신청서를 저장하지 못했습니다.',
      );
      return false;
    }
  };

  return (
    <Box padding={3}>
      <Typography variant="h4" gutterBottom style={{ fontWeight: 600 }}>
        서비스/도구 카탈로그
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        분석/개발/데이터/시각화/라벨링 도구를 선택하고 워크스페이스에 적용할 수
        있습니다.
      </Typography>

      {storageError && (
        <Alert severity="warning" style={{ marginBottom: 16 }}>
          {storageError}
        </Alert>
      )}

      <Box marginTop={2} marginBottom={2}>
        <ServiceCatalogSummaryCards tools={visibleTools} />
      </Box>

      <Box marginBottom={2}>
        <ToolCategoryTabs value={activeTab} onChange={setActiveTab} />
      </Box>

      {activeTab === '직접 입력 요청' && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <DirectToolRequestForm
              projects={projects}
              onSubmit={handleRequestSubmit}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <DirectRequestList
              requests={[...storedRequests, ...directRequests]}
            />
          </Grid>
        </Grid>
      )}

      {activeTab !== '직접 입력 요청' && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <ToolCatalogList
              tools={filteredTools}
              selectedTool={selectedTool}
              onSelect={setSelectedTool}
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <ToolCatalogDetail tool={selectedTool} />
          </Grid>
          <Grid item xs={12}>
            <ToolSelectionPanel
              tools={visibleTools}
              projects={projects}
              workspaces={workspaces}
              onCreateRequest={handleCreateRequest}
            />
          </Grid>
        </Grid>
      )}

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
        message={notice}
      />
    </Box>
  );
};

export const ServiceCatalogPage = () => {
  const { isAdminArea } = useAuthz();
  const showAdminPanel = isAdminArea;
  const runtime = usePortalRuntime();
  if (runtime.loading)
    return <Box padding={3}>서비스 카탈로그를 불러오는 중입니다.</Box>;
  if (!runtime.isDemo)
    return (
      <Box padding={3}>
        <Typography variant="h4" gutterBottom style={{ fontWeight: 600 }}>
          서비스/도구 카탈로그
        </Typography>
        <Typography variant="body1" color="textSecondary" gutterBottom>
          분석/개발/데이터/시각화/라벨링 도구를 탐색하고 프로젝트에 사용을
          신청할 수 있습니다.
        </Typography>
        <ServerServiceCatalog key={`${runtime.tenantId}:${runtime.actorId}`} />
      </Box>
    );
  return (
    <ServiceCatalogDemoContent
      key={`${runtime.isDemo}:${runtime.tenantId}:${runtime.actorId}`}
      tenantId={runtime.tenantId}
      actorId={runtime.actorId}
      showAdminPanel={showAdminPanel}
    />
  );
};
