import Chip from '@material-ui/core/Chip';
import { SettingStatus } from './types';

interface SettingStatusChipProps {
  status: SettingStatus;
}

const statusColor = (status: SettingStatus): 'default' | 'primary' | 'secondary' => {
  switch (status) {
    case '활성':
      return 'primary';
    case '변경대기':
      return 'secondary';
    default:
      return 'default';
  }
};

export const SettingStatusChip = ({ status }: SettingStatusChipProps) => {
  return <Chip size="small" label={status} color={statusColor(status)} />;
};
