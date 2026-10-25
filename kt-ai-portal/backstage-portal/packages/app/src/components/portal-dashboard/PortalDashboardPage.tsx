import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import { DashboardHero } from './DashboardHero';
import { DashboardSearchBox } from './DashboardSearchBox';
import { SummaryMetricCards } from './SummaryMetricCards';
import { NoticePanel } from './NoticePanel';
import { RecentAssetsPanel } from './RecentAssetsPanel';
import { MyProjectPanel } from './MyProjectPanel';
import { ExportPendingPanel } from './ExportPendingPanel';
import { CreditSummaryPanel } from './CreditSummaryPanel';
// import { KrmfProgressPanel } from './KrmfProgressPanel'; // K-RMF 기능 보류
import { SystemStatusPanel } from './SystemStatusPanel';
import { QuickLinkCards } from './QuickLinkCards';
import { mockDashboardData } from './mockDashboardData';
import { useAuthz } from '../authz';
import { getVisibleMenus } from '../navigation/portalMenuDefinitions';
import { useTenantSettings } from '../tenant-settings';
import { colors, layoutTokens } from '../common';

export const PortalDashboardPage = () => {
  const { hasAnyPermission } = useAuthz();
  const { settings } = useTenantSettings();
  const {
    currentUser,
    summaryMetrics,
    notices,
    recentAssets,
    myProjects,
    exportPending,
    creditSummary,
    // krmfProgress, // K-RMF 기능 보류
    systemStatus,
  } = mockDashboardData;

  const configuredMenu = (id: string) =>
    settings.menus.find(menu => menu.id === id);
  const visibleQuickLinks = getVisibleMenus(hasAnyPermission)
    .filter(menu => configuredMenu(menu.id)?.visible !== false)
    .sort(
      (a, b) =>
        (configuredMenu(a.id)?.order ?? 0) - (configuredMenu(b.id)?.order ?? 0),
    )
    .map(menu => ({
      id: menu.id,
      title: configuredMenu(menu.id)?.label || menu.title,
      description: menu.description,
      type: 'internal' as const,
      target: menu.route,
    }));

  return (
    <Box
      padding={{ xs: 1, md: 2 }}
      style={{ backgroundColor: colors.background }}
    >
      <Box style={{ maxWidth: layoutTokens.pageMaxWidth, margin: '0 auto' }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <DashboardHero fallbackUser={currentUser} />
          </Grid>
          <Grid item xs={12}>
            <DashboardSearchBox />
          </Grid>

          <Grid item xs={12}>
            <SummaryMetricCards
              metrics={summaryMetrics}
              credit={creditSummary}
            />
          </Grid>

          <Grid item xs={12} lg={8}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <NoticePanel notices={notices} />
              </Grid>
              <Grid item xs={12}>
                <RecentAssetsPanel assets={recentAssets} />
              </Grid>
              <Grid item xs={12} md={6}>
                <MyProjectPanel projects={myProjects} />
              </Grid>
              <Grid item xs={12} md={6}>
                <ExportPendingPanel items={exportPending} />
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <CreditSummaryPanel summary={creditSummary} />
              </Grid>
              {/* K-RMF 기능 보류: <KrmfProgressPanel progress={krmfProgress} /> */}
              <Grid item xs={12}>
                <SystemStatusPanel systems={systemStatus} />
              </Grid>
              <Grid item xs={12}>
                <QuickLinkCards links={visibleQuickLinks} />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};
