import {
  applyExportDecision,
  createExportDecision,
  exportDecisionStorageKey,
  readExportDecisions,
  saveExportDecisions,
} from './exportDecisionStore';
import { ExportRequest } from './types';

const baseRequest: ExportRequest = {
  id: 'EXP-1',
  direction: 'export',
  targetType: 'dataset',
  targetName: '테스트 데이터셋',
  targetDescription: '설명',
  projectId: 'P-1',
  projectName: '프로젝트',
  reason: '사유',
  requester: '신청자',
  requesterOrg: '소속',
  securityLevel: 'internal',
  visibility: 'restricted',
  accessScope: 'approved_users',
  status: 'requested',
  requestedAt: '2026-01-01T00:00:00Z',
  downloadable: false,
  attachments: [],
  auditLog: [],
};

afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

test('retains review decisions across reload within one tenant and actor', () => {
  const key = exportDecisionStorageKey('army', 'demo:portal-admin');
  const decision = createExportDecision(
    'EXP-1',
    'approved',
    'portal-admin(포털 관리자)',
  );
  saveExportDecisions(key, [decision]);
  const restored = readExportDecisions(key).items[0];
  expect(restored).toMatchObject({
    requestId: 'EXP-1',
    decision: 'approved',
    approver: 'portal-admin(포털 관리자)',
  });
  const applied = applyExportDecision(baseRequest, restored);
  expect(applied.status).toBe('approved');
  expect(applied.approver).toBe('portal-admin(포털 관리자)');
  expect(applied.approvedAt).toBe(restored.decidedAt);
  expect(applied.auditLog[applied.auditLog.length - 1]).toMatchObject({
    actor: 'portal-admin(포털 관리자)',
    action: '승인',
  });
  expect(
    readExportDecisions(exportDecisionStorageKey('army', 'demo:general-user'))
      .items,
  ).toEqual([]);
});

test('rejects corrupt storage and write failure never reports persistence', () => {
  localStorage.setItem('broken', '{"version":1,"items":[{"requestId":1}]}');
  expect(readExportDecisions('broken').error).toBeTruthy();
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  expect(() =>
    saveExportDecisions('x', [createExportDecision('EXP-1', 'rejected', 'a')]),
  ).toThrow('저장하지 못했습니다');
});
