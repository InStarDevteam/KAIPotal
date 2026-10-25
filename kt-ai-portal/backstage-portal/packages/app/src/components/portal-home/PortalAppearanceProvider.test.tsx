import { useContext } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { useTheme } from '@material-ui/core/styles';
import { PortalAppearanceProvider } from './PortalAppearanceProvider';
import { PortalAppearanceContext } from './homeDesign';

let mockBranding: {
  primaryColor: string;
  accentColor: string;
  design?: string;
  fontScale?: number;
};
let mockPreferences: { design?: string; fontScale?: number };
let mockReview: {
  reviewEnabled: boolean;
  selection?: 'aurora' | 'focus' | 'orbit' | 'canvas';
};
jest.mock('../tenant-settings/TenantSettingsContext', () => ({
  useTenantSettings: () => ({ settings: { branding: mockBranding } }),
}));
jest.mock('../tenant-settings/PlatformAccessContext', () => ({
  usePlatformAccess: () => ({ preferences: mockPreferences }),
}));
jest.mock('./homeDesign', () => ({
  ...jest.requireActual('./homeDesign'),
  useDesignReview: () => mockReview,
}));

function Probe() {
  const appearance = useContext(PortalAppearanceContext);
  const theme = useTheme();
  return (
    <output data-testid="appearance-probe">
      {JSON.stringify({
        ...appearance,
        font: theme.typography.body1.fontSize,
        primary: theme.palette.primary.main,
      })}
    </output>
  );
}
beforeEach(() => {
  mockBranding = {
    primaryColor: '#174a74',
    accentColor: '#47a6c8',
    design: 'focus',
    fontScale: 1.2,
  };
  mockPreferences = {};
  mockReview = { reviewEnabled: true };
});
afterEach(cleanup);

test('tenant branding and typography reach child routes and dialog root variables', () => {
  const view = render(
    <PortalAppearanceProvider>
      <Probe />
    </PortalAppearanceProvider>,
  );
  expect(
    JSON.parse(screen.getByTestId('appearance-probe').textContent!),
  ).toMatchObject({
    design: 'focus',
    fontScale: 1.2,
    source: 'tenant',
    font: '1.125rem',
    primary: '#174a74',
  });
  expect(document.documentElement.dataset.portalDesign).toBe('focus');
  expect(
    document.documentElement.style.getPropertyValue('--portal-primary'),
  ).toBe('#174a74');
  expect(
    document.documentElement.style.getPropertyValue('--portal-font-scale'),
  ).toBe('1.2');
  view.unmount();
  expect(document.documentElement.dataset.portalDesign).toBeUndefined();
  expect(
    document.documentElement.style.getPropertyValue('--portal-font-scale'),
  ).toBe('');
});

test('a membership change replaces colors and inherited design while personal preferences apply only when supplied', () => {
  const view = render(
    <PortalAppearanceProvider>
      <Probe />
    </PortalAppearanceProvider>,
  );
  mockBranding = {
    primaryColor: '#983c3b',
    accentColor: '#d4a54b',
    design: 'orbit',
    fontScale: 1,
  };
  view.rerender(
    <PortalAppearanceProvider>
      <Probe />
    </PortalAppearanceProvider>,
  );
  expect(
    JSON.parse(screen.getByTestId('appearance-probe').textContent!),
  ).toMatchObject({
    design: 'orbit',
    fontScale: 1,
    source: 'tenant',
    primary: '#983c3b',
  });
  mockPreferences = { design: 'canvas', fontScale: 0.9 };
  view.rerender(
    <PortalAppearanceProvider>
      <Probe />
    </PortalAppearanceProvider>,
  );
  expect(
    JSON.parse(screen.getByTestId('appearance-probe').textContent!),
  ).toMatchObject({ design: 'canvas', fontScale: 0.9, source: 'personal' });
  mockReview.selection = 'aurora';
  view.rerender(
    <PortalAppearanceProvider>
      <Probe />
    </PortalAppearanceProvider>,
  );
  expect(
    JSON.parse(screen.getByTestId('appearance-probe').textContent!),
  ).toMatchObject({ design: 'aurora', fontScale: 0.9, source: 'review' });
  mockReview.reviewEnabled = false;
  view.rerender(
    <PortalAppearanceProvider>
      <Probe />
    </PortalAppearanceProvider>,
  );
  expect(document.documentElement.dataset.portalDesign).toBe('canvas');
});
