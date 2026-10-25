#!/usr/bin/env node
/** A disposable local PostgreSQL test. Never opens a remote database. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCustomerSamplePlan, seedCustomerSample, sampleId, SAMPLE_BATCH, SAMPLE_PREFIX } from './seed-customer-sample.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'backstage-portal/packages/backend/package.json'));
const knex = require('knex');
if (process.env.POSTGRES_HOST && !['localhost', '127.0.0.1'].includes(process.env.POSTGRES_HOST)) throw new Error('Only disposable local PostgreSQL databases are allowed.');
const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
const database = `portal_samples_${suffix}`;
const runtimeRole = `sample_${suffix}`;
const runtimePassword = randomUUID();
const config = { host: '127.0.0.1', port: 5432, user: 'portal_admin', password: 'local-dev-only', database: 'postgres' };
const admin = knex({ client: 'pg', connection: config });
let db, runtime, server, compiledDir;
const checks = [];
const check = async (id, scenario, fn) => {
  try { await fn(); checks.push({ id, scenario, result: 'PASS' }); console.log(`PASS ${id} ${scenario}`); }
  catch (error) { checks.push({ id, scenario, result: 'FAIL', detail: error.message }); console.log(`FAIL ${id} ${scenario}: ${error.message}`); }
};
const tenantId = randomUUID(), otherTenantId = randomUUID(), userId = randomUUID(), inactiveUserId = randomUUID();
const options = { tenantId, userId };
const plan = buildCustomerSamplePlan(options);
const expectedTables = new Set(plan.map(entry => entry.table));
const authTables = ['fc_tenants', 'fc_users', 'fc_external_identities', 'fc_tenant_memberships', 'fc_group_memberships', 'fc_roles', 'fc_permissions', 'fc_role_permissions', 'fc_role_assignments', 'fc_platform_access', 'fc_portal_preferences', 'fc_user_profiles'];
const snapshot = async tables => {
  const result = {};
  for (const table of tables) result[table] = await db(`portal.${table}`).orderByRaw('1').select('*');
  return result;
};
try {
  await admin.raw(`CREATE DATABASE ${database}`);
  await admin.raw(`CREATE ROLE ${runtimeRole} LOGIN PASSWORD '${runtimePassword}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`);
  db = knex({ client: 'pg', connection: { ...config, database }, searchPath: ['portal'] });
  await db.raw('CREATE SCHEMA portal');
  await db.migrate.latest({ directory: path.join(root, 'backstage-portal/packages/backend/migrations/portal'), schemaName: 'portal', tableName: 'fc_knex_migrations' });
  await db.raw(`GRANT USAGE ON SCHEMA portal TO ${runtimeRole}`);
  await db.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA portal TO ${runtimeRole}`);
  await db.raw(`REVOKE UPDATE, DELETE ON portal.fc_audit_events FROM ${runtimeRole}`);
  runtime = knex({ client: 'pg', connection: { ...config, database, user: runtimeRole, password: runtimePassword }, searchPath: ['portal'], pool: { min: 0, max: 2 } });
  await db('portal.fc_tenants').insert([{ id: tenantId, code: 'sample-test', name: '샘플 시험', branch: 'joint' }, { id: otherTenantId, code: 'other-test', name: '다른 테넌트', branch: 'navy' }]);
  await db('portal.fc_users').insert([{ user_id: userId, display_name: '시험 사용자', status: 'active' }, { user_id: inactiveUserId, display_name: '미소속 시험 사용자', status: 'active' }]);
  await db('portal.fc_tenant_memberships').insert({ id: randomUUID(), tenant_id: tenantId, user_id: userId });
  await db('portal.fc_external_identities').insert({ user_id: userId, issuer: 'backstage', subject: 'user:test/sample-admin', verified: true });
  await db('portal.fc_roles').insert({ role_id: 'portal-admin', name: '시험 관리자', scope: 'system' });
  const permissions = ['portal.view', 'catalog.view', 'credit.view', 'credit.approve', 'export.request', 'export.review', 'project.request', 'project.approve', 'workspace.request', 'workspace.approve', 'audit.view', 'krmf.view', 'krmf.manage', 'krmf.review', 'krmf.evidence.submit'];
  await db('portal.fc_permissions').insert(permissions.map(permission_id => ({ permission_id })));
  await db('portal.fc_role_permissions').insert(permissions.map(permission_id => ({ role_id: 'portal-admin', permission_id })));
  const membership = await db('portal.fc_tenant_memberships').where({ tenant_id: tenantId, user_id: userId }).first();
  await db('portal.fc_role_assignments').insert({ id: randomUUID(), tenant_id: tenantId, membership_id: membership.id, role_id: 'portal-admin' });
  const originalAuth = await snapshot(authTables);
  const realProjectId = randomUUID();
  await db('portal.fc_project').insert({ id: realProjectId, tenant_id: tenantId, name: '기존 입력 보존 시험', description: '기존 데이터', owner_id: userId, created_by: userId, updated_by: userId });
  const realProject = await db('portal.fc_project').where({ id: realProjectId }).first();

  await check('SEED01', '25테이블 74행 결정적 UUID와 명확한 합성 표기', async () => {
    assert.equal(plan.length, 74); assert.equal(expectedTables.size, 25);
    assert.deepEqual(plan, buildCustomerSamplePlan(options));
    assert.notEqual(sampleId(tenantId, 'project:document'), sampleId(otherTenantId, 'project:document'));
    for (const entry of plan) {
      assert.equal(entry.row.tenant_id, tenantId);
      for (const field of ['name', 'title', 'reason', 'body', 'note']) if (entry.row[field]) assert.ok(entry.row[field].startsWith(SAMPLE_PREFIX), `${entry.table}.${field}`);
    }
  });
  await check('SEED02', '기본 dry-run은 업무행·감사행을 생성하지 않음', async () => {
    const report = await seedCustomerSample(db, options);
    assert.equal(report.mode, 'dry-run'); assert.equal(report.rowsToInsert, 74); assert.equal(report.insertedRows, 0);
    assert.equal(Number((await db('portal.fc_projects').count('* as count').first()).count), 0);
    assert.equal(Number((await db('portal.fc_audit_events').count('* as count').first()).count), 0);
  });
  await check('SEED03', '현재 유효한 멤버십 없는 사용자 적재 거절', async () => {
    await assert.rejects(seedCustomerSample(db, { tenantId, userId: inactiveUserId, apply: true }), /active membership/);
    assert.equal(Number((await db('portal.fc_projects').count('* as count').first()).count), 0);
  });
  await check('SEED04', '자연키 충돌 시 이전 삽입행까지 전부 rollback', async () => {
    const item = plan.find(entry => entry.table === 'fc_catalog_item');
    const collisionId = randomUUID();
    await db('portal.fc_catalog_item').insert({ ...item.row, id: collisionId });
    await assert.rejects(seedCustomerSample(db, { ...options, apply: true }), /duplicate key/);
    assert.equal(Number((await db('portal.fc_projects').count('* as count').first()).count), 0);
    assert.equal(Number((await db('portal.fc_work_requests').count('* as count').first()).count), 0);
    assert.equal(Number((await db('portal.fc_audit_events').count('* as count').first()).count), 0);
    await db('portal.fc_catalog_item').where({ id: collisionId }).del();
  });
  await check('SEED05', '명시 apply는 74행과 실제 적재 감사 1행을 원자적으로 등록', async () => {
    const report = await seedCustomerSample(db, { ...options, apply: true });
    assert.equal(report.insertedRows, 74); assert.equal(report.auditEventsInserted, 1); assert.equal(report.existingRowsChanged, false);
    const audit = await db('portal.fc_audit_events').first();
    assert.equal(audit.action, 'sample.import'); assert.equal(audit.actor_type, 'system'); assert.equal(audit.actor_id, null); assert.equal(audit.resource_id, SAMPLE_BATCH);
  });
  await check('SEED06', '재실행은 중복·감사 추가 없이 멱등', async () => {
    const report = await seedCustomerSample(db, { ...options, apply: true });
    assert.equal(report.existingRows, 74); assert.equal(report.insertedRows, 0); assert.equal(report.auditEventsInserted, 0);
    const dry = await seedCustomerSample(db, options); assert.equal(dry.rowsToInsert, 0);
    assert.equal(Number((await db('portal.fc_audit_events').count('* as count').first()).count), 1);
  });
  await check('SEED07', '실제 기존 프로젝트와 사용자·역할·접근정책·프로필 무변경', async () => {
    assert.deepEqual(await db('portal.fc_project').where({ id: realProjectId }).first(), realProject);
    assert.deepEqual(await snapshot(authTables), originalAuth);
  });
  await check('SEED08', '시연 후 수정된 샘플 제목·버전은 재실행 시 보존', async () => {
    const projectId = sampleId(tenantId, 'project:document');
    await db('portal.fc_project').where({ id: projectId }).update({ name: `${SAMPLE_PREFIX} 고객 수정 제목`, version: 2 });
    await seedCustomerSample(db, { ...options, apply: true });
    const row = await db('portal.fc_project').where({ id: projectId }).first();
    assert.equal(row.name, `${SAMPLE_PREFIX} 고객 수정 제목`); assert.equal(row.version, 2);
  });
  await check('SEED09', '프로젝트 양원장·멤버십 3개가 동일 ID와 소속으로 연결', async () => {
    for (const logical of ['document', 'quality', 'archive']) {
      const projectId = sampleId(tenantId, `project:${logical}`);
      assert.ok(await db('portal.fc_project').where({ id: projectId }).first());
      assert.ok(await db('portal.fc_projects').where({ id: projectId }).first());
      assert.ok(await db('portal.fc_project_member').where({ project_id: projectId, user_id: userId, tenant_id: tenantId }).first());
      assert.ok(await db('portal.fc_project_members').where({ project_id: projectId, user_id: userId, tenant_id: tenantId }).first());
    }
  });
  await check('SEED10', '크레딧 거래합계·잔액 일치, 기존 사용자·테넌트 계정 없음', async () => {
    const account = await db('portal.fc_credit_account').first();
    const sum = await db('portal.fc_credit_transaction').where({ account_id: account.id }).sum('amount as amount').first();
    assert.equal(sum.amount, account.balance); assert.equal(account.balance, '108000.0000'); assert.equal(account.owner_type, 'project');
    assert.equal(await db('portal.fc_credit_account').whereIn('owner_type', ['user', 'tenant']).first(), undefined);
    assert.equal(Number((await db('portal.fc_credit_transaction').count('* as count').first()).count), 4);
  });
  await check('SEED11', '카탈로그 3신청과 승인함 참조·상태 정합 및 실행 대기', async () => {
    const applications = await db('portal.fc_catalog_application'); assert.equal(applications.length, 3);
    for (const application of applications) {
      const work = await db('portal.fc_work_requests').where({ id: application.work_request_id }).first();
      assert.equal(work.status, application.status); assert.equal(work.payload.refType, 'catalog_application'); assert.equal(work.payload.refId, application.id);
      assert.equal(application.execution_status, 'pending_platform'); assert.equal(work.payload.executionStatus, 'pending_platform');
    }
  });
  await check('SEED12', 'K-RMF는 draft·합성 코드·미승인 참조 증적, 공식 인가 판정 없음', async () => {
    const baseline = await db('portal.fc_krmf_baseline').first(); assert.equal(baseline.status, 'draft'); assert.ok(baseline.description.includes('공식'));
    for (const control of await db('portal.fc_krmf_control')) { assert.ok(control.control_code.startsWith('SAMPLE-')); assert.notEqual(control.status, 'verified'); }
    const evidence = await db('portal.fc_krmf_evidence').first(); assert.equal(evidence.kind, 'reference'); assert.equal(evidence.review_status, 'pending'); assert.equal(evidence.file_id, null);
    assert.equal(await db('portal.fc_krmf_eval_record').whereIn('kind', ['authority_confirmation', 'risk_acceptance']).first(), undefined);
    assert.equal(await db('portal.fc_krmf_file').first(), undefined); assert.equal(await db('portal.fc_transfer_file').first(), undefined);
  });
  await check('SEED13', '미등록 파일을 승인하거나 실제 전송 완료로 표시하지 않음', async () => {
    const transfers = await db('portal.fc_transfer_request'); assert.equal(transfers.length, 4);
    for (const transfer of transfers) { assert.notEqual(transfer.status, 'approved'); assert.equal(transfer.approved_file_version, null); assert.equal(transfer.security_grade, 'public'); }
    assert.equal(await db('portal.fc_outbox_events').first(), undefined);
  });
  await check('SEED14', 'runtime RLS: context 없음·다른 tenant에서 sample rows 0건', async () => {
    for (const table of expectedTables) assert.equal(Number((await runtime(`portal.${table}`).count('* as count').first()).count), 0, `${table}: no context`);
    await runtime.transaction(async trx => {
      await trx.raw("SELECT set_config('portal.tenant_id', ?, true)", [otherTenantId]);
      for (const table of expectedTables) assert.equal(Number((await trx(`portal.${table}`).count('* as count').first()).count), 0, `${table}: other tenant`);
    });
    await runtime.transaction(async trx => {
      await trx.raw("SELECT set_config('portal.tenant_id', ?, true)", [tenantId]);
      assert.equal(Number((await trx('portal.fc_projects').count('* as count').first()).count), 3);
    });
  });
  await check('SEED15', '같은 ID의 다른 소유자 충돌을 수정 없이 거절', async () => {
    const rowId = sampleId(tenantId, 'project:quality');
    await db('portal.fc_project').where({ id: rowId }).update({ created_by: inactiveUserId });
    await assert.rejects(seedCustomerSample(db, { ...options, apply: true }), /identity collision/);
    assert.equal((await db('portal.fc_project').where({ id: rowId }).first()).created_by, inactiveUserId);
    await db('portal.fc_project').where({ id: rowId }).update({ created_by: userId });
  });
  await check('SEED16', '부분 삭제된 크레딧 원장은 자동 복원·잔액 변경을 거절', async () => {
    const transactionId = sampleId(tenantId, 'credit-transaction:adjust');
    const transaction = await db('portal.fc_credit_transaction').where({ id: transactionId }).first();
    await db('portal.fc_credit_transaction').where({ id: transactionId }).del();
    await assert.rejects(seedCustomerSample(db, { ...options, apply: true }), /Partial sample credit ledger/);
    assert.equal(await db('portal.fc_credit_transaction').where({ id: transactionId }).first(), undefined);
    assert.equal((await db('portal.fc_credit_account').first()).balance, '108000.0000');
    await db('portal.fc_credit_transaction').insert(transaction);
  });
  await check('SEED21', '기존 샘플의 다른 tenant 부모·JSON 통제 참조를 수정 없이 거절', async () => {
    const foreignProjectId = randomUUID();
    await db('portal.fc_projects').insert({ id: foreignProjectId, tenant_id: otherTenantId, name: '타 테넌트 프로젝트', owner_user_id: userId });
    const workId = sampleId(tenantId, 'work:workspace-reviewing');
    const original = await db('portal.fc_work_requests').where({ id: workId }).first();
    await db('portal.fc_work_requests').where({ id: workId }).update({ project_id: foreignProjectId });
    await assert.rejects(seedCustomerSample(db, { ...options, apply: true }), /Cross-tenant or missing reference/);
    assert.equal((await db('portal.fc_work_requests').where({ id: workId }).first()).project_id, foreignProjectId);
    await db('portal.fc_work_requests').where({ id: workId }).update({ project_id: original.project_id });
    const changeId = sampleId(tenantId, 'krmf-change:policy');
    const originalChange = await db('portal.fc_krmf_change').where({ id: changeId }).first();
    await db('portal.fc_krmf_change').where({ id: changeId }).update({ affected_control_ids: JSON.stringify([randomUUID()]) });
    await assert.rejects(seedCustomerSample(db, { ...options, apply: true }), /Cross-tenant or missing reference/);
    await db('portal.fc_krmf_change').where({ id: changeId }).update({ affected_control_ids: JSON.stringify(originalChange.affected_control_ids) });
  });
  await check('SEED22', '기존 샘플의 미소속 사용자 참조를 변경 없이 거절', async () => {
    const projectId = sampleId(tenantId, 'project:document');
    await db('portal.fc_project').where({ id: projectId }).update({ owner_id: inactiveUserId });
    await assert.rejects(seedCustomerSample(db, { ...options, apply: true }), /outside the selected tenant/);
    assert.equal((await db('portal.fc_project').where({ id: projectId }).first()).owner_id, inactiveUserId);
    await db('portal.fc_project').where({ id: projectId }).update({ owner_id: userId });
  });
  await check('SEED23', '조직·그룹 각 2개 샘플 계층 연결, 실제 사용자 소속·그룹 미배정', async () => {
    for (const [table, logical] of [['fc_organizations', 'organization'], ['fc_groups', 'group']]) {
      const rows = await db(`portal.${table}`).where({ tenant_id: tenantId }); assert.equal(rows.length, 2);
      const parent = rows.find(row => row.id === sampleId(tenantId, `${logical}:review`));
      const child = rows.find(row => row.id === sampleId(tenantId, `${logical}:data`));
      assert.equal(parent.parent_id, null); assert.equal(child.parent_id, parent.id);
      for (const row of rows) { assert.ok(row.code.startsWith('SAMPLE-')); assert.ok(row.name.startsWith(SAMPLE_PREFIX)); }
      if (table === 'fc_groups') assert.equal(parent.allow_nesting, true);
    }
    assert.deepEqual(await snapshot(authTables), originalAuth);
    assert.equal(await db('portal.fc_group_memberships').first(), undefined);
    assert.equal((await db('portal.fc_tenant_memberships').where({ tenant_id: tenantId, user_id: userId }).first()).organization_id, null);
  });

  // Seeded records are also read and changed through the real Express BFF,
  // using the ordinary runtime role rather than the schema owner.
  compiledDir = await mkdtemp(path.join(os.tmpdir(), 'portal-sample-router-'));
  const outputFile = path.join(compiledDir, 'router.cjs');
  await require('esbuild').build({ stdin: { contents: "export {createRouter} from './packages/backend/src/modules/portal/router';", resolveDir: path.join(root, 'backstage-portal') }, bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile: outputFile });
  const Module = require('module');
  const compiled = new Module(outputFile); compiled.paths = require.resolve.paths('express'); compiled._compile(await readFile(outputFile, 'utf8'), outputFile);
  const loggerErrors = [];
  const logger = { info() {}, warn() {}, debug() {}, error(message) { loggerErrors.push(String(message)); } };
  const httpAuth = { async credentials() { return { principal: { type: 'user', userEntityRef: 'user:test/sample-admin' } }; } };
  const app = require('express')(); app.use(await compiled.exports.createRouter({ db: runtime, logger, httpAuth }));
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const request = async (url, method = 'GET', body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${url}`, { method, headers: { 'x-portal-tenant-id': tenantId, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const result = { status: response.status, body: await response.json() }; return result;
  };
  const projectId = sampleId(tenantId, 'project:document');
  const baselineId = sampleId(tenantId, 'krmf-baseline:draft');
  await check('SEED17', '샘플 19개 API 실제 runtime 조회·집계·검색 정상', async () => {
    const urls = ['/v1/projects', `/v1/projects/${projectId}`, '/v1/work/overview', '/v1/work/requests', '/v1/catalog/items', '/v1/catalog/applications', '/v1/credits/products', `/v1/credits/accounts?owner_type=project&owner_id=${projectId}`, '/v1/credits/requests', '/v1/transfer-requests', '/v1/proposals', '/v1/krmf/baselines', `/v1/krmf/overview?baseline_id=${baselineId}`, `/v1/krmf/baselines/${baselineId}/controls`, '/v1/krmf/evidences', '/v1/krmf/actions', '/v1/krmf/changes', '/v1/krmf/eval-records', `/v1/search?q=${encodeURIComponent('시연 샘플')}&types=project`];
    for (const url of urls) { const result = await request(url); assert.equal(result.status, 200, `${url}: ${JSON.stringify(result.body)}`); }
    const credit = await request(`/v1/credits/accounts?owner_type=project&owner_id=${projectId}`); assert.equal(credit.body.data.balanced, true);
    const overview = await request('/v1/work/overview'); assert.equal(overview.body.data.myRequestTotal, 14); assert.equal(overview.body.data.myProjectTotal, 2);
    assert.equal(loggerErrors.length, 0, loggerErrors.join('\n'));
  });
  await check('SEED18', '샘플 카탈로그 승인 실제 API·연결 원장 갱신, 실행 대기 유지', async () => {
    const applicationId = sampleId(tenantId, 'catalog-application:new');
    const result = await request(`/v1/catalog/applications/${applicationId}/decision`, 'POST', { decision: 'approved' });
    assert.equal(result.status, 200, JSON.stringify(result.body)); assert.equal(result.body.data.status, 'approved'); assert.equal(result.body.data.execution_status, 'pending_platform');
    assert.equal((await db('portal.fc_work_requests').where({ id: result.body.data.work_request_id }).first()).status, 'approved');
  });
  await check('SEED19', '샘플 크레딧 승인 실제 API 거래·잔액 일치와 seed 재실행 보존', async () => {
    const requestId = sampleId(tenantId, 'credit-request:new');
    const result = await request(`/v1/credits/requests/${requestId}/decision`, 'POST', { decision: 'approved', reason: `${SAMPLE_PREFIX} 승인 동작 시험`, expectedVersion: 1 });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    const report = await seedCustomerSample(db, { ...options, apply: true }); assert.equal(report.insertedRows, 0);
    const account = await request(`/v1/credits/accounts?owner_type=project&owner_id=${projectId}`);
    assert.equal(account.body.data.account.balance, '138000.0000'); assert.equal(account.body.data.balanced, true);
    const again = await request(`/v1/credits/requests/${requestId}/decision`, 'POST', { decision: 'approved', reason: `${SAMPLE_PREFIX} 중복 승인 시험` }); assert.equal(again.status, 409);
  });
  await check('SEED20', '샘플 업무 신청 반려·증적 검토 실제 API와 멱등 seed 보존', async () => {
    const workId = sampleId(tenantId, 'work:workspace-requested');
    const decision = await request(`/v1/work/approvals/${workId}/decisions`, 'POST', { decision: 'rejected', note: `${SAMPLE_PREFIX} 정보 보완 시험`, expectedVersion: 1 }); assert.equal(decision.status, 200, JSON.stringify(decision.body));
    const evidenceId = sampleId(tenantId, 'krmf-evidence:reference');
    const evidence = await request(`/v1/krmf/evidences/${evidenceId}/review`, 'POST', { decision: 'approved', comment: `${SAMPLE_PREFIX} 합성 안내문 검토 시험`, expectedVersion: 1 }); assert.equal(evidence.status, 200, JSON.stringify(evidence.body));
    await seedCustomerSample(db, { ...options, apply: true });
    assert.equal((await db('portal.fc_work_requests').where({ id: workId }).first()).status, 'rejected');
    assert.equal((await db('portal.fc_krmf_evidence').where({ id: evidenceId }).first()).review_status, 'approved');
    assert.equal(loggerErrors.length, 0, loggerErrors.join('\n'));
  });
} catch (error) {
  checks.push({ id: 'SETUP', scenario: 'Disposable database setup', result: 'FAIL', detail: error.message });
  console.error(error.message);
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  if (compiledDir) await rm(compiledDir, { recursive: true, force: true });
  if (runtime) await runtime.destroy();
  if (db) await db.destroy();
  try { await admin.raw(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`); } catch { /* keep original failure */ }
  try { await admin.raw(`DROP ROLE IF EXISTS ${runtimeRole}`); } catch { /* keep original failure */ }
  await admin.destroy();
  const report = { checkedAt: new Date().toISOString(), databaseType: 'disposable local PostgreSQL', passed: checks.filter(check => check.result === 'PASS').length, failed: checks.filter(check => check.result === 'FAIL').length, total: checks.length, checks };
  const destination = path.join(root, 'docs/sample-data-20261004/evidence/customer-sample-tests.json');
  await mkdir(path.dirname(destination), { recursive: true }); await writeFile(destination, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`${report.passed}/${report.total} passed`); if (report.failed) process.exitCode = 1;
}
