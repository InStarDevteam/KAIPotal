export type SearchResultType = 'menu' | 'project' | 'organization' | 'user';
export type SearchSourceKind = 'portal' | 'external';
export type SearchSourceStatus = 'available' | 'integration_pending';
export type SearchSemanticStatus = 'not_available';

export interface SearchResultItem {
  type: SearchResultType;
  id: string;
  title: string;
  summary: string;
  source_label: string;
  source_status: SearchSourceStatus;
  link_path: string;
  updated_at: string | null;
}

export interface SearchSourcesResponse {
  sources: SearchSourceMeta[];
}

export interface SearchSourceMeta {
  key: string;
  label: string;
  kind: SearchSourceKind;
  status: SearchSourceStatus;
  note?: string;
}

export interface PortalSearchData {
  total: number;
  page: number;
  page_size: number;
  results: SearchResultItem[];
  took_ms: number;
  search_semantic_status: SearchSemanticStatus;
}

export interface PortalSuggestItem {
  type: SearchResultType;
  id: string;
  title: string;
}

export interface PortalSuggestData {
  q: string;
  suggestions: PortalSuggestItem[];
}

export interface SearchMeta {
  requestId: string;
  asOf?: string;
  dataMode?: string;
}

export interface SearchFilters {
  query: string;
  type: SearchResultType | 'all';
}

export type SearchSourcesState =
  | { status: 'loading' }
  | { status: 'success'; sources: SearchSourceMeta[] }
  | { status: 'error' };

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: PortalSearchData }
  | {
      status: 'error';
      message: string;
      kind: 'validation' | 'unauthenticated' | 'forbidden' | 'server';
      requestId?: string;
      retryable: boolean;
    };
