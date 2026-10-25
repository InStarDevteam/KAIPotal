import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ServerServiceCatalog } from './ServerServiceCatalog';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';

jest.mock('../portal-runtime/PortalRuntimeContext', () => ({ usePortalRuntime: jest.fn() }));
const catalogRow = (name: string) => ({ id: name, name, kind: 'tool', category: 'analysis', access_type: 'apply', active: true });
let request: jest.Mock;
const reply = (items: unknown[], page = 1, total = 41) => ({ data: { items, pagination: { page, pageSize: 20, total }, summary: { total: 80, applicable: 60, categories: { analysis: 41, labeling: 39 } } } });
const Harness = () => { const location = useLocation(); return <><span data-testid="catalog-url">{location.search}</span><ServerServiceCatalog /></>; };
const view = (url: string) => <MemoryRouter initialEntries={[url]}><Harness /></MemoryRouter>;
beforeEach(() => {
  jest.clearAllMocks();
  request = jest.fn(path => {
    const params = new URLSearchParams(path.split('?')[1]);
    const page = Number(params.get('page'));
    if (path.startsWith('/v1/projects')) return Promise.resolve(reply(Array.from({ length: page === 3 ? 1 : 50 }, (_, i) => ({ id: `p-${(page - 1) * 50 + i}`, name: `프로젝트 ${(page - 1) * 50 + i + 1}`, status: 'active' })), page, 101));
    if (path.startsWith('/v1/catalog/applications')) return Promise.resolve(reply([{ id: 'application', item_name: page === 3 ? '51번째 신청' : '첫 신청', reason: '사용 신청', status: 'requested', execution_status: 'pending_platform' }], page, 51));
    return Promise.resolve(reply([catalogRow(page === 3 ? '41번째 도구' : '분석 도구')], page));
  });
  (usePortalRuntime as jest.Mock).mockReturnValue({ request, permissions: ['project.approve'], actorId: 'actor', tenantId: 'army' });
});
it('pages catalog items and sends category filters to the server before paging', async () => {
  render(view('/service-catalog?page=3&tab=analysis'));
  await screen.findByRole('button', { name: '41번째 도구' });
  expect(request).toHaveBeenCalledWith('/v1/catalog/items?active=true&page=3&pageSize=20&category=analysis');
  expect(screen.getByRole('button', { name: '다음 카탈로그 페이지' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '이전 카탈로그 페이지' }));
  await screen.findByRole('button', { name: '분석 도구' });
  expect(screen.getByTestId('catalog-url')).toHaveTextContent('page=2');
});
it('pages approval history and labels the administrator scope correctly', async () => {
  render(view(`/service-catalog?page=3&tab=${encodeURIComponent('내 신청 이력')}`));
  await screen.findByText('51번째 신청');
  expect(screen.getByRole('tab', { name: '신청·승인 이력' })).toBeVisible();
  expect(request).toHaveBeenCalledWith('/v1/catalog/applications?page=3&pageSize=20');
  expect(screen.getByRole('status')).toHaveTextContent('전체 51개 · 3 / 3페이지');
});
it('allows loading and selecting projects beyond the first hundred', async () => {
  render(view('/service-catalog'));
  fireEvent.click(await screen.findByRole('button', { name: '분석 도구' }));
  fireEvent.click(await screen.findByRole('button', { name: '프로젝트 더 불러오기' }));
  await screen.findByText('참여 프로젝트 101개 중 100개 표시');
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 더 불러오기' }));
  await screen.findByText('참여 프로젝트 101개 중 101개 표시');
  fireEvent.mouseDown(screen.getByLabelText('프로젝트(선택)'));
  fireEvent.click(await screen.findByRole('option', { name: '프로젝트 101' }));
  expect(screen.getByRole('button', { name: '프로젝트(선택)' })).toHaveTextContent('프로젝트 101');
  await waitFor(() => expect(request).toHaveBeenCalledWith('/v1/projects?mine=true&status=active&page=3&pageSize=50'));
});
