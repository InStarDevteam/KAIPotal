import Chip from '@material-ui/core/Chip';
import { CreditStatus } from './types';

const statusConfig: Record<
  CreditStatus,
  { label: string; color: 'default' | 'primary' | 'secondary' }
> = {
  normal: { label: '정상', color: 'default' },
  warning: { label: '주의', color: 'primary' },
  low: { label: '부족', color: 'secondary' },
  exhausted: { label: '소진', color: 'secondary' },
  suspended: { label: '중지', color: 'secondary' },
};

export const CreditStatusChip = ({ status }: { status: CreditStatus }) => {
  const config = statusConfig[status];
  return <Chip size="small" label={config.label} color={config.color} />;
};
