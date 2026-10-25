import { useState } from 'react';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import { ProjectCreditSummary } from './ProjectCreditSummary';
import { CreditBalanceCards } from './CreditBalanceCards';
import { CreditChargeHistory } from './CreditChargeHistory';
import { CreditUsageHistory } from './CreditUsageHistory';
import { ResourcePriceTable } from './ResourcePriceTable';
import { ResourceAvailabilityPanel } from './ResourceAvailabilityPanel';
import { CreditAlertPanel } from './CreditAlertPanel';
import { CreditServerPage } from './CreditServerPage';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import {
  mockProjectCredits,
  mockChargeHistory,
  mockUsageHistory,
  mockResourcePrices,
  mockCreditAlerts,
} from './mockCredits';

const DemoCreditManagerPage = () => {
  const [selected, setSelected] = useState(mockProjectCredits[0]);

  return (
    <Box padding={3}>
      <Typography variant="h4" gutterBottom>
        크레딧 관리
      </Typography>
      <Typography color="textSecondary" paragraph>
        프로젝트별 크레딧 관리(예시 데이터)
      </Typography>

      <CreditBalanceCards credits={mockProjectCredits} />
      <CreditAlertPanel alerts={mockCreditAlerts} />

      <Box marginTop={3}>
        <ProjectCreditSummary
          credits={mockProjectCredits}
          selectedId={selected.projectId}
          onSelect={setSelected}
        />
      </Box>

      <Box marginTop={3}>
        <ResourceAvailabilityPanel credit={selected} />
      </Box>

      <Box marginTop={3}>
        <CreditChargeHistory history={mockChargeHistory} />
      </Box>

      <Box marginTop={3}>
        <CreditUsageHistory history={mockUsageHistory} />
      </Box>

      <Box marginTop={3}>
        <ResourcePriceTable prices={mockResourcePrices} />
      </Box>
    </Box>
  );
};

export const CreditManagerPage = () => {
  const { isDemo } = usePortalRuntime();
  return isDemo ? <DemoCreditManagerPage /> : <CreditServerPage />;
};
