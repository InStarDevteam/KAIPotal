import Chip from '@material-ui/core/Chip';
import { RiskLevel } from './types';

interface AuditRiskChipProps {
  riskLevel: RiskLevel;
}

const color = (riskLevel: RiskLevel): 'default' | 'primary' | 'secondary' => {
  switch (riskLevel) {
    case '낮음':
      return 'default';
    case '보통':
      return 'primary';
    case '높음':
    case '심각':
      return 'secondary';
    default:
      return 'default';
  }
};

export const AuditRiskChip = ({ riskLevel }: AuditRiskChipProps) => {
  return <Chip label={riskLevel} size="small" color={color(riskLevel)} />;
};
