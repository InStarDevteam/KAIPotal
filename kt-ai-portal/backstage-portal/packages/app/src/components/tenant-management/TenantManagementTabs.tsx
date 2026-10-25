import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import { TenantManagementTab } from './types';

interface TenantManagementTabsProps {
  value: TenantManagementTab;
  onChange: (tab: TenantManagementTab) => void;
}

export const tenantTabs: TenantManagementTab[] = [
  '사용자·플랫폼 권한',
  '군별 테넌트 개요',
  '위임관리 체계',
  '군별 리소스 풀',
  '군별 쿼터 관리',
  '사용량 대시보드',
  '군별 프로젝트 사용량',
  '테넌트 경계/분리 정책',
  '쿼터 변경 이력',
];

export const TenantManagementTabs = ({
  value,
  onChange,
}: TenantManagementTabsProps) => {
  return (
    <Tabs
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      indicatorColor="primary"
      textColor="primary"
      variant="scrollable"
      scrollButtons="auto"
    >
      {tenantTabs.map(tab => (
        <Tab key={tab} label={tab} value={tab} />
      ))}
    </Tabs>
  );
};
