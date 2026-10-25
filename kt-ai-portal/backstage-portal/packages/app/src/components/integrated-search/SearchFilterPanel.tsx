import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import MenuItem from '@material-ui/core/MenuItem';
import { SearchFilters, SearchResultType } from './types';
import { SEARCH_TYPE_LABELS } from './SearchApiClient';

const TYPE_OPTIONS: SearchResultType[] = [
  'menu',
  'project',
  'organization',
  'user',
];

interface SearchFilterPanelProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
}

export const SearchFilterPanel = ({
  filters,
  onChange,
}: SearchFilterPanelProps) => (
  <Grid container spacing={2}>
    <Grid item xs={12} sm={4}>
      <TextField
        id="portal-search-type"
        SelectProps={{ labelId: 'portal-search-type-label' }}
        fullWidth
        select
        label="검색 대상"
        value={filters.type}
        onChange={e =>
          onChange({
            ...filters,
            type: e.target.value as SearchFilters['type'],
          })
        }
        variant="outlined"
        size="small"
      >
        <MenuItem value="all">전체</MenuItem>
        {TYPE_OPTIONS.map(type => (
          <MenuItem key={type} value={type}>
            {SEARCH_TYPE_LABELS[type]}
          </MenuItem>
        ))}
      </TextField>
    </Grid>
  </Grid>
);
