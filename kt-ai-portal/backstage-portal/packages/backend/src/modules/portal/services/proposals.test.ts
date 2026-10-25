import {
  hasBlockingReview,
  isUniqueViolation,
  planSympathyAction,
  proposalReadable,
  reviewDecisionToStatus,
  safeHttpUrl,
} from './proposals';

describe('첨부 링크 SSRF 방어', () => {
  test.each([
    'https://docs.example.com/attachment.pdf',
    'http://intranet.example/report',
  ])('허용: %s', value => expect(safeHttpUrl(value)).toBe(true));

  test.each([
    // eslint-disable-next-line no-script-url -- malicious input rejection fixture; never executed
    'javascript:alert(1)',
    // eslint-disable-next-line no-script-url -- 악성 입력 거부 검증용
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'ftp://example.com/f',
    '//example.com/path',
    'https://user:secret@example.org',
    'https://example.org/\nfoo',
    'not a url',
    'https://example.org/<>',
  ])('거부: %s', value => expect(safeHttpUrl(value)).toBe(false));

  test('빈 값은 선택 입력이므로 허용한다', () => {
    expect(safeHttpUrl('')).toBe(true);
    expect(safeHttpUrl(null)).toBe(true);
  });
});

describe('공감 중복 방지', () => {
  test('이미 공감한 경우 삭제(취소), 아니면 추가를 계획한다', () => {
    expect(planSympathyAction(true)).toBe('delete');
    expect(planSympathyAction(false)).toBe('insert');
  });

  test('PostgreSQL unique 위반(23505)만 충돌로 인식한다', () => {
    const uniqueError = Object.assign(new Error('duplicate key'), {
      code: '23505',
    });
    const otherError = Object.assign(new Error('connection lost'), {
      code: '08006',
    });
    expect(isUniqueViolation(uniqueError)).toBe(true);
    expect(isUniqueViolation(otherError)).toBe(false);
    expect(isUniqueViolation(new Error('plain'))).toBe(false);
    expect(isUniqueViolation('23505')).toBe(false);
  });
});

describe('검토 결정에 따른 제안 상태', () => {
  test.each([
    ['answer', 'answered'],
    ['notice', 'notice'],
    ['supplement', 'under_review'],
  ] as const)('%s → %s', (decision, status) => {
    expect(reviewDecisionToStatus(decision)).toBe(status);
  });

  test('알 수 없는 결정은 null을 반환한다', () => {
    expect(reviewDecisionToStatus('approve')).toBeNull();
  });
});

describe('답변 후 수정 제한', () => {
  test('answer·notice 답변이 있으면 수정이 차단된다', () => {
    expect(hasBlockingReview([{ decision: 'supplement' }])).toBe(false);
    expect(
      hasBlockingReview([
        { decision: 'supplement' },
        { decision: 'answer' },
      ]),
    ).toBe(true);
    expect(hasBlockingReview([{ decision: 'notice' }])).toBe(true);
    expect(hasBlockingReview([])).toBe(false);
  });
});

describe('제안 공개범위', () => {
  const privateProposal = { visibility: 'private', author_id: 'author-1' };

  test('private 제안은 작성자와 관리자만 읽는다', () => {
    expect(proposalReadable(privateProposal, 'author-1', false)).toBe(true);
    expect(proposalReadable(privateProposal, 'admin-1', true)).toBe(true);
    expect(proposalReadable(privateProposal, 'other', false)).toBe(false);
    expect(proposalReadable(privateProposal, 'other', true)).toBe(true);
  });

  test('private가 아니면 테넌트 멤버 누구나 읽는다', () => {
    const tenantProposal = { visibility: 'tenant', author_id: 'author-1' };
    expect(proposalReadable(tenantProposal, 'other', false)).toBe(true);
  });
});
