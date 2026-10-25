import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ServerProposalBoard } from './ServerProposalBoard';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';

jest.mock('../portal-runtime/PortalRuntimeContext', () => ({ usePortalRuntime: jest.fn() }));
const row = (title: string, authorId = 'actor') => ({ id: title, title, author_id: authorId, type: 'feature', visibility: 'tenant', status: 'submitted', created_at: '2026-10-04T00:00:00Z' });
let request: jest.Mock;
const Harness = () => { const location = useLocation(); return <><span data-testid="proposal-url">{location.search}</span><ServerProposalBoard /></>; };
const view = (url: string) => <MemoryRouter initialEntries={[url]}><Harness /></MemoryRouter>;
beforeEach(() => {
  jest.clearAllMocks();
  request = jest.fn(path => {
    const params = new URLSearchParams(path.split('?')[1]);
    const page = Number(params.get('page'));
    return Promise.resolve({ data: { items: [row(page === 3 ? '51번째 제안' : '첫 페이지 제안')], pagination: { page, pageSize: 20, total: 51 }, summary: { total: 70, submitted: 60, under_review: 10, mine: 51, my_sympathy: 2, answered: 0, notice: 0 } } });
  });
  (usePortalRuntime as jest.Mock).mockReturnValue({ request, permissions: [], actorId: 'actor', tenantId: 'army' });
});
it('restores page three and exposes proposals beyond the previous fixed limit', async () => {
  render(view('/proposal-board?page=3'));
  await screen.findByRole('button', { name: '51번째 제안' });
  expect(screen.getByRole('button', { name: '다음 제안 페이지' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('전체 51개 · 3 / 3페이지');
  fireEvent.click(screen.getByRole('button', { name: '이전 제안 페이지' }));
  await screen.findByRole('button', { name: '첫 페이지 제안' });
  expect(screen.getByTestId('proposal-url')).toHaveTextContent('page=2');
});
it('requests own proposals from the server before pagination and resets page on sorting', async () => {
  render(view(`/proposal-board?page=3&tab=${encodeURIComponent('내 제안')}`));
  await screen.findByRole('button', { name: '51번째 제안' });
  expect(request).toHaveBeenCalledWith('/v1/proposals?page=3&pageSize=20&sort=latest&mine=true');
  fireEvent.click(screen.getByRole('button', { name: '공감순' }));
  await waitFor(() => expect(request).toHaveBeenLastCalledWith('/v1/proposals?page=1&pageSize=20&sort=sympathy&mine=true'));
  expect(screen.getByTestId('proposal-url')).not.toHaveTextContent('page=3');
});
it('uses server totals and actual personal sympathy instead of current-page positive votes', async () => {
  render(view('/proposal-board'));
  await screen.findByRole('button', { name: '첫 페이지 제안' });
  expect(screen.getAllByText('전체 제안').find(element => element.closest('.MuiCardContent-root'))?.closest('.MuiCardContent-root')).toHaveTextContent('70');
  expect(screen.getByText('내 공감').closest('.MuiCardContent-root')).toHaveTextContent('2');
});
