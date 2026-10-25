import Chip from '@material-ui/core/Chip';
import { RequirementPriority } from './types';

const priorityColor: Record<RequirementPriority, string> = {
  하: '#757575',
  중: '#ed6c02',
  상: '#d32f2f',
};

const priorityBg: Record<RequirementPriority, string> = {
  하: '#f5f5f5',
  중: '#fff3e0',
  상: '#ffebee',
};

export const RequirementPriorityChip = ({
  priority,
}: {
  priority: RequirementPriority;
}) => (
  <Chip
    label={priority}
    size="small"
    style={{
      color: priorityColor[priority],
      backgroundColor: priorityBg[priority],
      fontWeight: 600,
      borderRadius: 4,
    }}
  />
);
