#!/usr/bin/env node
/**
 * 데모 사이트 주요 route 및 /api/auth/guest/refresh smoke test
 * - 정적/SPA route는 200 반환
 * - /api/auth/guest/refresh는 200 반환
 */

const BASE_URL = process.env.AUDIT_BASE_URL || 'https://kai-platform-d0ae0.web.app';

const routes = [
  '/',
  '/admin-console',
  '/krmf-evidence',
  '/service-catalog',
  '/export-approval',
  '/integrated-search',
  '/project-workspace',
  '/credit-manager',
  '/my-page',
  '/environment-settings',
  '/tenant-management',
  '/proposal-board',
  '/requirement-coverage',
  '/requirement-progress',
  '/platform-api-integration',
  '/workflow-scenarios',
  '/api/auth/guest/refresh',
];

async function check(route) {
  const start = Date.now();
  // API route는 Firebase Hosting edge cache의 stale 404를 피하기 위해 cache-buster 추가
  const url = route.startsWith('/api/')
    ? `${BASE_URL}${route}${route.includes('?') ? '&' : '?'}_cb=${Date.now()}`
    : `${BASE_URL}${route}`;
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    const result = {
      route,
      url,
      status: res.status,
      ok: res.ok,
      duration: Date.now() - start,
      contentType: res.headers.get('content-type') || '',
      cacheStatus: res.headers.get('x-cache') || '',
    };
    if (!res.ok) {
      console.warn(`Headers for ${route}: x-cache=${result.cacheStatus}, content-type=${result.contentType}`);
    }
    return result;
  } catch (err) {
    return { route, url, status: 'ERR', ok: false, duration: Date.now() - start, error: err.message };
  }
}

async function main() {
  console.log(`Smoke check: ${BASE_URL}\n`);
  const results = [];
  for (const route of routes) {
    const result = await check(route);
    results.push(result);
    const mark = result.ok ? '✅' : '❌';
    console.log(`${mark} ${route} -> ${result.status} (${result.duration}ms)`);
  }

  const failed = results.filter(r => !r.ok);
  console.log(`\nTotal: ${results.length}, Passed: ${results.length - failed.length}, Failed: ${failed.length}`);
  if (failed.length > 0) {
    console.log('\nFailed:');
    failed.forEach(r => console.log(`  ${r.url}: ${r.status}`));
    process.exit(1);
  }
}

main();
