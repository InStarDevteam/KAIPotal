import Chip from '@material-ui/core/Chip';
import { RiskSeverity } from './types';

const severityConfig: Record<
  RiskSeverity,
  { label: string; color: 'default' | 'primary' | 'secondary' }
> = {
  low: { label: '낮음', color: 'default' },
  medium: { label: '보통', color: 'primary' },
  high: { label: '높음', color: 'secondary' },
  critical: { label: '긴급', color: 'secondary' },
};

export const RiskSeverityChip = ({ severity }: { severity: RiskSeverity }) => {
  const config = severityConfig[severity];
  return <Chip size="small" label={config.label} color={config.color} />;
};
