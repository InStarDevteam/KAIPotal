import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Chip from '@material-ui/core/Chip';
import { CreditAlert } from './types';

const severityConfig = {
  info: { label: '안내', color: 'default' as const },
  warning: { label: '주의', color: 'primary' as const },
  error: { label: '경고', color: 'secondary' as const },
};

export const CreditAlertPanel = ({ alerts }: { alerts: CreditAlert[] }) => {
  return (
    <Paper style={{ padding: 16 }}>
      <Typography variant="h6" gutterBottom>
        알림 / 경고
      </Typography>
      <List dense>
        {alerts.map(alert => (
          <ListItem key={alert.id}>
            <ListItemText
              primary={
                <>
                  <Chip
                    size="small"
                    label={severityConfig[alert.severity].label}
                    color={severityConfig[alert.severity].color}
                    style={{ marginRight: 8 }}
                  />
                  {alert.message}
                </>
              }
              secondary={`${alert.projectName} · ${new Date(alert.createdAt).toLocaleString()}`}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};
