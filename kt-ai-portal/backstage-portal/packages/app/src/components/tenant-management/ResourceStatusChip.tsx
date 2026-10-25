import Chip from '@material-ui/core/Chip';
import { ResourceStatus } from './types';

interface ResourceStatusChipProps {
  status: ResourceStatus;
}

const statusColor = (status: ResourceStatus): 'default' | 'primary' | 'secondary' => {
  switch (status) {
    case '정상':
      return 'primary';
    case '주의':
    case '과다사용':
    case '부족':
      return 'secondary';
    default:
      return 'default';
  }
};

export const ResourceStatusChip = ({ status }: ResourceStatusChipProps) => {
  return <Chip size="small" label={status} color={statusColor(status)} />;
};
