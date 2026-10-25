import Chip from '@material-ui/core/Chip';
import { IdentityVerificationStatus } from './types';

interface UserIdentityVerificationChipProps {
  status: IdentityVerificationStatus;
}

const colorMap: Record<IdentityVerificationStatus, 'default' | 'primary' | 'secondary'> = {
  미확인: 'default',
  확인중: 'primary',
  확인완료: 'primary',
  확인실패: 'secondary',
  재확인필요: 'secondary',
};

export const UserIdentityVerificationChip = ({ status }: UserIdentityVerificationChipProps) => {
  return <Chip label={status} size="small" color={colorMap[status]} />;
};
