import Chip from '@material-ui/core/Chip';
import { MilitaryBranch } from './types';

interface BranchChipProps {
  branch: MilitaryBranch;
}

const branchColor: Record<MilitaryBranch, 'default' | 'primary' | 'secondary'> = {
  '국방부 공통': 'default',
  육군: 'primary',
  해군: 'secondary',
  공군: 'default',
};

export const BranchChip = ({ branch }: BranchChipProps) => {
  return <Chip size="small" label={branch} color={branchColor[branch]} />;
};
