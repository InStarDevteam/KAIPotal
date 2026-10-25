import { SearchFilters, SearchResultItem } from './types';

export const applySearchFilters = (
  results: SearchResultItem[],
  filters: SearchFilters,
): SearchResultItem[] => {
  if (filters.type === 'all') return results;
  return results.filter(result => result.type === filters.type);
};
