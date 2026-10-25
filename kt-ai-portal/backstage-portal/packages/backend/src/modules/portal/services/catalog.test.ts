import {
  canDecideApplication,
  catalogUrlValid,
  LEDGER_REF_TYPE,
} from './catalog';

describe('카탈로그 링크 검증', () => {
  test('http(s) 링크만 허용한다', () => {
    expect(catalogUrlValid('https://tool.example.com')).toBe(true);
    expect(catalogUrlValid(null)).toBe(true);
    expect(catalogUrlValid('')).toBe(true);
  });

  test.each([
    // eslint-disable-next-line no-script-url -- malicious input rejection fixture; never executed
    'javascript:alert(1)',
    'file:///etc/passwd',
    '//example.com',
    'https://user:pass@example.org',
    'https://example.org/\nfoo',
  ])('거부: %s', value => expect(catalogUrlValid(value)).toBe(false));
});

describe('카탈로그 신청 결정 권한', () => {
  test('workspace.approve 또는 project.approve 권한이 있어야 결정할 수 있다', () => {
    expect(canDecideApplication(new Set(['workspace.approve']))).toBe(true);
    expect(canDecideApplication(new Set(['project.approve']))).toBe(true);
    expect(canDecideApplication(new Set(['portal.view']))).toBe(false);
    expect(canDecideApplication(new Set())).toBe(false);
  });
});

describe('공통 원장 중복 생성 방지', () => {
  test('원장 참조 유형은 고정 문자열이며 외부 입력과 섞이지 않는다', () => {
    expect(LEDGER_REF_TYPE).toBe('catalog_application');
  });
});
