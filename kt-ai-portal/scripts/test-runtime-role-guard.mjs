#!/usr/bin/env node
// Disposable local DB only. No cloud or configured POSTGRES_* connection is used.
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import { inspectRuntimeRole, inspectWorkRuntime } from './check-portal-work-runtime.mjs';
const require = createRequire(new URL('../backstage-portal/packages/backend/package.json', import.meta.url));
const knex = require('knex');
const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
const database = `runtime_guard_${suffix}`, runtimeRole = `guard_runtime_${suffix}`;
const parentRole = `guard_parent_${suffix}`, intermediateRole = `guard_group_${suffix}`;
const password = randomUUID();
const config = { host: '127.0.0.1', port: 5432, user: 'portal_admin', password: 'local-dev-only', database: 'postgres' };
const admin = knex({ client: 'pg', connection: config });
let owner, runtime, passed = 0;
const check = async (name, test) => { await test(); passed++; console.log(`PASS ${name}`); };
try {
  await admin.raw(`CREATE DATABASE ${database}`);
  await admin.raw(`CREATE ROLE ${runtimeRole} LOGIN PASSWORD '${password}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`);
  await admin.raw(`CREATE ROLE ${parentRole} NOLOGIN CREATEROLE`);
  await admin.raw(`CREATE ROLE ${intermediateRole} NOLOGIN`);
  owner = knex({ client: 'pg', connection: { ...config, database } });
  await owner.raw('CREATE SCHEMA portal');
  await owner.migrate.latest({ directory: path.resolve('backstage-portal/packages/backend/migrations/portal'), schemaName: 'portal', tableName: 'fc_knex_migrations' });
  await owner.raw(`GRANT USAGE ON SCHEMA portal TO ${runtimeRole}`);
  await owner.raw(`GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA portal TO ${runtimeRole}`);
  await owner.raw(`REVOKE UPDATE,DELETE ON portal.fc_audit_events FROM ${runtimeRole}`);
  runtime = knex({ client: 'pg', connection: { ...config, database, user: runtimeRole, password } });
  await check('baseline DML-only runtime passes role/ACL/RLS guard', async () => assert.deepEqual(await inspectWorkRuntime(runtime), []));
  await check('direct CREATEROLE/CREATEDB drift is rejected', async () => {
    await admin.raw(`ALTER ROLE ${runtimeRole} CREATEROLE CREATEDB`);
    assert.ok((await inspectRuntimeRole(runtime)).some(f => f.includes('생성')));
    await admin.raw(`ALTER ROLE ${runtimeRole} NOCREATEROLE NOCREATEDB`);
  });
  await check('nested privileged membership is rejected even with NOINHERIT', async () => {
    await admin.raw(`ALTER ROLE ${runtimeRole} NOINHERIT`);
    await admin.raw(`GRANT ${parentRole} TO ${intermediateRole}`);
    await admin.raw(`GRANT ${intermediateRole} TO ${runtimeRole}`);
    assert.ok((await inspectRuntimeRole(runtime)).some(f => f.includes(parentRole)));
    await admin.raw(`REVOKE ${intermediateRole} FROM ${runtimeRole}`);
    await admin.raw(`ALTER ROLE ${runtimeRole} INHERIT`);
  });
  await check('runtime object ownership is rejected', async () => {
    await owner.raw('CREATE TABLE portal.release_guard_owner_test (id integer)');
    await owner.raw(`ALTER TABLE portal.release_guard_owner_test OWNER TO ${runtimeRole}`);
    assert.ok((await inspectRuntimeRole(runtime)).some(f => f.includes('release_guard_owner_test')));
    await owner.raw('ALTER TABLE portal.release_guard_owner_test OWNER TO portal_admin');
    await owner.raw('DROP TABLE portal.release_guard_owner_test');
  });
  await check('least privilege repair preserves business DML and append-only audit', async () => {
    assert.deepEqual(await inspectWorkRuntime(runtime), []);
    const tenantId = randomUUID();
    await runtime('portal.fc_tenants').insert({ id: tenantId, code: 'GUARD', name: '로컬 검증', branch: 'joint' });
    assert.equal((await runtime('portal.fc_tenants').where('id', tenantId).first()).name, '로컬 검증');
    await runtime('portal.fc_audit_events').insert({ tenant_id: tenantId, actor_type: 'system', action: 'release.guard', result: 'success' });
    await assert.rejects(runtime('portal.fc_audit_events').update({ action: 'forged' }), /permission denied/);
    await assert.rejects(runtime('portal.fc_audit_events').delete(), /permission denied/);
    assert.equal((await runtime('portal.fc_audit_events').count('* as count').first()).count, '0');
    await runtime.transaction(async trx => {
      await trx.raw("SELECT set_config('portal.tenant_id', ?, true)", [tenantId]);
      assert.equal((await trx('portal.fc_audit_events').count('* as count').first()).count, '1');
    });
  });
  console.log(`${passed}/${passed} runtime least-privilege checks passed`);
} finally {
  await runtime?.destroy();
  await owner?.destroy();
  await admin.raw(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`);
  await admin.raw(`DROP ROLE IF EXISTS ${runtimeRole}`);
  await admin.raw(`DROP ROLE IF EXISTS ${intermediateRole}`);
  await admin.raw(`DROP ROLE IF EXISTS ${parentRole}`);
  await admin.destroy();
}
