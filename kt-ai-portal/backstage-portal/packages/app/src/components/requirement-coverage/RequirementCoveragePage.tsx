import { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
} from '@material-ui/core';
import GetAppIcon from '@material-ui/icons/GetApp';
import { AdminOnlyGuard } from '../requirement-progress/AdminOnlyGuard';
import { downloadCsv } from '../common/csvDownload';
import { RequirementCoverageSummaryCards } from './RequirementCoverageSummaryCards';
import { MenuCoveragePanel } from './MenuCoveragePanel';
import { SfrCoveragePanel } from './SfrCoveragePanel';
import { FeatureCoveragePanel } from './FeatureCoveragePanel';
import { ChangeHistoryCoveragePanel } from './ChangeHistoryCoveragePanel';
import { QuestionCoveragePanel } from './QuestionCoveragePanel';
import {
  menuRequirementCoverage,
  featureCoverageDetails,
} from './mockRequirementCoverageData';

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => {
  if (value !== index) return null;
  return <Box marginTop={2}>{children}</Box>;
};

export const RequirementCoveragePage = () => {
  const [tab, setTab] = useState(0);

  const handleDownloadMenuCoverage = () => {
    downloadCsv(
      '요구사항_메뉴_대응현황.csv',
      [
        { key: 'menuName', label: '메뉴' },
        { key: 'route', label: '라우트' },
        { key: 'visibleTo', label: '노출대상' },
        { key: 'relatedSfrIds', label: '관련 SFR' },
        { key: 'coverageSummary', label: '요약' },
        { key: 'relatedPlatformRoles', label: '관련 플랫폼' },
        { key: 'implementedItems', label: '화면구현 항목' },
        { key: 'partialItems', label: '부분구현 항목' },
        { key: 'followUpItems', label: '후속/미구현 항목' },
      ],
      menuRequirementCoverage.map(m => ({
        ...m,
        relatedSfrIds: m.relatedSfrIds.join('; '),
        relatedPlatformRoles: m.relatedPlatformRoles.join('; '),
        implementedItems: m.implementedItems.join('; '),
        partialItems: m.partialItems.join('; '),
        followUpItems: m.followUpItems.join('; '),
      })),
    );
  };

  const handleDownloadFeatureCoverage = () => {
    downloadCsv(
      '요구사항_기능_대응현황.csv',
      [
        { key: 'no', label: '번호' },
        { key: 'sfrId', label: 'SFR ID' },
        { key: 'category', label: '대분류' },
        { key: 'detailFunction', label: '세부기능' },
        { key: 'relatedMenuName', label: '관련 메뉴' },
        { key: 'implementationStatus', label: '구현상태' },
        { key: 'apiIntegrationRequired', label: 'API연계필요' },
        { key: 'relatedPlatformRoles', label: '관련 플랫폼' },
        { key: 'followUpAction', label: '후속조치' },
      ],
      featureCoverageDetails.map(f => ({
        ...f,
        relatedPlatformRoles: f.relatedPlatformRoles.join('; '),
        apiIntegrationRequired: f.apiIntegrationRequired ? 'Y' : 'N',
      })),
    );
  };

  return (
    <AdminOnlyGuard>
      <Box padding={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" style={{ gap: 16 }}>
          <Typography variant="h4">요구사항 대응현황</Typography>
          <Box display="flex" flexWrap="wrap" style={{ gap: 8 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<GetAppIcon />}
              onClick={handleDownloadMenuCoverage}
            >
              메뉴 현황 CSV
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<GetAppIcon />}
              onClick={handleDownloadFeatureCoverage}
            >
              기능 현황 CSV
            </Button>
          </Box>
        </Box>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          메뉴/기능/SFR 단위로 최종공고문 260723_v1 기준 RFP 요구사항 대응
          현황을 조회합니다. (관리자 전용)
        </Typography>
        <RequirementCoverageSummaryCards />
        <Tabs value={tab} onChange={(_e, newValue) => setTab(newValue)}>
          <Tab label="메뉴 대응현황" />
          <Tab label="SFR 대응현황" />
          <Tab label="기능 대응현황" />
          <Tab label="변경이력" />
          <Tab label="질의사항" />
        </Tabs>
        <TabPanel value={tab} index={0}>
          <MenuCoveragePanel />
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <SfrCoveragePanel />
        </TabPanel>
        <TabPanel value={tab} index={2}>
          <FeatureCoveragePanel />
        </TabPanel>
        <TabPanel value={tab} index={3}>
          <ChangeHistoryCoveragePanel />
        </TabPanel>
        <TabPanel value={tab} index={4}>
          <QuestionCoveragePanel />
        </TabPanel>
      </Box>
    </AdminOnlyGuard>
  );
};
