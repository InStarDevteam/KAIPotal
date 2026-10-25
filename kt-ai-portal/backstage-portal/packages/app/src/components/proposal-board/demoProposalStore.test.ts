import {
  createDemoProposal,
  normalizeProposalDraft,
  proposalStorageKey,
  readDemoProposals,
  saveDemoProposals,
  toggleProposalReaction,
} from './demoProposalStore';
import { ProposalDraft } from './types';

const draft: ProposalDraft = {
  title: '  부품 수요 예측  ',
  category: 'AI 모델 개발',
  proposer: '테스트 사용자',
  organization: '공군',
  contact: '',
  email: 'test@example.com',
  necessity: '부품 수요를 미리 확인합니다.',
  applicability: '정비 업무',
  expectedEffect: '대기 시간 감소',
  requiredData: '정비 이력',
  expectedUsers: '정비대대',
  securityLevel: '내부',
  isPublic: true,
  privacyAgreed: true,
};
afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});
test('retains submitted fields and reactions across reload within one tenant and actor', () => {
  const key = proposalStorageKey('airforce', 'one');
  const proposal = createDemoProposal(draft, 'one');
  const voted = toggleProposalReaction(proposal, 'likes');
  saveDemoProposals(key, [voted]);
  const restored = readDemoProposals(key, []).items[0];
  expect(restored).toMatchObject({
    title: '부품 수요 예측',
    necessity: draft.necessity,
    ownerId: 'one',
    likes: 1,
    myReactions: ['likes'],
  });
  expect(toggleProposalReaction(restored, 'likes').likes).toBe(0);
  expect(
    readDemoProposals(proposalStorageKey('army', 'one'), []).items,
  ).toEqual([]);
  expect(
    readDemoProposals(proposalStorageKey('airforce', 'two'), []).items,
  ).toEqual([]);
});
test('rejects invalid submissions and prevents public secret proposals', () => {
  expect(() => normalizeProposalDraft({ ...draft, title: '  ' })).toThrow();
  expect(() => normalizeProposalDraft({ ...draft, email: 'wrong' })).toThrow();
  expect(
    normalizeProposalDraft({ ...draft, securityLevel: '비밀' }).isPublic,
  ).toBe(false);
  expect(createDemoProposal(draft, 'one').id).not.toBe(
    createDemoProposal(draft, 'one').id,
  );
});
test('corrupt storage is recoverable and write failure never reports persistence', () => {
  localStorage.setItem('broken', '{"version":1,"items":[{}]}');
  expect(readDemoProposals('broken', []).error).toBeTruthy();
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  expect(() =>
    saveDemoProposals('x', [createDemoProposal(draft, 'one')]),
  ).toThrow('저장하지 못했습니다');
});
