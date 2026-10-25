#!/usr/bin/env node
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../backstage-portal/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
const origin = process.env.PORTAL_REVIEW_ORIGIN || 'http://127.0.0.1:3000';
const evidence = new URL('../docs/portal-experience/evidence/', import.meta.url);
await fs.mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const check = async (name, run) => { await run(); results.push(name); console.log(`PASS ${name}`); };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
  await context.addInitScript(() => {
    sessionStorage.setItem('kt-ai-portal-preview-authenticated', 'true');
    sessionStorage.setItem('__kt_ai_portal_role_override__', 'portal-admin');
  });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/developer-console`);
  await expect(page.getByRole('heading', { name: '플랫폼 연계 개발 콘솔' })).toBeVisible();
  await check('catalog preserves 34 scoped contracts and removes requirement labels', async () => {
    await expect(page.getByRole('tab', { name: 'API 카탈로그 34' })).toBeVisible();
    assert.ok(!/\b(?:SFR|SER|TER)-\d{3}\b/.test(await page.locator('body').innerText()));
  });
  await page.getByRole('tab', { name: 'API 테스트', exact: true }).click();
  await check('sample contract validates successfully without claiming external connection', async () => {
    await page.locator('button').filter({ hasText: /^샘플 계약 검증$/ }).click();
    await expect(page.getByRole('status')).toContainText('샘플 검증 · 통과');
    await expect(page.getByRole('status')).toContainText('외부 접속 결과가 아닙니다.');
    await expect(page.getByRole('button', { name: '접속 테스트', exact: true })).toBeDisabled();
  });
  await check('invalid request is rejected and a missing sample response field fails', async () => {
    await page.getByLabel('요청 파라미터 (JSON)').fill('{}');
    await page.locator('button').filter({ hasText: /^샘플 계약 검증$/ }).click();
    await expect(page.getByRole('status')).toContainText('필수 필드 누락');
    await page.getByRole('button', { name: '샘플 값 채우기' }).click();
    await page.getByRole('button', { name: '정상 응답' }).click();
    await page.getByRole('option', { name: '응답 필드 누락' }).click();
    await page.locator('button').filter({ hasText: /^샘플 계약 검증$/ }).click();
    await expect(page.getByRole('status')).toContainText('샘플 검증 · 실패');
    await expect(page.getByRole('status')).toContainText('필수 필드 누락');
  });
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  await page.screenshot({ path: new URL('developer-console-test.png', evidence).pathname, fullPage: true });
  await check('history survives reload and CSV identifies sample results', async () => {
    await page.reload();
    await page.getByRole('tab', { name: '테스트 이력 3' }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: '이력 CSV' }).click();
    const csv = await fs.readFile(await (await download).path(), 'utf8');
    assert.ok(csv.includes('샘플 계약 검증') && csv.includes('필수 필드 누락'));
  });
  await check('contract export carries draft schemas and no requirement IDs', async () => {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: '연계 명세 내보내기' }).click();
    const body = await fs.readFile(await (await download).path(), 'utf8');
    const contract = JSON.parse(body);
    assert.equal(contract.contracts.length, 40);
    assert.ok(contract.contracts.every(item => item.requestSchema && item.responseSchema));
    assert.ok(!/\b(?:SFR|SER|TER)-\d{3}\b/.test(body));
  });
  await check('VDI filter opens the two proposed VDI interfaces', async () => {
    await page.getByRole('button').filter({hasText:'가상 데스크톱 · 업무 세션'}).click();
    await expect(page.getByRole('heading', { name: '사용 가능한 가상 데스크톱 조회' })).toBeVisible();
    await expect(page.getByRole('button', { name: /사용자 VDI 세션 상태 조회/ })).toBeVisible();
  });
  await check('mobile console fits viewport without horizontal overflow', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('tab', { name: 'API 카탈로그 34' }).click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  });
  await check('no browser runtime errors', async () => assert.deepEqual(errors, []));
  await fs.writeFile(new URL('developer-console-checks.json', evidence), JSON.stringify({ origin, checks: results }, null, 2));
} finally { await browser.close(); }
