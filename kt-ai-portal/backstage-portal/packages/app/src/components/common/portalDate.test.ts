import { formatPortalDate, formatPortalDateTime } from './portalDate';

it('uses Korea dates even when UTC falls on the previous day', () => {
  expect(formatPortalDate('2026-10-02T16:15:00Z')).toBe('2026. 10. 03.');
  expect(formatPortalDateTime('2026-10-02T16:15:00Z')).toBe(
    '2026. 10. 03. 01:15:00',
  );
});
it('missing and invalid dates remain a clear empty value', () => {
  expect(formatPortalDate(null)).toBe('—');
  expect(formatPortalDateTime('invalid')).toBe('—');
});
