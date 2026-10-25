import Chip from '@material-ui/core/Chip';
import { ExportStatus } from './types';

const statusConfig: Record<
  ExportStatus,
  { label: string; color: 'default' | 'primary' | 'secondary' }
> = {
  requested: { label: '신청', color: 'default' },
  reviewing: { label: '검토중', color: 'primary' },
  need_revision: { label: '보완요청', color: 'secondary' },
  approved: { label: '승인', color: 'primary' },
  rejected: { label: '반려', color: 'secondary' },
  export_completed: { label: '반출완료', color: 'primary' },
  import_completed: { label: '반입완료', color: 'primary' },
};

export const ExportStatusChip = ({
  status,
  demoPending,
}: {
  status: ExportStatus;
  demoPending?: boolean;
}) => {
  const config = statusConfig[status];
  return (
    <Chip
      size="small"
      label={demoPending ? '접수 대기(데모)' : config.label}
      color={config.color}
    />
  );
};
