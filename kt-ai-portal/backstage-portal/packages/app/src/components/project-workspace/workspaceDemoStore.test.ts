import {
  readWorkspaceRequests,
  saveWorkspaceRequests,
  validateWorkspaceRequest,
  WorkEnvSubmission,
  workspaceStorageKey,
} from './workspaceDemoStore';

const form = {
  projectId: 'one',
  newProjectName: '',
  workspaceName: '부품 예측 환경',
  cpuCores: '4',
  gpuCount: '1',
  memoryGiB: '16',
  storageGiB: '100',
  startDate: '2026-10-01',
  endDate: '2026-10-31',
  datasets: ['정비 이력'],
  frameworks: ['PyTorch'],
};
afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});
test('validates required resources and reversed dates before accepting requests', () => {
  expect(validateWorkspaceRequest(form)).toBeNull();
  expect(validateWorkspaceRequest({ ...form, cpuCores: '0' })).toContain('CPU');
  expect(validateWorkspaceRequest({ ...form, gpuCount: '-1' })).toContain(
    'GPU',
  );
  expect(
    validateWorkspaceRequest({ ...form, endDate: '2026-09-30' }),
  ).toContain('종료일');
  expect(validateWorkspaceRequest({ ...form, projectId: 'new' })).toContain(
    '프로젝트',
  );
});
test('persists the complete request and approval without crossing actor or tenant', () => {
  const key = workspaceStorageKey('army', 'one');
  const item: WorkEnvSubmission = {
    id: 'request-1',
    requestType: 'AI 작업 환경(컨테이너) 생성 요청',
    projectName: '정비',
    workspaceName: form.workspaceName,
    securityLevel: '내부',
    status: '신청',
    submittedAt: '2026-09-24T00:00:00Z',
    request: form,
  };
  saveWorkspaceRequests(key, [item]);
  expect(readWorkspaceRequests(key).items[0].request).toEqual(form);
  saveWorkspaceRequests(key, [
    { ...item, status: '승인', reviewedAt: '2026-09-24T01:00:00Z' },
  ]);
  expect(readWorkspaceRequests(key).items[0].status).toBe('승인');
  expect(
    readWorkspaceRequests(workspaceStorageKey('navy', 'one')).items,
  ).toEqual([]);
  expect(
    readWorkspaceRequests(workspaceStorageKey('army', 'two')).items,
  ).toEqual([]);
});
test('malformed records and storage failures remain visible failures', () => {
  localStorage.setItem('broken', '{"version":1,"items":[null]}');
  expect(readWorkspaceRequests('broken').error).toBeTruthy();
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  expect(() => saveWorkspaceRequests('key', [])).toThrow('저장하지 못했습니다');
});
