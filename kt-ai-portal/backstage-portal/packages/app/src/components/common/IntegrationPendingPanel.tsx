import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import LinkOffIcon from '@material-ui/icons/LinkOff';

/** Required capability retained without presenting fixture values as live records. */
export const IntegrationPendingPanel = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <Paper variant="outlined" style={{ padding: 32, borderRadius: 12 }}>
    <LinkOffIcon style={{ color: '#66758b', marginBottom: 12 }} />
    <Typography variant="h6" style={{ fontWeight: 700 }} gutterBottom>
      {title}
    </Typography>
    <Typography
      color="textSecondary"
      style={{ maxWidth: 720, lineHeight: 1.7 }}
    >
      {description}
    </Typography>
  </Paper>
);
