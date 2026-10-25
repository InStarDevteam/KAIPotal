#!/usr/bin/env node
// 실제 로컬 PostgreSQL의 일회성 DB에서 사전 적재·ACL·BFF를 검증한다.
// 운영 DB 접속, 운영 데이터 변경, 외부 성공 응답 mock은 사용하지 않는다.
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { dictionarySnapshot, importDictionary, parseCsv } from './lib/metadata-dictionary.mjs';

if (process.env.POSTGRES_HOST && !['127.0.0.1', 'localhost'].includes(process.env.POSTGRES_HOST)) {
  throw new Error('Only disposable local PostgreSQL databases are allowed');
}
const root = path.resolve(new URL('..', import.meta.url).pathname);
const require = createRequire(new URL('../backstage-portal/packages/backend/package.json', import.meta.url));
const knex = require('knex');
const express = require('express');
const { build } = require('esbuild');
const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
const database = `portal_metadata_${suffix}`;
const loginRole = `metadata_${suffix}`;
const rolePassword = randomUUID();
const config = { host: '127.0.0.1', port: 5432, user: 'portal_admin', password: 'local-dev-only', database: 'postgres' };
const admin = knex({ client: 'pg', connection: config });
const temporary = await mkdtemp(path.join(os.tmpdir(), 'portal-metadata-'));
const sourceDirectory = path.resolve(root, process.env.MDR_DATA_DIR || 'docs/data-readiness-20261004/data');
const reportPath = path.resolve(root, process.env.METADATA_TEST_RESULT_PATH || 'docs/data-readiness-20261004/evidence/metadata-dictionary-tests.json');
const tables = ['releases', 'domains', 'words', 'terms', 'codes', 'columns'];
const checks = [], cleanupWarnings = [], serverErrors = [];
let owner, runtime, server, createdRuntimeRole = false, snapshot, releaseId;
const check = async (id, scenario, fn) => {
  try {
    const detail = await fn();
    checks.push({ id, scenario, result: 'PASS', detail: detail || 'ok' });
    console.log(`PASS ${id}: ${scenario}`);
  } catch (error) {
    checks.push({ id, scenario, result: 'FAIL', detail: String(error?.message || error).slice(0, 900) });
    console.log(`FAIL ${id}: ${scenario}: ${String(error?.message || error).slice(0, 300)}`);
  }
};
const countRows = async (db, table) => Number((await db(`portal.fc_metadata_${table}`).count('* as count').first()).count);
const csvText = rows => {
  const cell = value => /[",\r\n]/.test(String(value ?? '')) ? `"${String(value ?? '').replaceAll('"', '""')}"` : String(value ?? '');
  const headers = Object.keys(rows[0]);
  return '\uFEFF' + [headers.map(cell).join(','), ...rows.map(row => headers.map(header => cell(row[header])).join(','))].join('\n') + '\n';
};
const invalidCsv = async (file, mutate, expectedError) => {
  const directory = await mkdtemp(path.join(temporary, 'csv-'));
  for (const name of ['DATA_DICTIONARY.csv', 'STANDARD_DOMAINS.csv', 'STANDARD_WORDS.csv', 'STANDARD_TERMS.csv', 'STANDARD_CODES.csv']) {
    await writeFile(path.join(directory, name), await readFile(path.join(sourceDirectory, name)));
  }
  const rows = parseCsv(await readFile(path.join(directory, file), 'utf8'));
  mutate(rows);
  await writeFile(path.join(directory, file), csvText(rows));
  await assert.rejects(dictionarySnapshot(owner, directory), expectedError);
};

try {
  const existingRole = await admin('pg_catalog.pg_roles').where({ rolname: 'portal_runtime' }).first();
  if (!existingRole) {
    await admin.raw('CREATE ROLE portal_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE');
    createdRuntimeRole = true;
  } else {
    assert.equal(existingRole.rolsuper, false, 'Existing local portal_runtime must not be superuser');
    assert.equal(existingRole.rolbypassrls, false, 'Existing local portal_runtime must not bypass RLS');
  }
  await admin.raw(`CREATE ROLE ${loginRole} LOGIN PASSWORD '${rolePassword}' INHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`);
  await admin.raw(`GRANT portal_runtime TO ${loginRole}`);
  await admin.raw(`CREATE DATABASE ${database}`);
  owner = knex({ client: 'pg', connection: { ...config, database }, searchPath: ['portal'] });
  await owner.raw('CREATE SCHEMA portal');
  // 이 기본권한은 새 시험 DB에만 설정된다. 마지막 migration이 broad DML을 회수해야 한다.
  await owner.raw('GRANT USAGE ON SCHEMA portal TO portal_runtime');
  await owner.raw('ALTER DEFAULT PRIVILEGES IN SCHEMA portal GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO portal_runtime');
  const [, migrations] = await owner.migrate.latest({ directory: path.join(root, 'backstage-portal/packages/backend/migrations/portal'), schemaName: 'portal', tableName: 'fc_knex_migrations' });
  await owner.raw('REVOKE UPDATE, DELETE ON portal.fc_audit_events FROM portal_runtime');
  runtime = knex({ client: 'pg', connection: { ...config, database, user: loginRole, password: rolePassword }, pool: { min: 0, max: 3 }, searchPath: ['portal'] });
  await check('MD01', '현재 migration 전체 적용', async () => {
    const expected = (await readdir(path.join(root, 'backstage-portal/packages/backend/migrations/portal'))).filter(file => file.endsWith('.js')).sort();
    assert.deepEqual(migrations.slice().sort(), expected);
    return `${migrations.length} migrations`;
  });
  await check('MD02', '현재 스키마 55테이블·548컬럼 snapshot 및 제약 배열', async () => {
    snapshot = await dictionarySnapshot(owner, sourceDirectory);
    assert.equal(snapshot.tableCount, 55);
    assert.equal(snapshot.columns.length, 548);
    assert.equal(snapshot.words.length, 96);
    assert.equal(snapshot.codes.length, 161);
    assert.equal(snapshot.terms.length, 58 + 548);
    const profile = snapshot.columns.find(c => c.table_name === 'fc_user_profiles' && c.column_name === 'profile');
    assert.equal(profile.sensitivity, '개인정보');
    assert.equal(profile.is_nullable, false);
    const foreign = snapshot.columns.find(c => c.table_name === 'fc_metadata_columns' && c.column_name === 'domain_id');
    assert.equal(foreign.references.length, 1);
    assert.ok(foreign.references[0].definition.includes('FOREIGN KEY (release_id, domain_id)'));
    return `domains=${snapshot.domains.length}, terms=${snapshot.terms.length}, codes=${snapshot.codes.length}`;
  });
  await check('MD03', '실제 import 및 6테이블 행수·공식 기관 ID 공란', async () => {
    const imported = await importDictionary(owner, snapshot, 'test-draft-20261004');
    assert.equal(imported.inserted, true);
    releaseId = imported.releaseId;
    const release = await owner('portal.fc_metadata_releases').where({ release_id: releaseId }).first();
    assert.equal(release.mapping_status, 'provisional');
    assert.equal(release.source_type, 'project_draft');
    assert.equal(release.institution_version, null);
    assert.equal(release.institution_source, null);
    assert.equal(release.table_count, 55);
    assert.equal(release.column_count, 548);
    for (const kind of tables.slice(1)) assert.equal(await countRows(owner, kind), snapshot[kind].length);
    for (const [table, field] of [['domains', 'institution_domain_id'], ['words', 'institution_word_id'], ['terms', 'institution_term_id'], ['codes', 'institution_code_id'], ['columns', 'institution_term_id']]) {
      assert.equal(Number((await owner(`portal.fc_metadata_${table}`).whereNotNull(field).count('* as count').first()).count), 0);
    }
  });
  await check('MD04', '컬럼 domain/term/release FK 및 구성 단어 참조 정합성', async () => {
    const columns = await owner('portal.fc_metadata_columns').where({ release_id: releaseId });
    const domains = new Set((await owner('portal.fc_metadata_domains').where({ release_id: releaseId })).map(d => d.domain_id));
    const terms = await owner('portal.fc_metadata_terms').where({ release_id: releaseId });
    const termIds = new Set(terms.map(t => t.term_id));
    const wordIds = new Set((await owner('portal.fc_metadata_words').where({ release_id: releaseId })).map(w => w.word_id));
    assert.ok(columns.every(c => domains.has(c.domain_id) && termIds.has(c.term_id)));
    assert.ok(terms.every(t => Array.isArray(t.word_ids) && t.word_ids.every(id => wordIds.has(id))));
    await assert.rejects(owner('portal.fc_metadata_columns').where({ release_id: releaseId, table_name: 'fc_user_profiles', column_name: 'profile' }).update({ domain_id: 'missing-domain' }), e => e.code === '23503');
    await assert.rejects(owner('portal.fc_metadata_columns').where({ release_id: releaseId, table_name: 'fc_user_profiles', column_name: 'profile' }).update({ term_id: 'missing-term' }), e => e.code === '23503');
  });
  await check('MD05', '재적재 멱등 및 저장된 행수 유지', async () => {
    const before = await Promise.all(tables.map(table => countRows(owner, table)));
    const result = await importDictionary(owner, snapshot, 'test-draft-20261004');
    assert.deepEqual(result, { releaseId, inserted: false });
    assert.deepEqual(await Promise.all(tables.map(table => countRows(owner, table))), before);
  });
  await check('MD06', '동일 버전의 다른 원천을 거부하며 기존 원장 보존', async () => {
    await assert.rejects(importDictionary(owner, { ...snapshot, sourceHash: '0'.repeat(64) }, 'test-draft-20261004'), /different source/);
    assert.equal(await countRows(owner, 'releases'), 1);
    assert.equal(await countRows(owner, 'columns'), 548);
  });
  await check('MD07', 'CSV 컬럼 누락 시 schema mismatch 거부', () => invalidCsv('DATA_DICTIONARY.csv', rows => rows.pop(), /Dictionary\/schema mismatch/));
  await check('MD08', 'CSV 중복 컬럼 정의 거부', () => invalidCsv('DATA_DICTIONARY.csv', rows => rows.push({ ...rows[0] })));
  await check('MD09', '실제 CHECK와 다른 코드값 적재 거부', () => invalidCsv('STANDARD_CODES.csv', rows => { rows[0].코드 = 'invented-not-in-check'; }));
  await check('MD10', '정의되지 않은 구성 단어 거부', () => invalidCsv('STANDARD_TERMS.csv', rows => { rows[0]['구성단어ID(임시)'] = 'TMP-W-NOT-EXISTS'; }, /word/));
  await check('MD11', '원천 표준 용어의 빈 구성 단어 거부', () => invalidCsv('STANDARD_TERMS.csv', rows => { rows[0]['구성단어ID(임시)'] = ''; }));
  await check('MD12', '실제 DB와 다른 CSV 기술 자료형 거부', () => invalidCsv('DATA_DICTIONARY.csv', rows => { rows[0].자료형 = 'invented_type'; }));
  await check('MD21', '실제 DB와 다른 CSV NULL 조건 거부', () => invalidCsv('DATA_DICTIONARY.csv', rows => {
    rows.find(row => row['엔티티물리명'] === 'fc_user_profiles' && row['컬럼물리명'] === 'profile').NULL여부 = 'NULL 허용';
  }));
  await check('MD22', '실제 DB와 다른 CSV 기본키 정의 거부', () => invalidCsv('DATA_DICTIONARY.csv', rows => {
    rows.find(row => row['엔티티물리명'] === 'fc_user_profiles' && row['컬럼물리명'] === 'user_id').PK = '';
  }));
  await check('MD23', '실제 DB와 다른 CSV 기본값 거부', () => invalidCsv('DATA_DICTIONARY.csv', rows => {
    rows.find(row => row['엔티티물리명'] === 'fc_user_profiles' && row['컬럼물리명'] === 'version').기본값 = '99';
  }));
  await check('MD24', '실제 DB와 다른 CSV numeric 정밀도 거부', () => invalidCsv('DATA_DICTIONARY.csv', rows => {
    rows.find(row => row.자료형 === 'numeric')['길이·정밀도'] = '2,0';
  }));
  await check('MD25', '실제 CHECK 코드 누락 거부', () => invalidCsv('STANDARD_CODES.csv', rows => rows.pop(), /Missing CHECK/));
  await check('MD26', '중복 코드 ID·값 조합 거부', () => invalidCsv('STANDARD_CODES.csv', rows => rows.push({ ...rows[0] }), /Duplicate/));
  await check('MD13', 'portal_runtime 기본 broad DML을 신규 사전 6테이블에서 회수', async () => {
    for (const table of tables) {
      for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
        const result = await owner.raw('SELECT has_table_privilege(?, ?, ?) AS allowed', ['portal_runtime', `portal.fc_metadata_${table}`, privilege]);
        assert.equal(result.rows[0].allowed, privilege === 'SELECT', `${table} ${privilege}`);
      }
      assert.equal(await countRows(runtime, table), await countRows(owner, table));
    }
  });
  await check('MD14', '실제 runtime 연결로 사전 INSERT·UPDATE·DELETE 18종 거부', async () => {
    for (const table of tables) {
      const name = `portal.fc_metadata_${table}`;
      for (const statement of [`INSERT INTO ${name} DEFAULT VALUES`, `UPDATE ${name} SET release_id=release_id WHERE FALSE`, `DELETE FROM ${name} WHERE FALSE`]) {
        await assert.rejects(runtime.raw(statement), error => error.code === '42501', statement);
      }
    }
  });

  const tenant = randomUUID(), unknownTenant = randomUUID(), adminUser = randomUUID(), generalUser = randomUUID();
  const adminMembership = randomUUID(), generalMembership = randomUUID();
  await owner('portal.fc_tenants').insert({ id: tenant, code: `MD-${suffix}`, name: '메타데이터 시험 테넌트', branch: 'joint' });
  await owner('portal.fc_users').insert([{ user_id: adminUser, display_name: '사전 조회 관리자', status: 'active' }, { user_id: generalUser, display_name: '일반 조회 사용자', status: 'active' }]);
  await owner('portal.fc_external_identities').insert([{ user_id: adminUser, issuer: 'backstage', subject: 'user:test/admin', verified: true }, { user_id: generalUser, issuer: 'backstage', subject: 'user:test/user', verified: true }]);
  await owner('portal.fc_tenant_memberships').insert([{ id: adminMembership, tenant_id: tenant, user_id: adminUser }, { id: generalMembership, tenant_id: tenant, user_id: generalUser }]);
  await owner('portal.fc_roles').insert([{ role_id: 'metadata-reader', name: '사전 조회', scope: 'tenant' }, { role_id: 'general-user', name: '일반 사용자', scope: 'tenant' }]);
  await owner('portal.fc_permissions').insert(['portal.view', 'integration.view'].map(permission_id => ({ permission_id })));
  await owner('portal.fc_role_permissions').insert([{ role_id: 'metadata-reader', permission_id: 'integration.view' }, { role_id: 'metadata-reader', permission_id: 'portal.view' }, { role_id: 'general-user', permission_id: 'portal.view' }]);
  await owner('portal.fc_role_assignments').insert([{ tenant_id: tenant, membership_id: adminMembership, role_id: 'metadata-reader' }, { tenant_id: tenant, membership_id: generalMembership, role_id: 'general-user' }]);
  await build({ stdin: { contents: "export {createRouter} from './packages/backend/src/modules/portal/router';", resolveDir: path.join(root, 'backstage-portal') }, bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile: path.join(temporary, 'router.cjs') });
  const Module = require('module'), compiled = new Module(path.join(temporary, 'router.cjs'));
  compiled.paths = require.resolve.paths('express');
  compiled._compile(await readFile(path.join(temporary, 'router.cjs'), 'utf8'), path.join(temporary, 'router.cjs'));
  const app = express();
  const httpAuth = { async credentials(req) {
    const user = req.header('x-test-user');
    if (!['admin', 'user'].includes(user)) { const error = new Error('missing'); error.name = 'AuthenticationError'; throw error; }
    return { principal: { type: 'user', userEntityRef: `user:test/${user}` } };
  } };
  const logger = { info() {}, warn() {}, debug() {}, error(message) { serverErrors.push(String(message)); } };
  app.use(await compiled.exports.createRouter({ db: runtime, httpAuth, logger }));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (query = '', user = 'admin', tenantId = tenant) => {
    const response = await fetch(`${base}/v1/metadata/dictionary${query ? '?' + query : ''}`, { headers: { 'x-test-user': user, 'x-portal-tenant-id': tenantId } });
    return { status: response.status, body: await response.json() };
  };
  await check('MD15', '실제 BFF integration.view 조회·집계·메타정보', async () => {
    const result = await request();
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body.data.summary.tables, 55);
    assert.equal(result.body.data.summary.columns, 548);
    assert.equal(result.body.data.summary.codes, 161);
    assert.equal(result.body.data.items.length, 30);
    assert.equal(result.body.data.pagination.total, 548);
    assert.equal(result.body.data.release.mapping_status, 'provisional');
    assert.equal(result.body.meta.dataMode, 'live');
  });
  await check('MD16', '일반 사용자·미등록 테넌트·미인증 요청 접근 거부', async () => {
    assert.equal((await request('', 'user')).status, 403);
    assert.equal((await request('', 'admin', unknownTenant)).status, 403);
    assert.equal((await request('', 'none')).status, 401);
  });
  await check('MD17', 'table 필터·페이지 이동·새로고침 동일 정렬', async () => {
    const filtered = await request('table=fc_user_profiles');
    assert.equal(filtered.status, 200);
    assert.equal(filtered.body.data.pagination.total, 5);
    assert.ok(filtered.body.data.items.every(item => item.table_name === 'fc_user_profiles'));
    const first = (await request('pageSize=5')).body.data.items;
    const next = (await request('page=2&pageSize=5')).body.data.items;
    const reload = (await request('page=2&pageSize=5')).body.data.items;
    assert.equal(next.length, 5);
    assert.deepEqual(next, reload);
    assert.ok(next.every(item => !first.some(previous => previous.table_name === item.table_name && previous.column_name === item.column_name)));
  });
  await check('MD18', '검색 wildcard·역슬래시를 리터럴로 처리', async () => {
    for (const value of ['%', 'f_', '\\', 'fc\\_user']) {
      const result = await request(new URLSearchParams({ q: value }).toString());
      assert.equal(result.status, 200);
      const expected = snapshot.columns.filter(c => [c.table_name, c.column_name, c.logical_name].some(text => text.toLowerCase().includes(value.toLowerCase()))).length;
      assert.equal(result.body.data.pagination.total, expected, `literal ${value}`);
    }
    const result = await request(new URLSearchParams({ q: '프로필' }).toString());
    assert.equal(result.status, 200);
    assert.equal(result.body.data.pagination.total, 1);
  });
  await check('MD19', '검색 조건·범위·알 수 없는 키·중복 query 검증', async () => {
    const invalid = ['page=0', 'page=-1', 'page=10001', 'pageSize=0', 'pageSize=101', 'pageSize=1.5', 'q=a&q=b', 'table=x', 'table=fc_%', 'extra=x', 'q=' + 'a'.repeat(101), new URLSearchParams({ q: 'a\u0000b' }).toString()];
    for (const query of invalid) assert.equal((await request(query)).status, 422, query);
  });
  await check('MD20', '실제 BFF에서 자료 없는 페이지 정상 빈 목록', async () => {
    const result = await request('page=10000&pageSize=100');
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.data.items, []);
    assert.equal(result.body.data.pagination.total, 548);
  });
} catch (error) {
  checks.push({ id: 'SETUP', scenario: '실제 DB·BFF 준비', result: 'FAIL', detail: String(error?.message || error).slice(0, 900) });
  console.error(`FAIL SETUP: ${String(error?.message || error).slice(0, 300)}`);
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  await runtime?.destroy();
  await owner?.destroy();
  await admin.raw(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`).catch(error => cleanupWarnings.push(String(error.message).slice(0, 300)));
  await admin.raw(`DROP ROLE IF EXISTS ${loginRole}`).catch(error => cleanupWarnings.push(String(error.message).slice(0, 300)));
  if (createdRuntimeRole) await admin.raw('DROP ROLE portal_runtime').catch(error => cleanupWarnings.push('Shared local portal_runtime not dropped: ' + String(error.message).slice(0, 250)));
  await admin.destroy();
  await rm(temporary, { recursive: true, force: true });
  await mkdir(path.dirname(reportPath), { recursive: true });
  const passed = checks.filter(check => check.result === 'PASS').length;
  const failed = checks.length - passed;
  const report = { generatedAt: new Date().toISOString(), status: failed ? 'FAILED' : 'PASSED', scope: 'Fresh local PostgreSQL import, actual runtime ACL and real BFF HTTP', productionWrites: 0,
    snapshot: snapshot ? { tables: snapshot.tableCount, columns: snapshot.columns.length, domains: snapshot.domains.length, words: snapshot.words.length, terms: snapshot.terms.length, codes: snapshot.codes.length } : null,
    institutionDictionaryReceived: false, summary: { passed, failed }, checks, serverErrors, cleanupWarnings };
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`Metadata dictionary: ${passed} PASS, ${failed} FAIL. ${reportPath}`);
  process.exitCode = failed || cleanupWarnings.length ? 1 : 0;
}
