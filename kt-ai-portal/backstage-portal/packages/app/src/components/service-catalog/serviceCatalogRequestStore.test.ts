import {
  createDirectToolRequest,
  createSelectionToolRequest,
  normalizeDirectToolRequestInput,
  readServiceCatalogRequests,
  saveServiceCatalogRequests,
  serviceCatalogRequestStorageKey,
} from './serviceCatalogRequestStore';
import { SelectedTool, Tool } from './types';

const input = {
  toolName: '  Label Studio Pro  ',
  toolType: '라벨링 도구',
  provisionType: '폐쇄망 미러링',
  requiredVersion: '1.9',
  purpose: '영상 라벨링 작업이 필요합니다.',
  relatedProject: 'DIMS 정비이력 분석 프로젝트',
  requiredResources: 'GPU 1개',
  closedNetworkRequired: true,
  securityReviewRequired: true,
};

const tool: Tool = {
  id: 'tool-1',
  name: 'Jupyter Notebook',
  category: '개발도구',
  description: '',
  provisionType: '워크스페이스 선택',
  version: '7.0',
  status: '사용가능',
  allowedRoles: [],
  allowedWorkspaces: [],
  securityLevel: '내부' as const,
  owner: '',
  registeredAt: '',
  features: [],
  installMethod: '',
  requiredResources: '',
  requiresSecurityReview: false,
  workspaceApplicable: true,
  relatedProjects: [],
  relatedDocs: [],
  changeHistory: [],
};

afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

test('retains submitted fields across reload within one tenant and actor', () => {
  const key = serviceCatalogRequestStorageKey('army', 'demo:general-user');
  const request = createDirectToolRequest(input, 'demo:general-user');
  saveServiceCatalogRequests(key, [request]);
  const restored = readServiceCatalogRequests(key).items[0];
  expect(restored).toMatchObject({
    toolName: 'Label Studio Pro',
    purpose: input.purpose,
    toolType: '라벨링 도구',
    requester: 'demo:general-user',
    status: '요청',
  });
  expect(
    readServiceCatalogRequests(serviceCatalogRequestStorageKey('navy', 'demo:general-user'))
      .items,
  ).toEqual([]);
  expect(
    readServiceCatalogRequests(serviceCatalogRequestStorageKey('army', 'demo:portal-admin'))
      .items,
  ).toEqual([]);
});

test('rejects invalid input and keeps each submission unique', () => {
  expect(() =>
    normalizeDirectToolRequestInput({ ...input, toolName: '  ' }),
  ).toThrow('요청 도구명');
  expect(() =>
    normalizeDirectToolRequestInput({ ...input, purpose: '' }),
  ).toThrow('사용 목적');
  expect(createDirectToolRequest(input, 'a').id).not.toBe(
    createDirectToolRequest(input, 'a').id,
  );
});

test('builds a selection request from chosen tools and project', () => {
  const selections: SelectedTool[] = [
    { tool, version: tool.version, project: 'P', workspace: 'W', reason: '분석용' },
    {
      tool: { ...tool, id: 'tool-2', name: 'CVAT', requiresSecurityReview: true },
      version: '2.0',
      project: 'P',
      workspace: 'W',
      reason: '',
    },
  ];
  const request = createSelectionToolRequest(selections, 'P', 'demo:general-user');
  expect(request.toolName).toBe('Jupyter Notebook 외 1건');
  expect(request.purpose).toBe('분석용');
  expect(request.relatedProject).toBe('P');
  expect(request.securityReviewRequired).toBe(true);
  expect(() => createSelectionToolRequest([], 'P', 'demo:general-user')).toThrow();
});

test('corrupt storage is recoverable and write failure never reports persistence', () => {
  localStorage.setItem('broken', '{"version":1,"items":[{}]}');
  expect(readServiceCatalogRequests('broken').error).toBeTruthy();
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  expect(() =>
    saveServiceCatalogRequests('x', [createDirectToolRequest(input, 'a')]),
  ).toThrow('저장하지 못했습니다');
});
