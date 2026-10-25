import {
  ACTION_TRANSITIONS,
  applicabilityChangeError,
  BASELINE_TRANSITIONS,
  CHANGE_TRANSITIONS,
  computeImplementationRate,
  CONTROL_TRANSITIONS,
  controlVisibleToMember,
  canViewAllKrmf,
  EVAL_TRANSITIONS,
  isBlockedUpload,
  KRMF_PERMISSIONS,
  toCsv,
  transitionError,
  TRR_TRANSITIONS,
  ScopeIdentity,
} from './krmfDomain';

const user = '80ed3015-4b1f-4efa-ab1f-f0f97f88011a';
const projectA = '11111111-1111-1111-1111-111111111111';
const projectB = '22222222-2222-2222-2222-222222222222';

const scoped = (projectIds: string[]): ScopeIdentity => ({
  userId: user,
  canViewAll: false,
  memberProjectIds: new Set(projectIds),
});

describe('이행률 집계 규칙', () => {
  test('적용 통제 0건이면 이행률은 null, 100%로 표시하지 않는다', () => {
    expect(computeImplementationRate(0, 0)).toEqual({
      rate: null,
      label: '등록된 통제 없음',
    });
  });
  test('분모는 적용 통제, 분자는 검토 승인 증적이 있는 통제', () => {
    expect(computeImplementationRate(4, 3)).toEqual({ rate: 75, label: '75%' });
    expect(computeImplementationRate(3, 3)).toEqual({ rate: 100, label: '100%' });
    expect(computeImplementationRate(8, 1)).toEqual({ rate: 12.5, label: '12.5%' });
  });
});

describe('권한 스코프', () => {
  test('krmf.view 보유자만 테넌트 전체 조회 가능', () => {
    expect(canViewAllKrmf(new Set([KRMF_PERMISSIONS.view]))).toBe(true);
    expect(
      canViewAllKrmf(new Set([KRMF_PERMISSIONS.evidenceSubmit])),
    ).toBe(false);
    expect(canViewAllKrmf(new Set())).toBe(false);
  });
  test('일반 사용자는 담당 통제만 조회 가능', () => {
    expect(controlVisibleToMember(user, projectB, scoped([projectA]))).toBe(true);
    expect(controlVisibleToMember(null, projectB, scoped([projectA]))).toBe(false);
  });
  test('프로젝트 멤버는 소속 프로젝트 통제를 조회 가능, 타 프로젝트 통제는 차단', () => {
    expect(controlVisibleToMember(null, projectA, scoped([projectA]))).toBe(true);
    expect(controlVisibleToMember(null, projectB, scoped([projectA]))).toBe(false);
  });
  test('테넌트 공통 기준라인의 비담당 통제는 일반 사용자에게 노출되지 않는다', () => {
    expect(controlVisibleToMember(null, null, scoped([projectA]))).toBe(false);
    expect(controlVisibleToMember(user, null, scoped([projectA]))).toBe(true);
  });
  test('전체 조회 권한자는 범위 필터 없이 조회 가능', () => {
    const allScope: ScopeIdentity = {
      userId: user,
      canViewAll: true,
      memberProjectIds: new Set(),
    };
    expect(controlVisibleToMember(null, projectB, allScope)).toBe(true);
  });
});

describe('상태전이 검증', () => {
  test('통제 상태전이: 정의된 전이만 허용, 동일 상태는 허용', () => {
    expect(
      transitionError('통제', CONTROL_TRANSITIONS, 'not_started', 'in_progress'),
    ).toBeNull();
    expect(
      transitionError('통제', CONTROL_TRANSITIONS, 'verified', 'not_started'),
    ).toContain('변경할 수 없습니다');
    expect(
      transitionError('통제', CONTROL_TRANSITIONS, 'in_progress', 'in_progress'),
    ).toBeNull();
  });
  test('조치 상태전이: open→in_progress→resolved→reconfirmed 순서 강제', () => {
    expect(transitionError('조치', ACTION_TRANSITIONS, 'open', 'in_progress')).toBeNull();
    expect(transitionError('조치', ACTION_TRANSITIONS, 'open', 'resolved')).toContain(
      '변경할 수 없습니다',
    );
    expect(transitionError('조치', ACTION_TRANSITIONS, 'resolved', 'reconfirmed')).toBeNull();
    expect(transitionError('조치', ACTION_TRANSITIONS, 'reconfirmed', 'open')).toContain(
      '변경할 수 없습니다',
    );
  });
  test('기준선·변경·TRR·평가 기록 전이 규칙', () => {
    expect(transitionError('기준선', BASELINE_TRANSITIONS, 'draft', 'active')).toBeNull();
    expect(transitionError('기준선', BASELINE_TRANSITIONS, 'archived', 'active')).toContain(
      '변경할 수 없습니다',
    );
    expect(
      transitionError('변경', CHANGE_TRANSITIONS, 'recorded', 'reassessed'),
    ).toContain('변경할 수 없습니다');
    expect(transitionError('TRR 항목', TRR_TRANSITIONS, 'ready', 'na')).toBeNull();
    expect(transitionError('평가 기록', EVAL_TRANSITIONS, 'closed', 'answered')).toContain(
      '변경할 수 없습니다',
    );
  });
});

describe('적용여부 전환 규칙', () => {
  test('적용→제외·대체 전환은 사유 필수, 사유 있으면 허용', () => {
    expect(applicabilityChangeError('applied', 'excluded', null)).toContain('사유');
    expect(applicabilityChangeError('applied', 'alternative', '  ')).toContain('사유');
    expect(
      applicabilityChangeError('applied', 'excluded', '시스템 미도입'),
    ).toBeNull();
  });
  test('제외→적용, 동일 상태 전환은 사유 없이 허용', () => {
    expect(applicabilityChangeError('excluded', 'applied', null)).toBeNull();
    expect(applicabilityChangeError('applied', 'applied', null)).toBeNull();
  });
});

describe('증적 업로드 차단 규칙', () => {
  test.each([
    ['report.exe', 'application/octet-stream'],
    ['run.bat', 'text/plain'],
    ['script.ps1', 'text/plain'],
    ['installer.msi', 'application/octet-stream'],
    ['file.pdf', 'application/x-msdownload'],
    ['notes.txt', 'application/x-msdos-program'],
  ])('위험 실행 형식 차단: %s (%s)', (name, mime) =>
    expect(isBlockedUpload(name, mime)).toBe(true),
  );
  test.each([
    ['evidence.pdf', 'application/pdf'],
    ['screenshot.png', 'image/png'],
    ['config.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['noextension', 'text/plain'],
  ])('일반 형식 허용: %s (%s)', (name, mime) =>
    expect(isBlockedUpload(name, mime)).toBe(false),
  );
});

describe('CSV 출력', () => {
  test('BOM 접두와 쉼표·따옴표 이스케이프', () => {
    const csv = toCsv(
      ['코드', '제목'],
      [
        ['AC-1', '보안, 정책'],
        ['AC-2', '인용 "문구"'],
        ['AC-3', null],
      ],
    );
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"보안, 정책"');
    expect(csv).toContain('"인용 ""문구"""');
    expect(csv.split('\r\n')[3]).toBe('AC-3,');
  });
});
