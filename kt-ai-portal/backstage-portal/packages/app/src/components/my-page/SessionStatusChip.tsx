import Chip from '@material-ui/core/Chip';
import { SessionStatus } from './types';

interface SessionStatusChipProps {
  status: SessionStatus;
}

const statusColor = (status: SessionStatus): 'default' | 'primary' | 'secondary' => {
  switch (status) {
    case '활성':
      return 'primary';
    case '만료예정':
      return 'default';
    case '강제종료':
      return 'secondary';
    default:
      return 'default';
  }
};

export const SessionStatusChip = ({ status }: SessionStatusChipProps) => {
  return <Chip size="small" label={status} color={statusColor(status)} />;
};
