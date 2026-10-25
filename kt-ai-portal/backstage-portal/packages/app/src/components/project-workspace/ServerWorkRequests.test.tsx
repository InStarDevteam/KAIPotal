import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ServerWorkRequests } from './ServerWorkRequests';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';

jest.mock('../portal-runtime/PortalRuntimeContext', () => ({ usePortalRuntime: jest.fn() }));
let request: jest.Mock;
const entry = (index: number) => ({ id: `project-${index}`, name: `프로젝트 ${index + 1}`, status: 'active' });
beforeEach(() => {
  jest.clearAllMocks();
  request = jest.fn(path => {
    if (path.startsWith('/v1/projects?')) {
      const page = Number(new URLSearchParams(path.split('?')[1]).get('page'));
      return Promise.resolve({ data: { items: Array.from({ length: page === 3 ? 1 : 50 }, (_, i) => entry((page - 1) * 50 + i)), pagination: { total: 101 } } });
    }
    if (path.startsWith('/v1/projects/')) return Promise.resolve({ data: { project: entry(100), members: [{ user_id: 'actor' }] } });
    return Promise.resolve({ data: { items: [], nextCursor: null } });
  });
  (usePortalRuntime as jest.Mock).mockReturnValue({ request, permissions: ['workspace.request'], actorId: 'actor', tenantId: 'army' });
});
const view = (url = '/project-workspace') => <MemoryRouter initialEntries={[url]}><ServerWorkRequests /></MemoryRouter>;
it('loads all participating projects and makes the 101st available for workspace requests', async () => {
  render(view());
  fireEvent.click(await screen.findByRole('button', { name: '프로젝트 더 불러오기' }));
  await screen.findByText('참여 프로젝트 101개 중 100개 표시');
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 더 불러오기' }));
  await screen.findByText('참여 프로젝트 101개 중 101개 표시');
  fireEvent.mouseDown(screen.getByRole('button', { name: /^프로젝트 선택 / }));
  fireEvent.click(await screen.findByRole('option', { name: '프로젝트 101' }));
  expect(screen.getByRole('button', { name: /^프로젝트 선택 / })).toHaveTextContent('프로젝트 101');
});
it('preserves a permitted selected project beyond the initial page after a direct link', async () => {
  render(view('/project-workspace?project=project-100'));
  await screen.findByText('참여 프로젝트 101개 중 51개 표시');
  expect(screen.getByRole('button', { name: /^프로젝트 선택 / })).toHaveTextContent('프로젝트 101');
  expect(request).toHaveBeenCalledWith('/v1/projects/project-100');
});
it('does not insert a visible public project without the current user membership into the selector', async () => {
  request.mockImplementation(path => {
    if (path.startsWith('/v1/projects?')) return Promise.resolve({ data: { items: [entry(0)], pagination: { total: 1 } } });
    if (path.startsWith('/v1/projects/')) return Promise.resolve({ data: { project: entry(100), members: [{ user_id: 'another-actor' }] } });
    return Promise.resolve({ data: { items: [], nextCursor: null } });
  });
  render(view('/project-workspace?project=project-100'));
  await waitFor(() => expect(screen.getByRole('button', { name: /^프로젝트 선택 / })).toHaveTextContent('프로젝트 1'));
  expect(screen.getByRole('button', { name: /^프로젝트 선택 / })).not.toHaveTextContent('프로젝트 101');
});
