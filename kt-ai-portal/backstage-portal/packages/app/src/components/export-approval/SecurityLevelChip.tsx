import Chip from '@material-ui/core/Chip';
import { SecurityLevel } from './types';

const levelConfig: Record<
  SecurityLevel,
  { label: string; color: 'default' | 'primary' | 'secondary' }
> = {
  public: { label: '공개', color: 'default' },
  internal: { label: '내부', color: 'primary' },
  secret: { label: '비밀', color: 'secondary' },
};

export const SecurityLevelChip = ({ level }: { level: SecurityLevel }) => {
  const config = levelConfig[level];
  return <Chip size="small" label={config.label} color={config.color} />;
};
