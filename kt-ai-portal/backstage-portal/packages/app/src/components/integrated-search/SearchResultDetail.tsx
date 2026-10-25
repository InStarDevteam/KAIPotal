import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import Chip from '@material-ui/core/Chip';
import Button from '@material-ui/core/Button';
import { Link } from 'react-router-dom';
import { formatPortalDate } from '../common/portalDate';
import { SearchResultItem } from './types';
import { SearchTypeChip } from './SearchTypeChip';
import { sourceStatusLabel } from './SearchApiClient';

export const SearchResultDetail = ({
  result,
}: {
  result: SearchResultItem;
}) => {
  return (
    <Paper style={{ padding: 24, overflowWrap: 'anywhere' }}>
      <Typography variant="h5" gutterBottom>
        {result.title}
      </Typography>
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}
      >
        <SearchTypeChip type={result.type} />
        <Chip
          size="small"
          variant="outlined"
          color={result.source_status === 'available' ? 'primary' : 'default'}
          label={`${result.source_label} · ${sourceStatusLabel(
            result.source_status,
          )}`}
        />
      </div>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography color="textSecondary">설명</Typography>
          <Typography>{result.summary || '-'}</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography color="textSecondary">수정일</Typography>
          <Typography>{formatPortalDate(result.updated_at)}</Typography>
        </Grid>
      </Grid>

      <Button
        size="small"
        variant="contained"
        color="primary"
        style={{ marginTop: 16 }}
        component={Link}
        to={result.link_path}
      >
        페이지로 이동
      </Button>
    </Paper>
  );
};
