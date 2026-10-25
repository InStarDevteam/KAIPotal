const { chromium } = require('playwright');
const path = require('path');

const OUT_DIR = path.resolve(__dirname, '../docs/assets/final');
const BASE_URL = 'http://localhost:3000';

const captures = [
  { name: '01-portal-dashboard.png', route: '/' },
  { name: '02-integrated-search.png', route: '/integrated-search' },
  { name: '03-project-workspace.png', route: '/project-workspace' },
  { name: '04-export-approval.png', route: '/export-approval' },
  { name: '05-credit-manager.png', route: '/credit-manager' },
  { name: '06-krmf-evidence.png', route: '/krmf-evidence' },
  { name: '07-admin-console-user-management.png', route: '/admin-console', tabIndex: 1 }, // 사용자 관리
  { name: '08-admin-console-rbac-menu.png', route: '/admin-console', tabIndex: 3 }, // 권한/역할
  { name: '09-admin-console-policy-audit.png', route: '/admin-console', tabIndex: 6 }, // 감사 로그
  { name: '10-service-catalog.png', route: '/service-catalog' },
  { name: '11-proposal-board.png', route: '/proposal-board' },
  { name: '12-my-page.png', route: '/my-page' },
  { name: '13-environment-settings.png', route: '/environment-settings' },
  { name: '14-tenant-management.png', route: '/tenant-management' },
];

async function signInAsGuest(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  // Click the ENTER button inside the Guest sign-in card
  const guestEnter = await page.locator('button:has-text("Enter")').first();
  if (await guestEnter.isVisible().catch(() => false)) {
    await guestEnter.click();
    await page.waitForURL(url => url.pathname === '/', { timeout: 10000 });
  }
  await page.waitForTimeout(800);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  await signInAsGuest(page);

  for (const cap of captures) {
    await page.goto(`${BASE_URL}${cap.route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    if (typeof cap.tabIndex === 'number') {
      const tabs = await page.$$('[role="tab"]');
      if (tabs[cap.tabIndex]) {
        await tabs[cap.tabIndex].click();
        await page.waitForTimeout(1200);
      }
    }

    const outPath = path.join(OUT_DIR, cap.name);
    await page.screenshot({ path: outPath, fullPage: true });
    const stat = require('fs').statSync(outPath);
    console.log(`Captured ${cap.name} (${Math.round(stat.size / 1024)}KB)`);
  }

  await browser.close();
  console.log('All captures done.');
})();
