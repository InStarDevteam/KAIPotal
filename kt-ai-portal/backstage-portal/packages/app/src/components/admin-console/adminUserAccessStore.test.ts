import {
  adminUserAccessStorageKey,
  readAdminUserAccess,
  saveAdminUserAccess,
  AdminUserAccessRecord,
} from './adminUserAccessStore';

afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

test('persists user access settings without crossing tenants', () => {
  const key = adminUserAccessStorageKey('army');
  const record: AdminUserAccessRecord = {
    userId: 'u-1',
    organization: '육군본부',
    userType: '내부',
    role: 'PM',
    dataAccessLevel: '내부',
    canApproveExport: true,
    accessibleServices: ['Portal Dashboard', 'Credit Manager'],
  };
  saveAdminUserAccess(key, [record]);
  expect(readAdminUserAccess(key).items).toEqual([record]);
  expect(readAdminUserAccess(adminUserAccessStorageKey('navy')).items).toEqual(
    [],
  );
  const updated: AdminUserAccessRecord = {
    ...record,
    role: '관리자',
    accessibleServices: ['Admin Console'],
  };
  saveAdminUserAccess(key, [updated]);
  expect(readAdminUserAccess(key).items).toEqual([updated]);
});

test('rejects malformed records and surfaces storage failures', () => {
  localStorage.setItem('broken', '{"version":1,"items":[{"userId":"u-1","userType":"알수없음"}]}');
  expect(readAdminUserAccess('broken').error).toBeTruthy();
  localStorage.setItem('broken2', '{"version":1,"items":[null]}');
  expect(readAdminUserAccess('broken2').error).toBeTruthy();
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  expect(() =>
    saveAdminUserAccess('key', [{ userId: 'u-1' }]),
  ).toThrow('저장하지 못했습니다');
});
