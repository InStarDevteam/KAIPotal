import { RequirementCoverageItem, RequirementCoveragePanel } from '../common';

interface TenantRequirementCoveragePanelProps {
  items: RequirementCoverageItem[];
}

export const TenantRequirementCoveragePanel = ({ items }: TenantRequirementCoveragePanelProps) => {
  return <RequirementCoveragePanel title="Tenant Management 요구사항 대응 현황" items={items} />;
};
