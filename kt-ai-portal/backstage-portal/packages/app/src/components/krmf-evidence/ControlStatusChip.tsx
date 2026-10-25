import Chip from '@material-ui/core/Chip';
import { ControlCheckStatus } from './types';

const statusConfig: Record<
  ControlCheckStatus,
  { label: string; color: 'default' | 'primary' | 'secondary' }
> = {
  not_checked: { label: '미점검', color: 'default' },
  preparing: { label: '준비중', color: 'default' },
  checking: { label: '점검중', color: 'primary' },
  compliant: { label: '적합', color: 'primary' },
  non_compliant: { label: '미흡', color: 'secondary' },
  remediating: { label: '보완중', color: 'secondary' },
  completed: { label: '완료', color: 'primary' },
};

export const ControlStatusChip = ({ status }: { status: ControlCheckStatus }) => {
  const config = statusConfig[status];
  return <Chip size="small" label={config.label} color={config.color} />;
};
