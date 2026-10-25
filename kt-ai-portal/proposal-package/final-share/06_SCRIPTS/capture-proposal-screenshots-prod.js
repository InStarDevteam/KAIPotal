const { chromium } = require('/Users/choikyubeom/Documents/kimi-projects/KAIPotal/kt-ai-portal/backstage-portal/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../docs/assets/final');
const BASE_URL = process.env.BASE_URL || 'https://kai-platform-d0ae0.web.app';
const ACCESS_CODE = process.env.ACCESS_CODE;
if (!ACCESS_CODE) {
  console.error('오류: ACCESS_CODE 환경변수가 필요합니다. 예) ACCESS_CODE=<접근코드> node capture-proposal-screenshots-prod.js');
  process.exit(1);
}

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const normalCaptures = [
  { name: '01-portal-dashboard.png', route: '/' },
  { name: '02-integrated-search.png', route: '/integrated-search' },
  { name: '03-project-workspace.png', route: '/project-workspace' },
  { name: '04-export-approval.png', route: '/export-approval' },
  { name: '05-credit-manager.png', route: '/credit-manager' },
  { name: '06-krmf-evidence.png', route: '/krmf-evidence' },
  { name: '10-service-catalog.png', route: '/service-catalog' },
  { name: '11-proposal-board.png', route: '/proposal-board' },
  { name: '12-my-page.png', route: '/my-page' },
  { name: '13-environment-settings.png', route: '/environment-settings' },
  { name: '14-tenant-management.png', route: '/tenant-management' },
];

const adminConsoleCaptures = [
  { name: '07-admin-console-user-management.png', route: '/admin-console', tabIndex: 1, tabName: '사용자 관리' },
  { name: '08-admin-console-rbac-menu.png', route: '/admin-console', tabIndex: 3, tabName: '권한/역할' },
  { name: '09-admin-console-policy-audit.png', route: '/admin-console', tabIndex: 6, tabName: '감사 로그' },
  { name: '09-admin-console-platform-ops-tools.png', route: '/admin-console', tabIndex: 9, tabName: '플랫폼 운영도구' },
];

const adminDirectCaptures = [
  { name: '17-requirement-coverage.png', route: '/requirement-coverage' },
  { name: '18-platform-api-integration.png', route: '/platform-api-integration' },
  { name: '19-workflow-scenarios.png', route: '/workflow-scenarios' },
];

async function hideDemoBanner(page) {
  try {
    const closeBtn = page.locator('button[aria-label="close"]').first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }
  } catch {
    // ignore
  }
}

async function enterAccessCode(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1000);

  // Access code gate: single text input + entrance button
  const input = page.locator('input[type="text"], input[type="password"], input.MuiInputBase-input').first();
  if (await input.isVisible({ timeout: 5000 }).catch(() => false)) {
    await input.fill(ACCESS_CODE);
    const enterBtn = page.locator('button:has-text("접근코드로 입장")').first();
    await Promise.all([
      page.waitForURL(url => url.pathname === '/', { timeout: 30000 }),
      enterBtn.click(),
    ]);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  }

  // Backstage sign-in page: click Guest ENTER
  const guestEnter = page.locator('button:has-text("ENTER")').first();
  if (await guestEnter.isVisible({ timeout: 5000 }).catch(() => false)) {
    await Promise.all([
      page.waitForURL(url => url.pathname === '/', { timeout: 30000 }),
      guestEnter.click(),
    ]);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1200);
  }
}

async function capture(page, cap) {
  await page.goto(`${BASE_URL}${cap.route}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
  await hideDemoBanner(page);

  if (typeof cap.tabIndex === 'number') {
    const tabs = await page.$$('[role="tab"]');
    if (tabs[cap.tabIndex]) {
      await tabs[cap.tabIndex].click();
      await page.waitForTimeout(1200);
    }
  }

  // Hide any remaining demo banner or alert with 시연/샘플 text just in case
  await page.evaluate(() => {
    const alerts = Array.from(document.querySelectorAll('div[role="alert"], .MuiAlert-root'));
    alerts.forEach(el => {
      const text = el.textContent || '';
      if (text.includes('시연 환경') || text.includes('샘플 데이터')) {
        el.style.display = 'none';
      }
    });
  });
  await page.waitForTimeout(300);

  const outPath = path.join(OUT_DIR, cap.name);
  await page.screenshot({ path: outPath, fullPage: true });
  const stat = fs.statSync(outPath);
  console.log(`Captured ${cap.name} (${Math.round(stat.size / 1024)}KB)`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // Normal context
  const normalContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const normalPage = await normalContext.newPage();
  await enterAccessCode(normalPage);

  for (const cap of normalCaptures) {
    await capture(normalPage, cap);
  }

  // Admin context
  const adminContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await adminContext.addInitScript(() => {
    sessionStorage.setItem('__kt_ai_portal_admin_preview__', 'true');
  });
  const adminPage = await adminContext.newPage();
  await enterAccessCode(adminPage);

  for (const cap of adminConsoleCaptures) {
    await capture(adminPage, cap);
  }

  for (const cap of adminDirectCaptures) {
    await capture(adminPage, cap);
  }

  await browser.close();
  console.log('All proposal captures done.');
})();
