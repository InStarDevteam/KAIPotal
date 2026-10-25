import { RequirementCoverageItem, RequirementCoveragePanel } from '../common';

interface EnvironmentRequirementCoveragePanelProps {
  items: RequirementCoverageItem[];
}

export const EnvironmentRequirementCoveragePanel = ({
  items,
}: EnvironmentRequirementCoveragePanelProps) => {
  return <RequirementCoveragePanel title="환경설정 기능 안내" items={items} />;
};
