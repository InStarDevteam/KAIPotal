import { FC, useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
} from '@material-ui/core';
import { Link } from 'react-router-dom';
import { AdminOnlyGuard } from '../requirement-progress/AdminOnlyGuard';
import { PortalRoleSummaryPanel } from './PortalRoleSummaryPanel';
import { UserJourneyCards } from './UserJourneyCards';
import { WorkflowScenarioTable } from './WorkflowScenarioTable';
import { workflowScenarios } from './mockWorkflowScenarioData';

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => {
  if (value !== index) return null;
  return <Box marginTop={2}>{children}</Box>;
};

export const WorkflowScenarioPage: FC = () => {
  const [tab, setTab] = useState(0);

  return (
    <AdminOnlyGuard>
      <Box padding={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" style={{ gap: 16 }}>
          <Typography variant="h4">업무흐름/연계 시나리오</Typography>
          <Box display="flex" flexWrap="wrap" style={{ gap: 8 }}>
            <Button variant="outlined" size="small" component={Link} to="/requirement-coverage">
              요구사항 대응현황 보기
            </Button>
            <Button variant="outlined" size="small" component={Link} to="/platform-api-integration">
              API 연계현황 보기
            </Button>
          </Box>
        </Box>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          포털이 데이터 플랫폼, AI 플랫폼, 지능형 클라우드/CMP를 어떻게 연결하고,
          각 메뉴가 어떤 업무흐름에서 사용되는지 설명합니다.
        </Typography>
        <Typography variant="caption" color="error" display="block" gutterBottom>
          이 화면은 권한이 부여된 관리자만 사용할 수 있습니다.
        </Typography>
        <Tabs value={tab} onChange={(_e, newValue) => setTab(newValue)}>
          <Tab label="포털 역할 요약" />
          <Tab label={`사용자 여정 (${workflowScenarios.length})`} />
          <Tab label="업무흐름 시나리오" />
        </Tabs>
        <TabPanel value={tab} index={0}>
          <PortalRoleSummaryPanel />
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <UserJourneyCards />
        </TabPanel>
        <TabPanel value={tab} index={2}>
          <WorkflowScenarioTable />
        </TabPanel>
      </Box>
    </AdminOnlyGuard>
  );
};
