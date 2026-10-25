import {
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_TYPE_LABELS,
  PROPOSAL_VISIBILITY_LABELS,
  REVIEW_DECISION_LABELS,
  formatProposalDate,
  mapServerProposalDetail,
  mapServerProposalSummary,
} from './proposalServerData';

const listRow = {
  id: '3f6f9a20-0000-4000-8000-0000000000aa',
  type: 'feature',
  title: '장비 고장예측 모델 제안',
  visibility: 'tenant',
  status: 'submitted',
  author_id: 'user-1',
  view_count: 12,
  version: 1,
  created_at: '2026-09-20T01:00:00.000Z',
  updated_at: '2026-09-20T01:00:00.000Z',
  sympathy_count: 4,
};

test('maps list rows with Korean type, status and visibility labels', () => {
  const summary = mapServerProposalSummary(listRow);
  expect(summary).toMatchObject({
    id: listRow.id,
    title: '장비 고장예측 모델 제안',
    typeLabel: '기능 제안',
    statusLabel: '등록',
    visibilityLabel: '소속 공개',
    sympathyCount: 4,
    viewCount: 12,
    authorId: 'user-1',
  });
  expect(formatProposalDate(summary.createdAt)).toBe('2026-09-20');
});

test('maps every known type, status, visibility and review decision to a label', () => {
  expect(Object.keys(PROPOSAL_TYPE_LABELS)).toHaveLength(4);
  expect(Object.keys(PROPOSAL_STATUS_LABELS)).toHaveLength(4);
  expect(Object.keys(PROPOSAL_VISIBILITY_LABELS)).toHaveLength(3);
  expect(Object.keys(REVIEW_DECISION_LABELS)).toHaveLength(3);
  expect(PROPOSAL_VISIBILITY_LABELS.private).toContain('본인·관리자');
  expect(REVIEW_DECISION_LABELS.supplement).toBe('보완 요청');
  const unknown = mapServerProposalSummary({ ...listRow, type: 'etc' });
  expect(unknown.typeLabel).toBe('etc');
});

test('maps detail bundle with sympathy state and review list', () => {
  const detail = mapServerProposalDetail({
    proposal: {
      ...listRow,
      necessity: '필요성 내용',
      utilization_plan: '활용 계획',
      attachment_uri: 'https://example.com/doc',
    },
    sympathyCount: 7,
    mySympathy: true,
    reviews: [
      {
        id: 'review-1',
        reviewer_id: 'admin-1',
        decision: 'answer',
        body: '답변 내용',
        created_at: '2026-09-21T01:00:00.000Z',
      },
      {
        id: 'review-2',
        reviewer_id: 'admin-1',
        decision: 'supplement',
        body: '보완 요청 내용',
        created_at: '2026-09-22T01:00:00.000Z',
      },
    ],
  });
  expect(detail).toMatchObject({
    necessity: '필요성 내용',
    utilizationPlan: '활용 계획',
    attachmentUri: 'https://example.com/doc',
    sympathyCount: 7,
    mySympathy: true,
    viewCount: 12,
  });
  expect(detail.reviews).toHaveLength(2);
  expect(detail.reviews[0]).toMatchObject({
    decisionLabel: '답변',
    body: '답변 내용',
  });
  expect(detail.reviews[1].decisionLabel).toBe('보완 요청');
});
