import Chip from '@material-ui/core/Chip';
import { ToolStatus } from './types';

interface ToolStatusChipProps {
  status: ToolStatus;
}

const statusColor = (status: ToolStatus): 'default' | 'primary' | 'secondary' => {
  switch (status) {
    case '사용가능':
      return 'primary';
    case '신청필요':
      return 'secondary';
    case '준비중':
      return 'default';
    case '점검중':
      return 'default';
    case '비활성':
      return 'default';
    default:
      return 'default';
  }
};

export const ToolStatusChip = ({ status }: ToolStatusChipProps) => {
  return <Chip size="small" label={status} color={statusColor(status)} />;
};
