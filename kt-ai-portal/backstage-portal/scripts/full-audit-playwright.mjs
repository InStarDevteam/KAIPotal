#!/usr/bin/env node
/**
 * 31.6단계 전수검증 Playwright 스크립트
 * - 일반/관리자 권한별 전체 라우트 접속 검증
 * - 콘솔/네트워크 오류 수집
 * - 화면 캡처 부적합 문구 검출
 * - 탭/CSV 다운로드 기능 확인
 */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

const BASE_URL = process.env.AUDIT_BASE_URL || 'https://kai-platform-d0ae0.web.app';
const ACCESS_CODE = process.env.AUDIT_ACCESS_CODE;
if (!ACCESS_CODE) {
  console.error('오류: AUDIT_ACCESS_CODE 환경변수가 필요합니다. 예) AUDIT_ACCESS_CODE=<접근코드> node scripts/full-audit-playwright.mjs');
  process.exit(1);
}

const BAD_WORDS = [
  '제안서', '제안팀', 'PoC', '데모', '검토용', '낭부 관리자', '남부 관리자', '낫부 관리자', '낮부 관리자',
  '제안/사업관리', '제안 발표', '캡처용', 'Mock', 'mock data', '프리뷰', 'preview',
];
const BAD_REGEX = new RegExp(BAD_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');

const GUEST_ROUTES = [
  { route: '/', name: '통합 대시보드', tabs: [], buttons: [] },
  { route: '/admin-console', name: '관리자 콘솔', tabs: ['사용자 등록 신청', '사용자 관리', '외부 사용자 관리', '권한/역할', '로그인 정책', '비밀번호 정책', '감사 로그', '메뉴 관리', '요구사항 현황'], buttons: [] },
  { route: '/krmf-evidence', name: 'K-RMF 증빙관리', tabs: [], buttons: [] },
  { route: '/service-catalog', name: '서비스/도구 카탈로그', tabs: [], buttons: [] },
  { route: '/export-approval', name: '반입·반출 승인', tabs: ['신청 목록', '신청 등록'], buttons: [] },
  { route: '/integrated-search', name: '통합검색', tabs: [], buttons: [] },
  { route: '/project-workspace', name: '프로젝트/워크스페이스', tabs: ['프로젝트 목록', '프로젝트 생성 신청'], buttons: [] },
  { route: '/credit-manager', name: '크레딧 관리', tabs: [], buttons: [] },
  { route: '/my-page', name: '마이페이지', tabs: [], buttons: [] },
  { route: '/environment-settings', name: '환경설정', tabs: [], buttons: [] },
  { route: '/tenant-management', name: '육해공군 관리', tabs: [], buttons: [] },
  { route: '/proposal-board', name: '제안 게시판', tabs: ['전체 제안', 'AI 모델 개발', '빅데이터 분석', '데이터셋 구축', '내 제안', '관리자 검토', '요구사항 대응 현황'], buttons: [] },
];

const ADMIN_ROUTES = [
  { route: '/requirement-coverage', name: '요구사항 대응현황', tabs: ['메뉴 대응현황', 'SFR 대응현황', '기능 대응현황', '변경이력', '질의사항'], buttons: ['메뉴 현황 CSV', '기능 현황 CSV'], csv: true },
  { route: '/requirement-progress', name: '요구사항 대응현황 별칭', tabs: ['메뉴 대응현황', 'SFR 대응현황', '기능 대응현황', '변경이력', '질의사항'], buttons: ['메뉴 현황 CSV', '기능 현황 CSV'], csv: true, alias: true },
  { route: '/platform-api-integration', name: '플랫폼 API 연계현황', tabs: [], buttons: ['CSV 다운로드'], csv: true },
  { route: '/workflow-scenarios', name: '업무흐름/연계 시나리오', tabs: ['포털 역할 요약', '사용자 여정', '업무흐름 시나리오'], buttons: ['요구사항 대응현황 보기', 'API 연계현황 보기'], csv: false },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function loginGuest(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  const pwd = page.locator('input[type="password"]');
  if (await pwd.count() > 0) {
    await pwd.fill(ACCESS_CODE);
    await page.locator('button[type="submit"]').click();
    await sleep(1500);
  }
  const enterBtn = page.locator('button:has-text("ENTER")');
  if (await enterBtn.count() > 0) {
    await enterBtn.click();
    await sleep(1500);
  }
}

async function setAdminPreview(page, enabled) {
  await page.evaluate(enabled => {
    if (enabled) sessionStorage.setItem('__kt_ai_portal_admin_preview__', 'true');
    else sessionStorage.removeItem('__kt_ai_portal_admin_preview__');
  }, enabled);
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(1000);
}

async function auditRoute(page, item, mode) {
  const errors = [];
  const networkErrors = [];
  const consoleErrors = [];

  const onConsole = msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  };
  const onResponse = resp => {
    const status = resp.status();
    const url = resp.url();
    if (status >= 400 && url.startsWith(BASE_URL)) {
      networkErrors.push(`${status} ${url}`);
    }
  };
  page.on('console', onConsole);
  page.on('response', onResponse);

  try {
    await page.goto(`${BASE_URL}${item.route}`, { waitUntil: 'networkidle', timeout: 20000 });
    await sleep(1000);
  } catch (e) {
    errors.push(`navigate error: ${e.message}`);
  }

  const title = await page.title().catch(() => 'unknown');
  const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
  const badMatch = BAD_REGEX.test(bodyText) ? bodyText.match(BAD_REGEX)[0] : null;
  const menuVisible = bodyText.includes(item.name) || (await page.locator(`text=${item.name}`).count() > 0);

  const tabResults = [];
  for (const tabLabel of item.tabs || []) {
    try {
      const tab = page.getByRole('tab').filter({ hasText: new RegExp(tabLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first();
      if (await tab.count() > 0) {
        await tab.click({ timeout: 3000 });
        await sleep(500);
        tabResults.push({ tab: tabLabel, status: 'ok' });
      } else {
        tabResults.push({ tab: tabLabel, status: 'tab not found' });
      }
    } catch (e) {
      tabResults.push({ tab: tabLabel, status: `error: ${e.message}` });
    }
  }

  const buttonResults = [];
  for (const btnLabel of item.buttons || []) {
    try {
      const re = new RegExp(btnLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      let btn = page.locator('button').filter({ hasText: re }).first();
      if (await btn.count() === 0) {
        btn = page.locator('a').filter({ hasText: re }).first();
      }
      if (await btn.count() > 0) {
        if (item.csv) {
          const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
            btn.click({ timeout: 3000 }),
          ]);
          await sleep(500);
          buttonResults.push({ button: btnLabel, status: download ? 'clicked (download started)' : 'clicked (no download event)' });
        } else {
          await btn.click({ timeout: 3000 });
          await sleep(500);
          buttonResults.push({ button: btnLabel, status: 'clicked' });
        }
      } else {
        buttonResults.push({ button: btnLabel, status: 'not found' });
      }
    } catch (e) {
      buttonResults.push({ button: btnLabel, status: `error: ${e.message}` });
    }
  }

  page.off('console', onConsole);
  page.off('response', onResponse);

  return {
    mode,
    route: item.route,
    name: item.name,
    title,
    menuVisible,
    badWord: badMatch,
    consoleErrors: [...new Set(consoleErrors)],
    networkErrors: [...new Set(networkErrors)],
    errors,
    tabResults,
    buttonResults,
    snippet: bodyText.replace(/\s+/g, ' ').slice(0, 200),
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  page.on('dialog', async dialog => {
    if (dialog.message().includes('legacy guest token') || dialog.message().includes('Failed to sign in')) {
      await dialog.accept();
    } else {
      await dialog.dismiss();
    }
  });

  await loginGuest(page);

  const guestResults = [];
  for (const item of GUEST_ROUTES) {
    guestResults.push(await auditRoute(page, item, 'guest'));
  }

  const adminDirectAsGuest = [];
  for (const item of ADMIN_ROUTES) {
    adminDirectAsGuest.push(await auditRoute(page, { route: item.route, name: item.name, tabs: [], buttons: [] }, 'guest-direct-admin'));
  }

  await setAdminPreview(page, true);

  const adminResults = [];
  for (const item of ADMIN_ROUTES) {
    adminResults.push(await auditRoute(page, item, 'admin'));
  }

  await browser.close();

  const reportPath = path.join(PROJECT_ROOT, 'docs', 'STAGE_31_6_AUDIT_RESULTS.md');
  const lines = [];
  lines.push('# 31.6단계 전수검증 결과');
  lines.push('');
  lines.push(`- 검증일: ${new Date().toISOString()}`);
  lines.push(`- 대상 사이트: ${BASE_URL}`);
  lines.push(`- Access Code: ${ACCESS_CODE}`);
  lines.push('');

  function table(rows) {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    lines.push('| ' + headers.join(' | ') + ' |');
    lines.push('| ' + headers.map(() => '---').join(' | ') + ' |');
    for (const row of rows) {
      lines.push('| ' + headers.map(h => String(row[h] ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>')).join(' | ') + ' |');
    }
    lines.push('');
  }

  lines.push('## 1. 일반 사용자 라우트 검증');
  table(guestResults.map(r => ({
    Route: r.route,
    화멪: r.name,
    진입: r.title.includes('국방') || r.menuVisible ? '정상' : '오류',
    콘솔오류: r.consoleErrors.length ? r.consoleErrors.join('<br>') : '없음',
    네트워크오류: r.networkErrors.length ? r.networkErrors.join('<br>') : '없음',
    부적합문구: r.badWord || '없음',
    조치사항: r.errors.concat(r.tabResults.filter(t => t.status !== 'ok').map(t => `${t.tab}: ${t.status}`)).concat(r.buttonResults.filter(b => !b.status.includes('clicked')).map(b => `${b.button}: ${b.status}`)).join('<br>') || '-',
  })));

  lines.push('## 2. 관리자 전용 URL 직접 접근 (일반 사용자)');
  table(adminDirectAsGuest.map(r => ({
    Route: r.route,
    화멪: r.name,
    결과: r.snippet.includes('접근 권한이 없습니다') ? '차단 정상' : (r.menuVisible ? '메뉴 노출(이상)' : '기타'),
    콘솔오류: r.consoleErrors.length ? r.consoleErrors.join('<br>') : '없음',
    네트워크오류: r.networkErrors.length ? r.networkErrors.join('<br>') : '없음',
    부적합문구: r.badWord || '없음',
  })));

  lines.push('## 3. 관리자 권한 라우트 검증');
  table(adminResults.map(r => ({
    Route: r.route,
    화멪: r.name,
    진입: r.title.includes('국방') || r.menuVisible ? '정상' : '오류',
    탭동작: r.tabResults.map(t => `${t.tab}(${t.status})`).join('<br>'),
    버튼CSV: r.buttonResults.map(b => `${b.button}(${b.status})`).join('<br>'),
    콘솔오류: r.consoleErrors.length ? r.consoleErrors.join('<br>') : '없음',
    네트워크오류: r.networkErrors.length ? r.networkErrors.join('<br>') : '없음',
    부적합문구: r.badWord || '없음',
  })));

  lines.push('## 4. 상세 로그');
  lines.push('```json');
  lines.push(JSON.stringify({ guestResults, adminDirectAsGuest, adminResults }, null, 2));
  lines.push('```');

  writeFileSync(reportPath, lines.join('\n'), 'utf-8');
  console.log(`Report written to ${reportPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
