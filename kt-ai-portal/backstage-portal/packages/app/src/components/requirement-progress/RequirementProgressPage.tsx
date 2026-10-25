import React, { useState } from 'react';
import {
  Box,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@material-ui/core';
import { RequirementProgressSummaryCards } from './RequirementProgressSummaryCards';
import { SfrProgressTable } from './SfrProgressTable';
import { FeatureProgressTable } from './FeatureProgressTable';
import { RequirementChangeHistoryTable } from './RequirementChangeHistoryTable';
import { RequirementQuestionTable } from './RequirementQuestionTable';
import { AdminOnlyGuard } from './AdminOnlyGuard';
import {
  sfrRequirementSummaries,
  portalFeatureRequirements,
  requirementChangeHistories,
  requirementQuestions,
} from './mockRequirementProgressData';

const TabPanel: React.FC<{
  children: React.ReactNode;
  value: number;
  index: number;
}> = ({ children, value, index }) => {
  if (value !== index) return null;
  return <Box py={2}>{children}</Box>;
};

export const RequirementProgressPage = () => {
  const [tab, setTab] = useState(0);

  return (
    <AdminOnlyGuard>
      <Box padding={3}>
        <Typography variant="h4" gutterBottom>
          요구사항 진도표
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" gutterBottom>
          기준 문서: 최종공고문 260723_v1 / 전체 요구사항 166개, 기능 요구사항
          SFR 67개, 메인 포털 직접 대응 SFR-001~SFR-021의 UI 구현 현황을
          조회합니다.
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          이 화면은 권한이 부여된 관리자만 사용할 수 있습니다.

        </Typography>

        <Box mb={3}>
          <RequirementProgressSummaryCards
            features={portalFeatureRequirements}
          />
        </Box>

        <Paper variant="outlined">
          <Tabs
            value={tab}
            onChange={(_e, newValue) => setTab(newValue)}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="SFR별 진도표" />
            <Tab label="기능목록 상세" />
            <Tab label="변경이력" />
            <Tab label="질의사항" />
          </Tabs>

          <Box px={2} pb={2}>
            <TabPanel value={tab} index={0}>
              <SfrProgressTable summaries={sfrRequirementSummaries} />
            </TabPanel>
            <TabPanel value={tab} index={1}>
              <FeatureProgressTable features={portalFeatureRequirements} />
            </TabPanel>
            <TabPanel value={tab} index={2}>
              <RequirementChangeHistoryTable
                changes={requirementChangeHistories}
              />
            </TabPanel>
            <TabPanel value={tab} index={3}>
              <RequirementQuestionTable questions={requirementQuestions} />
            </TabPanel>
          </Box>
        </Paper>
      </Box>
    </AdminOnlyGuard>
  );
};
