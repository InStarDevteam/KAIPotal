import Chip from '@material-ui/core/Chip';
import { AuditEventType } from './types';

interface AuditEventTypeChipProps {
  eventType: AuditEventType;
}

const color = (eventType: AuditEventType): 'default' | 'primary' | 'secondary' => {
  switch (eventType) {
    case '로그인':
    case '로그아웃':
      return 'default';
    case '로그인 실패':
    case '계정 차단':
      return 'secondary';
    default:
      return 'primary';
  }
};

export const AuditEventTypeChip = ({ eventType }: AuditEventTypeChipProps) => {
  return <Chip label={eventType} size="small" color={color(eventType)} />;
};
