import Chip from '@material-ui/core/Chip';
import { QuotaProcessStatus } from './types';

interface QuotaStatusChipProps {
  status: QuotaProcessStatus;
}

const statusColor = (status: QuotaProcessStatus): 'default' | 'primary' | 'secondary' => {
  switch (status) {
    case '적용완료':
    case '승인':
      return 'primary';
    case '반려':
    case '회수완료':
      return 'secondary';
    default:
      return 'default';
  }
};

export const QuotaStatusChip = ({ status }: QuotaStatusChipProps) => {
  return <Chip size="small" label={status} color={statusColor(status)} />;
};
