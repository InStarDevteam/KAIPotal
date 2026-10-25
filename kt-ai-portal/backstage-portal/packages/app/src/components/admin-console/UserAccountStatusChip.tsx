import Chip from '@material-ui/core/Chip';
import { AccountStatus } from './types';

interface UserAccountStatusChipProps {
  status: AccountStatus;
}

const colorMap: Record<AccountStatus, 'default' | 'primary' | 'secondary'> = {
  활성: 'primary',
  잠금: 'secondary',
  비활성: 'default',
  만료예정: 'secondary',
};

export const UserAccountStatusChip = ({ status }: UserAccountStatusChipProps) => {
  return <Chip label={status} size="small" color={colorMap[status]} />;
};
