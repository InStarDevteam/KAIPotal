import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import { EnvironmentSettingsTab } from './types';

interface EnvironmentSettingsTabsProps {
  value: EnvironmentSettingsTab;
  onChange: (tab: EnvironmentSettingsTab) => void;
}

const tabs: EnvironmentSettingsTab[] = [
  '시스템 파라미터',
  '보안 정책',
  '자원할당 기준',
  '운영 설정',
  '변경 이력',
];

export const EnvironmentSettingsTabs = ({
  value,
  onChange,
}: EnvironmentSettingsTabsProps) => {
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
