import Chip from '@material-ui/core/Chip';
import { ProposalStatus } from './types';

interface ProposalStatusChipProps {
  status: ProposalStatus;
}

const statusColor = (status: ProposalStatus): 'default' | 'primary' | 'secondary' => {
  switch (status) {
    case '공지승인':
    case '완료':
      return 'primary';
    case '반려':
    case '보완요청':
      return 'secondary';
    default:
      return 'default';
  }
};

export const ProposalStatusChip = ({ status }: ProposalStatusChipProps) => {
  return <Chip size="small" label={status} color={statusColor(status)} />;
};
