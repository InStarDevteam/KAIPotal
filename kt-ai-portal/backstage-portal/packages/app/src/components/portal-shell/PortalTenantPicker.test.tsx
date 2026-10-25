import { fireEvent, render, screen } from '@testing-library/react';
import { PortalTenantPicker } from './PortalTenantPicker';
import { PortalTenant } from '../portal-runtime/PortalRuntimeContext';

const army: PortalTenant = {
  id: 'army',
  name: '육군',
  branch: 'army',
  roles: ['general-user'],
  permissions: ['portal.view'],
};
const navy: PortalTenant = {
  ...army,
  id: 'navy',
  name: '해군',
  branch: 'navy',
};

it('keeps a single membership inspectable and explains why other tenants are absent', () => {
  const onSelect = jest.fn();
  render(
    <PortalTenantPicker
      tenants={[army]}
      tenantId="army"
      loading={false}
      changing={false}
      onSelect={onSelect}
    />,
  );
  const select = screen.getByLabelText('소속 군 선택');
  expect(select.getAttribute('aria-disabled')).not.toBe('true');
  fireEvent.mouseDown(select);
  expect(screen.getByText(/현재 계정에 등록된 소속은 1개/)).toBeTruthy();
  expect(screen.queryByRole('option', { name: '해군' })).toBeNull();
  expect(onSelect).not.toHaveBeenCalled();
});
it('changes only to supplied memberships', () => {
  const onSelect = jest.fn();
  render(
    <PortalTenantPicker
      tenants={[army, navy]}
      tenantId="army"
      loading={false}
      changing={false}
      onSelect={onSelect}
    />,
  );
  fireEvent.mouseDown(screen.getByLabelText('소속 군 선택'));
  fireEvent.click(screen.getByRole('option', { name: '해군' }));
  expect(onSelect).toHaveBeenCalledWith('navy');
});
it('blocks conflicting selection while changing context', () => {
  render(
    <PortalTenantPicker
      tenants={[army, navy]}
      tenantId="army"
      loading={false}
      changing
      onSelect={jest.fn()}
    />,
  );
  expect(
    screen.getByLabelText('소속 군 선택').getAttribute('aria-disabled'),
  ).toBe('true');
});
