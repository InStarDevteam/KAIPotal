#!/usr/bin/env node
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../backstage-portal/package.json',import.meta.url));
const { chromium }=require('@playwright/test');
const express=require('express');
const dir=path.resolve('docs/production-upgrade/evidence');
await fs.mkdir(dir,{recursive:true});
const app=express();
const dist=path.resolve('backstage-portal/packages/app/dist');
app.use(express.static(dist));app.get('*',(_req,res)=>res.sendFile(path.join(dist,'index.html')));
const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
const origin=process.env.PORTAL_TEST_URL ?? `http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
let checks=0;
try {
 const context=await browser.newContext();
 // 명시된 demo/capture 환경의 UI 시험. 서버 인증/업무 저장 시험과 구별한다.
 await context.addInitScript(()=>{sessionStorage.setItem('kt-ai-portal-preview-authenticated','true');sessionStorage.setItem('__kt_ai_portal_role_override__','portal-admin');});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 if (!process.env.PORTAL_TEST_URL) {
   await page.setViewportSize({width:1440,height:1000});
   await page.goto('https://kai-platform-d0ae0.web.app/',{waitUntil:'domcontentloaded'});
   await page.getByTestId('portal-shell').waitFor({timeout:30000});
   await page.screenshot({path:path.join(dir,'before-desktop.png'),fullPage:true});
 }
 for(const width of [390,768,1366,1440,1920]) {
  await page.setViewportSize({width,height:1000});
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'오늘의 업무를 시작하세요'}).waitFor();
  await page.screenshot({path:path.join(dir,`shell-${width}.png`),fullPage:true});
  const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(size.scroll<=size.width+1, `page overflow ${width}: ${JSON.stringify(size)}`); checks++;
  if(width<1024) {
   const toggle=page.locator('header').getByRole('button',{name:'메뉴 열기'});
   await toggle.click();
   await page.getByRole('navigation',{name:'주 메뉴'}).getByRole('link',{name:'통합 대시보드',exact:true}).waitFor();
   await page.keyboard.press('Escape');
   await page.waitForTimeout(400);
   assert.equal(await page.locator('header').getByRole('button',{name:'메뉴 열기'}).evaluate(el=>el===document.activeElement),true);
   checks++;
  } else {
   await page.getByRole('button',{name:'메뉴 접기',exact:true}).click();
   assert.equal(await page.getByTestId('portal-shell').getAttribute('data-sidebar-mode'),'compact');
   await page.getByRole('button',{name:'메뉴 펼치기',exact:true}).click();
   await page.locator('header').getByRole('button',{name:'메뉴 숨기기'}).click();
   assert.equal(await page.getByTestId('portal-shell').getAttribute('data-sidebar-mode'),'hidden');
   await page.locator('header').getByRole('button',{name:'메뉴 열기'}).click();checks+=3;
  }
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('header').getByRole('textbox',{name:'통합검색어'}).fill('한글 데이터');
 await page.locator('header').getByRole('textbox',{name:'통합검색어'}).press('Enter');
 await page.waitForURL('**/integrated-search?q=*'); assert.ok(page.url().includes(encodeURIComponent('한글 데이터')));checks++;
 await page.getByRole('button',{name:'사용 도움말',exact:true}).click();await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'닫기',exact:true}).click();checks++;
 for(const route of ['/admin-console','/tenant-management','/project-workspace','/service-catalog']) {
   await page.goto(origin+route,{waitUntil:'domcontentloaded'});await page.getByTestId('portal-shell').waitFor();
   await page.screenshot({path:path.join(dir,route.slice(1)+'.png'),fullPage:true});
   checks++;
 }
 assert.deepEqual(errors,[]);checks++;
 await fs.writeFile(path.join(dir,'ui-report.json'),JSON.stringify({origin,checks,widths:[390,768,1366,1440,1920],errors,time:new Date().toISOString()},null,2));
 console.log(`${checks} browser checks passed; evidence: ${dir}`);
} finally {await browser.close(); await new Promise(resolve=>server.close(resolve));}
