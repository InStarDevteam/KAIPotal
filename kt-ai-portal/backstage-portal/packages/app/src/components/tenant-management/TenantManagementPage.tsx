import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@material-ui/core';
import { ROLE_LABELS, PortalRole } from '../authz/types';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { IntegrationPendingPanel } from '../common/IntegrationPendingPanel';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import { PlatformAccessManagementPanel } from '../tenant-settings/PlatformAccessManagementPanel';
import { useSearchParams } from 'react-router-dom';
import {
  branchProjectUsages,
  branchQuotas,
  branchResourcePools,
  branchTenantOverviews,
  delegatedAdmins,
  quotaChangeHistory,
  tenantBoundaryPolicies,
  tenantManagementSummary,
  usageSummary,
} from './mockTenantManagementData';
import { TenantManagementTab } from './types';
import { BranchAdminDelegationPanel } from './BranchAdminDelegationPanel';
import { BranchProjectUsagePanel } from './BranchProjectUsagePanel';
import { BranchQuotaManagementPanel } from './BranchQuotaManagementPanel';
import { BranchResourcePoolPanel } from './BranchResourcePoolPanel';
import { BranchTenantOverviewPanel } from './BranchTenantOverviewPanel';
import { BranchUsageDashboardPanel } from './BranchUsageDashboardPanel';
import { QuotaChangeHistoryPanel } from './QuotaChangeHistoryPanel';
import { TenantBoundaryPanel } from './TenantBoundaryPanel';
import { TenantManagementTabs, tenantTabs } from './TenantManagementTabs';
import { TenantSummaryCards } from './TenantSummaryCards';

export const TenantManagementPage = () => {
  const { isDemo, tenants, tenantId } = usePortalRuntime();
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get('tab');
  const normalizedTab =
    requestedTab === 'resources' ? '군별 리소스 풀' : requestedTab;
  const tab = tenantTabs.includes(normalizedTab as TenantManagementTab)
    ? (normalizedTab as TenantManagementTab)
    : '사용자·플랫폼 권한';
  const setTab = (value: TenantManagementTab) => {
    const next = new URLSearchParams(params);
    next.set('tab', value === '군별 리소스 풀' ? 'resources' : value);
    setParams(next);
  };

  return (
    <Box p={3}>
      <Typography variant="h4" style={{ fontWeight: 700 }} gutterBottom>
        테넌트 관리
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        소속별 사용자, 플랫폼 접근, 위임 관리자와 자원을 관리합니다.
      </Typography>

      {isDemo && <TenantSummaryCards summary={tenantManagementSummary} />}

      <TenantManagementTabs value={tab} onChange={setTab} />

      <Box mt={2}>
        {!isDemo &&
          !['사용자·플랫폼 권한', '군별 테넌트 개요', '위임관리 체계'].includes(
            tab,
          ) && (
            <IntegrationPendingPanel
              title={`${tab} · 연결 준비 중`}
              description="현재 소속의 원천 정보가 연결되면 이 화면에서 조회·관리할 수 있습니다. 사용자별 권한과 플랫폼 진입 허용은 ‘사용자·플랫폼 권한’에서 관리하세요."
            />
          )}
        {!isDemo && tab === '군별 테넌트 개요' && (
          <TableContainer component={Paper} variant="outlined">
            <Table aria-label="접근 가능한 테넌트">
              <TableHead>
                <TableRow>
                  <TableCell>테넌트</TableCell>
                  <TableCell>군 구분</TableCell>
                  <TableCell>내 역할</TableCell>
                  <TableCell>선택 상태</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tenants.map(tenant => (
                  <TableRow key={tenant.id}>
                    <TableCell>{tenant.name}</TableCell>
                    <TableCell>
                      {(
                        {
                          defense: '국방부 공통',
                          army: '육군',
                          navy: '해군',
                          airforce: '공군',
                          marines: '해병대',
                        } as Record<string, string>
                      )[tenant.branch] ?? tenant.branch}
                    </TableCell>
                    <TableCell>
                      {tenant.roles
                        .map(role => ROLE_LABELS[role as PortalRole] ?? role)
                        .join(', ')}
                    </TableCell>
                    <TableCell>
                      {tenant.id === tenantId && (
                        <Chip size="small" label="현재 소속" color="primary" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {!isDemo && tab === '위임관리 체계' && (
          <PlatformAccessManagementPanel section="members" />
        )}
        {tab === '사용자·플랫폼 권한' && (
          <PlatformAccessManagementPanel section="members" />
        )}
        {isDemo && tab === '군별 테넌트 개요' && (
          <BranchTenantOverviewPanel tenants={branchTenantOverviews} />
        )}
        {isDemo && tab === '위임관리 체계' && (
          <BranchAdminDelegationPanel admins={delegatedAdmins} />
        )}
        {isDemo && tab === '군별 리소스 풀' && (
          <BranchResourcePoolPanel resources={branchResourcePools} />
        )}
        {isDemo && tab === '군별 쿼터 관리' && (
          <BranchQuotaManagementPanel quotas={branchQuotas} />
        )}
        {isDemo && tab === '사용량 대시보드' && (
          <BranchUsageDashboardPanel summary={usageSummary} />
        )}
        {isDemo && tab === '군별 프로젝트 사용량' && (
          <BranchProjectUsagePanel usages={branchProjectUsages} />
        )}
        {isDemo && tab === '테넌트 경계/분리 정책' && (
          <TenantBoundaryPanel policies={tenantBoundaryPolicies} />
        )}
        {isDemo && tab === '쿼터 변경 이력' && (
          <QuotaChangeHistoryPanel history={quotaChangeHistory} />
        )}
      </Box>
    </Box>
  );
};
