#!/usr/bin/env node
/**
 * Read-only live release inspection. No synthetic API responses or business writes.
 * App-generated tenant-context and activity/audit requests remain enabled.
 * LIVE_BASE_URL: UI origin (default public Hosting)
 * CANDIDATE_API_BASE: optional real candidate backend origin; forwards API transport only
 * RELEASE_PHASE: safe evidence directory name (default live)
 */
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../backstage-portal/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
const base = new URL(process.env.LIVE_BASE_URL || 'https://kai-platform-d0ae0.web.app').origin;
const candidate = process.env.CANDIDATE_API_BASE ? new URL(process.env.CANDIDATE_API_BASE).origin : null;
const phase = process.env.RELEASE_PHASE || 'live';
assert.match(phase, /^[a-zA-Z0-9_-]+$/, 'RELEASE_PHASE must be a simple directory name');
const code = process.env.PREVIEW_ACCESS_CODE || 'demo1234';
const evidence = `${process.env.RELEASE_EVIDENCE_ROOT || 'docs/customer-demo-20261001/deployment'}/${phase}`;
await fs.mkdir(evidence, { recursive: true });
const routes = [
  '/project-workspace', '/export-approval', '/credit-manager', '/krmf-monitor',
  '/integrated-search', '/admin-console', '/role-menu-preview', '/service-catalog',
  '/proposal-board', '/my-page', '/environment-settings', '/tenant-management',
  '/tenant-settings', '/audit-history', '/developer-console',
];
const report = {
  phase, uiOrigin: base, candidateApiOrigin: candidate, startedAt: new Date().toISOString(),
  businessWritesAllowed: false, capturesMasked: true,
  checks: [], responses: [], serverFailures: [], networkFailures: [], pageErrors: [], blockedWrites: [],
};
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
const page = await context.newPage();
page.setDefaultTimeout(30000);
const activeApi = new Set();
const responseTasks = new Set();
const observations = { memberships: null, liveOverview: false, history200: 0, profile200: 0, myProjects200: 0 };
const pathname = url => new URL(url).pathname;
const isApi = url => pathname(url).startsWith('/api/');
page.on('pageerror', error => {
  // Do not persist exception strings, which can contain application/user data.
  report.pageErrors.push({ name: error.name, path: pathname(page.url()) });
});
page.on('request', request => { if (isApi(request.url())) activeApi.add(request); });
page.on('requestfinished', request => activeApi.delete(request));
page.on('requestfailed', request => {
  activeApi.delete(request);
  const error = request.failure()?.errorText || '';
  if (isApi(request.url()) && !error.includes('ERR_ABORTED'))
    report.networkFailures.push({ method: request.method(), path: pathname(request.url()) });
});
page.on('response', response => {
  if (!isApi(response.url())) return;
  const record = { method: response.request().method(), path: pathname(response.url()), status: response.status() };
  report.responses.push(record);
  if (record.status >= 500) report.serverFailures.push(record);
  if (record.status !== 200) return;
  if (record.path === '/api/portal/v1/portal-settings/history') observations.history200++;
  if (record.path === '/api/portal/v1/me/profile') observations.profile200++;
  if (record.path === '/api/portal/v1/projects' && new URL(response.url()).searchParams.get('mine') === 'true') observations.myProjects200++;
  if (['/api/portal/v1/me', '/api/portal/v1/work/overview'].includes(record.path)) {
    const task = response.json().then(body => {
      // Inspect only; never persist response bodies, identity data or credentials.
      if (record.path === '/api/portal/v1/me') observations.memberships = body.data?.memberships?.length;
      else observations.liveOverview = body.meta?.dataMode === 'live' && body.meta?.partial === false &&
        !Object.values(body.data?.sections || {}).includes('unavailable');
    }).catch(() => {}).finally(() => responseTasks.delete(task));
    responseTasks.add(task);
  }
});
await context.route('**/api/**', async route => {
  const request = route.request();
  const url = new URL(request.url());
  const readMethod = ['GET', 'HEAD', 'OPTIONS'].includes(request.method());
  const sessionOrTelemetry = [
    '/api/portal/v1/context/tenant', '/api/portal/v1/activity',
    '/api/auth/guest/refresh', '/api/auth/oidc/refresh', '/api/permission/authorize',
  ].includes(url.pathname);
  if (!readMethod && !sessionOrTelemetry) {
    report.blockedWrites.push({ method: request.method(), path: url.pathname });
    await route.abort('blockedbyclient');
    return;
  }
  if (!candidate) { await route.continue(); return; }
  try {
    const response = await route.fetch({ url: candidate + url.pathname + url.search, timeout: 45000 });
    // A local/candidate UI can have a different origin from its compiled public API URL.
    // Only transport CORS headers are adapted; status/body come unchanged from the real API.
    await route.fulfill({ response, headers: {
      ...response.headers(), 'access-control-allow-origin': base,
      'access-control-allow-credentials': 'true',
    } });
  } catch {
    report.networkFailures.push({ method: request.method(), path: url.pathname });
    await route.abort('failed');
  }
});
const settle = async () => {
  await expect.poll(() => activeApi.size, { timeout: 45000, message: 'API requests did not finish' }).toBe(0);
  await page.waitForTimeout(300);
  await expect.poll(() => activeApi.size, { timeout: 45000, message: 'API requests did not settle' }).toBe(0);
  await Promise.allSettled([...responseTasks]);
};
const shot = async name => {
  await page.evaluate(() => window.scrollTo(0, 0));
  const masks = [page.locator('input, textarea, .identity-facts dd, .identity-summary h3')];
  if (/admin-console|tenant-management|audit-history|environment-settings/.test(page.url())) masks.push(page.locator('tbody'));
  await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: true, animations: 'disabled', mask: masks });
};
const check = async (name, action) => {
  try {
    await action();
    report.checks.push({ name, passed: true });
    console.log('PASS', name);
  } catch (error) {
    report.checks.push({ name, passed: false, failureClass: error?.name || 'Error' });
    console.error('FAIL', name, `(${error?.name || 'Error'})`);
    await shot(`failure-${report.checks.length}`).catch(() => {});
  }
};
const overflow = async () => {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Page-level horizontal overflow');
};
const goto = async route => {
  await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByTestId('portal-shell').waitFor();
  await settle();
  await expect(page.locator('main')).not.toContainText('소속 군의 포털을 불러오는 중입니다.');
};
try {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByLabel('접근코드', { exact: true }).waitFor();
  await check('login exposes four design entry choices', async () => {
    await expect(page.getByRole('button', { name: /메인으로 입장/ })).toHaveCount(4);
    await shot('desktop-login');
  });
  await page.getByLabel('접근코드', { exact: true }).fill(code);
  await page.getByRole('button', { name: '01 Aurora 메인으로 입장', exact: true }).click();
  await page.getByTestId('portal-home').waitFor({ timeout: 60000 });
  await settle();
  await check('four homepage designs use live API mode', async () => {
    for (const [i, name] of ['Aurora', 'Focus', 'Orbit', 'Canvas'].entries()) {
      await page.getByRole('button', { name: `0${i + 1} ${name}`, exact: true }).click();
      await expect(page.getByTestId('portal-home')).toHaveAttribute('data-design', name.toLowerCase());
      await expect(page.locator('.platform-card')).toHaveCount(4);
      await expect(page.locator('body')).not.toContainText('고객 협의용 · 예시 환경');
      await overflow();
      await shot(`desktop-home-${name.toLowerCase()}`);
    }
  });
  await check('single authorized membership selector is openable', async () => {
    assert.equal(observations.memberships, 1, 'Expected the designated single-membership demonstration account');
    await page.getByLabel('소속 군 선택').click();
    await expect(page.getByText('현재 계정에 등록된 소속은 1개입니다. 다른 소속은 관리자의 등록이 필요합니다.')).toBeVisible();
    await expect(page.getByRole('option', { name: '국방부 공통', exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: /^(육군|해군|공군|해병대)$/ })).toHaveCount(0);
    await shot('desktop-tenant-selector');
    await page.keyboard.press('Escape');
  });
  await check('portal work opens directly and has no failed/partial aggregation', async () => {
    await page.keyboard.press('Escape');
    await page.locator('.home-work-button').click();
    await page.getByTestId('portal-work').waitFor();
    await settle();
    assert(observations.liveOverview, 'Live complete work overview response required');
    await expect(page.locator('.work-alert')).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText('집계 중 오류');
    await overflow();
    await shot('desktop-portal-work');
  });
  for (const route of routes) await check(`desktop authorized route ${route}`, async () => {
    await goto(route);
    const text = await page.locator('main').innerText();
    assert(!/\b(?:SFR|SER|TER)-\d{3}\b/.test(text), 'RFP code visible');
    assert(!text.includes('실증 프로젝트'), 'Unsupported standalone pilot module visible');
    assert(!/이 페이지에 접근할 권한이 없습니다|접근 권한이 없습니다/.test(text), 'Authorized route access denied');
    await overflow();
    await shot('desktop' + route.replaceAll('/', '-'));
  });
  await check('defense profile reads live data and exposes military/external fields without saving', async () => {
    const previous = observations.profile200;
    await goto('/my-page?tab=profile');
    assert(observations.profile200 > previous, 'Profile must be fetched successfully');
    await expect(page.locator('#profile-user-category')).toBeVisible();
    // MUI's exiting listbox shares the label; target the unique Select control.
    await page.locator('#profile-user-category').click();
    await page.getByRole('option', { name: '군 내부 사용자', exact: true }).click();
    await expect(page.getByRole('listbox')).toBeHidden();
    for (const label of ['신분 구분', '군번 / 군무원 직원번호', '계급 / 직급', '소속부대 / 기관', '부서', '직책', '업무 연락처'])
      await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    await shot('desktop-defense-profile');
    // MUI's exiting listbox shares the label; target the unique Select control.
    await page.locator('#profile-user-category').click();
    await page.getByRole('option', { name: '외부 사용자', exact: true }).click();
    await expect(page.getByRole('listbox')).toBeHidden();
    await expect(page.getByLabel('군번 / 군무원 직원번호', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('소속 회사 / 연구기관', { exact: true })).toBeVisible();
    await expect(page.getByLabel('군 내부 담당자', { exact: true })).toBeVisible();
    await shot('desktop-external-profile-unsaved');
  });
  await check('active sessions clearly report missing identity integration', async () => {
    await goto('/my-page?tab=sessions');
    await expect(page.locator('main')).toContainText('활성 세션 조회·종료는 아직 연결되지 않았습니다');
    await expect(page.getByRole('button', { name: /강제 종료|전체 다른 세션 종료/ })).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText('sess-001');
    await shot('desktop-sessions');
  });
  await check('my projects use readable cards or truthful empty state', async () => {
    const previous = observations.myProjects200;
    await goto('/my-page?tab=projects');
    assert(observations.myProjects200 > previous, 'My projects must be fetched successfully');
    await expect(page.getByLabel('현재 목록에서 프로젝트 검색', { exact: true })).toBeVisible();
    assert(await page.locator('.my-project-card').count() > 0 || await page.getByText('참여 중인 프로젝트가 없습니다', { exact: true }).isVisible());
    await expect(page.locator('.my-panel table')).toHaveCount(0);
    await overflow();
    await shot('desktop-my-projects');
  });
  await check('setting history reads the real server API', async () => {
    await goto('/environment-settings');
    const previous = observations.history200;
    await page.getByRole('tab', { name: '변경 이력', exact: true }).click();
    await settle();
    assert(observations.history200 > previous, 'Settings history must return HTTP 200');
    await expect(page.getByText('설정 변경 이력', { exact: true })).toBeVisible();
    await expect(page.locator('main')).not.toContainText('변경 이력을 불러오지 못했습니다');
    await overflow();
    await shot('desktop-setting-history');
  });
  if (process.env.CHECK_KRMF_STORAGE === 'true') {
    await check('K-RMF clearly reports storage availability before file submission', async () => {
      await goto('/krmf-monitor');
      await expect(page.locator('main')).toContainText('증적 파일 저장소 연결을 준비 중입니다');
      await overflow(); await shot('desktop-krmf-storage-status');
    });
  }
  if (process.env.CHECK_SEARCH_UX === 'true') {
    await check('search idle entry reports availability instead of connection failure', async () => {
      await goto('/integrated-search');
      await expect(page.getByText('검색 서비스 연결됨', { exact: true })).toBeVisible();
      for (const name of ['데이터셋', '모델', 'Docker 이미지', 'PyPI 패키지', '의미 기반 검색'])
        await expect(page.locator('main').getByText(name, { exact: true })).toBeVisible();
      await expect(page.locator('main [role="alert"]')).toHaveCount(0);
      await expect(page.locator('main [role="status"]')).toContainText('검색어를 2자 이상');
    });
    await check('header search refreshes the current search route and supports browser back', async () => {
      await page.getByLabel('통합검색어', { exact: true }).fill('프로젝트');
      await page.getByLabel('통합검색어', { exact: true }).press('Enter');
      await settle();
      await expect(page.getByLabel('검색어', { exact: true })).toHaveValue('프로젝트');
      await expect(page.locator('main [role="status"]')).toContainText('검색 결과');
      await page.getByLabel('통합검색어', { exact: true }).fill('크레딧');
      await page.getByLabel('통합검색어', { exact: true }).press('Enter');
      await settle();
      await expect(page.getByLabel('검색어', { exact: true })).toHaveValue('크레딧');
      await page.goBack(); await settle();
      await expect(page.getByLabel('검색어', { exact: true })).toHaveValue('프로젝트');
    });
    await check('search type selection persists in URL and reloads correctly', async () => {
      await page.getByLabel('검색 대상', { exact: true }).click();
      await page.getByRole('option', { name: '프로젝트', exact: true }).click();
      await settle();
      assert.equal(new URL(page.url()).searchParams.get('type'), 'project');
      await page.reload(); await page.getByTestId('portal-shell').waitFor(); await settle();
      await expect(page.getByLabel('검색 대상', { exact: true })).toContainText('프로젝트');
    });
    await check('short query validation preserves connected source state', async () => {
      await page.getByLabel('검색어', { exact: true }).fill('a');
      await page.getByRole('button', { name: '검색 실행', exact: true }).click();
      await settle();
      await expect(page.locator('main [role="alert"]')).toContainText('2자 이상');
      await expect(page.getByText('검색 서비스 연결됨', { exact: true })).toBeVisible();
      await overflow(); await shot('desktop-search-validation');
    });
  }
  if (process.env.CHECK_SAMPLE_DATA === 'true') {
    await check('sample projects render as readable real database cards', async () => {
      await goto('/my-page?tab=projects');
      await expect(page.locator('.my-project-card')).toHaveCount(5);
      for (const title of ['공개문서 분류 모델 검토', '합성 데이터 품질 점검', '종료된 포털 화면 검토'])
        await expect(page.locator('main')).toContainText(`[시연 샘플] ${title}`);
      await overflow(); await shot('desktop-sample-my-projects');
    });
    await check('catalog contains six synthetic items and three pending-platform applications', async () => {
      await goto('/service-catalog');
      await expect(page.locator('main')).toContainText('[시연 샘플] Jupyter Notebook 개발환경');
      await expect(page.locator('main')).toContainText('[시연 샘플] 포털 시연 데이터 안내');
      await page.getByRole('tab', { name: '신청·승인 이력', exact: true }).click();
      await settle();
      await expect(page.locator('main')).toContainText('플랫폼');
      await expect(page.locator('main')).toContainText('승인');
      await expect(page.locator('main')).not.toContainText('신청 이력이 없습니다.');
      await overflow(); await shot('desktop-sample-catalog-history');
    });
    await check('sample proposal and transfer histories are populated', async () => {
      await goto('/proposal-board');
      await expect(page.locator('main')).toContainText('[시연 샘플]');
      await expect(page.locator('main')).not.toContainText('등록된 제안이 없습니다.');
      await shot('desktop-sample-proposals');
      await goto('/export-approval');
      await expect(page.locator('main')).toContainText('[시연 샘플] 합성 문서');
      await overflow(); await shot('desktop-sample-transfer-requests');
    });
    await check('sample project credit balance and ledger are live and visibly synthetic', async () => {
      await goto('/credit-manager');
      await page.getByLabel('크레딧 계정 대상', { exact: true }).click();
      await page.getByRole('option', { name: /공개문서 분류 모델 검토/ }).click();
      await expect(page.getByRole('listbox')).toBeHidden();
      await settle();
      await expect(page.locator('main')).toContainText('108,000');
      await expect(page.locator('main')).toContainText('크레딧 거래 내역');
      await expect(page.locator('main')).toContainText('실제 지급·과금·CMP 계량값이 아닙니다');
      await overflow(); await shot('desktop-sample-credit-ledger');
    });
    await check('K-RMF project selector shows names and sample controls remain provisional', async () => {
      await goto('/krmf-monitor');
      await page.locator('#krmf-project-filter').click();
      await expect(page.getByRole('option', { name: '[시연 샘플] 공개문서 분류 모델 검토', exact: true })).toBeVisible();
      await page.getByRole('option', { name: '[시연 샘플] 공개문서 분류 모델 검토', exact: true }).click();
      await expect(page.getByRole('listbox')).toBeHidden();
      await settle();
      await page.getByRole('tab', { name: '통제·증적', exact: true }).click();
      await settle();
      await expect(page.locator('main')).toContainText('SAMPLE-');
      await expect(page.locator('main')).toContainText('증적 파일 저장소 연결을 준비 중입니다');
      await overflow(); await shot('desktop-sample-krmf');
    });
    await check('sample catalog reference opens an actually deployed public document', async () => {
      const response = await context.request.get(base + '/sample-data/portal-reference-20261004.txt');
      assert.equal(response.status(), 200);
      assert.match(await response.text(), /합성|샘플/);
    });
  }
  if (process.env.CHECK_DICTIONARY === 'true') {
    await check('dictionary reads the applied PostgreSQL draft with complete counts', async () => {
      await goto('/developer-console');
      await page.getByRole('tab', { name: '데이터 사전', exact: true }).click();
      await settle();
      for (const value of ['테이블 55', '컬럼 548', '단어 96', '용어 606', '도메인 22', '코드 값 161', '기관 매핑 대기'])
        await expect(page.locator('main')).toContainText(value);
      await expect(page.locator('main [role="status"]')).toContainText('1 / 19 페이지');
      await page.getByRole('button', { name: '사전 다음 페이지', exact: true }).click();
      await settle();
      await expect(page.locator('main [role="status"]')).toContainText('2 / 19 페이지');
      await overflow(); await shot('desktop-data-dictionary');
    });
    await check('dictionary table filter, column search and CSV download work', async () => {
      await page.locator('#portal-metadata-table').click();
      await page.getByRole('option', { name: /^fc_user_profiles \(/ }).click();
      await expect(page.getByRole('listbox')).toBeHidden();
      await settle();
      await page.locator('#portal-metadata-query').fill('profile');
      await page.locator('#portal-metadata-query').press('Enter');
      await settle();
      await expect(page.locator('main')).toContainText('fc_user_profiles.profile');
      await expect(page.locator('main')).toContainText('미수령 / 임시 정의');
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: '현재 페이지 내려받기', exact: true }).click(),
      ]);
      assert.match(download.suggestedFilename(), /데이터사전/);
      const stream = await download.createReadStream();
      const chunks = []; for await (const chunk of stream) chunks.push(chunk);
      const csv = Buffer.concat(chunks).toString('utf8');
      assert.match(csv, /fc_user_profiles/); assert.match(csv, /provisional/);
      await overflow(); await shot('desktop-data-dictionary-filtered');
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await check('all four mobile home designs fit 390px', async () => {
    await goto('/');
    for (const [i, name] of ['Aurora', 'Focus', 'Orbit', 'Canvas'].entries()) {
      await page.getByRole('button', { name: `0${i + 1} ${name}`, exact: true }).click();
      await expect(page.getByTestId('portal-home')).toHaveAttribute('data-design', name.toLowerCase());
      await overflow();
      await shot(`mobile-home-${name.toLowerCase()}`);
    }
  });
  for (const route of [...routes, '/portal-work', '/my-page?tab=projects', '/my-page?tab=sessions'])
    await check(`mobile authorized route ${route}`, async () => {
      await goto(route);
      await overflow();
      await shot('mobile-' + route.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-/, ''));
    });
  await check('mobile setting history fits within its own scrolling table', async () => {
    await goto('/environment-settings');
    await page.getByRole('tab', { name: '변경 이력', exact: true }).click();
    await settle();
    await overflow();
    await shot('mobile-setting-history');
  });
  if (process.env.CHECK_SEARCH_UX === 'true') {
    await check('mobile real search results fit 390px with accessible submission', async () => {
      await goto('/integrated-search');
      await page.getByLabel('검색어', { exact: true }).fill('프로젝트');
      await page.getByRole('button', { name: '검색 실행', exact: true }).click();
      await settle();
      await expect(page.locator('main [role="status"]')).toContainText('검색 결과');
      await overflow(); await shot('mobile-search-results');
    });
  }
  if (process.env.CHECK_DICTIONARY === 'true') {
    await check('mobile metadata dictionary filters and cards fit 390px', async () => {
      await goto('/developer-console');
      await page.getByRole('tab', { name: '데이터 사전', exact: true }).click();
      await settle();
      await expect(page.locator('main')).toContainText('컬럼 548');
      await expect(page.locator('#portal-metadata-query')).toBeVisible();
      await overflow(); await shot('mobile-data-dictionary');
    });
  }
  await settle();
  await check('no API 5xx, network failures, uncaught JS or attempted business writes', async () => {
    assert.equal(report.serverFailures.length, 0);
    assert.equal(report.networkFailures.length, 0);
    assert.equal(report.pageErrors.length, 0);
    assert.equal(report.blockedWrites.length, 0);
  });
} catch (error) {
  report.checks.push({ name: 'release inspection startup/completion', passed: false, failureClass: error?.name || 'Error' });
  console.error('FAIL release inspection startup/completion', `(${error?.name || 'Error'})`);
  await shot('fatal-state').catch(() => {});
} finally {
  report.finishedAt = new Date().toISOString();
  report.summary = {
    passed: report.checks.filter(item => item.passed).length,
    failed: report.checks.filter(item => !item.passed).length,
    apiResponses: report.responses.length,
    serverFailures: report.serverFailures.length,
    pageErrors: report.pageErrors.length,
    networkFailures: report.networkFailures.length,
    attemptedBusinessWrites: report.blockedWrites.length,
  };
  await fs.writeFile(`${evidence}/browser-report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary));
  await browser.close();
  if (report.summary.failed) process.exitCode = 1;
}
