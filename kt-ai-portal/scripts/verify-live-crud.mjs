// 라이브 사이트 주요 CRUD 검증: 제안 등록/삭제, 카탈로그 직접요청, 반출 승인, 마이페이지 프로필 저장.
// 데모 모드(브라우저 저장소) 기준: 저장 → 새로고침 복원까지 확인한다.
import { createRequire } from 'node:module';

const require = createRequire(
  new URL('../backstage-portal/package.json', import.meta.url),
);
const { chromium } = require('@playwright/test');

const BASE = process.env.LIVE_BASE_URL || 'https://kai-platform-d0ae0.web.app';
const CODE = process.env.PREVIEW_ACCESS_CODE || 'ictway';
const STAMP = `crud${Date.now().toString(36)}`;

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

let browser;
let page;
const pageErrors = [];

async function login(role) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  page = await context.newPage();
  page.on('pageerror', e => pageErrors.push(String(e)));
  const url = role ? `${BASE}/?captureRole=${role}` : BASE;
  await page.goto(url, { waitUntil: 'networkidle' });
  const codeInput = page.locator('input[aria-label="접근코드"]');
  if (await codeInput.count()) {
    await codeInput.fill(CODE);
    await page.getByRole('button', { name: /메인으로 입장/ }).first().click();
    await page.waitForLoadState('networkidle');
  }
}

try {
  browser = await chromium.launch({ headless: true });

  // ── 1. 홈: 포털 업무 버튼 ─────────────────────────────
  await login();
  const workBtn = page.locator('.home-work-button');
  check('홈 포털 업무 버튼 표시', (await workBtn.count()) === 1);
  await workBtn.click();
  await page.waitForTimeout(400);
  await page.getByTestId('portal-work').waitFor();
  check('포털 업무 첫화면으로 바로 진입', new URL(page.url()).pathname === '/portal-work');
  check('업무 팝업 없이 화면 표시', (await page.getByRole('dialog').count()) === 0);

  // ── 2. 제안 게시판: 등록 → 복원 → 삭제 ────────────────
  await page.goto(`${BASE}/proposal-board`, { waitUntil: 'networkidle' });
  const title = `E2E제안-${STAMP}`;
  const fillField = async (label, value) => {
    await page.getByLabel(label, { exact: false }).first().fill(value);
  };
  await fillField('제안 제목', title);
  await fillField('제안자', 'E2E테스터');
  await fillField('필요성', 'E2E 자동 검증으로 등록합니다.');
  await page.getByText('개인정보 동의', { exact: false }).first().click();
  await page.getByRole('button', { name: '등록', exact: true }).click();
  await page.waitForTimeout(600);
  await page.goto(`${BASE}/proposal-board`, { waitUntil: 'networkidle' });
  const proposalRow = page.locator('tr', { hasText: title });
  const proposalPersisted = (await proposalRow.count()) >= 1;
  check('제안 등록 후 새로고침 유지', proposalPersisted, title);
  if (proposalPersisted) {
    await proposalRow.first().locator('td').first().click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: '내 제안 삭제' }).click();
    await page.waitForTimeout(300);
    const confirmBtn = page
      .locator('[role="dialog"] button')
      .filter({ hasText: /삭제/ })
      .last();
    if (await confirmBtn.count()) await confirmBtn.click();
    await page.waitForTimeout(500);
    await page.reload({ waitUntil: 'networkidle' });
    check(
      '제안 삭제 후 새로고침 시 미노출',
      (await page.locator('tr', { hasText: title }).count()) === 0,
    );
  }

  // ── 3. 서비스 카탈로그: 직접 입력 요청 ────────────────
  await page.goto(`${BASE}/service-catalog`, { waitUntil: 'networkidle' });
  const toolName = `E2E도구-${STAMP}`;
  const directTab = page.getByRole('tab', { name: /직접 입력/ }).first();
  if (await directTab.count()) await directTab.click();
  await page.waitForTimeout(500);
  const nameField = page.getByRole('textbox').nth(1); // 0: 헤더 통합검색어, 1: 요청 도구명
  await nameField.fill(toolName);
  await page.getByRole('textbox').nth(6).fill('E2E 목적'); // 사용 목적(필수)
  await page.getByRole('button', { name: '요청 저장' }).click();
  await page.waitForTimeout(600);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: /직접 입력/ }).first().click();
  await page.waitForTimeout(400);
  check(
    '카탈로그 직접요청 새로고침 유지',
    (await page.locator(`text=${toolName}`).count()) >= 1,
    toolName,
  );

  // ── 4. 반출 승인: 관리자 역할로 승인 결정 유지 ─────────
  await login('portal-admin');
  await page.goto(`${BASE}/export-approval`, { waitUntil: 'networkidle' });
  // 검토 가능한 행을 찾아 선택한 뒤 승인
  const rowCount = await page.locator('tbody tr').count();
  let approvedRowName = '';
  for (let i = 0; i < rowCount; i++) {
    const row = page.locator('tbody tr').nth(i);
    await row.click();
    await page.waitForTimeout(250);
    const approveBtn = page.getByRole('button', { name: '승인', exact: true });
    if ((await approveBtn.count()) && !(await approveBtn.isDisabled())) {
      approvedRowName = ((await row.innerText()).split(/[\n\t]/)[0] || '').trim();
      await approveBtn.click();
      await page.waitForTimeout(300);
      await page
        .locator('[role="dialog"] button')
        .filter({ hasText: '확인' })
        .last()
        .click();
      await page.waitForTimeout(500);
      break;
    }
  }
  check('반출 승인 실행(검토 가능 행)', approvedRowName !== '', approvedRowName);
  if (approvedRowName) {
    await page.reload({ waitUntil: 'networkidle' });
    const decidedRow = page.locator('tbody tr', { hasText: approvedRowName }).first();
    await decidedRow.click();
    await page.waitForTimeout(300);
    const blockedNotice = await page
      .locator('text=에서는 승인·반려할 수 없습니다')
      .count();
    check('반출 승인 결정 새로고침 유지', blockedNotice >= 1);
  }

  // ── 5. 마이페이지: 프로필 저장 → 복원 ─────────────────
  await login();
  await page.goto(`${BASE}/my-page`, { waitUntil: 'networkidle' });
  const phoneInput = page.getByRole('textbox').nth(4); // 0: 헤더 검색어, 1 ID, 2 이름, 3 이메일, 4 연락처
  const phoneValue = `010-9999-${STAMP.slice(-4)}`;
  await phoneInput.fill(phoneValue);
  await page.getByRole('button', { name: '프로필 저장' }).click();
  await page.waitForTimeout(600);
  await page.reload({ waitUntil: 'networkidle' });
  const kept = (await page.getByRole('textbox').nth(4).inputValue()) === phoneValue;
  check(
    '마이페이지 프로필 저장 새로고침 유지',
    kept,
    `expected=${phoneValue} actual=${await page.getByRole('textbox').nth(4).inputValue()}`,
  );

  check(
    '전체 JS 런타임 예외 없음',
    pageErrors.length === 0,
    pageErrors.slice(0, 2).join(' | '),
  );
} finally {
  await browser?.close();
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
