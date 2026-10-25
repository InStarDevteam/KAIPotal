import Chip from '@material-ui/core/Chip';
import {
  RequirementImplementationStatus,
} from './types';

const statusColor: Record<RequirementImplementationStatus, string> = {
  화면구현: '#2e7d32',
  부분구현: '#ed6c02',
  후속개발: '#0288d1',
  미구현: '#757575',
  검토필요: '#d32f2f',
};

const statusBg: Record<RequirementImplementationStatus, string> = {
  화면구현: '#e8f5e9',
  부분구현: '#fff3e0',
  후속개발: '#e1f5fe',
  미구현: '#f5f5f5',
  검토필요: '#ffebee',
};

export const RequirementStatusChip = ({
  status,
}: {
  status: RequirementImplementationStatus;
}) => (
  <Chip
    label={status}
    size="small"
    style={{
      color: statusColor[status],
      backgroundColor: statusBg[status],
      fontWeight: 600,
      borderRadius: 4,
    }}
  />
);
