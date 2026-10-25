import { SearchResultItem, SearchFilters } from './types';
import { applySearchFilters } from './searchFiltering';

const makeItem = (type: SearchResultItem['type'], id: string): SearchResultItem => ({
  type,
  id,
  title: id,
  summary: '',
  source_label: '',
  source_status: 'available',
  link_path: '/',
  updated_at: null,
});

const results: SearchResultItem[] = [
  makeItem('menu', 'menu-1'),
  makeItem('project', 'project-1'),
  makeItem('project', 'project-2'),
  makeItem('organization', 'org-1'),
  makeItem('user', 'user-1'),
];

const baseFilters: SearchFilters = { query: '', type: 'all' };

describe('applySearchFilters', () => {
  it('전체(type=all)이면 결과를 그대로 반환한다', () => {
    expect(applySearchFilters(results, baseFilters)).toHaveLength(results.length);
  });

  it('타입별 필터가 동작한다', () => {
    const projects = applySearchFilters(results, { ...baseFilters, type: 'project' });
    expect(projects).toHaveLength(2);
    expect(projects.every(r => r.type === 'project')).toBe(true);
  });

  it('user 타입 필터가 동작한다', () => {
    const users = applySearchFilters(results, { ...baseFilters, type: 'user' });
    expect(users).toHaveLength(1);
    expect(users[0].id).toBe('user-1');
  });

  it('menu 타입 필터가 동작한다', () => {
    const menus = applySearchFilters(results, { ...baseFilters, type: 'menu' });
    expect(menus).toHaveLength(1);
    expect(menus[0].type).toBe('menu');
  });
});
