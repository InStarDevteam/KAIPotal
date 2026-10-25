/**
 * 제안서용 프로덕션 캡처 스크립트 (배포본 대상)
 *
 * 실행 방법 (저장소 루트 기준):
 *   cd kt-ai-portal
 *   ACCESS_CODE=<접근코드> node scripts/capture-proposal-screenshots-prod.js
 *
 * 환경변수:
 *   ACCESS_CODE        (필수) 접근코드 게이트 통과용 코드. 없으면 즉시 종료.
 *   BASE_URL           (선택) 기본 https://kai-platform-d0ae0.web.app
 *   CAPTURE_OUT_DIR    (선택) 캡처 저장 디렉터리. 기본 ../docs/assets/final (스크립트 기준)
 *   CAPTURE_FULL_PAGE  (선택) 'false'면 fullPage 캡처 비활성화. 기본 true
 *
 * playwright는 backstage-portal/node_modules 에 설치되어 있어야 한다.
 */

const { createRequire } = require('module');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 스크립트 위치와 무관하게 backstage-portal 기준으로 playwright를 해석한다.
const portalRequire = createRequire(path.resolve(__dirname, '../backstage-portal/package.json'));
const { chromium } = portalRequire('playwright');

const BASE_URL = process.env.BASE_URL || 'https://kai-platform-d0ae0.web.app';
const OUT_DIR = process.env.CAPTURE_OUT_DIR
  ? path.resolve(process.env.CAPTURE_OUT_DIR)
  : path.resolve(__dirname, '../docs/assets/final');
const FULL_PAGE = (process.env.CAPTURE_FULL_PAGE || 'true').toLowerCase() !== 'false';

const ACCESS_CODE = process.env.ACCESS_CODE;
if (!ACCESS_CODE) {
  console.error('[FATAL] ACCESS_CODE 환경변수가 필요합니다. 예: ACCESS_CODE=<코드> node scripts/capture-proposal-screenshots-prod.js');
  process.exit(1);
}

const ROLE_OVERRIDE_KEY = '__kt_ai_portal_role_override__';
const ADMIN_PREVIEW_KEY = '__kt_ai_portal_admin_preview__';
const PORTAL_SHELL = '[data-testid="portal-shell"]';
const PORTAL_READY_TIMEOUT = 30000;

// 로그인/권한 실패 화면에서 나타나는 텍스트 — 캡처 전에 반드시 부재해야 한다.
const FORBIDDEN_TEXTS = [
  'Enter as a Guest User',
  '접근 권한이 필요합니다',
  '접근 권한이 없습니다',
  '접근코드',
];

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// 신규 캡처 대상 (역할 전환 패널 기반)
// ---------------------------------------------------------------------------
const NEW_CAPTURES = [
  { name: '01-portal-dashboard-user.png', route: '/', role: 'general-user', captureId: 'portal-dashboard' },
  {
    name: '02-role-menu-user.png',
    route: '/',
    role: 'general-user',
    captureId: 'portal-dashboard',
    prepare: hideMainContentForMenuCapture,
  },
  { name: '03-portal-dashboard-admin.png', route: '/', role: 'portal-admin', captureId: 'portal-dashboard' },
  {
    name: '04-role-menu-admin.png',
    route: '/',
    role: 'portal-admin',
    captureId: 'portal-dashboard',
    prepare: hideMainContentForMenuCapture,
  },
  {
    name: '05-role-menu-comparison.png',
    route: '/role-menu-preview',
    role: 'portal-admin',
    captureId: 'role-menu-preview',
    prepare: async (page) => {
      // 역할 Select를 '포털 관리자'로 변경 후 '일반 사용자와 비교' 토글 활성화
      try {
        const roleSelect = page.locator('[data-capture-id="role-menu-preview"] .MuiSelect-root').first();
        if (await roleSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
          await roleSelect.click();
          await page.waitForTimeout(600);
          const option = page.locator('li:has-text("포털 관리자")').first();
          if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
            await option.click();
            await page.waitForTimeout(600);
          } else {
            await page.keyboard.press('Escape');
            console.warn('  [warn] 역할 옵션(포털 관리자)을 찾지 못했습니다.');
          }
        }
        const switchInput = page.locator('.MuiSwitch-input').first();
        if (await switchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          await switchInput.click({ force: true });
          await page.waitForTimeout(800);
        } else if (await page.getByText('일반 사용자와 비교').first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await page.getByText('일반 사용자와 비교').first().click();
          await page.waitForTimeout(800);
        } else {
          console.warn('  [warn] 비교 토글을 찾지 못했습니다. 기본 화면으로 진행합니다.');
        }
      } catch (e) {
        console.warn(`  [warn] 비교 모드 준비 실패: ${e.message}`);
      }
    },
    // 비교 영역이 있으면 해당 영역만 캡처
    elementSelector: '[data-testid="role-menu-comparison"]',
  },
  { name: '06-krmf-dashboard.png', route: '/krmf-evidence', role: 'security-manager', captureId: 'krmf-evidence' },
  {
    name: '07-krmf-control-evidence.png',
    route: '/krmf-evidence',
    role: 'security-manager',
    captureId: 'krmf-evidence',
    tabPattern: /통제항목/,
  },
  {
    name: '08-krmf-assessment.png',
    route: '/krmf-evidence',
    role: 'security-manager',
    captureId: 'krmf-evidence',
    tabPattern: /평가·인가 지원/,
  },
  {
    name: '09-krmf-operation-change.png',
    route: '/krmf-evidence',
    role: 'security-manager',
    captureId: 'krmf-evidence',
    tabPattern: /운영전환·변경관리/,
  },
  {
    name: '10-pilot-synthetic-data.png',
    route: '/project-workspace',
    role: 'project-manager',
    captureId: 'project-workspace',
    tabPattern: /실증·데이터 준비/,
  },
];

// ---------------------------------------------------------------------------
// 레거시 캡처 대상 (기존 파일명/라우트 유지 — docs 참조 보존)
// ---------------------------------------------------------------------------
const LEGACY_CAPTURES = [
  { name: '01-portal-dashboard.png', route: '/', role: null, captureId: 'portal-dashboard' },
  { name: '02-integrated-search.png', route: '/integrated-search', role: null, captureId: 'integrated-search' },
  { name: '03-project-workspace.png', route: '/project-workspace', role: null, captureId: 'project-workspace' },
  { name: '04-export-approval.png', route: '/export-approval', role: null, captureId: 'export-approval' },
  { name: '05-credit-manager.png', route: '/credit-manager', role: null, captureId: 'credit-manager' },
  { name: '06-krmf-evidence.png', route: '/krmf-evidence', role: 'security-manager', captureId: 'krmf-evidence', tabPattern: /증빙자료/ },
  { name: '07-admin-console-user-management.png', route: '/admin-console', role: 'portal-admin', captureId: 'admin-console', tabPattern: /사용자 관리/ },
  { name: '08-admin-console-rbac-menu.png', route: '/admin-console', role: 'portal-admin', captureId: 'admin-console', tabPattern: /권한\/역할/ },
  { name: '09-admin-console-policy-audit.png', route: '/admin-console', role: 'portal-admin', captureId: 'admin-console', tabPattern: /감사 로그/ },
  { name: '09-admin-console-platform-ops-tools.png', route: '/admin-console', role: 'portal-admin', captureId: 'admin-console', tabPattern: /플랫폼 운영도구/ },
  { name: '10-service-catalog.png', route: '/service-catalog', role: null, captureId: 'service-catalog' },
  { name: '11-proposal-board.png', route: '/proposal-board', role: null, captureId: 'proposal-board' },
  { name: '12-my-page.png', route: '/my-page', role: null, captureId: 'my-page' },
  { name: '13-environment-settings.png', route: '/environment-settings', role: 'portal-admin', captureId: 'environment-settings' },
  { name: '14-tenant-management.png', route: '/tenant-management', role: 'portal-admin', captureId: 'tenant-management' },
  { name: '17-requirement-coverage.png', route: '/requirement-coverage', role: 'portal-admin', captureId: 'requirement-coverage' },
  { name: '18-platform-api-integration.png', route: '/platform-api-integration', role: 'portal-admin', captureId: 'platform-api-integration' },
  { name: '19-workflow-scenarios.png', route: '/workflow-scenarios', role: 'portal-admin', captureId: 'workflow-scenarios' },
];

// ---------------------------------------------------------------------------
// 로그인 / 검증 유틸
// ---------------------------------------------------------------------------
async function login(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1000);

  // 1) 접근코드 게이트
  const codeInput = page.locator('input[type="password"]').first();
  if (await codeInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await codeInput.fill(ACCESS_CODE);
    await page.locator('button:has-text("접근코드로 입장")').first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);
  }

  // 2) Backstage Guest 카드 ENTER (Failed to sign in alert는 dialog 핸들러가 accept)
  const guestEnter = page.locator('button:has-text("ENTER")').first();
  if (await guestEnter.isVisible({ timeout: 8000 }).catch(() => false)) {
    await guestEnter.click();
  }

  // 3) 포털 셸 대기 — 실패하면 여기서 예외
  await page.waitForSelector(PORTAL_SHELL, { timeout: PORTAL_READY_TIMEOUT });
}

/**
 * 포털이 정상 렌더됐는지 검증한다.
 * @returns {{ ok: boolean, reason?: string }}
 */
async function assertPortalReady(page, captureId) {
  const shell = await page.locator(PORTAL_SHELL).count();
  if (shell === 0) {
    return { ok: false, reason: 'portal-shell 미존재 (로그인 실패 가능)' };
  }
  if (captureId) {
    const target = await page.locator(`[data-capture-id="${captureId}"]`).count();
    if (target === 0) {
      return { ok: false, reason: `data-capture-id="${captureId}" 요소 미존재` };
    }
  }
  const bodyText = await page.evaluate(() => document.body ? document.body.innerText : '');
  for (const t of FORBIDDEN_TEXTS) {
    if (bodyText.includes(t)) {
      return { ok: false, reason: `금지 텍스트 감지: "${t}" (로그인/권한 오류 화면)` };
    }
  }
  return { ok: true };
}

/**
 * 캡처 모드 역할 오버라이드. role=null이면 두 키를 지우고 기본 역할로 복귀.
 */
async function setRole(page, role) {
  await page.evaluate(([roleKey, adminKey, roleValue]) => {
    if (roleValue) {
      sessionStorage.setItem(roleKey, roleValue);
      if (roleValue === 'portal-admin') {
        sessionStorage.setItem(adminKey, 'true');
      } else {
        sessionStorage.removeItem(adminKey);
      }
    } else {
      sessionStorage.removeItem(roleKey);
      sessionStorage.removeItem(adminKey);
    }
  }, [ROLE_OVERRIDE_KEY, ADMIN_PREVIEW_KEY, role]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector(PORTAL_SHELL, { timeout: PORTAL_READY_TIMEOUT });
}

async function clickTabByName(page, pattern) {
  try {
    const tab = page.getByRole('tab', { name: pattern }).first();
    if (await tab.isVisible({ timeout: 5000 })) {
      await tab.click();
      await page.waitForTimeout(1000);
      return;
    }
    // role=tab 마크업이 아닌 경우 텍스트 클릭으로 폐색
    const byText = page.getByText(pattern).first();
    if (await byText.isVisible({ timeout: 3000 })) {
      await byText.click();
      await page.waitForTimeout(1000);
      return;
    }
    console.warn(`  [warn] 탭(${pattern})을 찾지 못했습니다. 기본 탭으로 진행합니다.`);
  } catch (e) {
    console.warn(`  [warn] 탭(${pattern}) 클릭 실패, 기본 탭으로 진행: ${e.message}`);
  }
}

// 사이드바 메뉴 강조 캡처용: 본문 영역을 숨기고 메뉴 구성만 남긴다
async function hideMainContentForMenuCapture(page) {
  await page.addStyleTag({
    content: '[data-capture-id] { display: none !important; }',
  });
  await page.waitForTimeout(500);
}

// ---------------------------------------------------------------------------
// 캡처 실행
// ---------------------------------------------------------------------------
const results = []; // { name, status, bytes, hash, reason }

// 의도적 동일 화면 중복 허용 목록 (레거시 파일명 유지 목적)
const ALLOWED_DUPLICATE_GROUPS = [
  ['01-portal-dashboard-user.png', '01-portal-dashboard.png'],
];

async function captureOne(page, cap) {
  console.log(`\n[capture] ${cap.name} (route=${cap.route}, role=${cap.role || '(default)'})`);

  // 검증 → 실패 시 로그인부터 1회 복구 재시도
  let check = await assertPortalReady(page, cap.captureId);
  if (!check.ok) {
    console.warn(`  [retry] 사전 검증 실패(${check.reason}) — 로그인부터 재시도`);
    try {
      await login(page);
      await setRole(page, cap.role);
      await page.goto(`${BASE_URL}${cap.route}`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForSelector(PORTAL_SHELL, { timeout: PORTAL_READY_TIMEOUT });
      if (cap.tabPattern) await clickTabByName(page, cap.tabPattern);
      if (cap.prepare) await cap.prepare(page);
    } catch (e) {
      results.push({ name: cap.name, status: 'FAIL', bytes: 0, hash: '-', reason: `복구 실패: ${e.message}` });
      return false;
    }
    check = await assertPortalReady(page, cap.captureId);
    if (!check.ok) {
      results.push({ name: cap.name, status: 'FAIL', bytes: 0, hash: '-', reason: check.reason });
      return false;
    }
  }

  const outPath = path.join(OUT_DIR, cap.name);
  let screenshotOptions = { path: outPath, fullPage: FULL_PAGE };
  if (cap.elementSelector) {
    const el = page.locator(cap.elementSelector).first();
    if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
      screenshotOptions = { path: outPath };
      await el.screenshot(screenshotOptions);
    } else {
      console.warn(`  [warn] ${cap.elementSelector} 영역이 없어 전체 페이지로 캡처합니다.`);
      await page.screenshot(screenshotOptions);
    }
  } else {
    await page.screenshot(screenshotOptions);
  }

  const buf = fs.readFileSync(outPath);
  const hash = crypto.createHash('sha1').update(buf).digest('hex');
  results.push({ name: cap.name, status: 'OK', bytes: buf.length, hash, reason: '' });
  console.log(`  saved ${cap.name} (${buf.length}B, sha1:${hash.slice(0, 8)})`);
  return true;
}

async function runGroup(page, captures) {
  let currentRole = undefined;
  for (const cap of captures) {
    try {
      if (cap.role !== currentRole) {
        await setRole(page, cap.role);
        currentRole = cap.role;
      }
      await page.goto(`${BASE_URL}${cap.route}`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForSelector(PORTAL_SHELL, { timeout: PORTAL_READY_TIMEOUT });
      await page.waitForTimeout(800);
      if (cap.tabPattern) await clickTabByName(page, cap.tabPattern);
      if (cap.prepare) await cap.prepare(page);
      await captureOne(page, cap);
    } catch (e) {
      results.push({ name: cap.name, status: 'FAIL', bytes: 0, hash: '-', reason: e.message });
      // 다음 캡처를 위해 로그인 상태 복구 시도
      try {
        await login(page);
        currentRole = undefined;
      } catch (e2) {
        console.error(`  [FATAL] 로그인 복구 실패: ${e2.message}`);
        throw e2;
      }
    }
  }
}

function printSummary() {
  console.log('\n===== 캡처 요약 =====');
  console.log(`${'파일'.padEnd(45)} ${'상태'.padEnd(6)} ${'바이트'.padStart(10)}  해시(8)`);
  for (const r of results) {
    const hash8 = r.hash === '-' ? '-' : r.hash.slice(0, 8);
    const reason = r.reason ? `  <- ${r.reason}` : '';
    console.log(`${r.name.padEnd(45)} ${r.status.padEnd(6)} ${String(r.bytes).padStart(10)}  ${hash8}${reason}`);
  }

  // 품질 게이트: 동일 sha1 해시가 2개 이상이면 로그인 화면 중복 캡처로 간주
  const byHash = new Map();
  for (const r of results) {
    if (r.status !== 'OK') continue;
    if (!byHash.has(r.hash)) byHash.set(r.hash, []);
    byHash.get(r.hash).push(r.name);
  }
  let duplicateFail = false;
  for (const [hash, names] of byHash) {
    if (names.length <= 1) continue;
    const allowed = ALLOWED_DUPLICATE_GROUPS.some(
      group => names.every(n => group.includes(n)) && group.every(g => names.includes(g)),
    );
    if (allowed) {
      console.log(`  [quality gate] 의도적 중복 허용: ${names.join(', ')}`);
      continue;
    }
    duplicateFail = true;
    console.error(`\n[QUALITY GATE FAIL] 동일 해시(${hash.slice(0, 8)}) 캡처 ${names.length}건: ${names.join(', ')}`);
  }

  const failed = results.filter(r => r.status !== 'OK');
  console.log(`\n총 ${results.length}건 중 성공 ${results.length - failed.length}건, 실패 ${failed.length}건`);
  return failed.length > 0 || duplicateFail;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  // 'Failed to sign in' 등 alert 다이얼로그는 accept (기본 dismiss 시 로그인 조용히 실패)
  page.on('dialog', (d) => d.accept().catch(() => {}));

  let hasFailure = false;
  try {
    await login(page);
    console.log('[login] 포털 셸 진입 확인');

    console.log('\n--- 신규 캡처 (역할 전환) ---');
    await runGroup(page, NEW_CAPTURES);

    console.log('\n--- 레거시 캡처 (기존 파일명 유지) ---');
    await runGroup(page, LEGACY_CAPTURES);
  } catch (e) {
    console.error(`[FATAL] ${e.message}`);
    hasFailure = true;
  } finally {
    await browser.close();
  }

  const gateFailed = printSummary();
  process.exit(hasFailure || gateFailed ? 1 : 0);
})();
