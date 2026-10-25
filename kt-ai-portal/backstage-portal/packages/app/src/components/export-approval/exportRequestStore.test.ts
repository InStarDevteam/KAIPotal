import {
  createDemoExportRequest,
  exportRequestStorageKey,
  normalizeDemoExportRequestInput,
  readDemoExportRequests,
  saveDemoExportRequests,
} from './exportRequestStore';

const input = {
  direction: 'export' as const,
  targetType: 'dataset' as const,
  targetName: '  육군 정비 데이터셋  ',
  targetDescription: '반출 설명',
  projectName: 'DIMS 정비이력 분석 프로젝트',
  reason: '외부 분석',
  requester: '홍길동',
  requesterOrg: 'AI개발센터',
  securityLevel: 'internal' as const,
  visibility: 'restricted' as const,
  accessScope: 'approved_users' as const,
  downloadable: true,
  attachments: [' 파일1.pdf ', '', '파일2.xlsx'],
};

afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

test('retains submitted demo requests across reload within one tenant and actor', () => {
  const key = exportRequestStorageKey('army', 'demo:general-user');
  const request = createDemoExportRequest(input);
  saveDemoExportRequests(key, [request]);
  const restored = readDemoExportRequests(key).items[0];
  expect(restored).toMatchObject({
    targetName: '육군 정비 데이터셋',
    requester: '홍길동',
    status: 'requested',
    demoPending: true,
    attachments: ['파일1.pdf', '파일2.xlsx'],
  });
  expect(restored.auditLog[0].note).toContain('데모');
  expect(
    readDemoExportRequests(exportRequestStorageKey('army', 'demo:portal-admin'))
      .items,
  ).toEqual([]);
});

test('rejects invalid input and keeps each submission unique', () => {
  expect(() =>
    normalizeDemoExportRequestInput({ ...input, targetName: ' ' }),
  ).toThrow('대상명');
  expect(() =>
    normalizeDemoExportRequestInput({ ...input, reason: '' }),
  ).toThrow('신청 사유');
  expect(createDemoExportRequest(input).id).not.toBe(
    createDemoExportRequest(input).id,
  );
});

test('corrupt storage is recoverable and write failure never reports persistence', () => {
  localStorage.setItem('broken', '{"version":1,"items":[{"id":"x"}]}');
  expect(readDemoExportRequests('broken').error).toBeTruthy();
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  expect(() =>
    saveDemoExportRequests('x', [createDemoExportRequest(input)]),
  ).toThrow('저장하지 못했습니다');
});
