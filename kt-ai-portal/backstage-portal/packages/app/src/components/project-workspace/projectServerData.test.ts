import {
  PROJECT_MEMBER_ROLE_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_VISIBILITY_LABELS,
  formatServerDate,
  formatServerDateTime,
  isValidUserId,
  mapServerProjectDetail,
  mapServerProjectSummary,
  parseCloseBlockers,
} from './projectServerData';

const projectRow = {
  id: 'b1f2a3c4-0000-4000-8000-000000000001',
  tenant_id: 'army',
  name: '정비이력 분석',
  description: '설명',
  purpose: '목적',
  status: 'active',
  owner_id: 'user-1',
  start_at: '2026-10-01T00:00:00.000Z',
  end_at: '2026-12-31T00:00:00.000Z',
  visibility: 'public',
  version: 3,
  created_at: '2026-09-01T09:00:00.000Z',
  my_role: 'manager',
  is_member: true,
};

test('maps list rows to summaries with Korean labels and dates without raw value leakage', () => {
  const summary = mapServerProjectSummary(projectRow);
  expect(summary).toMatchObject({
    id: projectRow.id,
    name: '정비이력 분석',
    status: 'active',
    statusLabel: '진행 중',
    visibilityLabel: '전체 공개',
    startAt: '2026-10-01',
    endAt: '2026-12-31',
    version: 3,
    myRole: 'manager',
    isMember: true,
  });
  expect(formatServerDate('')).toBe('');
  expect(formatServerDate('not-a-date')).toBe('');
  expect(formatServerDateTime(projectRow.created_at)).toContain('2026');
});

test('maps unknown status and visibility to their raw values instead of inventing labels', () => {
  const summary = mapServerProjectSummary({
    ...projectRow,
    status: 'paused',
    visibility: 'hidden',
  });
  expect(summary.statusLabel).toBe('paused');
  expect(summary.visibilityLabel).toBe('hidden');
  expect(PROJECT_STATUS_LABELS.closed).toBe('종료 완료');
  expect(PROJECT_MEMBER_ROLE_LABELS.viewer).toBe('뷰어');
  expect(PROJECT_VISIBILITY_LABELS.member).toBe('멤버 공개');
});

test('maps detail bundle members and invites with role and invite status labels', () => {
  const detail = mapServerProjectDetail({
    project: projectRow,
    members: [
      {
        user_id: 'user-1',
        role: 'manager',
        joined_at: '2026-09-01T09:00:00.000Z',
        display_name: '김철수',
      },
    ],
    invites: [
      {
        id: 'invite-1',
        invitee_id: 'user-2',
        role: 'viewer',
        status: 'invited',
        invited_at: '2026-09-10T09:00:00.000Z',
      },
    ],
  });
  expect(detail.project.name).toBe('정비이력 분석');
  expect(detail.members[0]).toMatchObject({
    userId: 'user-1',
    displayName: '김철수',
    roleLabel: '관리자',
    joinedAt: '2026-09-01',
  });
  expect(detail.invites[0]).toMatchObject({
    inviteeId: 'user-2',
    roleLabel: '뷰어',
    statusLabel: '초대 대기',
  });
});

test('extracts close blocker item list from the server close_blocked message', () => {
  const message =
    '종료할 수 없습니다. 미처리 업무 2건이 있습니다: [업무신청] workspace: 정비 환경 신청; [카탈로그신청] GPU 분석 도구 사용';
  expect(parseCloseBlockers(message)).toEqual([
    '[업무신청] workspace: 정비 환경 신청',
    '[카탈로그신청] GPU 분석 도구 사용',
  ]);
  expect(parseCloseBlockers('버전이 충돌했습니다.')).toEqual([]);
});

test('validates member and invitee identifiers as UUIDs like the server does', () => {
  expect(isValidUserId(projectRow.id)).toBe(true);
  expect(isValidUserId('FP-001')).toBe(false);
  expect(isValidUserId('')).toBe(false);
});
