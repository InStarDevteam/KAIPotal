import { Knex } from 'knex';
import { tenantMenuDefinitions, TenantMenu } from './tenantSettings';

export type SearchResultType = 'menu' | 'project' | 'organization' | 'user';
export type SearchSourceStatus = 'available' | 'integration_pending';
export type SearchSourceKind = 'portal' | 'external';

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

export interface SearchSourceMeta {
  key: string;
  label: string;
  kind: SearchSourceKind;
  status: SearchSourceStatus;
  note?: string;
}

export interface RawSearchQuery {
  q?: unknown;
  types?: unknown;
  page?: unknown;
  page_size?: unknown;
}

export type ParsedSearchQuery =
  | {
      ok: true;
      q: string;
      types: SearchResultType[] | null;
      page: number;
      pageSize: number;
    }
  | { ok: false; code: string; message: string };

export const SEARCH_RESULT_TYPES: readonly SearchResultType[] = [
  'menu',
  'project',
  'organization',
  'user',
];

const PORTAL_SOURCE_LABELS: Record<SearchResultType, string> = {
  menu: '포털 메뉴',
  project: '프로젝트',
  organization: '조직',
  user: '사용자',
};

const EXTERNAL_PENDING_NOTE = '외부 원천 연동 대기';

const EXTERNAL_SOURCES: SearchSourceMeta[] = [
  {
    key: 'dataset',
    label: '데이터셋',
    kind: 'external',
    status: 'integration_pending',
    note: EXTERNAL_PENDING_NOTE,
  },
  {
    key: 'model',
    label: '모델',
    kind: 'external',
    status: 'integration_pending',
    note: EXTERNAL_PENDING_NOTE,
  },
  {
    key: 'docker',
    label: 'Docker 이미지',
    kind: 'external',
    status: 'integration_pending',
    note: EXTERNAL_PENDING_NOTE,
  },
  {
    key: 'pypi',
    label: 'PyPI 패키지',
    kind: 'external',
    status: 'integration_pending',
    note: EXTERNAL_PENDING_NOTE,
  },
  {
    key: 'semantic',
    label: '의미 기반 검색',
    kind: 'external',
    status: 'integration_pending',
    note: EXTERNAL_PENDING_NOTE,
  },
];

export const searchSources = (): SearchSourceMeta[] => [
  ...SEARCH_RESULT_TYPES.map(t => ({
    key: t,
    label: PORTAL_SOURCE_LABELS[t],
    kind: 'portal' as const,
    status: 'available' as const,
  })),
  ...EXTERNAL_SOURCES,
];

export const escapeLikeTerm = (term: string): string =>
  term.replace(/[\\%_]/g, ch => `\\${ch}`);

export const likePattern = (term: string): string =>
  `%${escapeLikeTerm(term)}%`;

const toPositiveInt = (value: unknown, fallback: number): number | null => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
};

const invalid = (message: string): ParsedSearchQuery => ({
  ok: false,
  code: 'invalid_query',
  message,
});

export const parseSearchQuery = (raw: RawSearchQuery): ParsedSearchQuery => {
  const q = typeof raw.q === 'string' ? raw.q.trim() : '';
  if (q.length < 2) return invalid('검색어는 2자 이상 입력해 주세요.');
  if (q.length > 100) return invalid('검색어는 100자 이하여야 합니다.');

  let types: SearchResultType[] | null = null;
  if (typeof raw.types === 'string' && raw.types.trim().length > 0) {
    const parts = raw.types
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    const unsupported = parts.filter(
      p => !SEARCH_RESULT_TYPES.includes(p as SearchResultType),
    );
    if (unsupported.length > 0) {
      return invalid(`지원하지 않는 검색 대상입니다: ${unsupported.join(', ')}`);
    }
    types = parts as SearchResultType[];
  }

  const page = toPositiveInt(raw.page, 1);
  if (page === null) return invalid('page는 1 이상의 정수여야 합니다.');
  const pageSize = toPositiveInt(raw.page_size, 20);
  if (pageSize === null) return invalid('page_size는 1 이상의 정수여야 합니다.');
  return { ok: true, q, types, page, pageSize: Math.min(pageSize, 100) };
};

export type ParsedSuggestQuery =
  | { ok: true; q: string }
  | { ok: false; code: string; message: string };

export const parseSuggestQuery = (raw: { q?: unknown }): ParsedSuggestQuery => {
  const q = typeof raw.q === 'string' ? raw.q.trim() : '';
  if (q.length < 1) return { ok: false, code: 'invalid_query', message: '검색어를 입력해 주세요.' };
  if (q.length > 100) return { ok: false, code: 'invalid_query', message: '검색어는 100자 이하여야 합니다.' };
  return { ok: true, q };
};

export const paginateResults = <T>(
  items: T[],
  page: number,
  pageSize: number,
): { total: number; page: number; page_size: number; results: T[] } => ({
  total: items.length,
  page,
  page_size: pageSize,
  results: items.slice((page - 1) * pageSize, page * pageSize),
});

export const mergeSearchResults = (
  groups: SearchResultItem[][],
): SearchResultItem[] =>
  groups
    .flat()
    .sort((a, b) => {
      const at = a.updated_at ?? '';
      const bt = b.updated_at ?? '';
      if (at !== bt) return at < bt ? 1 : -1;
      if (a.type !== b.type) return a.type < b.type ? -1 : 1;
      if (a.id !== b.id) return a.id < b.id ? -1 : 1;
      return 0;
    });

export const canSearchUsers = (
  permissions: ReadonlySet<string>,
): boolean => permissions.has('user.manage');

const toMenuList = (value: unknown): TenantMenu[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is TenantMenu => {
    if (typeof v !== 'object' || v === null) return false;
    const m = v as Record<string, unknown>;
    return (
      typeof m.id === 'string' &&
      typeof m.label === 'string' &&
      typeof m.visible === 'boolean' &&
      typeof m.order === 'number'
    );
  });
};

export const defaultSearchMenus = (): TenantMenu[] =>
  tenantMenuDefinitions.map((d, order) => ({
    id: d.id,
    label: d.label,
    visible: true,
    order,
  }));

export const searchableMenus = (
  menus: TenantMenu[],
  q: string,
  permissions: ReadonlySet<string>,
): TenantMenu[] => {
  const needle = q.toLowerCase();
  return menus
    .filter(m => m.visible)
    .filter(m => {
      const def = tenantMenuDefinitions.find(d => d.id === m.id);
      return !def || def.permissions.some(p => permissions.has(p));
    })
    .filter(m => m.label.toLowerCase().includes(needle))
    .sort((a, b) => a.order - b.order);
};

export const menuLinkPath = (menuId: string): string =>
  menuId === 'portal-dashboard' ? '/' : `/${menuId}`;

export const buildProjectSearch = (
  db: Knex,
  tenantId: string,
  pattern: string,
) =>
  db('portal.fc_projects as p')
    .where({ 'p.tenant_id': tenantId, 'p.status': 'active' })
    .whereRaw("p.name ILIKE ? ESCAPE '\\'", [pattern])
    .select('p.id', 'p.name', 'p.description', 'p.updated_at');

export const buildOrganizationSearch = (
  db: Knex,
  tenantId: string,
  pattern: string,
) =>
  db('portal.fc_organizations as o')
    .where({ 'o.tenant_id': tenantId, 'o.status': 'active' })
    .whereRaw("o.name ILIKE ? ESCAPE '\\'", [pattern])
    .select('o.id', 'o.name', 'o.created_at');

export const buildUserSearch = (
  db: Knex,
  tenantId: string,
  pattern: string,
) =>
  db('portal.fc_users as u')
    .join('portal.fc_tenant_memberships as m', join =>
      join.on('m.user_id', 'u.user_id').andOnVal('m.tenant_id', tenantId),
    )
    .where({ 'u.status': 'active', 'm.status': 'active' })
    .where('m.valid_from', '<=', db.fn.now())
    .where(qb =>
      qb.whereNull('m.valid_until').orWhere('m.valid_until', '>', db.fn.now()),
    )
    .whereRaw("u.display_name ILIKE ? ESCAPE '\\'", [pattern])
    .select('u.user_id', 'u.display_name', 'u.created_at');

const iso = (value: unknown): string | null =>
  value instanceof Date ? value.toISOString() : null;

const clip = (value: string | null, max: number): string =>
  value && value.length > max ? `${value.slice(0, max)}…` : (value ?? '');

export interface PortalSearchInput {
  tenantId: string;
  permissions: ReadonlySet<string>;
  q: string;
  types: SearchResultType[] | null;
  page: number;
  pageSize: number;
}

export interface PortalSearchResponse {
  total: number;
  page: number;
  page_size: number;
  results: SearchResultItem[];
  took_ms: number;
}

export const searchPortalData = async (
  trx: Knex.Transaction,
  input: PortalSearchInput,
): Promise<PortalSearchResponse> => {
  const startedAt = Date.now();
  const pattern = likePattern(input.q);
  const wants = (t: SearchResultType): boolean =>
    input.types === null || input.types.includes(t);
  const groups: SearchResultItem[][] = [];

  if (wants('menu')) {
    const settings = await trx('portal.fc_tenant_settings')
      .where({ tenant_id: input.tenantId })
      .first('menus', 'updated_at');
    const menus = settings ? toMenuList(settings.menus) : defaultSearchMenus();
    const updatedAt = iso(settings?.updated_at);
    groups.push(
      searchableMenus(menus, input.q, input.permissions).map(m => ({
        type: 'menu' as const,
        id: m.id,
        title: m.label,
        summary: '포털 메뉴 바로가기',
        source_label: PORTAL_SOURCE_LABELS.menu,
        source_status: 'available' as const,
        link_path: menuLinkPath(m.id),
        updated_at: updatedAt,
      })),
    );
  }

  if (wants('project')) {
    const rows = await buildProjectSearch(trx, input.tenantId, pattern);
    groups.push(
      rows.map(r => ({
        type: 'project' as const,
        id: r.id as string,
        title: r.name as string,
        summary: clip((r.description as string | null) ?? null, 200),
        source_label: PORTAL_SOURCE_LABELS.project,
        source_status: 'available' as const,
        link_path: `/project-workspace?project=${encodeURIComponent(r.id as string)}`,
        updated_at: iso(r.updated_at),
      })),
    );
  }

  if (wants('organization')) {
    const rows = await buildOrganizationSearch(trx, input.tenantId, pattern);
    groups.push(
      rows.map(r => ({
        type: 'organization' as const,
        id: r.id as string,
        title: r.name as string,
        summary: '소속 조직',
        source_label: PORTAL_SOURCE_LABELS.organization,
        source_status: 'available' as const,
        link_path: `/tenant-management?organization=${encodeURIComponent(r.id as string)}`,
        updated_at: iso(r.created_at),
      })),
    );
  }

  if (wants('user') && canSearchUsers(input.permissions)) {
    const rows = await buildUserSearch(trx, input.tenantId, pattern);
    groups.push(
      rows.map(r => ({
        type: 'user' as const,
        id: r.user_id as string,
        title: r.display_name as string,
        summary: '포털 사용자',
        source_label: PORTAL_SOURCE_LABELS.user,
        source_status: 'available' as const,
        link_path: `/admin-console?user=${encodeURIComponent(r.user_id as string)}`,
        updated_at: iso(r.created_at),
      })),
    );
  }

  const merged = mergeSearchResults(groups);
  const paged = paginateResults(merged, input.page, input.pageSize);
  return { ...paged, took_ms: Date.now() - startedAt };
};
