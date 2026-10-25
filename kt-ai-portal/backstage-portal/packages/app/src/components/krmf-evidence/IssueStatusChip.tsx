import Chip from '@material-ui/core/Chip';
import { IssueStatus } from './types';

const statusConfig: Record<
  IssueStatus,
  { label: string; color: 'default' | 'primary' | 'secondary' }
> = {
  registered: { label: '등록', color: 'default' },
  in_progress: { label: '조치중', color: 'primary' },
  resolved: { label: '조치완료', color: 'primary' },
  reviewing: { label: '검토중', color: 'primary' },
  closed: { label: '종결', color: 'primary' },
  deferred: { label: '보류', color: 'secondary' },
};

export const IssueStatusChip = ({ status }: { status: IssueStatus }) => {
  const config = statusConfig[status];
  return <Chip size="small" label={config.label} color={config.color} />;
};
