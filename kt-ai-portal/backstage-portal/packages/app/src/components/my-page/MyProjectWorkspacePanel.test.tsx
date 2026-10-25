import { safeWorkspaceUrl } from './MyProjectWorkspacePanel';

describe('workspace launch URL', () => {
  it('only launches a configured HTTPS service and never a placeholder', () => {
    expect(safeWorkspaceUrl('https://workspace.mil/launch')).toBe(
      'https://workspace.mil/launch',
    );
    for (const url of [
      // eslint-disable-next-line no-script-url -- rejection fixture, never executed
      'javascript:alert(1)',
      'http://workspace.mil',
      'https://user:password@workspace.mil',
      'https://ws.example.com/demo',
      'https://unconfigured.invalid',
      '/relative',
    ])
      expect(safeWorkspaceUrl(url)).toBeNull();
  });
});
