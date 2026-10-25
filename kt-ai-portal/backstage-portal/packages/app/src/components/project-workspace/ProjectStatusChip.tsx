import Chip from '@material-ui/core/Chip';
import { ProjectStatus } from './types';

const statusConfig: Record<
  ProjectStatus,
  { label: string; color: 'default' | 'primary' | 'secondary' }
> = {
  requested: { label: '신청', color: 'default' },
  pending_approval: { label: '승인대기', color: 'secondary' },
  approved: { label: '승인', color: 'primary' },
  rejected: { label: '반려', color: 'secondary' },
  running: { label: '운영중', color: 'primary' },
  paused: { label: '일시중지', color: 'secondary' },
  closed: { label: '종료', color: 'default' },
};

export const ProjectStatusChip = ({ status }: { status: ProjectStatus }) => {
  const config = statusConfig[status];
  return <Chip size="small" label={config.label} color={config.color} />;
};
