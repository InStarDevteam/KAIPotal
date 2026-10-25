import Chip from '@material-ui/core/Chip';
import { ActivityType } from './types';

interface ActivityTypeChipProps {
  type: ActivityType;
}

export const ActivityTypeChip = ({ type }: ActivityTypeChipProps) => {
  return <Chip size="small" label={type} color="default" />;
};
