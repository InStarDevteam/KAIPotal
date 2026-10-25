#!/usr/bin/env node
// Real deployed BFF checks. Writes are opt-in, restricted to this release's
// synthetic project/request; any temporary profile change is restored.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base = process.env.LIVE_BACKEND_BASE || 'https://kai-platform-d0ae0.web.app';
const phase = process.env.RELEASE_PHASE || 'live-api';
const write = process.env.RELEASE_WRITE_CHECKS === 'true';
const evidence = `${process.env.RELEASE_EVIDENCE_ROOT || 'docs/customer-demo-20261001/deployment'}/${phase}`;
await fs.mkdir(evidence, { recursive: true });
const checks = [];
let token, tenantId;
const check = async (name, run) => { await run(); checks.push(name); console.log('PASS', name); };
const api = async (route, { method = 'GET', body, expected = 200, authenticated = true, tenant = tenantId } = {}) => {
  const response = await fetch(`${base}/api/portal/v1${route}`, {
    method, headers: { 'Content-Type': 'application/json', ...(authenticated && token ? { Authorization: `Bearer ${token}` } : {}), ...(tenant ? { 'x-portal-tenant-id': tenant } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  assert([expected].flat().includes(response.status), `${method} ${route}: ${response.status} ${data.error?.code || ''}`);
  return data;
};
const report = { base, write, at: new Date().toISOString(), checks, artifacts: {} };
const pagedItems = async (route, pageSize = 200) => {
  const items = [];
  const separator = route.includes('?') ? '&' : '?';
  for (let page = 1; page <= 100; page++) {
    const response = await api(`${route}${separator}page=${page}&pageSize=${pageSize}`);
    assert(Array.isArray(response.data?.items), `${route}: missing items`);
    const total = response.data.pagination?.total;
    assert(Number.isSafeInteger(total) && total >= 0, `${route}: missing total`);
    items.push(...response.data.items);
    if (page * pageSize >= total) {
      assert.equal(items.length, total, `${route}: pagination omitted or repeated rows`);
      assert.equal(new Set(items.map(item => item.id)).size, items.length, `${route}: duplicate pages`);
      return items;
    }
  }
  throw new Error(`${route}: read-only verification page bound exceeded`);
};
const cursorItems = async route => {
  const items = [];
  const seenCursors = new Set();
  let cursor;
  for (let page = 0; page < 100; page++) {
    const response = await api(`${route}?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    assert(Array.isArray(response.data?.items), `${route}: missing items`);
    items.push(...response.data.items);
    cursor = response.data.nextCursor;
    if (!cursor) {
      assert.equal(new Set(items.map(item => item.id)).size, items.length, `${route}: duplicate cursor pages`);
      return items;
    }
    assert(!seenCursors.has(cursor), `${route}: repeated cursor`);
    seenCursors.add(cursor);
  }
  throw new Error(`${route}: read-only verification cursor bound exceeded`);
};
try {
  await check('database health and unauthenticated rejection', async () => {
    assert.equal((await api('/health', { authenticated: false })).data.status, 'ok');
    await api('/me', { authenticated: false, expected: 401 });
  });
  await check('actual guest authentication and server membership', async () => {
    const response = await fetch(`${base}/api/auth/guest/refresh?env=development`, { headers: { 'X-Requested-With': 'XMLHttpRequest', Origin: 'https://kai-platform-d0ae0.web.app' }, signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200);
    token = (await response.json()).backstageIdentity?.token;
    assert(token);
    const me = (await api('/me')).data;
    assert(me.memberships.length > 0);
    tenantId = me.memberships[0].tenant_id;
    report.roles = me.memberships[0].roles;
    report.tenantCount = me.memberships.length;
    report.actorId = me.userId;
    await api('/context/tenant', { method: 'POST', body: { tenantId } });
  });
  await check('all aggregate sections readable without partial failure', async () => {
    const result = await api('/work/overview');
    assert.equal(result.meta.partial, false);
    assert(!Object.values(result.data.sections).includes('unavailable'));
    report.sections = result.data.sections;
  });
  await check('current BFF read paths including profile and settings history', async () => {
    const paths = ['/tenant-settings', '/platform-access', '/me/profile', '/me/activity', '/projects?mine=true&page=1&pageSize=20', '/portal-settings', '/portal-settings/history', '/krmf/overview', '/credits/products', `/credits/accounts?owner_type=user&owner_id=${report.actorId}`, '/transfer-requests', '/catalog/items', '/proposals', '/search?q=군수', '/work/requests', '/work/approvals', '/integrations/targets'];
    for (const route of paths) {
      const response = await api(route, { expected: route.startsWith('/credits/accounts?') ? [200, 404] : 200 });
      if (response.error) {
        assert.equal(response.error.code, 'not_found');
        report.emptyStates = [...(report.emptyStates || []), 'Personal credit account has not been opened'];
      }
      if (route === '/integrations/targets') report.integrationTargets = response.data.map(item => ({ id: item.id, configured: item.configured }));
    }
    report.readPathCount = paths.length;
  });
  if (process.env.CHECK_KRMF_STORAGE === 'true') {
    await check('K-RMF storage capability reports unconfigured durable storage', async () => {
      const result = await api('/krmf/overview');
      assert.equal(result.data.file_storage_configured, false);
      report.fileStorageConfigured = result.data.file_storage_configured;
    });
  }
  await check('unknown tenant is rejected by real server authorization', async () => {
    await api('/me/profile', { tenant: '00000000-0000-4000-8000-000000000001', expected: 403 });
  });
  if (process.env.CHECK_SAMPLE_DATA === 'true') {
    const sampleSeedPath = process.env.SAMPLE_SEED_REPORT || 'docs/sample-data-20261004/evidence/sample-seed-applied.json';
    const seed = JSON.parse(await fs.readFile(sampleSeedPath, 'utf8'));
    assert.equal(seed.synthetic, true);
    assert.equal(seed.privilegesChanged, false);
    assert.equal(seed.tenantId, tenantId, 'Authenticated tenant must match the approved sample tenant');
    assert.equal(seed.userId, report.actorId, 'Authenticated actor must match the approved sample actor');
    const { buildCustomerSamplePlan, SAMPLE_BATCH } = await import('./seed-customer-sample.mjs');
    assert.equal(seed.batch, SAMPLE_BATCH);
    const plan = buildCustomerSamplePlan({ tenantId: seed.tenantId, userId: seed.userId });
    const rows = table => plan.filter(item => item.table === table).map(item => item.row);
    const assertRows = (expectedRows, actualRows, fields) => {
      for (const expectedRow of expectedRows) {
        const actual = actualRows.find(item => item.id === expectedRow.id);
        assert(actual, `Missing sample row ${expectedRow.id}`);
        for (const field of fields) assert.equal(actual[field], expectedRow[field], `${expectedRow.id}: ${field}`);
      }
    };
    report.samples = { batch: seed.batch, readOnly: true, projectId: seed.sampleProjectId, baselineId: seed.sampleBaselineId, creditAccountId: seed.sampleCreditAccountId };
    await check('sample projects and workspace requests preserve real membership and pending execution', async () => {
      const projects = await pagedItems('/projects?mine=true');
      assertRows(rows('fc_project'), projects, ['name', 'status', 'visibility', 'owner_id']);
      const detail = (await api(`/projects/${seed.sampleProjectId}`)).data;
      assert.equal(detail.project.id, seed.sampleProjectId);
      assert(detail.members.some(member => member.user_id === report.actorId && member.role === 'manager'));
      const requests = await cursorItems('/work/requests');
      const expected = rows('fc_work_requests');
      assertRows(expected, requests, ['status', 'project_id', 'requester_user_id']);
      for (const request of requests.filter(item => expected.some(row => row.id === item.id))) {
        assert.equal(request.payload.sample, true);
        assert.equal(request.payload.sampleBatch, seed.batch);
        assert.equal(request.payload.executionStatus, 'pending_platform');
        assert.equal(request.payload.platformConnectionState, 'pending_integration');
      }
      report.samples.projects = rows('fc_project').length;
      report.samples.workspaceRequests = expected.length;
    });
    await check('sample catalog and proposals are readable with portal-only approval states', async () => {
      const items = await pagedItems('/catalog/items?active=true');
      assertRows(rows('fc_catalog_item'), items, ['name', 'kind', 'category', 'access_type']);
      const applications = await pagedItems('/catalog/applications');
      assertRows(rows('fc_catalog_application'), applications, ['status', 'execution_status', 'project_id', 'work_request_id']);
      const proposals = await pagedItems('/proposals?mine=true');
      assertRows(rows('fc_proposal'), proposals, ['title', 'status', 'visibility', 'author_id']);
      // Proposal detail GET increments view_count; list checks preserve the
      // proposal ledger while checking the seeded review/notice states.
      report.samples.catalogItems = rows('fc_catalog_item').length;
      report.samples.catalogApplications = rows('fc_catalog_application').length;
      report.samples.proposals = rows('fc_proposal').length;
    });
    await check('sample transfers have no fabricated files or completed transmission', async () => {
      for (const expected of rows('fc_transfer_request')) {
        const detail = (await api(`/transfer-requests/${expected.id}`)).data;
        assert.equal(detail.status, expected.status);
        assert.equal(detail.requested_by, report.actorId);
        assert.equal(detail.approved_file_version, null);
        assert.deepEqual(detail.files, []);
      }
      report.samples.transfers = rows('fc_transfer_request').length;
      report.samples.fabricatedFiles = 0;
    });
    await check('sample project credit balance equals all four actual ledger transactions', async () => {
      const result = (await api(`/credits/accounts?owner_type=project&owner_id=${seed.sampleProjectId}`)).data;
      assert.equal(result.account.id, seed.sampleCreditAccountId);
      assert.equal(result.account.owner_id, seed.sampleProjectId);
      assert.equal(Number(result.account.balance), 108000);
      assert.equal(result.balanced, true);
      const transactions = await pagedItems(`/credits/accounts/${seed.sampleCreditAccountId}/transactions`, 2);
      assertRows(rows('fc_credit_transaction'), transactions, ['type', 'account_id']);
      assert.equal(transactions.length, 4);
      const sum = transactions.reduce((total, item) => total + Number(item.amount), 0);
      assert.equal(sum, 108000);
      assert.equal(sum, Number(result.account.balance));
      const requests = (await api('/credits/requests?mine=true')).data.items;
      assertRows(rows('fc_credit_request'), requests, ['status', 'owner_id', 'owner_type']);
      const trend = (await api(`/credits/usage/trend?owner_type=project&owner_id=${seed.sampleProjectId}`)).data;
      assert.equal(trend.measured, false);
      report.samples.creditBalance = sum;
      report.samples.creditTransactions = transactions.length;
      report.samples.creditMeasured = false;
    });
    await check('sample K-RMF remains a draft baseline with pending reference evidence', async () => {
      const baselines = (await api(`/krmf/baselines?project_id=${seed.sampleProjectId}`)).data;
      assertRows(rows('fc_krmf_baseline'), baselines, ['name', 'version', 'status', 'project_id']);
      const sampleBaseline = baselines.find(item => item.id === seed.sampleBaselineId);
      assert.equal(sampleBaseline.project_name, rows('fc_project').find(item => item.id === seed.sampleProjectId).name);
      const controls = (await api(`/krmf/baselines/${seed.sampleBaselineId}/controls`)).data;
      assertRows(rows('fc_krmf_control'), controls, ['control_code', 'applicability', 'status']);
      const expectedEvidence = rows('fc_krmf_evidence')[0];
      const evidences = (await api(`/krmf/evidences?control_id=${expectedEvidence.control_id}`)).data;
      assertRows([expectedEvidence], evidences, ['kind', 'review_status', 'file_id', 'reference_uri']);
      const overview = (await api(`/krmf/overview?baseline_id=${seed.sampleBaselineId}`)).data;
      assert.equal(overview.total_controls, 5);
      assert.equal(overview.review_pending, 1);
      assert.equal(overview.implementation_rate, 0);
      report.samples.krmfControls = controls.length;
      report.samples.krmfReferenceEvidence = 1;
      report.samples.krmfOfficialApproval = false;
    });
  }
  if (process.env.CHECK_DICTIONARY === 'true') {
    const expectedSummary = { tables: 55, columns: 548, words: 96, terms: 606, domains: 22, codes: 161 };
    let dictionary;
    await check('actual metadata dictionary counts and provisional institutional status', async () => {
      dictionary = (await api('/metadata/dictionary?page=1&pageSize=100')).data;
      assert.deepEqual(dictionary.summary, expectedSummary);
      assert.equal(dictionary.release.source_type, 'project_draft');
      assert.equal(dictionary.release.mapping_status, 'provisional');
      assert.equal(dictionary.release.institution_version, null);
      assert.equal(dictionary.release.institution_source, null);
      assert.equal(dictionary.release.table_count, 55);
      assert.equal(dictionary.release.column_count, 548);
      assert.equal(dictionary.pagination.total, 548);
      assert.equal(dictionary.tables.length, 55);
      report.dictionary = { summary: dictionary.summary, mappingStatus: dictionary.release.mapping_status, officialInstitutionSource: null, releaseVersion: dictionary.release.version };
    });
    await check('all metadata dictionary pages expose 548 unique provisional columns', async () => {
      const columns = [...dictionary.items];
      for (let page = 2; page <= Math.ceil(dictionary.pagination.total / 100); page++) {
        const result = (await api(`/metadata/dictionary?page=${page}&pageSize=100`)).data;
        assert.equal(result.pagination.total, 548);
        columns.push(...result.items);
      }
      assert.equal(columns.length, 548);
      assert.equal(new Set(columns.map(item => `${item.schema_name}.${item.table_name}.${item.column_name}`)).size, 548);
      assert.equal(new Set(columns.map(item => item.table_name)).size, 55);
      for (const column of columns) {
        assert.equal(column.schema_name, 'portal');
        assert.equal(column.mapping_status, 'provisional');
        assert.equal(column.institution_term_id, null);
      }
      for (const table of dictionary.tables) assert.equal(columns.filter(item => item.table_name === table.table_name).length, table.column_count);
      report.dictionary.uniqueColumns = columns.length;
      report.dictionary.pages = Math.ceil(dictionary.pagination.total / 100);
    });
    await check('metadata dictionary actual search table filter and query validation', async () => {
      const table = dictionary.tables.find(item => item.table_name === 'fc_project');
      assert(table);
      const filtered = (await api('/metadata/dictionary?table=fc_project&pageSize=100')).data;
      assert.equal(filtered.pagination.total, table.column_count);
      assert(filtered.items.every(item => item.table_name === 'fc_project'));
      const searched = (await api('/metadata/dictionary?q=project&pageSize=100')).data;
      assert(searched.pagination.total > 0);
      assert(searched.items.every(item => [item.table_name, item.column_name, item.logical_name].some(value => value.toLowerCase().includes('project'))));
      const wildcard = (await api('/metadata/dictionary?q=%25')).data;
      assert.equal(wildcard.pagination.total, 0);
      const invalid = await api('/metadata/dictionary?page=0', { expected: 422 });
      assert.equal(invalid.error.code, 'invalid_query');
      report.dictionary.tableFilter = 'fc_project';
      report.dictionary.searchChecked = true;
    });
  }
  if (write) {
    await check('defense profile persists and original profile is restored', async () => {
      const original = (await api('/me/profile')).data;
      let changed = false;
      try {
        const profile = { ...original.profile, userCategory: 'military', personnelType: 'soldier', militaryNumber: 'DEMO-20261001', rank: '시연용', organization: '고객 시연 검증', affiliation: '', sponsor: '' };
        await api('/me/profile', { method: 'PATCH', body: { profile, expectedVersion: original.version } });
        changed = true;
        assert.equal((await api('/me/profile')).data.profile.militaryNumber, 'DEMO-20261001');
      } finally {
        if (changed) {
          const current = (await api('/me/profile')).data;
          await api('/me/profile', { method: 'PATCH', body: { profile: original.profile, expectedVersion: current.version } });
          assert.deepEqual((await api('/me/profile')).data.profile, original.profile);
        }
      }
    });
    await check('synthetic ordinary project and work request persist through approval', async () => {
      const project = (await api('/projects', { method: 'POST', expected: [200, 201], body: {
        name: '[시연] 군수 데이터 분석', description: '고객 시연을 위한 합성 예시입니다. 실제 군 데이터와 외부 플랫폼 자원을 사용하지 않습니다.', purpose: '포털 프로젝트·작업환경 신청·승인 흐름 확인', visibility: 'public', startAt: '2026-10-01', endAt: '2026-12-31', idempotencyKey: 'customer-release-20261001-project',
      } })).data;
      report.artifacts.projectId = project.id;
      const title = 'AI 작업환경 · [시연] 분석 워크스페이스';
      const requests = (await api('/work/requests?limit=100')).data.items;
      let request = requests.find(item => item.project_id === project.id && item.title === title);
      if (!request) request = (await api('/work/requests', { method: 'POST', expected: 201, body: {
        type: 'workspace', title, projectId: project.id, payload: { projectId: project.id, projectName: project.name, workspaceName: '[시연] 분석 워크스페이스', requestType: 'ai', cpuCores: '4', gpuCount: '0', memoryGiB: '16', storageGiB: '100', startDate: '2026-10-02', endDate: '2026-12-31', securityLevel: '내부', purpose: '합성 데이터로 포털 신청·승인 흐름을 검증합니다.', datasets: '', models: '', frameworks: '', labelingTools: '', visualizationTools: '', trainingDataTools: '', persistenceLocation: '', deidentificationRequired: 'no', usesCredit: 'yes', performanceLinkage: 'no' },
      } })).data;
      report.artifacts.requestId = request.id;
      if (request.status === 'requested') await api(`/work/approvals/${request.id}/decisions`, { method: 'POST', body: { decision: 'approved', expectedVersion: request.version, note: '고객 시연 검증: 포털 원장 승인만 확인했습니다. 외부 자원을 생성하지 않았습니다.' } });
      const persisted = (await api('/work/requests?limit=100')).data.items.find(item => item.id === request.id);
      assert.equal(persisted.status, 'approved');
      const mine = (await api('/projects?mine=true&page=1&pageSize=20')).data.items;
      assert(mine.some(item => item.id === project.id));
    });
  }
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL'; report.error = error.message; process.exitCode = 1; console.error('FAIL', error.message);
} finally {
  await fs.writeFile(`${evidence}/backend-verification.json`, JSON.stringify(report, null, 2));
  console.log(`${checks.length} real backend checks passed; ${report.status}`);
}
