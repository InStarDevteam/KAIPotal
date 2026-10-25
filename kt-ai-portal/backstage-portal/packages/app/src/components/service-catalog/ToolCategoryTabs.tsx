import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import { ServiceCatalogTab } from './types';

interface ToolCategoryTabsProps {
  value: ServiceCatalogTab;
  onChange: (tab: ServiceCatalogTab) => void;
}

const tabs: ServiceCatalogTab[] = [
  '전체',
  '분석 프레임워크',
  '개발도구',
  '데이터 도구',
  '시각화 도구',
  '라벨링 도구',
  '학습데이터 구축 도구',
  'Docker 이미지',
  'PyPI 패키지',
  '컨테이너 라이브러리',
  '분석 도구',
  '서비스 카탈로그',
  '직접 입력 요청',
];

export const ToolCategoryTabs = ({
  value,
  onChange,
}: ToolCategoryTabsProps) => {
  return (
    <Tabs
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      indicatorColor="primary"
      textColor="primary"
      variant="scrollable"
      scrollButtons="auto"
    >
      {tabs.map(tab => (
        <Tab key={tab} label={tab} value={tab} />
      ))}
    </Tabs>
  );
};
