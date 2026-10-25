import knex from 'knex';
import {
  buildOrganizationSearch,
  buildProjectSearch,
  buildUserSearch,
  canSearchUsers,
  defaultSearchMenus,
  escapeLikeTerm,
  likePattern,
  mergeSearchResults,
  menuLinkPath,
  paginateResults,
  parseSearchQuery,
  parseSuggestQuery,
  searchSources,
  SearchResultItem,
  searchableMenus,
} from './portalSearch';

const TENANT = '11111111-2222-3333-4444-555555555555';
const qb = knex({ client: 'pg' });

describe('escapeLikeTerm', () => {
  it('escapes LIKE wildcards and the escape character itself', () => {
    expect(escapeLikeTerm('100%_\\')).toBe('100\\%\\_\\\\');
    expect(likePattern('a%b_c\\d')).toBe('%a\\%b\\_c\\\\d%');
    expect(escapeLikeTerm('일반문자')).toBe('일반문자');
  });
});

describe('parseSearchQuery', () => {
  it('rejects queries shorter than 2 chars or longer than 100 chars', () => {
    expect(parseSearchQuery({ q: '한' }).ok).toBe(false);
    expect(parseSearchQuery({ q: '' }).ok).toBe(false);
    expect(parseSearchQuery({ q: '글'.repeat(101) }).ok).toBe(false);
    expect(parseSearchQuery({ q: '검색어' }).ok).toBe(true);
  });
  it('defaults page to 1 and page_size to 20, capping page_size at 100', () => {
    const parsed = parseSearchQuery({ q: '검색어' });
    if (!parsed.ok) throw new Error('must parse');
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(20);
    const capped = parseSearchQuery({ q: '검색어', page_size: '500' });
    if (!capped.ok) throw new Error('must parse');
    expect(capped.pageSize).toBe(100);
  });
  it('rejects non-integer page and page_size', () => {
    expect(parseSearchQuery({ q: '검색어', page: '0' }).ok).toBe(false);
    expect(parseSearchQuery({ q: '검색어', page: 'abc' }).ok).toBe(false);
    expect(parseSearchQuery({ q: '검색어', page_size: '-3' }).ok).toBe(false);
  });
  it('parses types filter and rejects unsupported types', () => {
    const parsed = parseSearchQuery({ q: '검색어', types: 'project,menu' });
    if (!parsed.ok) throw new Error('must parse');
    expect(parsed.types).toEqual(['project', 'menu']);
    expect(parseSearchQuery({ q: '검색어', types: 'project,secret' }).ok).toBe(
      false,
    );
    expect(parseSearchQuery({ q: '검색어', types: '' }).ok).toBe(true);
  });
});

describe('parseSuggestQuery', () => {
  it('requires a non-empty query within 100 chars', () => {
    expect(parseSuggestQuery({ q: '' }).ok).toBe(false);
    expect(parseSuggestQuery({ q: '글'.repeat(101) }).ok).toBe(false);
    expect(parseSuggestQuery({ q: '가' }).ok).toBe(true);
  });
});

describe('paginateResults', () => {
  const items = Array.from({ length: 45 }, (_, i) => i + 1);
  it('slices the requested page and reports totals', () => {
    const p1 = paginateResults(items, 1, 20);
    expect(p1.total).toBe(45);
    expect(p1.results).toEqual(items.slice(0, 20));
    const p3 = paginateResults(items, 3, 20);
    expect(p3.results).toEqual(items.slice(40, 45));
  });
});

describe('mergeSearchResults', () => {
  const item = (id: string, updated: string | null): SearchResultItem => ({
    type: 'project',
    id,
    title: id,
    summary: '',
    source_label: '프로젝트',
    source_status: 'available',
    link_path: '/',
    updated_at: updated,
  });
  it('sorts newest first and keeps null timestamps last', () => {
    const merged = mergeSearchResults([
      [item('b', '2026-09-01T00:00:00.000Z'), item('a', null)],
      [item('c', '2026-09-02T00:00:00.000Z')],
    ]);
    expect(merged.map(m => m.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('searchableMenus', () => {
  const menus = defaultSearchMenus();
  it('excludes hidden menus and menus the user has no permission for', () => {
    const hidden = menus.map(m =>
      m.id === 'credit-manager' ? { ...m, visible: false } : m,
    );
    const general = new Set(['portal.view']);
    const matched = searchableMenus(hidden, '크레딧', general);
    expect(matched).toEqual([]);
    const admin = new Set(['portal.view', 'credit.view']);
    expect(searchableMenus(hidden, '크레딧', admin)).toEqual([]);
    const adminVisible = searchableMenus(menus, '크레딧', admin);
    expect(adminVisible.map(m => m.id)).toEqual(['credit-manager']);
  });
  it('matches labels case-insensitively and honors ordering', () => {
    const general = new Set(['portal.view']);
    const matched = searchableMenus(menus, '포털', general);
    expect(matched.map(m => m.id)).toEqual(['portal-dashboard', 'portal-work']);
  });
});

describe('canSearchUsers', () => {
  it('allows user search only with the user.manage permission', () => {
    expect(canSearchUsers(new Set(['portal.view']))).toBe(false);
    expect(canSearchUsers(new Set(['user.manage']))).toBe(true);
  });
});

describe('menuLinkPath', () => {
  it('maps the dashboard to the root path and other menus to their route', () => {
    expect(menuLinkPath('portal-dashboard')).toBe('/');
    expect(menuLinkPath('integrated-search')).toBe('/integrated-search');
  });
});

describe('searchSources', () => {
  it('marks portal sources available and external sources integration_pending', () => {
    const sources = searchSources();
    const portal = sources.filter(s => s.kind === 'portal');
    const external = sources.filter(s => s.kind === 'external');
    expect(portal.length).toBeGreaterThan(0);
    expect(portal.every(s => s.status === 'available')).toBe(true);
    expect(external.length).toBeGreaterThan(0);
    expect(external.every(s => s.status === 'integration_pending')).toBe(true);
    expect(external.every(s => s.note === '외부 원천 연동 대기')).toBe(true);
    expect(external.map(s => s.key)).toEqual(
      expect.arrayContaining(['dataset', 'model', 'docker', 'pypi', 'semantic']),
    );
  });
});

describe('tenant scoping in search queries', () => {
  it('binds the selected tenant to every tenant-scoped search query', () => {
    const project = buildProjectSearch(qb, TENANT, '%x%').toSQL();
    expect(project.sql).toContain('"p"."tenant_id" = ?');
    expect(project.bindings).toEqual([TENANT, 'active', '%x%']);

    const org = buildOrganizationSearch(qb, TENANT, '%x%').toSQL();
    expect(org.sql).toContain('"o"."tenant_id" = ?');
    expect(org.bindings).toEqual([TENANT, 'active', '%x%']);

    const user = buildUserSearch(qb, TENANT, '%x%').toSQL();
    expect(user.sql).toContain('"m"."tenant_id" = ?');
    expect(user.sql).toContain('"m"."status" = ?');
    expect(user.bindings[0]).toBe(TENANT);
    expect(user.bindings[user.bindings.length - 1]).toBe('%x%');
  });
  it('uses ILIKE with an explicit escape clause so wildcards cannot match broadly', () => {
    for (const query of [
      buildProjectSearch(qb, TENANT, likePattern('100%')),
      buildOrganizationSearch(qb, TENANT, likePattern('a_')),
      buildUserSearch(qb, TENANT, likePattern('x\\y')),
    ]) {
      const { sql, bindings } = query.toSQL();
      expect(sql).toContain('ILIKE ? ESCAPE');
      expect(bindings[bindings.length - 1]).toContain('\\');
    }
  });
});
