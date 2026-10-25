// 라이브 사이트(https://kai-platform-d0ae0.web.app) 기본 동작 스모크 검증.
// 접근코드 로그인 → 새 포털 홈 렌더 → journey bar 비노출 → 주요 진입점 확인.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(
  new URL('../backstage-portal/package.json', import.meta.url),
);
const { chromium } = require('@playwright/test');

const BASE = process.env.LIVE_BASE_URL || 'https://kai-platform-d0ae0.web.app';
const CODE = process.env.PREVIEW_ACCESS_CODE || 'ictway';

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error)));

  await page.goto(BASE, { waitUntil: 'networkidle' });

  // 1. 접근코드 입력
  const codeInput = page.locator('input[aria-label="접근코드"]');
  check('접근코드 입력란 표시', await codeInput.count() === 1);
  await codeInput.fill(CODE);
  // 데모/협의 프로필에서는 시안 선택 버튼이 표시된다. 첫 번째 시안으로 입장.
  const designEntry = page.getByRole('button', {
    name: /메인으로 입장/,
  });
  check('시안 선택 버튼 표시', (await designEntry.count()) >= 1);
  await designEntry.first().click();
  await page.waitForURL(url => !url.pathname.includes('login'), {
    timeout: 15000,
  }).catch(() => {});
  await page.waitForLoadState('networkidle');

  // 2. 로그인 후 홈 렌더
  const bodyText = await page.locator('body').innerText();
  check(
    '로그인 후 홈 렌더',
    !bodyText.includes('접근코드가 일치하지 않습니다'),
    `url=${page.url()}`,
  );
  check(
    '플랫폼 진입 홈(AI/데이터/클우드)',
    /AI/.test(bodyText) && /데이터|DATA/i.test(bodyText),
  );

  // 3. journey bar 비노출
  const journeyVisible = await page
    .locator('text=플랫폼 이용 단계')
    .count()
    .catch(() => 0);
  check('글로벌 업무여정(플랫폼 이용 단계) 비노출', journeyVisible === 0);

  // 4. 상단 앱 런처 존재
  const launcher = await page
    .getByRole('button', { name: /모든 앱|앱|launcher/i })
    .count()
    .catch(() => 0);
  check(
    '앱 런처 버튼 존재',
    launcher >= 1,
    `matched=${launcher}`,
  );

  // 5. 낮은 수준의 JS 런타임 예외 없음
  check(
    '페이지 JS 런타임 예외 없음',
    pageErrors.length === 0,
    pageErrors.slice(0, 2).join(' | '),
  );

  await page.screenshot({ path: 'docs/portal-experience/evidence/live-home.png', fullPage: false });
} finally {
  await browser?.close();
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
