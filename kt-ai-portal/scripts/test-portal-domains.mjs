#!/usr/bin/env node
// 신규 도메인(K-RMF·크레딧·반출·프로젝트·제안·카탈로그·통합검색) 종합 시나리오 시험.
// 실행: cd kt-ai-portal && node scripts/test-portal-domains.mjs
//   - 일회성 로컬 DB(portal_domains_<suffix>) 생성 → 9개 migration 적용 → esbuild 라우터 번들 → express 기동
//   - x-test-user / x-portal-tenant-id 헤더로 테스트 인증, 종료 시 DB/역할/임시 저장소 삭제
//   - 결과는 콘솔과 docs/final-completion/evidence/domain-api-tests.json 에 기록
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../backstage-portal/packages/backend/package.json', import.meta.url));
const knex = require('knex');
const express = require('express');
const { build } = require('esbuild');
if (process.env.POSTGRES_HOST && !['localhost','127.0.0.1'].includes(process.env.POSTGRES_HOST)) throw new Error('Only local disposable test databases are allowed');
const suffix = randomUUID().replaceAll('-', '').slice(0,12);
const database = `portal_domains_${suffix}`;
const role = `domains_${suffix}`;
const password = randomUUID();
const config = { host: '127.0.0.1', port: 5432, user: 'portal_admin', password: 'local-dev-only', database: 'postgres' };
const admin = knex({ client: 'pg', connection: config });
let owner, runtime, server;
const tmp = await mkdtemp(path.join(os.tmpdir(), 'portal-domains-'));
const storageDir = path.join(tmp, 'storage');
await mkdir(storageDir, { recursive: true });
process.env.PORTAL_FILE_STORAGE_DIR = storageDir;
const checks = [];
let passed = 0;
const check = async (id, scenario, fn) => {
  try {
    const detail = await fn() ?? 'ok';
    passed++;
    checks.push({ id, scenario, result: 'PASS', detail: String(detail).slice(0, 400) });
    console.log(`PASS [${id}] ${detail === 'ok' ? scenario : `${scenario} — ${detail}`}`);
  } catch (e) {
    const message = (e && e.message) ? e.message : String(e);
    checks.push({ id, scenario, result: 'FAIL', detail: message.slice(0, 400) });
    console.log(`FAIL [${id}] ${scenario}: ${message}`);
  }
};
try {
  await admin.raw(`CREATE DATABASE ${database}`);
  await admin.raw(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`);
  owner = knex({ client: 'pg', connection: { ...config, database }, searchPath: ['portal'] });
  await owner.raw('CREATE SCHEMA portal');
  await owner.migrate.latest({ directory: path.resolve('backstage-portal/packages/backend/migrations/portal'), schemaName: 'portal', tableName: 'fc_knex_migrations' });
  await owner.raw(`GRANT USAGE ON SCHEMA portal TO ${role}`);
  await owner.raw(`GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA portal TO ${role}`);
  await owner.raw(`REVOKE UPDATE,DELETE ON portal.fc_audit_events FROM ${role}`);
  runtime = knex({ client: 'pg', connection: { ...config, database, user: role, password }, pool: { min: 0, max: 4 }, searchPath: ['portal'] });
  await build({ stdin: { contents: "export {createRouter} from './packages/backend/src/modules/portal/router';", resolveDir: path.resolve('backstage-portal') }, bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile: path.join(tmp,'router.cjs') });
  const Module = require('module');
  const compiled = new Module(path.join(tmp,'router.cjs'));
  compiled.paths = require.resolve.paths('express');
  compiled._compile(await readFile(path.join(tmp,'router.cjs'),'utf8'), path.join(tmp,'router.cjs'));
  const { createRouter } = compiled.exports;

  // ── 사전 데이터: 테넌트 2개, 사용자 3명, 역할·권한 seed ──
  const a = randomUUID(), b = randomUUID();
  const adminA = randomUUID(), userA = randomUUID(), adminB = randomUUID();
  await owner('portal.fc_tenants').insert([{id:a,code:'A',name:'A',branch:'army'},{id:b,code:'B',name:'B',branch:'navy'}]);
  await owner('portal.fc_users').insert([
    {user_id:adminA,display_name:'A관리자',status:'active'},
    {user_id:userA,display_name:'A일반',status:'active'},
    {user_id:adminB,display_name:'B관리자',status:'active'},
  ]);
  await owner('portal.fc_external_identities').insert([
    {user_id:adminA,issuer:'backstage',subject:'user:test/admin',verified:true},
    {user_id:userA,issuer:'backstage',subject:'user:test/user',verified:true},
    {user_id:adminB,issuer:'backstage',subject:'user:test/badmin',verified:true},
  ]);
  const memAdminA = randomUUID(), memUserA = randomUUID(), memAdminB = randomUUID();
  await owner('portal.fc_tenant_memberships').insert([
    {id:memAdminA,tenant_id:a,user_id:adminA},{id:memUserA,tenant_id:a,user_id:userA},{id:memAdminB,tenant_id:b,user_id:adminB},
  ]);
  await owner('portal.fc_roles').insert([
    {role_id:'portal-admin',name:'Admin',scope:'system'},
    {role_id:'security-manager',name:'Security',scope:'tenant'},
    {role_id:'general-user',name:'General',scope:'tenant'},
  ]);
  const allPermissions = ['portal.view','rbac.manage','user.manage','settings.manage','tenant.manage','menu.manage','audit.view',
    'krmf.manage','krmf.review','krmf.view','krmf.evidence.submit',
    'credit.view','credit.approve','export.request','export.review',
    'project.request','project.approve','workspace.approve','catalog.view','integration.view'];
  await owner('portal.fc_permissions').insert(allPermissions.map(permission_id=>({permission_id})));
  await owner('portal.fc_role_permissions').insert([
    ...allPermissions.map(permission_id=>({role_id:'portal-admin',permission_id})),
    ...['krmf.manage','krmf.review','krmf.view','krmf.evidence.submit'].map(permission_id=>({role_id:'security-manager',permission_id})),
    ...['portal.view','krmf.evidence.submit','project.request','catalog.view'].map(permission_id=>({role_id:'general-user',permission_id})),
  ]);
  await owner('portal.fc_role_assignments').insert([
    {id:randomUUID(),tenant_id:a,membership_id:memAdminA,role_id:'portal-admin'},
    {id:randomUUID(),tenant_id:a,membership_id:memAdminA,role_id:'security-manager'},
    {id:randomUUID(),tenant_id:a,membership_id:memUserA,role_id:'general-user'},
    {id:randomUUID(),tenant_id:b,membership_id:memAdminB,role_id:'portal-admin'},
  ]);

  const app = express();
  const logger = {info(){},warn(){},error(){},debug(){}};
  const httpAuth = { async credentials(req) {
    const header = req.header('x-test-user');
    if (!['admin','user','badmin'].includes(header)) { const e=new Error('missing'); e.name='AuthenticationError'; throw e; }
    return {principal:{type:'user',userEntityRef:`user:test/${header}`}};
  } };
  app.use(await createRouter({db:runtime,logger,httpAuth}));
  server = app.listen(0,'127.0.0.1'); await new Promise(resolve=>server.once('listening',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (url, method='GET', body, tenant=a, user='admin') => {
    const response = await fetch(base+url,{method,headers:{'x-test-user':user,'x-portal-tenant-id':tenant,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
    const text = await response.text();
    let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
    return {status:response.status, body:parsed, headers:response.headers};
  };
  const upload = async (url, fields, file, tenant=a, user='user') => {
    const form = new FormData();
    for (const [k,v] of Object.entries(fields)) form.append(k, String(v));
    if (file) form.append('file', new Blob([file.bytes],{type:file.type}), file.name);
    const response = await fetch(base+url,{method:'POST',headers:{'x-test-user':user,'x-portal-tenant-id':tenant},body:form});
    const text = await response.text();
    let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
    return {status:response.status, body:parsed, headers:response.headers};
  };
  const download = async (url, tenant=a, user='user') => {
    const response = await fetch(base+url,{headers:{'x-test-user':user,'x-portal-tenant-id':tenant}});
    return {status:response.status, headers:response.headers, bytes:Buffer.from(await response.arrayBuffer())};
  };
  const csv = async (url, tenant=a, user='admin') => {
    const response = await fetch(base+url,{headers:{'x-test-user':user,'x-portal-tenant-id':tenant}});
    const bytes = Buffer.from(await response.arrayBuffer());
    return {status:response.status, bytes, text:bytes.toString('utf8')};
  };
  const hasBom = buf => buf.length>=3 && buf[0]===0xEF && buf[1]===0xBB && buf[2]===0xBF;

  // ── S0: migration 9개 전부 적용(빈 DB 초기화 경로) ──
  await check('S0-1','migration 9개 전부 적용 확인', async () => {
    const rows = await owner('portal.fc_knex_migrations').select('name');
    const expected = (await readdir('backstage-portal/packages/backend/migrations/portal')).filter(file => file.endsWith('.js')).sort();
    assert.deepEqual(rows.map(row => row.name).sort(), expected);
    return `migration ${rows.length}개 적용`; 
  });

  // ── S1: K-RMF 기준선·통제·overview 집계 ──
  let baseline1, c1, c2, c3;
  await check('S1-1','관리자 기준선 생성(이름+버전)', async () => {
    const r = await request('/v1/krmf/baselines','POST',{name:'시험 기준선',version:'1.0',description:'종합 시험'});
    assert.equal(r.status,201); baseline1 = r.body.data.id;
    assert.equal(r.body.data.status,'draft');
    return `baseline ${baseline1}`;
  });
  await check('S1-2','통제 3건 등록 + 제외 사유 필수 검증', async () => {
    const denied = await request('/v1/krmf/baselines/'+baseline1+'/controls','POST',{control_code:'AC-03',title:'제외 통제',applicability:'excluded'});
    assert.equal(denied.status,422); assert.equal(denied.body.error.code,'alternative_reason_required');
    const r1 = await request('/v1/krmf/baselines/'+baseline1+'/controls','POST',{control_code:'AC-01',title:'계정 관리',applicability:'applied',owner_id:userA});
    assert.equal(r1.status,201); c1 = r1.body.data.id;
    const r2 = await request('/v1/krmf/baselines/'+baseline1+'/controls','POST',{control_code:'AC-02',title:'접근 통제',applicability:'applied',owner_id:userA});
    assert.equal(r2.status,201); c2 = r2.body.data.id;
    const r3 = await request('/v1/krmf/baselines/'+baseline1+'/controls','POST',{control_code:'AC-03',title:'물리 통제',applicability:'excluded',alternative_reason:'해당 시설 없음'});
    assert.equal(r3.status,201); c3 = r3.body.data.id;
    return '통제 3건(적용 2·제외 1), 사유 없는 제외 422';
  });
  await check('S1-3','overview 집계 일치(통제 3·적용 2·제외 1·이행률 0)', async () => {
    const r = await request(`/v1/krmf/overview?baseline_id=${baseline1}`);
    assert.equal(r.status,200);
    const d = r.body.data;
    assert.equal(d.total_controls,3); assert.equal(d.applied,2); assert.equal(d.excluded,1);
    assert.equal(d.implementation_rate,0); assert.equal(d.rate_label,'0%');
    return `total=${d.total_controls} applied=${d.applied} excluded=${d.excluded} rate=${d.rate_label}`;
  });

  // ── S2: 통제 0건 기준선 overview ──
  await check('S2-1','빈 기준선은 implementation_rate=null, 등록된 통제 없음', async () => {
    const created = await request('/v1/krmf/baselines','POST',{name:'빈 기준선',version:'0.1'});
    assert.equal(created.status,201);
    const r = await request(`/v1/krmf/overview?baseline_id=${created.body.data.id}`);
    assert.equal(r.status,200);
    assert.equal(r.body.data.total_controls,0);
    assert.equal(r.body.data.implementation_rate,null);
    assert.equal(r.body.data.rate_label,'등록된 통제 없음');
    return 'rate=null, rate_label=등록된 통제 없음';
  });

  // ── S3: 증적 업로드·멱등 replay·검토 승인·이행률 갱신 ──
  let evidence1; const evidenceKey = randomUUID(); const evidenceBytes = Buffer.from('증적 파일 본문(통제 AC-01 근거)','utf8');
  await check('S3-1','일반 사용자 증적 multipart 업로드(idempotency_key)', async () => {
    const r = await upload('/v1/krmf/evidences',{control_id:c1,title:'계정목록 증적',idempotency_key:evidenceKey},{name:'evidence-ac01.txt',type:'text/plain',bytes:evidenceBytes},a,'user');
    assert.equal(r.status,201,JSON.stringify(r.body));
    evidence1 = r.body.data.id;
    assert.equal(r.body.data.review_status,'pending');
    return `evidence ${evidence1}`;
  });
  await check('S3-2','동일 idempotency_key 재요청 replay — 중복 생성 0건', async () => {
    const r = await upload('/v1/krmf/evidences',{control_id:c1,title:'계정목록 증적',idempotency_key:evidenceKey},{name:'evidence-ac01.txt',type:'text/plain',bytes:evidenceBytes},a,'user');
    assert.equal(r.status,201); assert.equal(r.body.data.id,evidence1); assert.equal(r.body.data.replayed,true);
    const list = await request(`/v1/krmf/evidences?control_id=${c1}`,'GET',undefined,a,'admin');
    assert.equal(list.body.data.length,1);
    return 'replayed=true, 동일 id, 목록 1건';
  });
  await check('S3-3','관리자 검토 승인(expectedVersion 일치) + 재처리 409/재승인 replay', async () => {
    const r = await request(`/v1/krmf/evidences/${evidence1}/review`,'POST',{decision:'approved',comment:'승인','expectedVersion':1});
    assert.equal(r.status,200); assert.equal(r.body.data.review_status,'approved');
    const stale = await request(`/v1/krmf/evidences/${evidence1}/review`,'POST',{decision:'approved',comment:'재시도','expectedVersion':99});
    assert.equal(stale.status,409); assert.equal(stale.body.error.code,'already_reviewed');
    const same = await request(`/v1/krmf/evidences/${evidence1}/review`,'POST',{decision:'approved',comment:'승인','expectedVersion':1});
    assert.equal(same.status,200);
    return '승인 200, 버전 다른 재처리 409 already_reviewed, 동일 버전 재승인 200';
  });
  await check('S3-4','overview 이행률 1/2 = 50% 갱신', async () => {
    const r = await request(`/v1/krmf/overview?baseline_id=${baseline1}`);
    assert.equal(r.body.data.implementation_rate,50); assert.equal(r.body.data.rate_label,'50%');
    return 'implementation_rate=50%';
  });

  // ── S4: 권한·테넌트 격리·다운로드 무결성 ──
  await check('S4-1','검토 권한 없는 사용자의 검토 시도 403', async () => {
    const r = await request(`/v1/krmf/evidences/${evidence1}/review`,'POST',{decision:'rejected',comment:'시도'},a,'user');
    assert.equal(r.status,403); assert.equal(r.body.error.code,'permission_denied');
    return '403 permission_denied';
  });
  await check('S4-2','타 테넌트 사용자 증적 조회/다운로드 차단', async () => {
    const r = await download(`/v1/krmf/evidences/${evidence1}/file`,b,'badmin');
    assert.ok([403,404].includes(r.status),`status ${r.status}`);
    const list = await request(`/v1/krmf/evidences?control_id=${c1}`,'GET',undefined,b,'badmin');
    assert.equal(list.status,200); assert.equal(list.body.data.length,0);
    return `타 테넌트 다운로드 ${r.status}, 목록 0건`;
  });
  await check('S4-3','다운로드 파일 내용·원본명 일치', async () => {
    const r = await download(`/v1/krmf/evidences/${evidence1}/file`,a,'user');
    assert.equal(r.status,200);
    assert.ok(r.bytes.equals(evidenceBytes),'다운로드 바이트 불일치');
    const disposition = r.headers.get('content-disposition') ?? '';
    assert.ok(disposition.includes(encodeURIComponent('evidence-ac01.txt')),disposition);
    return '바이트 일치, 원본명 Content-Disposition 일치';
  });

  // ── S5: 미흡 조치 등록·상태 순서 강제·기한 overdue ──
  let action1; const pastDue = new Date(Date.now()-86400000).toISOString();
  await check('S5-1','조치 등록 원인 필수 + 기한 과거 등록', async () => {
    const noCause = await request('/v1/krmf/actions','POST',{control_id:c2,title:'원인 누락 조치'});
    assert.equal(noCause.status,422); assert.equal(noCause.body.error.code,'invalid_cause');
    const badControl = await request('/v1/krmf/actions','POST',{control_id:'not-a-uuid',title:'x',cause:'y'});
    assert.equal(badControl.status,422);
    const r = await request('/v1/krmf/actions','POST',{control_id:c2,title:'접근통제 미흡 조치',cause:'점검 누락',impact:'high',due_date:pastDue});
    assert.equal(r.status,201); action1 = r.body.data.id;
    assert.equal(r.body.data.status,'open');
    return '원인 없음 422, 조치 등록';
  });
  await check('S5-2','overdue 필터에 기한 경과 조치 반영', async () => {
    const r = await request('/v1/krmf/actions?overdue=true','GET',undefined,a,'admin');
    assert.equal(r.status,200);
    const found = r.body.data.find(item=>item.id===action1);
    assert.ok(found,'overdue 목록에 조치 없음');
    assert.ok(new Date(found.due_date).getTime() < Date.now());
    return 'overdue=true 목록에 기한 경과 조치 포함';
  });
  await check('S5-3','조치 상태 전이 순서 강제(open→in_progress→resolved→reconfirmed)', async () => {
    const skip = await request(`/v1/krmf/actions/${action1}`,'PATCH',{status:'resolved',resolution:'걸어넘기기'},a,'admin');
    assert.equal(skip.status,400); assert.equal(skip.body.error.code,'invalid_status_transition');
    const r1 = await request(`/v1/krmf/actions/${action1}`,'PATCH',{status:'in_progress'},a,'admin');
    assert.equal(r1.status,200);
    const noResolution = await request(`/v1/krmf/actions/${action1}`,'PATCH',{status:'resolved'},a,'admin');
    assert.equal(noResolution.status,422); assert.equal(noResolution.body.error.code,'resolution_required');
    const r2 = await request(`/v1/krmf/actions/${action1}`,'PATCH',{status:'resolved',resolution:'접근통제 재점검 완료'},a,'admin');
    assert.equal(r2.status,200);
    const r3 = await request(`/v1/krmf/actions/${action1}`,'PATCH',{status:'reconfirmed'},a,'admin');
    assert.equal(r3.status,200); assert.equal(r3.body.data.status,'reconfirmed');
    return '걸어넘기 400, 해결내용 필수 422, 순서 전이 성공';
  });

  // ── S6: 운영변경 등록·재검토·next_due 반영 ──
  let change1; const controlDue = '2099-06-01T00:00:00.000Z';
  await check('S6-1','운영변경 등록(유형 policy, 설명 필수 검증)', async () => {
    const noDesc = await request('/v1/krmf/changes','POST',{title:'설명 누락 변경',change_type:'policy'});
    assert.equal(noDesc.status,422); assert.equal(noDesc.body.error.code,'invalid_description');
    const badType = await request('/v1/krmf/changes','POST',{title:'유형 오류',change_type:'deploy',description:'설명'});
    assert.equal(badType.status,422); assert.equal(badType.body.error.code,'invalid_change_type');
    const r = await request('/v1/krmf/changes','POST',{title:'정책 갱신',change_type:'policy',description:'접근 정책 개정 반영',affected_control_ids:[c2],reassess_required:true,reassess_reason:'영향 재평가 필요'});
    assert.equal(r.status,201); change1 = r.body.data.id;
    assert.equal(r.body.data.status,'recorded');
    return '설명/유형 검증 422, 변경 등록';
  });
  await check('S6-2','재검토 요청(under_review) + 영향 통제 next_due overview 반영', async () => {
    const due = await request(`/v1/krmf/controls/${c2}`,'PATCH',{due_date:controlDue},a,'admin');
    assert.equal(due.status,200);
    const skip = await request(`/v1/krmf/changes/${change1}`,'PATCH',{status:'reassessed'},a,'admin');
    assert.equal(skip.status,400);
    const r = await request(`/v1/krmf/changes/${change1}`,'PATCH',{status:'under_review'},a,'admin');
    assert.equal(r.status,200); assert.equal(r.body.data.status,'under_review');
    const overview = await request(`/v1/krmf/overview?baseline_id=${baseline1}`);
    assert.equal(overview.body.data.changes_reassess_pending,1);
    assert.equal(overview.body.data.next_due,controlDue);
    return `next_due=${overview.body.data.next_due}, 재검토 대기 1건`;
  });

  // ── S7: TRR 항목 + 추적 연결 ──
  const krmfProject = randomUUID(); let trrItem1;
  await check('S7-1','TRR 항목 upsert 2건', async () => {
    await owner('portal.fc_projects').insert({id:krmfProject,tenant_id:a,name:'KRMF 시험 프로젝트',owner_user_id:userA});
    await owner('portal.fc_project_members').insert({project_id:krmfProject,tenant_id:a,user_id:userA});
    const namedBaseline=await request('/v1/krmf/baselines','POST',{name:'프로젝트 연결 기준선',version:'0.1',project_id:krmfProject});
    assert.equal(namedBaseline.status,201);
    const baselines=await request(`/v1/krmf/baselines?project_id=${krmfProject}&status=draft`);
    assert.equal(baselines.status,200);
    assert.equal(baselines.body.data.find(row=>row.id===namedBaseline.body.data.id)?.project_name,'KRMF 시험 프로젝트');
    const crossBaselines=await request(`/v1/krmf/baselines?project_id=${krmfProject}`,'GET',undefined,b,'badmin');
    assert.equal(crossBaselines.status,200);assert.equal(crossBaselines.body.data.length,0);
    const r = await request('/v1/krmf/trr/items','POST',{project_id:krmfProject,items:[{item_code:'TRR-01',title:'계정 시험'},{item_code:'TRR-02',title:'접근 시험'}]});
    assert.equal(r.status,201); assert.equal(r.body.data.upserted,2);
    trrItem1 = r.body.data.items.find(i=>i.item_code==='TRR-01').id;
    return 'TRR 항목 2건 upsert';
  });
  await check('S7-2','TRR PATCH evidence_ready/status 목록 반영', async () => {
    const r = await request(`/v1/krmf/trr/items/${trrItem1}`,'PATCH',{evidence_ready:true,status:'ready',note:'증적 준비 완료'});
    assert.equal(r.status,200);
    const list = await request(`/v1/krmf/trr?project_id=${krmfProject}`);
    const item = list.body.data.find(i=>i.id===trrItem1);
    assert.equal(item.status,'ready'); assert.equal(item.evidence_ready,true);
    const other = list.body.data.find(i=>i.item_code==='TRR-02');
    assert.equal(other.status,'not_ready');
    return 'ready/evidence_ready 반영, 미변경 항목 유지';
  });
  await check('S7-3','추적 연결 링크 등록(requirement) 후 미연결 조회에서 제외', async () => {
    await owner('portal.fc_krmf_control_link').insert({id:randomUUID(),tenant_id:a,control_id:c1,link_type:'requirement',ref_id:'REQ-0001',ref_title:'요구 1건',status:'linked'});
    const r = await request(`/v1/krmf/traceability?baseline_id=${baseline1}`);
    assert.equal(r.status,200);
    assert.ok(!r.body.data.unlinked_control_ids.includes(c1),'연결된 통제가 미연결 목록에 남음');
    assert.ok(r.body.data.unlinked_control_ids.includes(c2));
    assert.ok(r.body.data.unlinked_control_ids.includes(c3));
    const linked = r.body.data.controls.find(item=>item.control_id===c1);
    assert.equal(linked.links.requirement.length,1);
    return 'unlinked에서 c1 제외, requirement 링크 1건';
  });

  // ── S8: CSV export 3종(BOM·한글 헤더·실측 수치) ──
  await check('S8-1','implementation CSV — BOM, 한글 헤더, 실제 통제 수치', async () => {
    const r = await csv(`/v1/krmf/export?type=implementation&baseline_id=${baseline1}`);
    assert.equal(r.status,200);
    assert.ok(hasBom(r.bytes),'BOM 없음');
    const lines = r.text.replace(/^\uFEFF/,'').split('\r\n').filter(l=>l.length);
    assert.equal(lines.length,4,`헤더+3행 기대, 실제 ${lines.length}`);
    assert.ok(lines[0].includes('통제코드') && lines[0].includes('증적수'));
    const ac1 = lines.find(l=>l.startsWith('AC-01,'));
    const cells = ac1.split(',');
    assert.equal(cells[6],'1'); assert.equal(cells[7],'1'); assert.equal(cells[8],'1');
    return `BOM+헤더+${lines.length-1}데이터행, AC-01 증적수 1/승인 1(실측)`;
  });
  await check('S8-2','traceability CSV — 연결 상태 반영(가짜 수치 없음)', async () => {
    const r = await csv(`/v1/krmf/export?type=traceability&baseline_id=${baseline1}`);
    assert.equal(r.status,200); assert.ok(hasBom(r.bytes));
    assert.ok(r.text.includes('통제코드') && r.text.includes('요구링크수'));
    const ac1Line = r.text.split('\r\n').find(l=>l.startsWith('AC-01,'));
    assert.ok(ac1Line.includes('연결됨') && !ac1Line.includes('미해결'),ac1Line);
    const ac2Line = r.text.split('\r\n').find(l=>l.startsWith('AC-02,'));
    const ac2Cells = ac2Line.split(',');
    assert.equal(ac2Cells[2],'0','미연결 통제 요구링크수 0 기대');
    assert.equal(ac2Cells[6],'N','미연결 통제 미해결여부 N 기대');
    return 'AC-01 연결됨(실측), AC-02 요구링크 0·미해결 N';
  });
  await check('S8-3','evidence CSV — 실제 증적 1걧만 출력', async () => {
    const r = await csv(`/v1/krmf/export?type=evidence&baseline_id=${baseline1}`);
    assert.equal(r.status,200); assert.ok(hasBom(r.bytes));
    assert.ok(r.text.includes('통제코드') && r.text.includes('검토상태'));
    const lines = r.text.replace(/^\uFEFF/,'').split('\r\n').filter(l=>l.length);
    assert.equal(lines.length,2,`헤더+1행 기대, 실제 ${lines.length}`);
    assert.ok(lines[1].startsWith('AC-01,') && lines[1].includes('approved'));
    return '증적 1행(실측), 검토상태 approved';
  });

  // ── S9: 크레딧 상품·충전 신청·승인·원장 대조 ──
  let creditRequest1; const creditKey = randomUUID();
  await check('S9-1','크레딧 상품 등록(unit_price) — 목록 조회로 검증', async () => {
    await owner('portal.fc_credit_product').insert({id:randomUUID(),tenant_id:a,code:'CPU-HOUR',name:'CPU 시간',unit:'cpu-hour',unit_price:'120.0000',currency:'KRW',valid_from:new Date(Date.now()-86400000),active:true,created_by:adminA,updated_by:adminA});
    const r = await request('/v1/credits/products');
    assert.equal(r.status,200);
    const product = r.body.data.items.find(p=>p.code==='CPU-HOUR');
    assert.ok(product,'상품 없음');
    assert.equal(product.unit_price,'120.0000');
    return 'unit_price=120.0000 상품 조회';
  });
  await check('S9-2','일반 사용자 충전 신청(idempotency) + 같은 키 재신청 중복 0', async () => {
    const r = await request('/v1/credits/requests','POST',{type:'charge',owner_type:'user',owner_id:userA,amount:'100.0000',reason:'시험 충전',idempotency_key:creditKey},a,'user');
    assert.equal(r.status,201,JSON.stringify(r.body)); creditRequest1 = r.body.data.id;
    const replay = await request('/v1/credits/requests','POST',{type:'charge',owner_type:'user',owner_id:userA,amount:'100.0000',reason:'시험 충전',idempotency_key:creditKey},a,'user');
    assert.equal(replay.status,201); assert.equal(replay.body.data.id,creditRequest1);
    const list = await request('/v1/credits/requests?mine=true','GET',undefined,a,'user');
    const dup = list.body.data.items.filter(i=>i.idempotency_key===creditKey);
    assert.equal(dup.length,1);
    const forbidden = await request('/v1/credits/requests','POST',{type:'charge',owner_type:'user',owner_id:adminA,amount:'10',reason:'타인 신청 시도',idempotency_key:randomUUID()},a,'user');
    assert.equal(forbidden.status,403);
    return '재신청 동일 id, 목록 1건, 타인 신청 403';
  });
  await check('S9-3','승인권자 승인 → 잔액·원장 합산 대조', async () => {
    const r = await request(`/v1/credits/requests/${creditRequest1}/decision`,'POST',{decision:'approved',reason:'승인','expectedVersion':1});
    assert.equal(r.status,200,JSON.stringify(r.body)); assert.equal(r.body.data.status,'approved');
    const account = await request(`/v1/credits/accounts?owner_type=user&owner_id=${userA}`,'GET',undefined,a,'admin');
    assert.equal(account.status,200);
    assert.equal(account.body.data.account.balance,'100.0000');
    assert.equal(account.body.data.balanced,true);
    const sum = account.body.data.recentTransactions.reduce((acc,t)=>acc+Number(t.amount),0);
    assert.equal(Math.round(sum*10000),1000000);
    const transactions=await request(`/v1/credits/accounts/${account.body.data.account.id}/transactions?page=1&pageSize=1`,'GET',undefined,a,'user');
    assert.equal(transactions.status,200,JSON.stringify(transactions.body));
    assert.equal(transactions.body.data.pagination.total,1);
    assert.equal(transactions.body.data.items.length,1);
    assert.equal(transactions.body.data.items[0].amount,'100.0000');
    const nextPage=await request(`/v1/credits/accounts/${account.body.data.account.id}/transactions?page=2&pageSize=1`,'GET',undefined,a,'user');
    assert.equal(nextPage.status,200);assert.equal(nextPage.body.data.items.length,0);assert.equal(nextPage.body.data.pagination.total,1);
    const cross=await request(`/v1/credits/accounts/${account.body.data.account.id}/transactions`,'GET',undefined,b,'badmin');assert.equal(cross.status,404);
    const again = await request(`/v1/credits/requests/${creditRequest1}/decision`,'POST',{decision:'approved',reason:'중복 승인 시도'});
    assert.equal(again.status,409); assert.equal(again.body.error.code,'invalid_state');
    return '잔액 100.0000 = 원장 합산, 중복 승인 409';
  });

  // ── S10: 차감 잔액 부족 + 사용량 추이 미연동 ──
  await check('S10-1','차감 시 잔액 부족 409(잔액이 부족합니다)', async () => {
    const r = await request('/v1/credits/transactions','POST',{owner_type:'user',owner_id:userA,amount:'-999.0000',reason:'차감 시험'},a,'admin');
    assert.equal(r.status,409); assert.equal(r.body.error.code,'insufficient_balance');
    assert.equal(r.body.error.message,'잔액이 부족합니다.');
    const after = await request(`/v1/credits/accounts?owner_type=user&owner_id=${userA}`,'GET',undefined,a,'admin');
    assert.equal(after.body.data.account.balance,'100.0000');
    return "409 insufficient_balance '잔액이 부족합니다.', 잔액 유지";
  });
  await check('S10-2','사용량 추이 measured=false(가짜 수치 없음)', async () => {
    const denied = await request(`/v1/credits/usage/trend?owner_type=user&owner_id=${adminA}`,'GET',undefined,a,'user');
    assert.equal(denied.status,403);
    const r = await request(`/v1/credits/usage/trend?owner_type=user&owner_id=${userA}`,'GET',undefined,a,'user');
    assert.equal(r.status,200);
    assert.equal(r.body.data.measured,false);
    assert.deepEqual(r.body.data.items,[]);
    return 'measured=false, items=[], 타인 추이 403';
  });

  // ── S11: 반출 신청·승인·버전·다운로드·보완요청 ──
  let transferA, fileV1, fileV2; const transferKey = randomUUID();
  const v1Bytes = Buffer.from('반출 파일 본문 v1','utf8');
  await check('S11-1','반출 신청(multipart+공개동의+보안등급, idempotency)', async () => {
    const noConsent = await upload('/v1/transfer-requests',{kind:'export',subject_type:'artifact',title:'동의 누락',purpose:'시험',security_grade:'internal',public_consent:'false',public_scope:'tenant'},{name:'a.txt',type:'text/plain',bytes:v1Bytes},a,'user');
    assert.equal(noConsent.status,422);
    const r = await upload('/v1/transfer-requests',{kind:'export',subject_type:'artifact',title:'모델 반출',purpose:'시험 반출',security_grade:'internal',public_consent:'true',public_scope:'tenant',idempotency_key:transferKey},{name:'model-v1.txt',type:'text/plain',bytes:v1Bytes},a,'user');
    assert.equal(r.status,201,JSON.stringify(r.body)); transferA = r.body.data.id;
    const replay = await upload('/v1/transfer-requests',{kind:'export',subject_type:'artifact',title:'모델 반출',purpose:'시험 반출',security_grade:'internal',public_consent:'true',public_scope:'tenant',idempotency_key:transferKey},{name:'model-v1.txt',type:'text/plain',bytes:v1Bytes},a,'user');
    assert.equal(replay.status,201); assert.equal(replay.body.data.id,transferA);
    const detail = await request(`/v1/transfer-requests/${transferA}`,'GET',undefined,a,'user');
    fileV1 = detail.body.data.files[0].id;
    assert.equal(detail.body.data.files[0].version,1);
    return '동의 없는 공개범위 422, 신청+replay 동일 id, 파일 버전 1';
  });
  await check('S11-2','승인자 승인(approved_file_version=1) → 승인 파일 다운로드 200', async () => {
    const denied = await request(`/v1/transfer-requests/${transferA}/decision`,'POST',{decision:'approved',reason:'승인 시도'},a,'user');
    assert.equal(denied.status,403);
    const r = await request(`/v1/transfer-requests/${transferA}/decision`,'POST',{decision:'approved',reason:'반출 허가','expectedVersion':1},a,'admin');
    assert.equal(r.status,200); assert.equal(r.body.data.approved_file_version,1);
    const dl = await download(`/v1/transfer-requests/files/${fileV1}/download`,a,'user');
    assert.equal(dl.status,200); assert.ok(dl.bytes.equals(v1Bytes));
    return '승인 권한 없음 403, approved_file_version=1, 다운로드 바이트 일치';
  });
  await check('S11-3','신규 버전 업로드 시 staleApproval, 최신 버전 다운로드만 409 차단', async () => {
    const v2Bytes = Buffer.from('반출 파일 본문 v2(수정)','utf8');
    const up = await upload(`/v1/transfer-requests/${transferA}/files`,{},{name:'model-v2.txt',type:'text/plain',bytes:v2Bytes},a,'user');
    assert.equal(up.status,201,JSON.stringify(up.body));
    assert.equal(up.body.data.staleApproval,true);
    assert.equal(up.body.data.file.version,2);
    fileV2 = up.body.data.file.id;
    const detail = await request(`/v1/transfer-requests/${transferA}`,'GET',undefined,a,'admin');
    assert.equal(detail.body.data.staleApproval,true);
    assert.ok(detail.body.data.staleApprovalMessage.includes('재승인') || detail.body.data.staleApprovalMessage.includes('승인'));
    const latest = await download(`/v1/transfer-requests/files/${fileV2}/download`,a,'user');
    assert.equal(latest.status,409); assert.equal(JSON.parse(latest.bytes.toString()).error.code,'not_approved_version');
    const approved = await download(`/v1/transfer-requests/files/${fileV1}/download`,a,'user');
    assert.equal(approved.status,200); assert.ok(approved.bytes.equals(v1Bytes));
    return 'staleApproval=true, 최신 v2 다운로드 409, 승인 v1 다운로드 200';
  });
  await check('S11-4','보완요청 결정 후 신청자 파일 재업로드 시 in_review 전이', async () => {
    const created = await upload('/v1/transfer-requests',{kind:'import',subject_type:'server',title:'서버 반입',purpose:'시험 반입',security_grade:'internal',public_consent:'false',public_scope:'none'},{name:'server.txt',type:'text/plain',bytes:v1Bytes},a,'user');
    assert.equal(created.status,201);
    const requestB = created.body.data.id;
    const supplement = await request(`/v1/transfer-requests/${requestB}/decision`,'POST',{decision:'request_supplement',reason:'증적 보완 필요'},a,'admin');
    assert.equal(supplement.status,200); assert.equal(supplement.body.data.status,'supplement_requested');
    const up = await upload(`/v1/transfer-requests/${requestB}/files`,{},{name:'server-v2.txt',type:'text/plain',bytes:Buffer.from('반입 파일 보완 본문','utf8')},a,'user');
    assert.equal(up.status,201);
    assert.equal(up.body.data.status,'in_review');
    assert.equal(up.body.data.staleApproval,false);
    const detail = await request(`/v1/transfer-requests/${requestB}`,'GET',undefined,a,'admin');
    assert.equal(detail.body.data.status,'in_review');
    return 'supplement_requested → 파일 재업로드 → in_review';
  });

  // ── S14(선행): 카탈로그 항목 등록 — S12 신청에 필요 ──
  let catalogItem1;
  await check('S14-1','카탈로그 항목 등록(관리자) + 입력 검증', async () => {
    const invalid = await request('/v1/catalog/items','POST',{kind:'tool',category:'analysis'});
    assert.equal(invalid.status,422);
    const badKind = await request('/v1/catalog/items','POST',{kind:'weapon',category:'analysis',name:'x'});
    assert.equal(badKind.status,422);
    const r = await request('/v1/catalog/items','POST',{kind:'tool',category:'analysis',name:'분석 도구 A',summary:'시험 항목',accessType:'apply'},a,'admin');
    assert.equal(r.status,201); catalogItem1 = r.body.data.id;
    assert.equal(r.body.data.active,true);
    const denied = await request('/v1/catalog/items','POST',{kind:'tool',category:'analysis',name:'일반 사용자 등록 시도'},a,'user');
    assert.equal(denied.status,403);
    return '항목 등록 201, 비관리자 403, 무효 입력 422';
  });

  // ── S12: 프로젝트 생성·멤버·종료 블로킹·종료 성공 ──
  let project1, catalogApp1; const projectKey = randomUUID(); const appKey = randomUUID();
  await check('S12-1','프로젝트 생성(idempotency replay 동일 id)', async () => {
    const r = await request('/v1/projects','POST',{name:'시험 프로젝트 알파',description:'종료 시험',visibility:'public',idempotencyKey:projectKey},a,'user');
    assert.equal(r.status,201,JSON.stringify(r.body)); project1 = r.body.data.id;
    const replay = await request('/v1/projects','POST',{name:'시험 프로젝트 알파',description:'종료 시험',visibility:'public',idempotencyKey:projectKey},a,'user');
    assert.equal(replay.status,200); assert.equal(replay.body.data.id,project1);
    return '생성 201, replay 200 동일 id';
  });
  await check('S12-2','멤버 추가 + 중복 추가 409', async () => {
    const r = await request(`/v1/projects/${project1}/members`,'POST',{userId:adminA,role:'member'},a,'user');
    assert.equal(r.status,201);
    const dup = await request(`/v1/projects/${project1}/members`,'POST',{userId:adminA,role:'viewer'},a,'user');
    assert.equal(dup.status,409); assert.equal(dup.body.error.code,'already_member');
    const detail = await request(`/v1/projects/${project1}`,'GET',undefined,a,'user');
    assert.equal(detail.body.data.members.length,2);
    return '멤버 2명, 중복 409 already_member';
  });
  await check('S12-3','카탈로그 신청 pending 상태에서 종료 시도 → 409 close_blocked + blockers', async () => {
    const app = await request('/v1/catalog/applications','POST',{itemId:catalogItem1,projectId:project1,reason:'프로젝트 연결 신청',idempotencyKey:appKey},a,'user');
    assert.equal(app.status,201,JSON.stringify(app.body)); catalogApp1 = app.body.data.id;
    assert.equal(app.body.data.execution_status,'pending_platform');
    const closeReq = await request(`/v1/projects/${project1}/close-request`,'POST',{},a,'user');
    assert.equal(closeReq.status,200); assert.equal(closeReq.body.data.status,'closing');
    const noPreserve = await request(`/v1/projects/${project1}/close`,'POST',{},a,'user');
    assert.equal(noPreserve.status,422); assert.equal(noPreserve.body.error.code,'preserve_outputs_required');
    const blocked = await request(`/v1/projects/${project1}/close`,'POST',{preserveOutputs:true},a,'user');
    assert.equal(blocked.status,409); assert.equal(blocked.body.error.code,'close_blocked');
    assert.ok(Array.isArray(blocked.body.error.blockers),'blockers 구조 없음');
    assert.ok(blocked.body.error.blockers.some(bl=>bl.kind==='catalog_application'),JSON.stringify(blocked.body.error.blockers));
    return `close_blocked, blockers ${blocked.body.error.blockers.length}건(catalog_application 포함)`;
  });
  await check('S12-4','신청 처리 후 preserveOutputs=true 종료 성공', async () => {
    const denied = await request(`/v1/catalog/applications/${catalogApp1}/decision`,'POST',{decision:'approved'},a,'user');
    assert.equal(denied.status,403);
    const decision = await request(`/v1/catalog/applications/${catalogApp1}/decision`,'POST',{decision:'approved'},a,'admin');
    assert.equal(decision.status,200); assert.equal(decision.body.data.status,'approved');
    const close = await request(`/v1/projects/${project1}/close`,'POST',{preserveOutputs:true},a,'user');
    assert.equal(close.status,200,JSON.stringify(close.body)); assert.equal(close.body.data.status,'closed');
    const reopened = await request(`/v1/projects/${project1}`,'GET',undefined,a,'user');
    assert.equal(reopened.body.data.project.status,'closed');
    return '승인 후 종료 closed, 비결정권자 403';
  });

  // ── S13: 제안 작성·공감 토글·답변 후 수정 409 ──
  let proposal1; const proposalKey = randomUUID();
  await check('S13-1','제안 작성(idempotency replay 동일 id)', async () => {
    const r = await request('/v1/proposals','POST',{type:'feature',title:'제안 시험',necessity:'필요성',visibility:'tenant',idempotencyKey:proposalKey},a,'user');
    assert.equal(r.status,201,JSON.stringify(r.body)); proposal1 = r.body.data.id;
    const replay = await request('/v1/proposals','POST',{type:'feature',title:'제안 시험',necessity:'필요성',visibility:'tenant',idempotencyKey:proposalKey},a,'user');
    assert.equal(replay.status,200); assert.equal(replay.body.data.id,proposal1);
    return '작성 201, replay 200 동일 id';
  });
  await check('S13-2','본인 공감 → 중복 공감은 토글 취소(수치 반환)', async () => {
    const first = await request(`/v1/proposals/${proposal1}/sympathy`,'POST',{},a,'user');
    assert.equal(first.status,200); assert.equal(first.body.data.sympathyCount,1); assert.equal(first.body.data.mySympathy,true);
    const second = await request(`/v1/proposals/${proposal1}/sympathy`,'POST',{},a,'user');
    assert.equal(second.status,200);
    assert.ok(second.body.data.sympathyCount===0 || second.status===409,`공감 수치 ${second.body.data.sympathyCount}`);
    if (second.body.data.sympathyCount!==0) assert.equal(second.status,409);
    const third = await request(`/v1/proposals/${proposal1}/sympathy`,'POST',{},a,'user');
    assert.equal(third.status,200); assert.equal(third.body.data.sympathyCount,1);
    return '공감 1 → 토글 0 → 재공감 1';
  });
  await check('S13-3','관리자 답변(review) 후 수정 409 reviewed_locked', async () => {
    const denied = await request(`/v1/proposals/${proposal1}/reviews`,'POST',{decision:'answer',body:'일반 사용자 답변 시도'},a,'user');
    assert.equal(denied.status,403);
    const r = await request(`/v1/proposals/${proposal1}/reviews`,'POST',{decision:'answer',body:'검토 완료 답변'},a,'admin');
    assert.equal(r.status,201); assert.equal(r.body.data.status,'answered');
    const detail = await request(`/v1/proposals/${proposal1}`,'GET',undefined,a,'user');
    assert.equal(detail.body.data.proposal.status,'answered');
    const edit = await request(`/v1/proposals/${proposal1}`,'PATCH',{title:'수정 시도'},a,'user');
    assert.equal(edit.status,409); assert.equal(edit.body.error.code,'reviewed_locked');
    return '답변 201(answered), 답변 후 수정 409 reviewed_locked';
  });

  // ── S14(후속): 카탈로그 신청·승인 후 execution_status 유지 ──
  await check('S14-2','카탈로그 신청(idempotency) + 승인 후 execution_status=pending_platform 유지', async () => {
    const replay = await request('/v1/catalog/applications','POST',{itemId:catalogItem1,projectId:project1,reason:'프로젝트 연결 신청',idempotencyKey:appKey},a,'user');
    assert.equal(replay.status,200); assert.equal(replay.body.data.id,catalogApp1);
    const list = await request('/v1/catalog/applications?status=approved','GET',undefined,a,'admin');
    const app = list.body.data.items.find(item=>item.id===catalogApp1);
    assert.ok(app,'승인된 신청 목록에 없음');
    assert.equal(app.status,'approved');
    assert.equal(app.execution_status,'pending_platform','가짜 성공(provisioning/success) 금지');
    const work = await owner('portal.fc_work_requests').where({id:app.work_request_id}).first();
    assert.equal(work.status,'approved','원장 신청 상태 불일치');
    return "승인 후에도 execution_status='pending_platform'(플랫폼 미연동 상태 그대로)";
  });

  // ── S15: 통합검색 ──
  await check('S15-1','메뉴 검색(q 2자 이상·페이지) + 1자 검색 422', async () => {
    const short = await request('/v1/search?q=%ED%8F%AC&types=menu','GET',undefined,a,'user');
    assert.equal(short.status,422);
    const r = await request('/v1/search?q=%ED%8F%AC%ED%84%B8&types=menu&page_size=1&page=1','GET',undefined,a,'user');
    assert.equal(r.status,200);
    assert.equal(r.body.data.page_size,1);
    assert.equal(r.body.data.results.length,1);
    assert.ok(r.body.data.total>=2,`전체 ${r.body.data.total}`);
    const page2 = await request('/v1/search?q=%ED%8F%AC%ED%84%B8&types=menu&page_size=1&page=2','GET',undefined,a,'user');
    assert.equal(page2.body.data.results.length,1);
    assert.notEqual(page2.body.data.results[0].id,r.body.data.results[0].id);
    assert.ok(r.body.data.results[0].title.includes('포털'));
    return `total=${r.body.data.total}, 페이지 1/2 결과 상이, q 1자 422`;
  });
  await check('S15-2','프로젝트 검색 + 타 테넌트 결과 0건', async () => {
    const created = await request('/v1/projects','POST',{name:'검색용 프로젝트',visibility:'public'},a,'user');
    assert.equal(created.status,201);
    const r = await request(`/v1/search?q=${encodeURIComponent('검색용')}&types=project`,'GET',undefined,a,'user');
    assert.equal(r.status,200);
    assert.equal(r.body.data.results.length,1);
    assert.equal(r.body.data.results[0].type,'project');
    const cross = await request(`/v1/search?q=${encodeURIComponent('검색용')}&types=project`,'GET',undefined,b,'badmin');
    assert.equal(cross.status,200);
    assert.equal(cross.body.data.results.length,0,'타 테넌트 프로젝트 노출');
    return '본 테넌트 1건, 타 테넌트 0건';
  });
  await check('S15-3','외부 원천 /v1/search/sources integration_pending', async () => {
    const r = await request('/v1/search/sources','GET',undefined,a,'user');
    assert.equal(r.status,200);
    const external = r.body.data.sources.filter(s=>s.kind==='external');
    assert.ok(external.length>=4,`외부 원천 ${external.length}개`);
    assert.ok(external.every(s=>s.status==='integration_pending'),'외부 원천 상태 불일치');
    assert.ok(external.some(s=>s.key==='semantic'));
    return `외부 원천 ${external.length}개 전부 integration_pending`;
  });
  await check('S15-4','user 유형 검색 권한(user.manage 없으면 빈 결과, 있으면 조회)', async () => {
    const denied = await request(`/v1/search?q=${encodeURIComponent('관리')}&types=user`,'GET',undefined,a,'user');
    assert.equal(denied.status,200);
    assert.equal(denied.body.data.results.length,0,'일반 사용자 user 검색 결과 없음(권한)');
    const allowed = await request(`/v1/search?q=${encodeURIComponent('관리')}&types=user`,'GET',undefined,a,'admin');
    assert.equal(allowed.status,200);
    assert.ok(allowed.body.data.results.length>=1,'관리자 user 검색 결과 없음');
    assert.ok(allowed.body.data.results.every(item=>item.type==='user'));
    return '일반 빈 결과(200), user.manage 보유 시 조회';
  });

  // ── S16: 감사 이벤트 표본 검증 ──
  await check('S16-1','주요 쓰기 감사 이벤트 4종 표본 확인', async () => {
    const samples = [
      ['krmf.evidence.approved','증적 검토 승인'],
      ['transfer.request.approved','반출 승인'],
      ['project.close','프로젝트 종료'],
      ['proposal.review','제안 답변'],
    ];
    const found = [];
    for (const [action,label] of samples) {
      const r = await request(`/v1/audit-events?action=${encodeURIComponent(action)}&pageSize=50`,'GET',undefined,a,'admin');
      assert.equal(r.status,200,`${label} 조회 실패`);
      assert.ok(r.body.data.summary.total>=1,`${label} 감사 이벤트 없음`);
      found.push(`${label} ${r.body.data.summary.total}건`);
    }
    const denied = await request('/v1/audit-events','GET',undefined,a,'user');
    assert.equal(denied.status,403);
    return found.join('; ');
  });

  await check('S17-1','K-RMF unconfigured file storage rejects uploads and downloads but permits references', async () => {
    const configured = process.env.PORTAL_FILE_STORAGE_DIR;
    let guardServer;
    try {
      delete process.env.PORTAL_FILE_STORAGE_DIR;
      const guardApp = express();
      guardApp.use(await createRouter({db:runtime,logger,httpAuth}));
      guardServer = guardApp.listen(0,'127.0.0.1');
      await new Promise(resolve => guardServer.once('listening',resolve));
      const guardBase = `http://127.0.0.1:${guardServer.address().port}`;
      const headers = {'x-test-user':'user','x-portal-tenant-id':a};
      const overview = await fetch(guardBase+'/v1/krmf/overview',{headers});
      assert.equal(overview.status,200);
      assert.equal((await overview.json()).data.file_storage_configured,false);
      const form = new FormData();
      form.set('control_id',c1);form.set('title','Storage guard');
      form.set('file',new Blob(['synthetic'],{type:'text/plain'}),'guard.txt');
      const denied = await fetch(guardBase+'/v1/krmf/evidences',{method:'POST',headers,body:form});
      assert.equal(denied.status,503);
      assert.equal((await denied.json()).error.code,'storage_unavailable');
      const download = await fetch(guardBase+`/v1/krmf/evidences/${evidence1}/file`,{headers});
      assert.equal(download.status,503);
      const reference = new FormData();reference.set('control_id',c1);reference.set('title','Reference still supported');reference.set('reference_uri','https://evidence.example.invalid/synthetic');
      const accepted = await fetch(guardBase+'/v1/krmf/evidences',{method:'POST',headers,body:reference});
      assert.equal(accepted.status,201);
      return 'Explicit storage missing: capability=false, file upload/download=503, reference registration=201';
    } finally {
      if (guardServer) await new Promise(resolve => guardServer.close(resolve));
      if (configured === undefined) delete process.env.PORTAL_FILE_STORAGE_DIR;
      else process.env.PORTAL_FILE_STORAGE_DIR=configured;
    }
  });

  await check('S18-1','업무 요약이 크레딧·반입반출 원장을 포함하고 사용자·테넌트를 격리', async () => {
    const before = (await request('/v1/work/overview','GET',undefined,a,'admin')).body.data;
    const creditId=randomUUID(), transferId=randomUUID();
    await owner('portal.fc_credit_request').insert([
      {id:creditId,tenant_id:a,type:'charge',owner_type:'user',owner_id:adminA,amount:'5',reason:'종합 집계 검증',status:'requested',requested_by:adminA},
      {tenant_id:b,type:'charge',owner_type:'user',owner_id:adminB,amount:'5',reason:'다른 소속 제외',status:'requested',requested_by:adminB},
    ]);
    await owner('portal.fc_transfer_request').insert([
      {id:transferId,tenant_id:a,kind:'export',subject_type:'artifact',title:'종합 반출 집계',purpose:'검증',security_grade:'internal',public_consent:true,public_scope:'tenant',status:'requested',requested_by:adminA},
      {tenant_id:b,kind:'export',subject_type:'artifact',title:'다른 소속 제외',purpose:'검증',security_grade:'internal',public_consent:true,public_scope:'tenant',status:'requested',requested_by:adminB},
    ]);
    const after = (await request('/v1/work/overview','GET',undefined,a,'admin')).body.data;
    for (const type of ['credit','export']) assert.equal(after.approvalQueue.find(row=>row.type===type).count,before.approvalQueue.find(row=>row.type===type).count+1);
    assert.equal(after.myRequestTotal,before.myRequestTotal+2);
    assert(after.myRequests.some(row=>row.id===creditId));assert(after.myRequests.some(row=>row.id===transferId));
    const user = (await request('/v1/work/overview','GET',undefined,a,'user')).body.data;
    assert(!user.myRequests.some(row=>[creditId,transferId].includes(row.id)));
    assert.equal(user.approvalQueue.length,0);
    return 'Two separate ledgers included once, another tenant and another actor excluded';
  });

  await check('S19-1','장문 입력 줄바꿈 등록·수정·검토·신청은 허용하고 제목 제어문자는 거부', async () => {
    const longText='첫째 줄\r\n\t둘째 줄\n셋째 줄';
    const p=await request('/v1/projects','POST',{name:'장문 입력 프로젝트',description:longText,purpose:longText},a,'user');
    assert.equal(p.status,201);assert.equal(p.body.data.description,longText);
    const edit=await request(`/v1/projects/${p.body.data.id}`,'PATCH',{description:longText+'\n수정',purpose:longText,expectedVersion:p.body.data.version},a,'user');
    assert.equal(edit.status,200);assert.equal(edit.body.data.description,longText+'\n수정');
    assert.equal((await request('/v1/projects','POST',{name:'제목\n줄바꿈'},a,'user')).status,422);
    const proposal=await request('/v1/proposals','POST',{type:'feature',title:'장문 제안',necessity:longText,utilizationPlan:longText},a,'user');
    assert.equal(proposal.status,201);assert.equal(proposal.body.data.necessity,longText);
    assert.equal((await request(`/v1/proposals/${proposal.body.data.id}`,'PATCH',{necessity:longText+'\n수정'},a,'user')).status,200);
    assert.equal((await request(`/v1/proposals/${proposal.body.data.id}/reviews`,'POST',{decision:'answer',body:longText},a,'admin')).status,201);
    assert.equal((await request('/v1/proposals','POST',{type:'feature',title:'제목\n줄바꿈'},a,'user')).status,422);
    const item=await request('/v1/catalog/items','POST',{kind:'tool',category:'data',name:'장문 카탈로그',summary:longText,description:longText},a,'admin');
    assert.equal(item.status,201);assert.equal(item.body.data.description,longText);
    assert.equal((await request('/v1/catalog/applications','POST',{itemId:item.body.data.id,projectId:p.body.data.id,reason:longText},a,'user')).status,201);
    assert.equal((await request('/v1/catalog/items','POST',{kind:'tool',category:'data',name:'제목\n줄바꿈'},a,'admin')).status,422);
    assert.equal((await request('/v1/catalog/applications','POST',{itemId:item.body.data.id,reason:'내용\u0000제어문자'},a,'user')).status,422);
    return 'CR/LF/TAB descriptions round-trip through DB; titles and non-text controls still rejected';
  });

  await check('S19-2','전체 프로젝트 검색·101번째 페이지·제안 본인 필터·전체 집계·카탈로그 페이지 정합', async () => {
    const prefix=`PAGING-${randomUUID()}`;
    const projectRows=Array.from({length:101},(_,index)=>({id:randomUUID(),tenant_id:a,name:`${prefix}-${String(index).padStart(3,'0')}`,owner_id:userA,created_by:userA,updated_by:userA,visibility:'public',created_at:new Date(Date.UTC(2026,9,4,0,0,index))}));
    await owner('portal.fc_project').insert(projectRows);
    const last=await request(`/v1/projects?page=6&pageSize=20&q=${encodeURIComponent(prefix)}`,'GET',undefined,a,'user');
    assert.equal(last.status,200);assert.equal(last.body.data.pagination.total,101);assert.equal(last.body.data.items.length,1);assert.equal(last.body.data.items[0].id,projectRows[0].id);
    const cross=await request(`/v1/projects?q=${encodeURIComponent(prefix)}`,'GET',undefined,b,'badmin');assert.equal(cross.body.data.pagination.total,0);
    const wildcard=await request('/v1/projects?q=%25','GET',undefined,a,'user');assert.equal(wildcard.body.data.pagination.total,0);
    assert.equal((await request(`/v1/projects?q=${'x'.repeat(101)}`,'GET',undefined,a,'user')).status,422);
    const proposalRows=Array.from({length:51},(_,index)=>({id:randomUUID(),tenant_id:a,type:'feature',title:`${prefix}-제안-${index}`,author_id:userA,created_by:userA,updated_by:userA,visibility:'tenant'}));
    await owner('portal.fc_proposal').insert(proposalRows);
    const other=randomUUID();await owner('portal.fc_proposal').insert({id:other,tenant_id:a,type:'feature',title:'타인 제안',author_id:adminA,created_by:adminA,updated_by:adminA,visibility:'private'});
    await owner('portal.fc_proposal_sympathy').insert([{proposal_id:proposalRows[0].id,tenant_id:a,user_id:userA},{proposal_id:proposalRows[1].id,tenant_id:a,user_id:adminA}]);
    const own=await request('/v1/proposals?mine=true&page=3&pageSize=20','GET',undefined,a,'user');assert.equal(own.status,200);assert(own.body.data.items.length>0);assert(own.body.data.items.every(row=>row.author_id===userA));assert(!own.body.data.items.some(row=>row.id===other));
    const summary=own.body.data.summary;
    const expectedSympathy=await owner('portal.fc_proposal_sympathy').where({tenant_id:a,user_id:userA}).count('* as count').first();
    assert.equal(summary.my_sympathy,Number(expectedSympathy.count));assert.equal(summary.mine,own.body.data.pagination.total);
    const itemRows=Array.from({length:21},(_,index)=>({id:randomUUID(),tenant_id:a,kind:'tool',category:'labeling',name:`${prefix}-도구-${index}`,created_by:adminA,updated_by:adminA}));
    await owner('portal.fc_catalog_item').insert(itemRows);
    const catalog=await request('/v1/catalog/items?active=true&category=labeling&page=2&pageSize=20','GET',undefined,a,'user');assert.equal(catalog.status,200);assert.equal(catalog.body.data.pagination.total,21);assert.equal(catalog.body.data.items.length,1);assert.equal(catalog.body.data.summary.categories.labeling,21);
    const applicationRows=Array.from({length:21},()=>({id:randomUUID(),tenant_id:a,item_id:itemRows[0].id,reason:'페이지 시험',requested_by:userA}));
    await owner('portal.fc_catalog_application').insert(applicationRows);
    const applications=await request('/v1/catalog/applications?page=2&pageSize=20','GET',undefined,a,'user');assert.equal(applications.status,200);assert(applications.body.data.items.length>0);assert(applications.body.data.pagination.total>=21);assert(applications.body.data.items.every(row=>row.requested_by===userA));
    const firstApplications=await request('/v1/catalog/applications?page=1&pageSize=20','GET',undefined,a,'user');
    const firstIds=new Set(firstApplications.body.data.items.map(row=>row.id));assert(applications.body.data.items.every(row=>!firstIds.has(row.id)));
    const firstProposals=await request('/v1/proposals?mine=true&sort=sympathy&page=1&pageSize=20','GET',undefined,a,'user');
    const nextProposals=await request('/v1/proposals?mine=true&sort=sympathy&page=2&pageSize=20','GET',undefined,a,'user');
    const firstProposalIds=new Set(firstProposals.body.data.items.map(row=>row.id));assert(nextProposals.body.data.items.every(row=>!firstProposalIds.has(row.id)));
    return '101st project reachable, literal wildcard protected, own proposals paged before filtering, real personal sympathy and catalog totals';
  });

  const failed = checks.length - passed;
  const summary = { total: checks.length, passed, failed };
  console.log(`\n=== domain scenario tests: ${passed}/${checks.length} PASS, ${failed} FAIL ===`);
  const report = { generatedAt: new Date().toISOString(), database: 'disposable', checks, summary };
  const outDir = path.resolve('docs/final-completion/evidence');
  await mkdir(outDir,{recursive:true});
  await writeFile(path.join(outDir,'domain-api-tests.json'), JSON.stringify(report,null,2)+'\n');
  console.log(`report: ${path.join(outDir,'domain-api-tests.json')}`);
  if (failed > 0) process.exitCode = 1;
} finally {
  if (server) await new Promise(resolve=>server.close(resolve));
  if (runtime) await runtime.destroy(); if (owner) await owner.destroy();
  await admin.raw(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`);
  await admin.raw(`DROP ROLE IF EXISTS ${role}`); await admin.destroy();
  await rm(tmp,{recursive:true,force:true});
}
