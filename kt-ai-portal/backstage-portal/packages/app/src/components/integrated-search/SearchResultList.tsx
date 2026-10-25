import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Chip from '@material-ui/core/Chip';
import { Link } from 'react-router-dom';
import { SearchResultItem } from './types';
import { SearchTypeChip } from './SearchTypeChip';
import { sourceStatusLabel } from './SearchApiClient';
import { formatPortalDate } from '../common/portalDate';

const updatedLabel = (updatedAt: string | null): string | null =>
  updatedAt ? formatPortalDate(updatedAt) : null;

export const SearchResultList = ({
  results,
  selectedId,
  onSelect,
}: {
  results: SearchResultItem[];
  selectedId?: string;
  onSelect: (result: SearchResultItem) => void;
}) => {
  if (results.length === 0) {
    return (
      <Paper style={{ padding: 24, textAlign: 'center' }}>
        <Typography color="textSecondary">검색 결과가 없습니다.</Typography>
      </Paper>
    );
  }

  return (
    <Paper>
      <List dense>
        {results.map(result => (
          <ListItem
            key={`${result.type}:${result.id}`}
            button
            selected={selectedId === `${result.type}:${result.id}`}
            onClick={() => onSelect(result)}
          >
            <ListItemText
              primary={
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 8,
                    overflowWrap: 'anywhere',
                  }}
                >
                  <SearchTypeChip type={result.type} />
                  <Link
                    to={result.link_path}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <Typography component="span" variant="subtitle1">
                      {result.title}
                    </Typography>
                  </Link>
                </div>
              }
              secondary={
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                >
                  {result.summary && (
                    <Typography
                      component="div"
                      variant="body2"
                      color="textSecondary"
                    >
                      {result.summary}
                    </Typography>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}
                  >
                    <Chip
                      size="small"
                      variant="outlined"
                      color={
                        result.source_status === 'available'
                          ? 'primary'
                          : 'default'
                      }
                      label={`${result.source_label} · ${sourceStatusLabel(
                        result.source_status,
                      )}`}
                    />
                    {updatedLabel(result.updated_at) && (
                      <Typography variant="caption" color="textSecondary">
                        수정일 {updatedLabel(result.updated_at)}
                      </Typography>
                    )}
                  </div>
                </div>
              }
              primaryTypographyProps={{ component: 'div' }}
              secondaryTypographyProps={{ component: 'div' }}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};
