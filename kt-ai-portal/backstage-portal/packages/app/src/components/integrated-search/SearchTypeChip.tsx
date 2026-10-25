import Chip from '@material-ui/core/Chip';
import { searchTypeLabel } from './SearchApiClient';
import { SearchResultType } from './types';

export const SearchTypeChip = ({ type }: { type: SearchResultType }) => {
  return <Chip size="small" variant="outlined" label={searchTypeLabel(type)} />;
};
