import Chip from '@material-ui/core/Chip';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Box from '@material-ui/core/Box';
import { SectionCard, StatusChip } from '../common';
import type { StatusTone } from '../common';
import { Notice, NoticeSeverity } from './types';

interface NoticePanelProps {
  notices: Notice[];
}

const severityTone: Record<NoticeSeverity, StatusTone> = {
  info: 'info',
  warning: 'warning',
  error: 'error',
};

export const NoticePanel = ({ notices }: NoticePanelProps) => {
  return (
    <SectionCard title="공지사항">
      <List dense disablePadding>
        {notices.map(notice => (
          <ListItem key={notice.id} disableGutters style={{ paddingTop: 8, paddingBottom: 8, borderBottom: '1px solid #f3f4f6' }}>
            <Box width="100%" display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap">
              <Box flex={1} minWidth={200}>
                <Typography variant="subtitle2">{notice.title}</Typography>
              </Box>
              <Box display="flex" alignItems="center" marginTop={{ xs: 1, sm: 0 }}>
                <Chip size="small" label={notice.type} variant="outlined" style={{ marginRight: 8 }} />
                <StatusChip tone={severityTone[notice.severity]} label={notice.severity.toUpperCase()} />
                <Typography variant="caption" color="textSecondary" style={{ marginLeft: 12 }}>
                  {notice.date}
                </Typography>
              </Box>
            </Box>
          </ListItem>
        ))}
      </List>
    </SectionCard>
  );
};
