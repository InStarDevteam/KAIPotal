import {
  emptyWorkspaceDraft,
  validateServerWorkspace,
  workspaceRequestPayload,
  workspaceOnly,
  workspaceStatusLabel,
} from './workspaceServerModel';

const project = { id: 'project-a', name: '정비 데이터 분석', status: 'active' };
const draft = {
  ...emptyWorkspaceDraft,
  projectId: project.id,
  workspaceName: '분석 환경',
  cpuCores: '4',
  memoryGiB: '16',
  storageGiB: '100',
  startDate: '2026-10-01',
  endDate: '2026-12-31',
};

test('requires current active project membership before a workspace can be submitted', () => {
  expect(validateServerWorkspace(draft, [project])).toBeNull();
  expect(validateServerWorkspace(draft, [])).toContain('참여 프로젝트');
  expect(
    validateServerWorkspace(draft, [{ ...project, status: 'closed' }]),
  ).toContain('참여 프로젝트');
  expect(
    validateServerWorkspace(
      { ...draft, projectId: 'different-tenant-project' },
      [project],
    ),
  ).toContain('참여 프로젝트');
});

test('validates resources, GPU and periods without losing entered optional configuration', () => {
  expect(
    validateServerWorkspace({ ...draft, memoryGiB: '0' }, [project]),
  ).toContain('Memory');
  expect(
    validateServerWorkspace({ ...draft, gpuCount: '1025' }, [project]),
  ).toContain('GPU');
  expect(
    validateServerWorkspace({ ...draft, endDate: '2026-09-01' }, [project]),
  ).toContain('종료일');
  const payload = workspaceRequestPayload(
    {
      ...draft,
      requestType: 'data',
      frameworks: 'Pandas',
      deidentificationRequired: 'yes',
      datasets: 'approved-dataset-id',
    },
    project,
  );
  expect(payload).toMatchObject({
    type: 'workspace',
    projectId: project.id,
    title: '데이터 작업환경 · 분석 환경',
    payload: {
      datasets: 'approved-dataset-id',
      frameworks: 'Pandas',
      deidentificationRequired: 'yes',
      projectName: project.name,
    },
  });
});

test('keeps unrelated approval types out and labels approval distinct from provisioned state', () => {
  const rows = ['workspace', 'credit', 'export'].map(type => ({
    id: type,
    type,
    title: type,
    status: 'requested',
    version: 1,
    project_id: project.id,
    created_at: '2026-10-01',
    payload: {},
  }));
  expect(workspaceOnly(rows).map(row => row.id)).toEqual(['workspace']);
  expect(workspaceStatusLabel('approved')).toBe('신청 승인');
  expect(workspaceStatusLabel('unknown_state')).toBe('unknown_state');
});
