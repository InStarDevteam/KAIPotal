import Chip from '@material-ui/core/Chip';
import { RequirementImpact } from './types';

const impactColor: Record<RequirementImpact, string> = {
  낮음: '#2e7d32',
  중간: '#ed6c02',
  높음: '#d32f2f',
};

const impactBg: Record<RequirementImpact, string> = {
  낮음: '#e8f5e9',
  중간: '#fff3e0',
  높음: '#ffebee',
};

export const RequirementImpactChip = ({
  impact,
}: {
  impact: RequirementImpact;
}) => (
  <Chip
    label={impact}
    size="small"
    style={{
      color: impactColor[impact],
      backgroundColor: impactBg[impact],
      fontWeight: 600,
      borderRadius: 4,
    }}
  />
);
