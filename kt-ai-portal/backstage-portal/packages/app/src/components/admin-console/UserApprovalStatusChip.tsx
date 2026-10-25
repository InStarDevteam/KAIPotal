import Chip from '@material-ui/core/Chip';
import { RegistrationStatus } from './types';

interface UserApprovalStatusChipProps {
  status: RegistrationStatus;
}

const colorMap: Record<RegistrationStatus, 'default' | 'primary' | 'secondary'> = {
  신청: 'default',
  본인확인완료: 'primary',
  검토중: 'primary',
  승인: 'primary',
  반려: 'secondary',
  보완요청: 'secondary',
};

export const UserApprovalStatusChip = ({ status }: UserApprovalStatusChipProps) => {
  return <Chip label={status} size="small" color={colorMap[status]} />;
};
