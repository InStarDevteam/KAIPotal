import Chip from '@material-ui/core/Chip';
import { EvidenceStatus } from './types';

const statusConfig: Record<
  EvidenceStatus,
  { label: string; color: 'default' | 'primary' | 'secondary' }
> = {
  not_submitted: { label: '미제출', color: 'default' },
  submitted: { label: '제출완료', color: 'primary' },
  reviewing: { label: '검토중', color: 'primary' },
  revision_requested: { label: '보완요청', color: 'secondary' },
  approved: { label: '승인', color: 'primary' },
  rejected: { label: '반려', color: 'secondary' },
};

export const EvidenceStatusChip = ({ status }: { status: EvidenceStatus }) => {
  const config = statusConfig[status];
  return <Chip size="small" label={config.label} color={config.color} />;
};
