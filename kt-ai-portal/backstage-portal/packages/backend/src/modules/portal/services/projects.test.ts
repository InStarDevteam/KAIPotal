import {
  canManageProject,
  canTransitionProject,
  closeBlockerMessage,
  memberCanInvite,
  projectVisibleTo,
} from './projects';

describe('프로젝트 상태 전이', () => {
  test.each([
    ['active', 'suspended'],
    ['active', 'closing'],
    ['suspended', 'active'],
    ['suspended', 'closing'],
    ['closing', 'closed'],
    ['closing', 'active'],
  ] as const)('허용: %s → %s', (from, to) => {
    expect(canTransitionProject(from, to)).toBe(true);
  });

  test.each([
    ['active', 'closed'],
    ['closed', 'active'],
    ['closed', 'closing'],
    ['closing', 'suspended'],
    ['suspended', 'closed'],
    ['unknown', 'active'],
    ['active', 'unknown'],
  ] as const)('거부: %s → %s', (from, to) => {
    expect(canTransitionProject(from, to)).toBe(false);
  });

  test('종료(closed) 상태에서는 어떤 전이도 허용하지 않는다', () => {
    for (const status of ['active', 'suspended', 'closing', 'closed']) {
      expect(canTransitionProject('closed', status)).toBe(false);
    }
  });
});

describe('프로젝트 접근 범위', () => {
  const memberProject = { visibility: 'member' };
  const publicProject = { visibility: 'public' };

  test('member 공개범위는 멤버만 볼 수 있다 (비멤버 차단)', () => {
    expect(projectVisibleTo(memberProject, false)).toBe(false);
    expect(projectVisibleTo(memberProject, true)).toBe(true);
  });

  test('public 프로젝트는 비멤버도 조회할 수 있다', () => {
    expect(projectVisibleTo(publicProject, false)).toBe(true);
  });

  test('소유자와 project.approve 권한자만 관리할 수 있다', () => {
    const project = { owner_id: 'owner-1' };
    expect(canManageProject(project, 'owner-1', new Set())).toBe(true);
    expect(canManageProject(project, 'other', new Set(['project.approve']))).toBe(true);
    expect(canManageProject(project, 'other', new Set(['portal.view']))).toBe(false);
  });

  test('초대 권한은 소유자·관리자·manager 역할만 가진다', () => {
    expect(memberCanInvite('manager', false, new Set())).toBe(true);
    expect(memberCanInvite('member', false, new Set())).toBe(false);
    expect(memberCanInvite('viewer', true, new Set())).toBe(true);
    expect(memberCanInvite(undefined, false, new Set(['project.approve']))).toBe(true);
  });
});

describe('프로젝트 종료 차단 사유', () => {
  test('미처리 업무 목록을 한글 사유로 정리한다', () => {
    const message = closeBlockerMessage([
      { kind: 'work_request', id: 'a', title: 'export: 반출 승인 대기' },
      { kind: 'catalog_application', id: 'b', title: '도구 신청 사유' },
    ]);
    expect(message).toContain('미처리 업무 2건');
    expect(message).toContain('반출 승인 대기');
    expect(message).toContain('카탈로그신청');
  });
});
