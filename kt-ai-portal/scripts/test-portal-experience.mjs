#!/usr/bin/env node
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../backstage-portal/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
const browser = await chromium.launch({ headless: true });
const origin = process.env.PORTAL_REVIEW_ORIGIN || 'http://localhost:3000';
const evidence = 'docs/portal-experience/evidence';
await fs.mkdir(evidence, { recursive: true });
const checks = [], errors = [];
let page;
const check = async (name, fn) => { await fn(); checks.push(name); console.log(`PASS ${name}`); };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  const goto = async route => { await page.goto(origin + route); await page.getByTestId('portal-shell').waitFor(); await expect(page.locator('main')).not.toContainText('소속 군의 포털을 불러오는 중입니다.'); };
  await page.goto(origin);
  await check('login exposes 4 choices and rejects wrong code', async () => {
    await expect(page.getByTestId('portal-login')).toBeVisible();
    await expect(page.locator('.login-design-option')).toHaveCount(4);
    await page.getByLabel('접근코드', { exact: true }).fill('incorrect');
    await page.getByRole('button', { name: '03 Orbit 메인으로 입장' }).click();
    await expect(page.getByRole('alert')).toContainText('접근코드가 일치하지 않습니다');
    await expect(page.getByTestId('portal-shell')).toHaveCount(0);
  });
  await check('selected design opens after authentication, reload preserves it', async () => {
    await page.getByLabel('접근코드', { exact: true }).fill('demo1234');
    await page.getByRole('button', { name: '03 Orbit 메인으로 입장' }).click();
    await expect(page.getByTestId('portal-home')).toHaveAttribute('data-design', 'orbit');
    await page.reload();
    await expect(page.getByTestId('portal-home')).toHaveAttribute('data-design', 'orbit');
  });
  await check('all 4 homes have 4 services and no visible sidebar', async () => {
    for (const [index, name] of ['Aurora', 'Focus', 'Orbit', 'Canvas'].entries()) {
      await page.getByRole('button', { name: `0${index + 1} ${name}`, exact: true }).click();
      await expect(page.getByTestId('portal-home')).toHaveAttribute('data-design', name.toLowerCase());
      await expect(page.locator('.platform-card')).toHaveCount(4);
      await expect(page.getByRole('navigation', { name: '주 메뉴' })).toHaveCount(0);
      await expect(page.getByTestId('portal-shell')).toHaveAttribute('data-sidebar-mode', 'hidden');
    }
  });
  await check('launcher provides four icons and role-filtered portal functions', async () => {
    await page.getByRole('button', { name: '모든 앱', exact: true }).click();
    const menu = page.getByRole('dialog', { name: '모든 앱', exact: true });
    await expect(menu.locator('.launcher-apps button')).toHaveCount(4);
    await expect(menu.getByRole('link', { name: '개발 관리자', exact: true })).toHaveCount(0);
    await expect(menu.getByRole('link', { name: '프로젝트/워크스페이스', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
  });
  await check('unconfigured platform shows honest handoff, not simulated success', async () => {
    await page.getByRole('button', { name: 'AI 플랫폼 열기', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('아직 서비스 접속 주소가 연결되지 않았습니다');
    await page.getByRole('button', { name: '닫기', exact: true }).click();
  });
  await check('personal order and favorite persist after reload', async () => {
    await page.getByRole('button', { name: '나의 바로가기' }).click();
    await page.getByLabel('VDI', { exact: true }).check();
    await page.getByRole('button', { name: 'vdi 위로' }).click();
    await page.getByRole('button', { name: 'vdi 위로' }).click();
    await page.getByRole('button', { name: 'vdi 위로' }).click();
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await expect(page.locator('.platform-card').first()).toHaveAttribute('aria-label', 'VDI 열기');
    await page.reload();
    await expect(page.locator('.platform-card').first()).toHaveAttribute('aria-label', 'VDI 열기');
    await expect(page.locator('.platform-card').first().locator('.platform-favorite')).toHaveCount(1);
  });
  await check('general users cannot open admin routes directly', async () => {
    for (const route of ['/developer-console', '/platform-api-integration', '/tenant-management']) {
      await goto(route);
      await expect(page.locator('main')).toContainText('권한');
      await expect(page.getByRole('heading', { name: '플랫폼 연계 개발 콘솔' })).toHaveCount(0);
      await expect(page.getByRole('table', { name: '테넌트 사용자 플랫폼 접근 권한' })).toHaveCount(0);
    }
  });
  await goto('/developer-console?captureRole=portal-admin');
  await check('admin API catalog retains 40 interfaces without RFP codes', async () => {
    await expect(page.getByRole('heading', { name: '플랫폼 연계 개발 콘솔' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'API 카탈로그 40' })).toBeVisible();
    assert.ok(!/(?:SFR|SER|TER)-\d{3}/.test(await page.locator('main').innerText()));
  });
  await check('API sample validates edited JSON, error paths and persists history', async () => {
    await page.getByRole('tab', { name: 'API 테스트', exact: true }).click();
    const input = page.getByRole('textbox', { name: /요청 (?:파라미터|데이터) \(JSON\)/ });
    await input.fill('{ invalid }');
    await page.getByRole('button', { name: '샘플 계약 검증', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('JSON 문법이 올바르지 않습니다');
    await page.getByRole('button', { name: '샘플 값 채우기' }).click();
    await page.getByRole('button', { name: '샘플 계약 검증', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('통과');
    await page.getByRole('button', { name: '검증 시나리오' }).click();
    await page.getByRole('option', { name: '인증 만료 (401)' }).click();
    await page.getByRole('button', { name: '샘플 계약 검증', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('401');
    await expect(page.getByRole('button', { name: '접속 테스트', exact: true })).toBeDisabled();
    await page.getByRole('tab', { name: /테스트 이력/ }).click();
    await expect(page.locator('main')).toContainText('인증');
    await page.reload();
    await page.getByRole('tab', { name: /테스트 이력/ }).click();
    await expect(page.getByRole('button', { name: '이력 CSV' })).toBeEnabled();
  });
  await check('API history and full specification download', async () => {
    let event = page.waitForEvent('download');
    await page.getByRole('button', { name: '이력 CSV' }).click();
    let result = await event;
    assert.ok((await fs.readFile(await result.path(), 'utf8')).includes('샘플'));
    event = page.waitForEvent('download');
    await page.getByRole('button', { name: '연계 명세 내보내기' }).click();
    result = await event;
    assert.ok((await fs.readFile(await result.path(), 'utf8')).includes('VDI'));
  });
  await goto('/tenant-management');
  await check('superuser can assign tenant admin with explicit reason', async () => {
    const table = page.getByRole('table', { name: '테넌트 사용자 플랫폼 접근 권한' });
    await expect(table).toBeVisible();
    await table.getByRole('button', { name: '관리자로 지정', exact: true }).first().click();
    await page.getByLabel('지정 사유', { exact: true }).fill('운영 인수인계 담당자 지정');
    await page.getByRole('button', { name: '관리자 지정', exact: true }).click();
    await expect(page.getByRole('alert').last()).toContainText('관리자로 지정했습니다');
    await page.reload();
    await expect(table).toContainText('군별 관리자');
  });
  await check('tenant picker includes marine corps and platform policy persists', async () => {
    await goto('/tenant-settings');
    await page.getByRole('button', { name: '소속 군 선택' }).click();
    await expect(page.getByRole('option', { name: '해병대', exact: true })).toBeVisible();
    await page.getByRole('option', { name: '해병대', exact: true }).click();
    await page.getByRole('checkbox', { name: 'AI 플랫폼 이용 허용', exact: true }).uncheck();
    await page.getByRole('button', { name: '접근 설정 저장' }).click();
    await goto('/');
    await expect(page.getByRole('button', { name: 'AI 플랫폼 열기', exact: true })).toHaveAttribute('aria-disabled', 'true');
    await page.getByRole('button', { name: '소속 군 선택' }).click();
    await page.getByRole('option', { name: '육군', exact: true }).click();
    await expect(page.getByRole('button', { name: 'AI 플랫폼 열기', exact: true })).toHaveAttribute('aria-disabled', 'false');
  });
  await check('all homes and developer console fit mobile/tablet/desktop', async () => {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await goto('/');
      for (const [index, design] of ['Aurora', 'Focus', 'Orbit', 'Canvas'].entries()) {
        await page.getByRole('button', { name: `0${index + 1} ${design}`, exact: true }).click();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${design} overflow at ${width}`);
      }
      await goto('/developer-console');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `developer console overflow at ${width}`);
    }
  });
  await check('active page routes and tabs render without requirement IDs', async () => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const route of ['/admin-console', '/role-menu-preview', '/project-workspace', '/credit-manager', '/export-approval', '/service-catalog', '/my-page', '/environment-settings', '/tenant-management', '/integrated-search', '/tenant-settings', '/audit-history', '/proposal-board']) {
      await goto(route);
      const tabs = await page.getByRole('tab').count();
      for (let i = 0; i < tabs; i++) {
        await page.getByRole('tab').nth(i).click();
        assert.ok(!/(?:SFR|SER|TER)-\d{3}|RFP 요구사항/.test(await page.locator('main').innerText()), `requirement code at ${route} tab ${i}`);
      }
    }
  });
  await check('logout clears preview identity and returns to login', async () => {
    await page.getByRole('button', { name: '내 계정', exact: true }).click();
    await page.getByRole('button', { name: '로그아웃', exact: true }).click();
    await expect(page.getByTestId('portal-login')).toBeVisible();
    assert.equal(await page.evaluate(() => sessionStorage.getItem('kt-ai-portal-preview-authenticated')), null);
  });
  assert.deepEqual(errors, []);
  checks.push('no browser runtime exceptions');
  console.log(`${checks.length} experience scenarios passed`);
} catch (error) {
  await page?.screenshot({ path: `${evidence}/test-failure.png`, fullPage: true });
  throw error;
} finally {
  await fs.writeFile(`${evidence}/experience-report.json`, JSON.stringify({ checks, count: checks.length, errors, date: new Date().toISOString() }, null, 2));
  await browser.close();
}
