import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import { ProposalTab } from './types';

interface ProposalTabsProps {
  value: ProposalTab;
  onChange: (tab: ProposalTab) => void;
  canReview?: boolean;
}

const tabs: ProposalTab[] = [
  '전체 제안',
  'AI 모델 개발',
  '빅데이터 분석',
  '데이터셋 구축',
  '내 제안',
  '관리자 검토',
];

export const ProposalTabs = ({
  value,
  onChange,
  canReview = false,
}: ProposalTabsProps) => {
  return (
    <Tabs
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      indicatorColor="primary"
      textColor="primary"
      variant="scrollable"
      scrollButtons="auto"
    >
      {tabs
        .filter(tab => tab !== '관리자 검토' || canReview)
        .map(tab => (
          <Tab key={tab} label={tab} value={tab} />
        ))}
    </Tabs>
  );
};
