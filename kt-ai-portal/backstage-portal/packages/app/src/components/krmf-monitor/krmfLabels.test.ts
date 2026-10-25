import {
  ACTION_STATUS_FLOW,
  ACTION_STATUS_LABELS,
  APPLICABILITY_LABELS,
  CONTROL_STATUS_LABELS,
  REVIEW_STATUS_LABELS,
  TRR_STATUS_LABELS,
  actionStatusLabel,
  applicabilityLabel,
  controlStatusLabel,
  formatDate,
  implementationRateLabel,
  isOverdue,
  normalizeRecentChanges,
  reviewStatusLabel,
  trrEvidenceReadyLabel,
  trrStatusLabel,
} from './krmfLabels';

describe('krmf 상태 라벨 유틸', () => {
  it('적용성 라벨은 applied/excluded/alternative를 한글로 변환한다', () => {
    expect(applicabilityLabel('applied')).toBe('적용');
    expect(applicabilityLabel('excluded')).toBe('제외');
    expect(applicabilityLabel('alternative')).toBe('대체');
    expect(applicabilityLabel(undefined)).toBe('미지정');
    expect(applicabilityLabel('unknown')).toBe('미지정');
    expect(Object.keys(APPLICABILITY_LABELS)).toHaveLength(3);
  });

  it('통제 상태 라벨은 백엔드 상태값만 매핑하고 나머지는 원문을 유지한다', () => {
    expect(controlStatusLabel('not_started')).toBe('이행 전');
    expect(controlStatusLabel('in_progress')).toBe('이행 중');
    expect(controlStatusLabel('evidence_submitted')).toBe('증적 제출');
    expect(controlStatusLabel('verified')).toBe('검증 완료');
    expect(controlStatusLabel('custom_state')).toBe('custom_state');
    expect(controlStatusLabel(undefined)).toBe('미지정');
    expect(Object.keys(CONTROL_STATUS_LABELS)).toHaveLength(4);
  });

  it('증적 검토 상태 라벨은 pending/approved/rejected를 변환한다', () => {
    expect(reviewStatusLabel('pending')).toBe('검토대기');
    expect(reviewStatusLabel('approved')).toBe('승인');
    expect(reviewStatusLabel('rejected')).toBe('반려');
    expect(Object.keys(REVIEW_STATUS_LABELS)).toHaveLength(3);
  });

  it('조치 상태 라벨과 전이 순서가 open→in_progress→resolved→reconfirmed다', () => {
    expect(actionStatusLabel('open')).toBe('등록');
    expect(actionStatusLabel('in_progress')).toBe('진행 중');
    expect(actionStatusLabel('resolved')).toBe('조치 완료');
    expect(actionStatusLabel('reconfirmed')).toBe('재확인 완료');
    expect(ACTION_STATUS_FLOW).toEqual([
      'open',
      'in_progress',
      'resolved',
      'reconfirmed',
    ]);
    expect(Object.keys(ACTION_STATUS_LABELS)).toHaveLength(4);
  });

  it('TRR 준비 상태와 증적 준비 여부 라벨을 변환한다', () => {
    expect(trrStatusLabel('not_ready')).toBe('미준비');
    expect(trrStatusLabel('ready')).toBe('준비 완료');
    expect(trrStatusLabel('na')).toBe('해당 없음');
    expect(trrStatusLabel('etc')).toBe('etc');
    expect(Object.keys(TRR_STATUS_LABELS)).toHaveLength(3);
    expect(trrEvidenceReadyLabel(true)).toBe('준비 완료');
    expect(trrEvidenceReadyLabel(false)).toBe('미준비');
    expect(trrEvidenceReadyLabel(undefined)).toBe('미준비');
  });
});

describe('krmf 날짜·기한 유틸', () => {
  it('formatDate는 날짜를 YYYY-MM-DD로 변환하고 빈 값은 —를 반환한다', () => {
    expect(formatDate('2026-09-29T10:00:00+09:00')).toBe('2026-09-29');
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  it('isOverdue는 기한이 지난 경우만 true다', () => {
    const now = Date.parse('2026-09-29T00:00:00Z');
    expect(isOverdue('2026-09-28T12:00:00Z', now)).toBe(true);
    expect(isOverdue('2026-09-29T12:00:00Z', now)).toBe(false);
    expect(isOverdue(null, now)).toBe(false);
    expect(isOverdue('invalid', now)).toBe(false);
  });
});

describe('krmf 개요 파싱 유틸', () => {
  it('통제 0건이면 이행률 대신 등록된 통제 없음을 표시한다', () => {
    expect(
      implementationRateLabel({ total_controls: 0, rate_label: '0%' }),
    ).toBe('등록된 통제 없음');
    expect(
      implementationRateLabel({ total_controls: 12, rate_label: '75%' }),
    ).toBe('75%');
  });

  it('recent_changes는 배열이 아니면 빈 목록으로 정규화한다', () => {
    expect(normalizeRecentChanges(undefined)).toEqual([]);
    expect(normalizeRecentChanges(null)).toEqual([]);
    expect(normalizeRecentChanges('x')).toEqual([]);
    expect(normalizeRecentChanges({})).toEqual([]);
  });

  it('recent_changes 항목은 제목과 일시를 추출하고 id를 보존한다', () => {
    const views = normalizeRecentChanges([
      {
        id: 'chg-1',
        title: '방화벽 정책 변경',
        occurred_at: '2026-09-20T09:00:00+09:00',
      },
      { summary: '서버 패치', created_at: '2026-09-21T09:00:00+09:00' },
      { description: '계정 정리' },
    ]);
    expect(views).toHaveLength(3);
    expect(views[0]).toEqual({
      id: 'chg-1',
      label: '방화벽 정책 변경',
      at: '2026-09-20T09:00:00+09:00',
    });
    expect(views[1].label).toBe('서버 패치');
    expect(views[1].at).toBe('2026-09-21T09:00:00+09:00');
    expect(views[2].label).toBe('계정 정리');
    expect(views[2].at).toBe('');
    expect(views[2].id).toBe('recent-change-2');
  });
});
