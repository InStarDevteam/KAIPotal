import { appendDemoActivity, csvCell, readDemoActivity } from './demoActivity';

afterEach(() => localStorage.clear());
test('CSV cells quote fields and neutralize spreadsheet formulas', () => {
  expect(csvCell('user,"name"')).toBe('"user,""name"""');
  expect(csvCell('  =HYPERLINK("test")')).toBe('"\'  =HYPERLINK(""test"")"');
  expect(csvCell('\t+42')).toBe('"\'\t+42"');
  expect(csvCell('일반 사용자')).toBe('"일반 사용자"');
});
test('demo history tolerates corrupt storage without fabricating records', () => {
  localStorage.setItem('kai.demo.activity.v1', 'bad-json');
  expect(readDemoActivity()).toEqual([]);
});
test('recorded demo events retain tenant identity and timestamps', () => {
  appendDemoActivity({
    tenantId: 'army',
    actorId: 'demo:branch-admin',
    actorName: '군별 관리자',
    action: 'tenant.settings.update',
    category: 'admin',
    resourceType: 'settings',
    resourceId: 'army',
    result: 'success',
  });
  const rows = readDemoActivity();
  expect(rows).toHaveLength(1);
  expect(rows[0].tenantId).toBe('army');
  expect(Number.isFinite(Date.parse(rows[0].createdAt))).toBe(true);
});
