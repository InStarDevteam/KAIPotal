import {
  PortalSearchData,
  PortalSuggestData,
  PortalSuggestItem,
  SearchResultItem,
  SearchResultType,
  SearchSourceMeta,
  SearchSourceStatus,
  SearchSourcesResponse,
} from './types';
import { PortalResponse } from '../portal-runtime/PortalRuntimeContext';

export const SEARCH_TYPE_LABELS: Record<SearchResultType, string> = {
  menu: '포털 메뉴',
  project: '프로젝트',
  organization: '조직',
  user: '사용자',
};

export const searchTypeLabel = (type: string): string =>
  SEARCH_TYPE_LABELS[type as SearchResultType] ?? type;

export const sourceStatusLabel = (status: SearchSourceStatus): string =>
  status === 'available' ? '검색 가능' : '연동 대기';

export const SEARCH_QUERY_MIN_LENGTH = 2;
export const SEARCH_QUERY_MAX_LENGTH = 100;

export const validateSearchQuery = (q: string): string | null => {
  const trimmed = q.trim();
  if (trimmed.length < SEARCH_QUERY_MIN_LENGTH)
    return '검색어는 2자 이상 입력해 주세요.';
  if (trimmed.length > SEARCH_QUERY_MAX_LENGTH)
    return '검색어는 100자 이하여야 합니다.';
  return null;
};

export const validateSuggestQuery = (q: string): string | null => {
  const trimmed = q.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > SEARCH_QUERY_MAX_LENGTH)
    return '검색어는 100자 이하여야 합니다.';
  return null;
};

type PortalRequest = <T>(
  path: string,
  init?: RequestInit,
) => Promise<PortalResponse<T>>;

export interface SearchParams {
  q: string;
  types?: SearchResultType[];
  page?: number;
  pageSize?: number;
}

export class PortalSearchValidationError extends Error {
  readonly code = 'invalid_query';

  constructor(message: string) {
    super(message);
    this.name = 'PortalSearchValidationError';
  }
}

const isSearchResultType = (value: unknown): value is SearchResultType =>
  value === 'menu' ||
  value === 'project' ||
  value === 'organization' ||
  value === 'user';

const asSearchResultItem = (value: unknown): SearchResultItem | null => {
  if (typeof value !== 'object' || value === null) return null;
  const item = value as Record<string, unknown>;
  if (
    !isSearchResultType(item.type) ||
    typeof item.id !== 'string' ||
    typeof item.title !== 'string' ||
    typeof item.summary !== 'string' ||
    typeof item.source_label !== 'string' ||
    (item.source_status !== 'available' &&
      item.source_status !== 'integration_pending') ||
    typeof item.link_path !== 'string'
  )
    return null;
  return {
    type: item.type,
    id: item.id,
    title: item.title,
    summary: item.summary,
    source_label: item.source_label,
    source_status: item.source_status,
    link_path: item.link_path,
    updated_at: typeof item.updated_at === 'string' ? item.updated_at : null,
  };
};

const asSearchSourceMeta = (value: unknown): SearchSourceMeta | null => {
  if (typeof value !== 'object' || value === null) return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.key !== 'string' ||
    typeof item.label !== 'string' ||
    (item.kind !== 'portal' && item.kind !== 'external') ||
    (item.status !== 'available' && item.status !== 'integration_pending')
  )
    return null;
  return {
    key: item.key,
    label: item.label,
    kind: item.kind,
    status: item.status,
    note: typeof item.note === 'string' ? item.note : undefined,
  };
};

const asSuggestItem = (value: unknown): PortalSuggestItem | null => {
  if (typeof value !== 'object' || value === null) return null;
  const item = value as Record<string, unknown>;
  if (
    !isSearchResultType(item.type) ||
    typeof item.id !== 'string' ||
    typeof item.title !== 'string'
  )
    return null;
  return { type: item.type, id: item.id, title: item.title };
};

export const parseSearchData = (raw: unknown): PortalSearchData => {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('검색 응답 형식이 올바르지 않습니다.');
  }
  const data = raw as Record<string, unknown>;
  if (!Array.isArray(data.results)) {
    throw new Error('검색 응답에 결과 목록이 없습니다.');
  }
  return {
    total: typeof data.total === 'number' ? data.total : 0,
    page: typeof data.page === 'number' ? data.page : 1,
    page_size: typeof data.page_size === 'number' ? data.page_size : 0,
    results: data.results
      .map(asSearchResultItem)
      .filter((item): item is SearchResultItem => item !== null),
    took_ms: typeof data.took_ms === 'number' ? data.took_ms : 0,
    search_semantic_status: 'not_available',
  };
};

export const parseSourcesData = (raw: unknown): SearchSourceMeta[] => {
  if (
    typeof raw !== 'object' ||
    raw === null ||
    !Array.isArray((raw as SearchSourcesResponse).sources)
  ) {
    throw new Error('검색 원천 응답 형식이 올바르지 않습니다.');
  }
  return (raw as SearchSourcesResponse).sources
    .map(asSearchSourceMeta)
    .filter((item): item is SearchSourceMeta => item !== null);
};

export const parseSuggestData = (raw: unknown): PortalSuggestItem[] => {
  if (
    typeof raw !== 'object' ||
    raw === null ||
    !Array.isArray((raw as PortalSuggestData).suggestions)
  ) {
    return [];
  }
  return (raw as PortalSuggestData).suggestions
    .map(asSuggestItem)
    .filter((item): item is PortalSuggestItem => item !== null)
    .slice(0, 10);
};

const buildSearchPath = ({
  q,
  types,
  page = 1,
  pageSize = 20,
}: SearchParams): string => {
  const params = new URLSearchParams();
  params.set('q', q.trim());
  if (types && types.length > 0) params.set('types', types.join(','));
  params.set('page', String(page));
  params.set('page_size', String(pageSize));
  return `/v1/search?${params.toString()}`;
};

export const searchPortal = async (
  request: PortalRequest,
  params: SearchParams,
): Promise<PortalSearchData> => {
  const validationMessage = validateSearchQuery(params.q);
  if (validationMessage)
    throw new PortalSearchValidationError(validationMessage);
  const response = await request<unknown>(buildSearchPath(params));
  return parseSearchData(response.data);
};

export const fetchSearchSources = async (
  request: PortalRequest,
): Promise<SearchSourceMeta[]> => {
  const response = await request<unknown>('/v1/search/sources');
  return parseSourcesData(response.data);
};

export const suggestPortal = async (
  request: PortalRequest,
  q: string,
): Promise<PortalSuggestItem[]> => {
  const validationMessage = validateSuggestQuery(q);
  if (validationMessage) return [];
  const params = new URLSearchParams();
  params.set('q', q.trim());
  const response = await request<unknown>(
    `/v1/search/suggest?${params.toString()}`,
  );
  return parseSuggestData(response.data);
};

export interface SearchErrorInfo {
  message: string;
  kind: 'validation' | 'unauthenticated' | 'forbidden' | 'server';
  requestId?: string;
  retryable: boolean;
}

const errorStatus = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
};

export const toSearchErrorInfo = (error: unknown): SearchErrorInfo => {
  if (error instanceof PortalSearchValidationError) {
    return { message: error.message, kind: 'validation', retryable: false };
  }
  const status = errorStatus(error);
  const message =
    error instanceof Error && error.message
      ? error.message
      : '검색 요청을 처리하지 못했습니다.';
  if (status === 401) {
    return {
      message: '로그인이 만료되었습니다. 다시 로그인 후 검색해 주세요.',
      kind: 'unauthenticated',
      retryable: false,
    };
  }
  if (status === 403) {
    return {
      message: '검색 권한이 없습니다. 관리자에게 문의하세요.',
      kind: 'forbidden',
      retryable: false,
    };
  }
  const requestId =
    typeof (error as { requestId?: unknown } | null)?.requestId === 'string'
      ? (error as { requestId: string }).requestId
      : undefined;
  return { message, kind: 'server', requestId, retryable: true };
};
