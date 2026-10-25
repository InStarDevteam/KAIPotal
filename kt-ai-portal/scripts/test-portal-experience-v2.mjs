#!/usr/bin/env node
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../backstage-portal/package.json',import.meta.url));
const {chromium,expect}=require('@playwright/test');
const origin=process.env.PORTAL_REVIEW_ORIGIN||'http://localhost:3000';
const evidence='docs/portal-experience-v2/evidence';
await fs.mkdir(evidence,{recursive:true});
const browser=await chromium.launch();
const checks=[],errors=[];
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.on('pageerror',e=>errors.push(e.message));
const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS',name)};
const goto=async(route)=>{await page.goto(origin+route);await page.getByTestId('portal-shell').waitFor();await expect(page.locator('main')).not.toContainText('소속 군의 포털을 불러오는 중입니다.');};
try{
 await page.goto(origin);await page.getByLabel('접근코드',{exact:true}).fill('demo1234');await page.getByRole('button',{name:'01 Aurora 메인으로 입장'}).click();await page.getByTestId('portal-home').waitFor();
 await check('four desktop designs retain four platforms and direct work navigation',async()=>{
  for(const [i,name] of ['Aurora','Focus','Orbit','Canvas'].entries()){
   await page.getByRole('button',{name:`0${i+1} ${name}`,exact:true}).click();
   await expect(page.locator('.platform-card')).toHaveCount(4);
   await expect(page.getByRole('navigation',{name:'주 메뉴'})).toHaveCount(0);
   await expect(page.locator('.home-work-button')).toHaveAttribute('href','/portal-work');
   await page.evaluate(()=>window.scrollTo(0,0)); await page.screenshot({path:`${evidence}/after-${name.toLowerCase()}.png`,fullPage:true});
  }
 });
 await check('home work action directly opens personal landing, not a dialog',async()=>{
  await page.locator('.home-work-button').click();await expect(page).toHaveURL(/\/portal-work$/);
  await expect(page.getByTestId('portal-work')).toHaveAttribute('data-profile','personal');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.work-directory').getByRole('link',{name:'개발 관리자'})).toHaveCount(0);
  await page.evaluate(()=>window.scrollTo(0,0)); await page.screenshot({path:`${evidence}/work-personal.png`,fullPage:true});
 });
 await check('project filter and selected-project deep link work',async()=>{
  await page.getByLabel('내 프로젝트 검색').fill('장비 고장예측');await expect(page.locator('.work-project-card')).toHaveCount(1);
  await page.locator('.work-project-card').click();await expect(page).toHaveURL(/project=P-2025-002/);
  await expect(page.locator('main')).toContainText('장비 고장예측 모델 개발');
  await page.goBack();await page.getByTestId('portal-work').waitFor();
  await page.locator('.work-primary').click();await expect(page.getByRole('tab',{name:'작업 환경 생성 요청',exact:true})).toHaveAttribute('aria-selected','true');
 });
 await check('six effective roles receive their own landing and authorized directory',async()=>{
  for(const [role,profile] of Object.entries({'general-user':'personal','project-manager':'project','branch-admin':'tenant','portal-admin':'operations','security-manager':'security','security-auditor':'audit'})){
   await goto(`/portal-work?captureRole=${role}`);
   await expect(page.getByTestId('portal-work')).toHaveAttribute('data-profile',profile);
   await expect(page.getByRole('dialog')).toHaveCount(0);
   await page.evaluate(()=>window.scrollTo(0,0)); await page.screenshot({path:`${evidence}/work-${profile}.png`,fullPage:true});
   if(profile==='audit'){
    await expect(page.locator('.work-directory').getByRole('link',{name:'반입·반출 승인',exact:true})).toHaveCount(0);
    await expect(page.locator('.work-primary')).toHaveAttribute('href','/audit-history');
   }
   if(profile==='tenant'){
    await page.locator('.resource-row').first().click();
    await expect(page.getByRole('tab',{name:'군별 리소스 풀',exact:true})).toHaveAttribute('aria-selected','true');
   }
  }
 });
 await check('refresh and search use existing workflows',async()=>{
  await goto('/portal-work?captureRole=general-user');
  await page.getByRole('button',{name:'업무 현황 새로고침'}).click();await expect(page.getByRole('status')).toContainText('다시 불러왔습니다');
  await page.getByLabel('업무 자산 검색').fill('센서');await page.getByRole('button',{name:'자산 검색 실행'}).click();await expect(page).toHaveURL(/integrated-search\?q=/);await expect(page.getByRole('textbox').filter({visible:true}).first()).toBeVisible();
 });
 await check('mobile layouts have no horizontal overflow and keep all actions',async()=>{
  await page.setViewportSize({width:390,height:844});await goto('/?captureRole=general-user');
  for(const [i,name] of ['Aurora','Focus','Orbit','Canvas'].entries()){
   await page.getByRole('button',{name:`0${i+1} ${name}`,exact:true}).click();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`${name} overflows`);
   await expect(page.locator('.platform-card')).toHaveCount(4);
   await page.evaluate(()=>window.scrollTo(0,0)); await page.screenshot({path:`${evidence}/mobile-${name.toLowerCase()}.png`,fullPage:true});
  }
  await page.locator('.home-work-button').click();await page.getByTestId('portal-work').waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'work overflows');
  await expect(page.locator('.work-primary')).toBeVisible();
  const heading=await page.locator('.work-heading').boundingBox();
  const action=await page.locator('.work-primary').boundingBox();
  const metrics=await page.locator('.work-metrics').boundingBox();
  assert(action.y+action.height<=heading.y+heading.height+1,'work action is clipped');
  assert(metrics.y>=heading.y+heading.height,'summary overlaps heading');
  await page.evaluate(()=>window.scrollTo(0,0)); await page.screenshot({path:`${evidence}/mobile-work.png`,fullPage:true});
 });
 assert.deepEqual(errors,[]);
 await fs.writeFile(`${evidence}/test-results.json`,JSON.stringify({origin,checks,errors},null,2));
 console.log(`${checks.length} checks passed; no page errors`);
}finally{await browser.close()}
