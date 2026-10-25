#!/usr/bin/env node
// 전용 일회성 로컬 DB에서 실제 runtime 권한/RLS와 HTTP API를 함께 검증한다.
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../backstage-portal/packages/backend/package.json', import.meta.url));
const knex = require('knex');
const express = require('express');
const { build } = require('esbuild');
if (process.env.POSTGRES_HOST && !['localhost','127.0.0.1'].includes(process.env.POSTGRES_HOST)) throw new Error('Only local disposable test databases are allowed');
const suffix = randomUUID().replaceAll('-', '').slice(0,12);
const database = `portal_test_${suffix}`;
const role = `runtime_${suffix}`;
const password = randomUUID();
const config = { host: '127.0.0.1', port: 5432, user: 'portal_admin', password: 'local-dev-only', database: 'postgres' };
const admin = knex({ client: 'pg', connection: config });
let owner, runtime, server;
const tmp = await mkdtemp(path.join(os.tmpdir(), 'portal-runtime-'));
let passed = 0;
const check = async (name, fn) => { await fn(); passed++; console.log(`PASS ${name}`); };
try {
  await admin.raw(`CREATE DATABASE ${database}`);
  await admin.raw(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`);
  owner = knex({ client: 'pg', connection: { ...config, database }, searchPath: ['portal'] });
  await owner.raw('CREATE SCHEMA portal');
  await owner.migrate.latest({ directory: path.resolve('backstage-portal/packages/backend/migrations/portal'), schemaName: 'portal', tableName: 'fc_knex_migrations' });
  await owner.raw(`GRANT USAGE ON SCHEMA portal TO ${role}`);
  await owner.raw(`GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA portal TO ${role}`);
  await owner.raw(`REVOKE UPDATE,DELETE ON portal.fc_audit_events FROM ${role}`);
  runtime = knex({ client: 'pg', connection: { ...config, database, user: role, password }, pool: { min: 0, max: 2 }, searchPath: ['portal'] });
  await build({ stdin: { contents: "export {createRouter} from './packages/backend/src/modules/portal/router'; export {authorizationForUser} from './packages/backend/src/modules/portal/services/rbac'; export {tenantMenuDefinitions} from './packages/backend/src/modules/portal/services/tenantSettings';", resolveDir: path.resolve('backstage-portal') }, bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile: path.join(tmp,'router.cjs') });
  // 외부 의존성은 workspace에 설치된 패키지에서 찾는다.
  const Module = require('module');
  const compiled = new Module(path.join(tmp,'router.cjs'));
  compiled.paths = require.resolve.paths('express');
  compiled._compile(await (await import('node:fs/promises')).readFile(path.join(tmp,'router.cjs'),'utf8'), path.join(tmp,'router.cjs'));
  const { createRouter, authorizationForUser, tenantMenuDefinitions } = compiled.exports;
  await check('server menu defaults match active frontend IDs and ordering',async()=>{
    const source=await readFile('backstage-portal/packages/app/src/components/navigation/portalMenuDefinitions.ts','utf8');
    const frontendIds=[...source.matchAll(/^\s+id: '([^']+)'/gm)].map(match=>match[1]);
    assert.deepEqual(tenantMenuDefinitions.map(menu=>menu.id),frontendIds);
  });
  const a = randomUUID(), b = randomUUID(), u = randomUUID(), other = randomUUID(), ma = randomUUID(), mo = randomUUID();
  await owner('portal.fc_tenants').insert([{id:a,code:'A',name:'A',branch:'army'}, {id:b,code:'B',name:'B',branch:'navy'}]);
  await owner('portal.fc_users').insert([{user_id:u,display_name:'Admin',status:'active'},{user_id:other,display_name:'User',status:'active'}]);
  await owner('portal.fc_external_identities').insert([{user_id:u,issuer:'backstage',subject:'user:test/admin',verified:true},{user_id:other,issuer:'backstage',subject:'user:test/user',verified:true}]);
  await owner('portal.fc_tenant_memberships').insert([{id:ma,tenant_id:a,user_id:u},{id:mo,tenant_id:a,user_id:other}]);
  await owner('portal.fc_roles').insert([{role_id:'portal-admin',name:'Admin',scope:'system'},{role_id:'reader',name:'Reader',scope:'tenant'},{role_id:'security-manager',name:'Security',scope:'tenant'}]);
  await owner('portal.fc_permissions').insert(['portal.view','rbac.manage','user.manage','krmf.manage','settings.manage','tenant.manage','menu.manage','audit.view'].map(permission_id=>({permission_id})));
  await owner('portal.fc_role_permissions').insert([{role_id:'reader',permission_id:'portal.view'},{role_id:'security-manager',permission_id:'krmf.manage'},...['portal.view','rbac.manage','user.manage','settings.manage','menu.manage','audit.view'].map(permission_id=>({role_id:'portal-admin',permission_id}))]);
  const aid = randomUUID();
  await owner('portal.fc_role_assignments').insert({id:aid,tenant_id:a,membership_id:ma,role_id:'portal-admin'});
  await check('runtime no-context RLS denies rows', async()=>assert.equal((await runtime('portal.fc_tenant_memberships')).length,0));
  await check('valid role with runtime tenant context', async()=>assert.ok((await authorizationForUser(runtime,u,a)).permissions.has('rbac.manage')));
  await check('system role cannot cross tenant boundary', async()=>assert.equal((await authorizationForUser(runtime,u,b)).permissions.size,0));
  await check('future membership has no permissions', async()=>{await owner('portal.fc_tenant_memberships').where({id:ma}).update({valid_from:new Date(Date.now()+3600000)});assert.equal((await authorizationForUser(runtime,u,a)).permissions.size,0);await owner('portal.fc_tenant_memberships').where({id:ma}).update({valid_from:new Date(Date.now()-1000)});});
  await check('expired membership has no permissions', async()=>{await owner('portal.fc_tenant_memberships').where({id:ma}).update({valid_until:new Date(Date.now()-1000)});assert.equal((await authorizationForUser(runtime,u,a)).permissions.size,0);await owner('portal.fc_tenant_memberships').where({id:ma}).update({valid_until:null});});
  await check('pool reuse leaves no tenant context', async()=>assert.equal((await runtime('portal.fc_tenant_memberships')).length,0));
  const app=express();
  const logger={info(){},warn(){},error(){},debug(){}};
  const httpAuth={ async credentials(req) { if (!['admin','user'].includes(req.header('x-test-user'))) { const e=new Error('missing');e.name='AuthenticationError';throw e; } return {principal:{type:'user',userEntityRef:`user:test/${req.header('x-test-user')}`}}; } };
  app.use(await createRouter({db:runtime,logger,httpAuth}));
  server=app.listen(0,'127.0.0.1'); await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const request=async(url,method='GET',body,tenant=a,user='admin')=>{ const response=await fetch(base+url,{method,headers:{'x-test-user':user,'x-portal-tenant-id':tenant,'content-type':'application/json'},body:body?JSON.stringify(body):undefined}); return {status:response.status,body:await response.json()}; };
  await check('health queries actual schema',async()=>assert.equal((await request('/v1/health')).status,200));
  await check('unauthenticated API is 401',async()=>assert.equal((await request('/v1/me','GET',undefined,a,'none')).status,401));
  await check('me returns only valid own memberships and server authorization under RLS',async()=>{const r=await request('/v1/me');assert.equal(r.status,200);assert.deepEqual(r.body.data.memberships.map(m=>m.tenant_id),[a]);assert.deepEqual(r.body.data.memberships[0].roles,['portal-admin']);assert.ok(r.body.data.memberships[0].permissions.includes('audit.view'));});
  await check('tenant selection and audit commit with runtime role',async()=>assert.equal((await request('/v1/context/tenant','POST',{tenantId:a})).status,200));
  await check('cross-tenant selection fails',async()=>assert.equal((await request('/v1/context/tenant','POST',{tenantId:b})).status,403));
  await check('tenant user listing works under RLS',async()=>{const r=await request('/v1/memberships');assert.equal(r.status,200);assert.equal(r.body.data.length,2);});
  await check('missing permission and cross tenant denied',async()=>{assert.equal((await request('/v1/memberships','GET',undefined,b)).status,403);assert.equal((await request('/v1/memberships','GET',undefined,a,'user')).status,403);});
  await check('cannot delegate permissions not held',async()=>assert.equal((await request('/v1/role-assignments','POST',{membershipId:mo,roleId:'security-manager',reason:'test'})).status,403));
  let rid;
  await check('assign role with expiry persists and records audit',async()=>{const r=await request('/v1/role-assignments','POST',{membershipId:mo,roleId:'reader',reason:'test',validUntil:new Date(Date.now()+3600000).toISOString()});assert.equal(r.status,201);rid=r.body.data.id;assert.ok(await owner('portal.fc_audit_events').where({resource_id:rid}).first());});
  await check('duplicate role assignment is conflict',async()=>assert.equal((await request('/v1/role-assignments','POST',{membershipId:mo,roleId:'reader',reason:'test'})).status,409));
  await check('role with future expiry can be revoked',async()=>assert.equal((await request(`/v1/role-assignments/${rid}/revoke`,'POST',{reason:'test'})).status,200));
  await check('last privileged assignment cannot be removed',async()=>assert.equal((await request(`/v1/role-assignments/${aid}/revoke`,'POST',{reason:'test'})).status,409));
  await check('only the hardened role revoke route is registered',async()=>{
    const source=await readFile('backstage-portal/packages/backend/src/modules/portal/routes/admin.ts','utf8');
    assert.equal(source.split("'/v1/role-assignments/:id/revoke'").length-1,1);
  });
  await check('ordinary revoke preserves reason and uses hardened audit event',async()=>{
    const revoked=await owner('portal.fc_role_assignments').where({id:rid}).first();
    assert.equal(revoked.reason,'회수: test');
    assert.ok(await owner('portal.fc_audit_events').where({resource_id:rid,action:'rbac.role.revoke'}).first());
    assert.equal((await request(`/v1/role-assignments/${rid}/revoke`,'POST',{reason:'again'})).status,404);
  });
  const secondAdminId=randomUUID();
  await owner('portal.fc_role_assignments').insert({id:secondAdminId,tenant_id:a,membership_id:mo,role_id:'portal-admin'});
  await check('a distinct administrator can be revoked while another remains active',async()=>{
    const r=await request(`/v1/role-assignments/${secondAdminId}/revoke`,'POST',{reason:'중복 관리자 정리'});
    assert.equal(r.status,200,JSON.stringify(r.body));
    assert.equal(r.body.data.revoked,true);
    assert.ok((await authorizationForUser(runtime,u,a)).permissions.has('rbac.manage'));
  });
  const futureAdminId=randomUUID();
  await owner('portal.fc_role_assignments').insert({id:futureAdminId,tenant_id:a,membership_id:mo,role_id:'portal-admin',valid_from:new Date(Date.now()+3600000)});
  await check('future administrators do not bypass last active administrator protection',async()=>{
    const r=await request(`/v1/role-assignments/${aid}/revoke`,'POST',{reason:'must stay active'});
    assert.equal(r.status,409);
    assert.equal(r.body.error.code,'last_privileged_assignment');
  });
  await owner('portal.fc_role_assignments').where({id:futureAdminId}).delete();
  let settings;
  await check('unsaved tenant settings return branch defaults and version zero',async()=>{
    const r=await request('/v1/tenant-settings');assert.equal(r.status,200);settings=r.body.data;
    assert.equal(settings.version,0);assert.equal(settings.branding.primaryColor,'#315b45');
    assert.ok(settings.menus.some(menu=>menu.id==='audit-history'));assert.ok(!settings.menus.some(menu=>menu.id==='krmf-evidence'));
  });
  await check('branding persists atomically with audit and version',async()=>{
    const r=await request('/v1/tenant-settings','PUT',{expectedVersion:0,branding:{...settings.branding,portalTitle:'Updated Army Portal'}});
    assert.equal(r.status,200);settings=r.body.data;assert.equal(settings.version,1);
    assert.equal((await request('/v1/tenant-settings')).body.data.branding.portalTitle,'Updated Army Portal');
    assert.deepEqual((await owner('portal.fc_audit_events').where({action:'tenant.settings.update',result:'success'}).first()).changed_fields,['branding.portalTitle']);
  });
  await check('stale editor cannot overwrite settings',async()=>{
    const r=await request('/v1/tenant-settings','PUT',{expectedVersion:0,branding:{...settings.branding,portalTitle:'Stale'}});assert.equal(r.status,409);
    assert.equal((await request('/v1/tenant-settings')).body.data.branding.portalTitle,'Updated Army Portal');
  });
  await check('concurrent editors cannot lose a settings update',async()=>{
    const responses=await Promise.all(['Editor one','Editor two'].map(portalTitle=>request('/v1/tenant-settings','PUT',{expectedVersion:settings.version,branding:{...settings.branding,portalTitle}})));
    assert.deepEqual(responses.map(response=>response.status).sort(),[200,409]);settings=responses.find(response=>response.status===200).body.data;
  });
  await check('malicious logo, unreadable color, hidden recovery menu and archived route rejected',async()=>{
    for(const logoUrl of ['javascript:alert(1)','//evil.test/logo','/\\evil.test/logo','https://user:password@evil.test/logo'])
      assert.equal((await request('/v1/tenant-settings','PUT',{expectedVersion:settings.version,branding:{...settings.branding,logoUrl}})).status,422);
    assert.equal((await request('/v1/tenant-settings','PUT',{expectedVersion:settings.version,branding:{...settings.branding,primaryColor:'#ffffff'}})).status,422);
    assert.equal((await request('/v1/tenant-settings','PUT',{expectedVersion:settings.version,menus:settings.menus.map(menu=>menu.id==='tenant-settings'?{...menu,visible:false}:menu)})).status,422);
    assert.equal((await request('/v1/tenant-settings','PUT',{expectedVersion:settings.version,menus:settings.menus.map((menu,index)=>index===1?{...menu,id:'krmf-evidence'}:menu)})).status,422);
  });
  await check('branding permission does not grant menu changes',async()=>{
    await owner('portal.fc_role_permissions').where({role_id:'portal-admin',permission_id:'menu.manage'}).delete();
    const r=await request('/v1/tenant-settings','PUT',{expectedVersion:settings.version,menus:settings.menus.map(menu=>menu.id==='proposal-board'?{...menu,visible:false}:menu)});assert.equal(r.status,403);
    await owner('portal.fc_role_permissions').insert({role_id:'portal-admin',permission_id:'menu.manage'});
  });
  await check('menu permission does not grant branding changes',async()=>{
    await owner('portal.fc_role_permissions').where({role_id:'portal-admin',permission_id:'settings.manage'}).delete();
    assert.equal((await request('/v1/tenant-settings','PUT',{expectedVersion:settings.version,branding:{...settings.branding,portalTitle:'Denied'}})).status,403);
    const r=await request('/v1/tenant-settings','PUT',{expectedVersion:settings.version,branding:settings.branding,menus:settings.menus.map(menu=>menu.id==='proposal-board'?{...menu,label:'Our ideas',visible:false}:menu)});assert.equal(r.status,200);settings=r.body.data;
    await owner('portal.fc_role_permissions').insert({role_id:'portal-admin',permission_id:'settings.manage'});
  });
  await check('settings RLS hides rows without context and prevents cross tenant changes',async()=>{
    assert.equal((await runtime('portal.fc_tenant_settings')).length,0);
    assert.equal((await request('/v1/tenant-settings','GET',undefined,b)).status,403);
    assert.equal((await request('/v1/tenant-settings','PUT',{expectedVersion:0,branding:settings.branding},b)).status,403);
    await assert.rejects(runtime.transaction(async trx=>{await trx.raw("SELECT set_config('portal.tenant_id', ?, true)",[b]);await trx('portal.fc_tenant_settings').insert({tenant_id:a,branding:'{}',menus:'[]',updated_by:u});}));
  });
  await owner('portal.fc_role_assignments').insert({tenant_id:a,membership_id:mo,role_id:'reader'});
  await check('reader can load appearance but cannot save or read audit ledger',async()=>{
    assert.equal((await request('/v1/tenant-settings','GET',undefined,a,'user')).status,200);
    assert.equal((await request('/v1/tenant-settings','PUT',{expectedVersion:settings.version,branding:{...settings.branding,portalTitle:'Denied'}},a,'user')).status,403);
    assert.equal((await request('/v1/audit-events','GET',undefined,a,'user')).status,403);
  });
  await check('client activity is attributed to verified identity and labeled client',async()=>{
    assert.equal((await request('/v1/activity','POST',{action:'page.view',pageId:'portal-dashboard'},a,'user')).status,201);
    const event=await owner('portal.fc_audit_events').where({action:'client.page.view'}).first();assert.equal(event.actor_id,other);assert.equal(event.reason_code,'client_reported');
    assert.equal((await request('/v1/activity','POST',{action:'session.start'},a,'user')).status,201);
    assert.equal((await request('/v1/activity','POST',{action:'page.view',pageId:'audit-history'},a,'user')).status,403);
    assert.equal((await request('/v1/activity','POST',{action:'page.view',pageId:'proposal-board'},a,'user')).status,403);
  });
  await check('client cannot forge audit actor result server action or archived page',async()=>{
    for(const body of [{action:'authn.login.success'},{action:'page.view',pageId:'portal-dashboard',actorId:u},{action:'page.view',pageId:'portal-dashboard',result:'denied'},{action:'page.view',pageId:'krmf-evidence'}])
      assert.equal((await request('/v1/activity','POST',body)).status,422);
  });
  await owner('portal.fc_audit_events').insert({tenant_id:b,actor_id:u,action:'private.other.tenant',result:'success'});
  await check('audit filters summaries and pagination are restricted to authorized tenant',async()=>{
    const r=await request('/v1/audit-events?category=usage&actor=User&pageSize=1');assert.equal(r.status,200);assert.equal(r.body.data.summary.total,1);assert.equal(r.body.data.summary.uniqueActors,1);
    assert.equal(r.body.data.items[0].tenantId,a);assert.equal(r.body.data.items[0].source,'client');assert.equal(r.body.data.summary.byCategory.usage,1);
    const denied=await request('/v1/audit-events?result=denied');assert.ok(denied.body.data.summary.denied>0);assert.equal(denied.body.data.summary.success,0);
    assert.equal((await request('/v1/audit-events','GET',undefined,b)).status,403);
    assert.equal((await request('/v1/audit-events?search=private.other.tenant')).body.data.summary.total,0);
    assert.equal((await request('/v1/audit-events?from=invalid')).status,422);assert.equal((await request('/v1/audit-events?pageSize=201')).status,422);
  });
  await check('audit snapshot prevents its own read events shifting pagination',async()=>{
    const first=(await request('/v1/audit-events?pageSize=1')).body.data;
    await request('/v1/activity','POST',{action:'session.end'});
    const next=(await request(`/v1/audit-events?pageSize=1&page=2&snapshot=${encodeURIComponent(first.pagination.snapshot)}`)).body.data;
    assert.equal(next.pagination.total,first.pagination.total);assert.notEqual(next.items[0].id,first.items[0].id);
  });
  await check('export requests have distinct immutable audit events',async()=>{
    const result=await request('/v1/audit-events?purpose=export&pageSize=10000&page=1');assert.equal(result.status,200);
    assert.equal(result.body.data.items.length,result.body.data.pagination.total);
    assert.ok(await owner('portal.fc_audit_events').where({action:'audit.history.export',actor_id:u,tenant_id:a}).first());
    assert.equal((await request('/v1/audit-events?purpose=erase')).status,422);
    assert.equal((await request('/v1/audit-events?purpose=export&page=2')).status,422);
    assert.equal((await request('/v1/audit-events?pageSize=10000')).status,422);
  });
  await check('export rejects over 10000 rows without returning a partial file',async()=>{
    const fixtures=Array.from({length:10001},()=>({event_id:randomUUID(),tenant_id:a,actor_id:u,action:'test.export.limit',result:'success',occurred_at:new Date(Date.now()-60000)}));
    await owner.batchInsert('portal.fc_audit_events',fixtures,1000);
    const exceeded=await request('/v1/audit-events?purpose=export&pageSize=10000&action=test.export.limit');
    assert.equal(exceeded.status,422);assert.equal(exceeded.body.error.code,'export_limit_exceeded');assert.equal(exceeded.body.data,undefined);
    assert.ok(await owner('portal.fc_audit_events').where({action:'audit.history.export',reason_code:'export_limit_exceeded',result:'denied'}).first());
    await owner('portal.fc_audit_events').where({event_id:fixtures[0].event_id}).delete();
    const allowed=await request('/v1/audit-events?purpose=export&pageSize=10000&action=test.export.limit');
    assert.equal(allowed.status,200);assert.equal(allowed.body.data.items.length,10000);assert.equal(allowed.body.data.pagination.total,10000);
    assert.equal(new Set(allowed.body.data.items.map(item=>item.id)).size,10000);
  });
  await check('export rows and summary retain one snapshot when an older event commits midway',async()=>{
    const delayed=await owner.transaction();
    await delayed('portal.fc_audit_events').insert({tenant_id:a,actor_id:u,action:'test.export.delayed',result:'success',occurred_at:new Date(Date.now()-60000)});
    // Commit a previously invisible event exactly between the aggregate and row
    // queries. READ COMMITTED would return a row omitted by the aggregate.
    const prototype=Object.getPrototypeOf(runtime.client),originalQuery=prototype.query;
    let committed=false;
    prototype.query=async function(connection,query){
      const result=await originalQuery.call(this,connection,query);
      if(!committed&&typeof query.sql==='string'&&query.sql.includes('COUNT(*) FILTER')){
        committed=true;await delayed.commit();
      }
      return result;
    };
    try{
      const result=await request('/v1/audit-events?purpose=export&pageSize=10000&action=test.export.delayed');
      assert.ok(committed);assert.equal(result.status,200);assert.equal(result.body.data.summary.total,0);assert.equal(result.body.data.items.length,0);
      assert.equal(Number((await owner('portal.fc_audit_events').where({action:'test.export.delayed'}).count('* as count').first()).count),1);
    }finally{prototype.query=originalQuery;if(!delayed.isCompleted())await delayed.rollback();}
  });
  await owner('portal.fc_role_permissions').insert({role_id:'portal-admin',permission_id:'tenant.manage'});
  await owner('portal.fc_roles').insert([{role_id:'general-user',name:'General',scope:'tenant'},{role_id:'branch-admin',name:'Tenant admin',scope:'tenant'}]);
  await owner('portal.fc_role_permissions').insert([{role_id:'general-user',permission_id:'portal.view'},...['portal.view','tenant.manage','user.manage'].map(permission_id=>({role_id:'branch-admin',permission_id}))]);
  await owner('portal.fc_role_assignments').insert({tenant_id:a,membership_id:mo,role_id:'general-user'});
  let platformPolicy;
  await check('platform policy reads defaults and unconfigured launch never returns a fake endpoint',async()=>{
    const r=await request('/v1/platform-access'); assert.equal(r.status,200); platformPolicy=r.body.data.policy; assert.equal(platformPolicy.platforms.length,4);
    const launched=await request('/v1/platforms/ai/launch','POST',{}); assert.equal(launched.status,200); assert.equal(launched.body.data.href,null);
    assert.ok(await owner('portal.fc_audit_events').where({action:'platform.launch',reason_code:'endpoint_unconfigured',result:'failed'}).first());
  });
  await check('tenant admins persist platform endpoints with optimistic concurrency and audit',async()=>{
    const next={...platformPolicy,platforms:platformPolicy.platforms.map(p=>p.id==='ai'?{...p,href:'https://ai.example.mil/workbench'}:p)};
    const r=await request('/v1/platform-access/policy','PUT',next);assert.equal(r.status,200);platformPolicy=r.body.data;
    assert.equal((await request('/v1/platform-access/policy','PUT',next)).status,409);
    assert.equal((await request('/v1/platforms/ai/launch','POST',{})).body.data.href,'https://ai.example.mil/workbench');
    assert.ok(await owner('portal.fc_audit_events').where({action:'platform.policy.update',result:'success'}).first());
  });
  await check('platform policy cannot be changed by readers or across tenants and enforces membership',async()=>{
    assert.equal((await request('/v1/platform-access/policy','PUT',platformPolicy,a,'user')).status,403);
    assert.equal((await request('/v1/platform-access/policy','PUT',platformPolicy,b)).status,403);
    assert.equal((await request('/v1/platform-access/policy','PUT',{...platformPolicy,userGrants:{[randomUUID()]:['ai']}})).status,422);
    assert.equal((await runtime('portal.fc_platform_access')).length,0);
  });
  await check('individual revoke is enforced by launch API and other users grants stay private',async()=>{
    const r=await request('/v1/platform-access/policy','PUT',{...platformPolicy,userGrants:{[other]:['data'],[u]:['ai','data','cloud','vdi']}}); assert.equal(r.status,200); platformPolicy=r.body.data;
    assert.equal((await request('/v1/platforms/ai/launch','POST',{},a,'user')).status,403);
    assert.equal((await request('/v1/platforms/data/launch','POST',{},a,'user')).status,200);
    const own=(await request('/v1/platform-access','GET',undefined,a,'user')).body.data.policy.userGrants;assert.deepEqual(Object.keys(own),[other]);
    const disabled=await request('/v1/platform-access/policy','PUT',{...platformPolicy,platforms:platformPolicy.platforms.map(p=>p.id==='ai'?{...p,enabled:false}:p)});assert.equal(disabled.status,200);platformPolicy=disabled.body.data;
    assert.equal((await request('/v1/platforms/ai/launch','POST',{})).status,403);
  });
  await check('personal preferences are stored for the verified user and cannot grant access',async()=>{
    const preferences={platformOrder:['vdi','ai','data','cloud'],favorites:['vdi']};
    assert.equal((await request('/v1/preferences','PUT',preferences,a,'user')).status,200);
    assert.deepEqual((await request('/v1/platform-access','GET',undefined,a,'user')).body.data.preferences,preferences);
    assert.deepEqual((await request('/v1/platform-access')).body.data.preferences.favorites,[]);
    assert.equal((await request('/v1/preferences','PUT',{...preferences,userId:u},a,'user')).status,422);
    assert.equal((await runtime('portal.fc_portal_preferences')).length,0);
  });
  await check('superuser can assign a tenant admin while ordinary users cannot',async()=>{
    assert.equal((await request('/v1/role-assignments','POST',{membershipId:ma,roleId:'branch-admin',reason:'forbidden'},a,'user')).status,403);
    assert.equal((await request('/v1/role-assignments','POST',{membershipId:mo,roleId:'branch-admin',reason:'Tenant administrator appointment'})).status,201);
    const members=await request('/v1/platform-access/members','GET',undefined,a,'user');assert.equal(members.status,200);assert.ok(members.body.data.find(member=>member.id===other).roles.includes('branch-admin'));
  });
  await check('new menu definitions preserve stored branding and existing menu customization',async()=>{
    await owner('portal.fc_tenant_settings').where({tenant_id:a}).update({menus:JSON.stringify(settings.menus.filter(menu=>menu.id!=='developer-console'))});
    const merged=(await request('/v1/tenant-settings')).body.data;assert.equal(merged.branding.portalTitle,settings.branding.portalTitle);assert.equal(merged.menus.find(menu=>menu.id==='proposal-board').label,'Our ideas');assert.ok(merged.menus.some(menu=>menu.id==='developer-console'));
  });
  await owner('portal.fc_role_assignments').where({membership_id:mo}).whereNull('valid_until').delete();
  await check('suspended account denied tenant selection',async()=>{await owner('portal.fc_users').where({user_id:u}).update({status:'suspended'});assert.equal((await request('/v1/context/tenant','POST',{tenantId:a})).status,403);await owner('portal.fc_users').where({user_id:u}).update({status:'active'});});
  await check('unverified identity denied',async()=>{await owner('portal.fc_external_identities').where({user_id:u}).update({verified:false});assert.equal((await request('/v1/me')).status,403);await owner('portal.fc_external_identities').where({user_id:u}).update({verified:true});});
  await check('audit failure rolls back settings update',async()=>{await owner.raw(`REVOKE INSERT ON portal.fc_audit_events FROM ${role}`);assert.equal((await request('/v1/tenant-settings','PUT',{expectedVersion:settings.version,branding:{...settings.branding,portalTitle:'Must roll back'}})).status,500);assert.equal((await request('/v1/tenant-settings')).body.data.version,settings.version);});
  await check('audit failure rolls back role assignment',async()=>{const r=await request('/v1/role-assignments','POST',{membershipId:mo,roleId:'reader',reason:'test'});assert.equal(r.status,500);const active=await owner('portal.fc_role_assignments').where({membership_id:mo}).whereNull('valid_until');assert.equal(active.length,0);});
  await check('runtime cannot edit audit ledger',async()=>assert.rejects(runtime('portal.fc_audit_events').update({action:'tamper'})));
  await check('runtime cannot delete audit ledger',async()=>assert.rejects(runtime('portal.fc_audit_events').delete()));
  console.log(`${passed} runtime integration checks passed (real PostgreSQL, disposable DB)`);
} finally {
  if(server) await new Promise(resolve=>server.close(resolve));
  if(runtime) await runtime.destroy(); if(owner) await owner.destroy();
  await admin.raw(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`);
  await admin.raw(`DROP ROLE IF EXISTS ${role}`); await admin.destroy();
  await rm(tmp,{recursive:true,force:true});
}
