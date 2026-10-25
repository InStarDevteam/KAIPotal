#!/usr/bin/env node
// Local demo/capture browser checks. Runtime API/RLS checks live in test-portal-runtime.mjs.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../backstage-portal/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
const express = require('express');
const app = express();
const dist = path.resolve('backstage-portal/packages/app/dist');
app.use(express.static(dist));
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const evidence = path.resolve('docs/tenant-portal-update/evidence');
await fs.mkdir(evidence, { recursive: true });
let browser;
const checks = [];
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
  await context.addInitScript(() => {
    sessionStorage.setItem('kt-ai-portal-preview-authenticated', 'true');
    if (!sessionStorage.getItem('__kt_ai_portal_role_override__')) sessionStorage.setItem('__kt_ai_portal_role_override__', 'portal-admin');
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const goto = async route => { await page.goto(origin + route); await page.getByTestId('portal-shell').waitFor(); };
  const switchTenant = async label => { await page.getByRole('button', { name: '소속 군 선택' }).click(); await page.getByRole('option', { name: label, exact: true }).click(); };
  const check = async (name, fn) => { await fn(); checks.push(name); console.log(`PASS ${name}`); };
  await goto('/tenant-settings');
  await page.getByRole('heading', { name: '군별 포털 설정', exact: true }).waitFor();
  await switchTenant('육군');
  await check('save tenant branding and apply shell theme', async () => {
    const inputSize = await page.getByLabel('포털 이름', { exact: false }).evaluate(el => ({ height: el.parentElement.getBoundingClientRect().height, inputHeight: el.getBoundingClientRect().height, sizing: getComputedStyle(el).boxSizing, padding: getComputedStyle(el).padding, lineHeight: getComputedStyle(el).lineHeight }));
    assert.ok(inputSize.height >= 36, `outlined input must retain usable height: ${JSON.stringify(inputSize)}`);
    await page.getByLabel('포털 이름', { exact: false }).fill('육군 통합 업무 포털');
    await page.getByLabel('대표 색상', { exact: true }).fill('#164e3b');
    await page.getByLabel('환영 문구', { exact: true }).fill('육군 업무에 오신 것을 환영합니다.');
    await page.getByLabel('도움말 문구', { exact: true }).fill('육군 운영지원실로 문의해 주세요.');
    await page.getByRole('button', { name: '변경사항 저장' }).click();
    await expect(page.locator('header').getByRole('link', { name: '육군 통합 업무 포털' })).toBeVisible();
    assert.equal(await page.getByTestId('portal-shell').evaluate(el => getComputedStyle(el).getPropertyValue('--portal-primary').trim()), '#164e3b');
  });
  await check('persist settings across reload', async () => {
    await page.reload();
    await expect(page.getByLabel('포털 이름', { exact: false })).toHaveValue('육군 통합 업무 포털');
  });
  await page.screenshot({ path: path.join(evidence, 'army-settings.png'), fullPage: true });
  await check('tenant settings isolation and restore on switch', async () => {
    await switchTenant('해군');
    await expect(page.getByLabel('포털 이름', { exact: false })).not.toHaveValue('육군 통합 업무 포털');
    await switchTenant('육군');
    await expect(page.getByLabel('포털 이름', { exact: false })).toHaveValue('육군 통합 업무 포털');
  });
  await check('invalid contrast prevents saving', async () => {
    await page.getByLabel('대표 색상', { exact: true }).fill('#ffffff');
    await expect(page.getByRole('button', { name: '변경사항 저장' })).toBeDisabled();
    await page.getByLabel('대표 색상', { exact: true }).fill('#164e3b');
  });
  await check('menu label and visibility persist in navigation', async () => {
    await page.getByRole('tab', { name: '메뉴 구성' }).click();
    await page.getByRole('textbox', { name: '프로젝트/워크스페이스 표시 이름' }).fill('육군 프로젝트');
    await page.getByRole('checkbox', { name: '제안 게시판 표시', exact: true }).uncheck();
    await page.getByRole('button', { name: '변경사항 저장' }).click();
    await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
    const nav = page.getByRole('navigation', { name: '주 메뉴' });
    await expect(nav.getByRole('link', { name: '육군 프로젝트', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: '제안 게시판', exact: true })).toHaveCount(0);
  });
  await check('hidden menu blocks direct route', async () => {
    await goto('/proposal-board');
    await expect(page.getByText('현재 소속 군에서 사용하지 않는 메뉴입니다.', { exact: false })).toBeVisible();
  });
  await check('common help text applied', async () => {
    await page.getByRole('button', { name: '내 계정', exact: true }).click();
    await page.getByRole('button', { name: '사용 도움말', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('육군 운영지원실로 문의해 주세요.');
    await page.getByRole('button', { name: '닫기', exact: true }).click();
  });
  await check('integrated audit includes settings and access events', async () => {
    await goto('/audit-history');
    await expect(page.getByRole('table', { name: '접속 및 사용 이력' })).toContainText('포털 설정 변경');
    await expect(page.getByRole('table')).toContainText('포털 접속');
    await expect(page.getByRole('table')).toContainText('화면 조회');
  });
  await check('audit filtering and CSV export', async () => {
    await page.getByLabel('행위, 대상, 요청 식별자 검색').fill('tenant.settings.update');
    await page.getByRole('button', { name: '조회', exact: true }).click();
    await expect(page.getByRole('table')).toContainText('포털 설정 변경');
    await expect(page.getByRole('table')).not.toContainText('화면 조회');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'CSV 내려받기' }).click();
    const downloaded = await download;
    const body = await fs.readFile(await downloaded.path(), 'utf8');
    assert.ok(body.includes('포털 설정 변경') && body.includes('육군'));
    assert.ok(!body.includes('화면 조회'));
    await page.getByRole('button', { name: '초기화', exact: true }).click();
  });
  await page.screenshot({ path: path.join(evidence, 'audit-history.png'), fullPage: true });
  await check('archived pages cannot be opened', async () => {
    for (const route of ['/krmf-evidence', '/requirement-progress', '/requirement-coverage', '/workflow-scenarios']) {
      await goto(route);
      await expect(page.getByText('사용할 수 없는 페이지입니다.')).toBeVisible();
    }
  });
  await check('active pages omit requirement codes and KRMF labels', async () => {
    for (const route of ['/', '/admin-console', '/role-menu-preview', '/project-workspace', '/credit-manager', '/export-approval', '/service-catalog', '/my-page', '/environment-settings', '/tenant-management', '/integrated-search', '/tenant-settings', '/audit-history']) {
      await goto(route);
      await expect(page.locator('main')).not.toContainText('소속 군의 포털을 불러오는 중입니다.');
      assert.ok(!/(?:SFR|TER|SER)-\d|요구사항 대응|K-?RMF/i.test(await page.locator('body').innerText()), `Unwanted user-facing text at ${route}`);
    }
  });
  await check('settings and audit responsive without page overflow', async () => {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of ['/tenant-settings', '/audit-history']) {
        await goto(route);
        await expect(page.locator('main')).not.toContainText('소속 군의 포털을 불러오는 중입니다.');
        const size = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth }));
        assert.ok(size.scroll <= size.viewport + 1, `${route} overflow at ${width}: ${JSON.stringify(size)}`);
        if (width === 390) await page.screenshot({ path: path.join(evidence, `${route.slice(1)}-mobile.png`), fullPage: true });
      }
    }
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await check('branch administrator cannot select another branch', async () => {
    await goto('/tenant-settings?captureRole=branch-admin');
    await expect(page.getByRole('heading', { name: '군별 포털 설정', exact: true })).toBeVisible();
    await expect(page.getByLabel('포털 이름', { exact: false })).toHaveValue('육군 통합 업무 포털');
    await expect(page.getByRole('button', { name: '소속 군 선택' })).toHaveAttribute('aria-disabled', 'true');
  });
  await check('general user inherits branch branding but cannot manage or audit', async () => {
    await goto('/tenant-settings?captureRole=general-user');
    await expect(page.locator('header').getByRole('link', { name: '육군 통합 업무 포털' })).toBeVisible();
    await expect(page.getByTestId('tenant-settings-page')).toHaveCount(0);
    await goto('/audit-history');
    await expect(page.getByRole('table', { name: '접속 및 사용 이력' })).toHaveCount(0);
    await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
    await expect(page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '접속·사용 이력', exact: true })).toHaveCount(0);
  });
  assert.deepEqual(errors, []);
  checks.push('no browser runtime exceptions');
  await fs.writeFile(path.join(evidence, 'browser-report.json'), JSON.stringify({ checks, count: checks.length, time: new Date().toISOString() }, null, 2));
  console.log(`${checks.length} browser scenarios passed`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
