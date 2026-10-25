import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import { useState } from 'react';
import {
  environmentSettingsSummary,
  portalOperationSettings,
  resourceAllocationPolicies,
  securitySettings,
  settingChangeHistory,
  systemParameters,
} from './mockEnvironmentSettingsData';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { EnvironmentSettingsSummaryCards } from './EnvironmentSettingsSummaryCards';
import { EnvironmentSettingsTabs } from './EnvironmentSettingsTabs';
import { PortalOperationSettingPanel } from './PortalOperationSettingPanel';
import { PortalSettingsServerPanel } from './PortalSettingsServerPanel';
import { PortalSettingHistoryServerPanel } from './PortalSettingHistoryServerPanel';
import { ResourceAllocationPolicyPanel } from './ResourceAllocationPolicyPanel';
import { SecuritySettingPanel } from './SecuritySettingPanel';
import { SettingChangeHistoryPanel } from './SettingChangeHistoryPanel';
import { SystemParameterPanel } from './SystemParameterPanel';
import { serverCategoryForTab } from './portalSettingsServerData';
import { EnvironmentSettingsTab } from './types';

export const EnvironmentSettings = () => {
  const { isDemo, tenantId } = usePortalRuntime();
  const [tab, setTab] = useState<EnvironmentSettingsTab>('시스템 파라미터');
  const serverCategory = serverCategoryForTab(tab);

  return (
    <Box p={3}>
      <Typography variant="h4" style={{ fontWeight: 700 }} gutterBottom>
        환경설정
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        포털 전역 시스템 파라미터, 보안 정책, 자원할당 기준, 운영 설정을
        관리합니다.
      </Typography>

      {isDemo && (
        <EnvironmentSettingsSummaryCards summary={environmentSettingsSummary} />
      )}

      <EnvironmentSettingsTabs value={tab} onChange={setTab} />

      <Box mt={2}>
        {!isDemo && serverCategory && (
          <PortalSettingsServerPanel
            key={serverCategory}
            category={serverCategory}
            title={tab}
          />
        )}
        {isDemo && tab === '시스템 파라미터' && (
          <SystemParameterPanel parameters={systemParameters} />
        )}
        {isDemo && tab === '보안 정책' && (
          <SecuritySettingPanel settings={securitySettings} />
        )}
        {isDemo && tab === '자원할당 기준' && (
          <ResourceAllocationPolicyPanel
            policies={resourceAllocationPolicies}
          />
        )}
        {isDemo && tab === '운영 설정' && (
          <PortalOperationSettingPanel settings={portalOperationSettings} />
        )}
        {tab === '변경 이력' &&
          (isDemo ? (
            <SettingChangeHistoryPanel history={settingChangeHistory} />
          ) : (
            <PortalSettingHistoryServerPanel key={tenantId} />
          ))}
      </Box>
    </Box>
  );
};
