// Uses a disposable local database and the real BFF; never targets Cloud SQL.
import assert from 'node:assert/strict';
import { createCustomerReviewServer } from './lib/customer-review-server.mjs';
const server = await createCustomerReviewServer();
let passed = 0;
const check = async (name, run) => { await run(); passed++; console.log(`PASS ${name}`); };
try {
  const put = (category, key, value, valueType, extra = {}) => server.api(`/portal-settings/${category}/${key}`, { method: 'PUT', body: { value, valueType, ...extra } });
  await check('real save appends immutable before/after and actor/time history', async () => {
    assert.equal((await put('common', 'portal.title', '기존 제목', 'string')).status, 200);
    assert.equal((await put('common', 'portal.title', '변경 제목', 'string', { expectedVersion: 1 })).status, 200);
    const result = await server.api('/portal-settings/history?key=portal.title');
    assert.equal(result.status, 200);
    assert.equal(result.body.data.total, 2);
    assert.deepEqual(result.body.data.items.map(row => [row.oldValue, row.newValue]), [['기존 제목', '변경 제목'], [null, '기존 제목']]);
    assert.equal(result.body.data.items[0].changedBy, server.actors['portal-admin']);
    assert.ok(result.body.data.items[0].changedByName);
    assert.ok(Date.parse(result.body.data.items[0].changedAt));
  });
  await check('general users cannot read settings history', async () => {
    assert.equal((await server.api('/portal-settings/history', { actor: 'general-user' })).status, 403);
  });
  await check('tenant filter and actual RLS isolate history', async () => {
    const cross = await server.api('/portal-settings/history', { tenant: 'navy' });
    assert.equal(cross.status, 200);
    assert.equal(cross.body.data.total, 0);
    assert.equal((await server.api('/portal-settings/history', { actor: 'general-user', tenant: 'navy' })).status, 403);
    // Administrator belonging to both tenants still cannot select A by a query override.
    const forged = await server.api(`/portal-settings/history?tenantId=${server.tenants.army}`, { tenant: 'navy' });
    assert.equal(forged.body.data.total, 0);
  });
  await check('conflicting save does not append a successful history row', async () => {
    const result = await put('common', 'portal.title', '충돌 값', 'string', { expectedVersion: 1 });
    assert.equal(result.status, 409);
    assert.equal((await server.api('/portal-settings/history')).body.data.total, 2);
  });
  await check('secrets absent from save, list, and history JSON including nested fields', async () => {
    for (const [key, value, valueType] of [['smtp.token', 'PRIVATE-SETTING-SECRET', 'string'], ['connector.config', { integrations: [{ apiKey: 'NESTED-PRIVATE-SECRET' }] }, 'json']]) {
      const saved = await put('security', key, value, valueType);
      assert.equal(saved.status, 200);
      assert.equal(saved.body.data.value, null);
      assert.equal(saved.body.data.sensitive, true);
    }
    for (const route of ['/portal-settings', '/portal-settings/history']) {
      const result = await server.api(route);
      assert.equal(result.status, 200);
      assert.ok(!JSON.stringify(result.body).includes('PRIVATE-SECRET'));
      assert.ok(!JSON.stringify(result.body).includes('PRIVATE-SETTING-SECRET'));
      const rows = result.body.data.items.filter(item => item.sensitive);
      assert.equal(rows.length, 2);
      assert.ok(rows.every(row => row.value === null || row.newValue === null));
    }
  });
  await check('category filtering and deterministic bounded pagination', async () => {
    const security = await server.api('/portal-settings/history?category=security&pageSize=1');
    assert.equal(security.body.data.total, 2);
    assert.equal(security.body.data.items.length, 1);
    const second = await server.api('/portal-settings/history?category=security&pageSize=1&page=2');
    assert.notEqual(second.body.data.items[0].id, security.body.data.items[0].id);
    assert.equal((await server.api('/portal-settings/history?category=unknown')).status, 422);
    assert.equal((await server.api('/portal-settings/history?pageSize=101')).status, 422);
    assert.equal((await server.api('/portal-settings/history?page=0')).status, 422);
    assert.equal((await server.api('/portal-settings/history?key=BAD')).status, 422);
  });
  await check('string values resembling JSON retain their declared type', async () => {
    const saved = await put('common', 'string.example', 'true', 'string');
    assert.equal(saved.status, 200);
    assert.equal(saved.body.data.value, 'true');
  });
  assert.deepEqual(server.apiErrors, []);
  console.log(`Settings history: ${passed}/${passed} scenarios passed`);
} finally { await server.close(); }
