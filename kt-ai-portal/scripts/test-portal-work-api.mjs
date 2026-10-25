#!/usr/bin/env node
// 전용 일회성 로컬 DB에서 work-overview/공유 승인함 API의 실제 RLS·권한·동시성을 검증한다.
// 기준: 로컬 샘플을 '내 프로젝트'로 간주 금지, 교차 테넌트 차단, 낙관적 락, 이력·감사 원자성.
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const require = createRequire(
  new URL("../backstage-portal/packages/backend/package.json", import.meta.url)
);
const knex = require("knex");
const express = require("express");
const { build } = require("esbuild");

if (
  process.env.POSTGRES_HOST &&
  !["localhost", "127.0.0.1"].includes(process.env.POSTGRES_HOST)
)
  throw new Error("Only local disposable test databases are allowed");

const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const database = `portal_work_test_${suffix}`;
const role = `runtime_${suffix}`;
const password = randomUUID();
const config = {
  host: "127.0.0.1",
  port: 5432,
  user: "portal_admin",
  password: "local-dev-only",
  database: "postgres",
};
const admin = knex({ client: "pg", connection: config });
let owner;
let runtime;
let server;
const tmp = await mkdtemp(path.join(os.tmpdir(), "portal-work-"));
let passed = 0;
const check = async (name, fn) => {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
};

try {
  await admin.raw(`CREATE DATABASE ${database}`);
  await admin.raw(
    `CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`
  );
  owner = knex({
    client: "pg",
    connection: { ...config, database },
    searchPath: ["portal"],
  });
  await owner.raw("CREATE SCHEMA portal");
  await owner.migrate.latest({
    directory: path.resolve(
      "backstage-portal/packages/backend/migrations/portal"
    ),
    schemaName: "portal",
    tableName: "fc_knex_migrations",
  });
  await owner.raw(`GRANT USAGE ON SCHEMA portal TO ${role}`);
  await owner.raw(
    `GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA portal TO ${role}`
  );
  await owner.raw(
    `REVOKE UPDATE,DELETE ON portal.fc_audit_events FROM ${role}`
  );
  runtime = knex({
    client: "pg",
    connection: { ...config, database, user: role, password },
    pool: { min: 0, max: 2 },
    searchPath: ["portal"],
  });

  await build({
    stdin: {
      contents:
        "export {createRouter} from './packages/backend/src/modules/portal/router';",
      resolveDir: path.resolve("backstage-portal"),
    },
    bundle: true,
    platform: "node",
    format: "cjs",
    packages: "external",
    outfile: path.join(tmp, "router.cjs"),
  });
  const Module = require("module");
  const compiled = new Module(path.join(tmp, "router.cjs"));
  compiled.paths = require.resolve.paths("express");
  compiled._compile(
    await (
      await import("node:fs/promises")
    ).readFile(path.join(tmp, "router.cjs"), "utf8"),
    path.join(tmp, "router.cjs")
  );
  const { createRouter } = compiled.exports;

  // ── 시드: 2 테넌트, 4 사용자(권한 분리), 1 프로젝트(소유자만 멤버) ──
  const a = randomUUID();
  const b = randomUUID();
  const uUser = randomUUID(); // 일반 사용자 (portal.view)
  const uApprover = randomUUID(); // 반출 검토자 (export.review + audit.view), 양 테넌트 소속
  const uPm = randomUUID(); // 프로젝트 관리자 (workspace.approve)
  const uFinance = randomUUID(); // 크레딧 승인자 (credit.approve)
  await owner("portal.fc_tenants").insert([
    { id: a, code: "A", name: "A", branch: "army" },
    { id: b, code: "B", name: "B", branch: "navy" },
  ]);
  const users = [
    [uUser, "user:test/user"],
    [uApprover, "user:test/approver"],
    [uPm, "user:test/pm"],
    [uFinance, "user:test/finance"],
  ];
  await owner("portal.fc_users").insert(
    users.map(([user_id, ref]) => ({
      user_id,
      display_name: ref,
      status: "active",
    }))
  );
  await owner("portal.fc_external_identities").insert(
    users.map(([user_id, ref]) => ({
      user_id,
      issuer: "backstage",
      subject: ref,
      verified: true,
    }))
  );
  const memberships = [];
  const addMembership = (tenant_id, user_id) => {
    const id = randomUUID();
    memberships.push({ id, tenant_id, user_id });
  };
  addMembership(a, uUser);
  addMembership(a, uApprover);
  addMembership(a, uPm);
  addMembership(a, uFinance);
  addMembership(b, uApprover); // 교차 테넌트 검증용
  await owner("portal.fc_tenant_memberships").insert(memberships);
  await owner("portal.fc_roles").insert([
    { role_id: "reader", name: "Reader", scope: "tenant" },
    { role_id: "export-approver", name: "ExportApprover", scope: "tenant" },
    { role_id: "pm", name: "PM", scope: "tenant" },
    { role_id: "finance", name: "Finance", scope: "tenant" },
  ]);
  const perms = [
    "portal.view",
    "export.request",
    "workspace.request",
    "credit.view",
    "export.review",
    "audit.view",
    "workspace.approve",
    "credit.approve",
  ];
  await owner("portal.fc_permissions").insert(
    perms.map((permission_id) => ({ permission_id }))
  );
  await owner("portal.fc_role_permissions").insert([
    { role_id: "reader", permission_id: "portal.view" },
    { role_id: "reader", permission_id: "workspace.request" },
    { role_id: "reader", permission_id: "export.request" },
    { role_id: "reader", permission_id: "credit.view" },
    { role_id: "export-approver", permission_id: "workspace.request" },
    { role_id: "export-approver", permission_id: "export.review" },
    { role_id: "export-approver", permission_id: "audit.view" },
    { role_id: "pm", permission_id: "workspace.approve" },
    { role_id: "finance", permission_id: "credit.approve" },
  ]);
  const memberRow = (tenant_id, user_id) =>
    memberships.find((m) => m.tenant_id === tenant_id && m.user_id === user_id);
  await owner("portal.fc_role_assignments").insert([
    {
      id: randomUUID(),
      tenant_id: a,
      membership_id: memberRow(a, uUser).id,
      role_id: "reader",
    },
    {
      id: randomUUID(),
      tenant_id: a,
      membership_id: memberRow(a, uApprover).id,
      role_id: "export-approver",
    },
    {
      id: randomUUID(),
      tenant_id: a,
      membership_id: memberRow(a, uPm).id,
      role_id: "pm",
    },
    {
      id: randomUUID(),
      tenant_id: a,
      membership_id: memberRow(a, uFinance).id,
      role_id: "finance",
    },
    {
      id: randomUUID(),
      tenant_id: b,
      membership_id: memberRow(b, uApprover).id,
      role_id: "export-approver",
    },
  ]);
  const project = randomUUID();
  await owner("portal.fc_projects").insert({
    id: project,
    tenant_id: a,
    name: "서버 검증 프로젝트",
    owner_user_id: uUser,
  });
  await owner("portal.fc_project_members").insert({
    project_id: project,
    tenant_id: a,
    user_id: uUser,
    member_role: "owner",
  });

  // ── HTTP 하네스 ──
  const app = express();
  app.use(express.json());
  const logger = {
    error: () => {},
    info: () => {},
    debug: () => {},
    warn: () => {},
    child: () => logger,
  };
  const httpAuth = {
    async credentials(req) {
      const user = req.header("x-test-user");
      if (!user) {
        const e = new Error("missing");
        e.name = "AuthenticationError";
        throw e;
      }
      return {
        principal: { type: "user", userEntityRef: `user:test/${user}` },
      };
    },
  };
  app.use(await createRouter({ db: runtime, logger, httpAuth }));
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const api = async (url, method = "GET", body, tenant = a, user = "user") => {
    const response = await fetch(base + url, {
      method,
      headers: {
        "x-test-user": user,
        "x-portal-tenant-id": tenant,
        "content-type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, body: await response.json() };
  };

  // ── 검증 ─────────────────────────────────────────────
  await check("migration creates work ledger tables", async () => {
    const tables = await owner("information_schema.tables")
      .where({ table_schema: "portal" })
      .whereIn("table_name", [
        "fc_projects",
        "fc_project_members",
        "fc_work_requests",
        "fc_request_events",
      ])
      .select("table_name");
    assert.equal(tables.length, 4);
  });

  await check("overview: 내 프로젝트는 서버 멤버십 원장 기준만", async () => {
    const mine = await api("/v1/work/overview", "GET", undefined, a, "user");
    assert.equal(mine.status, 200);
    const ids = mine.body.data.myProjects.map((p) => p.id);
    assert.ok(ids.includes(project));
    // 검토자는 프로젝트 멤버가 아니므로 동일 테넌트 샘플이라도 내 프로젝트가 아니다.
    const approver = await api(
      "/v1/work/overview",
      "GET",
      undefined,
      a,
      "approver"
    );
    assert.equal(approver.body.data.myProjects.length, 0);
  });

  await check("overview: 감사 최근 기록은 audit.view 권한으로만", async () => {
    const user = await api("/v1/work/overview", "GET", undefined, a, "user");
    assert.equal(user.body.data.recentAudit, null);
    assert.equal(user.body.data.auditExcludedReason, "permission_missing");
    const approver = await api(
      "/v1/work/overview",
      "GET",
      undefined,
      a,
      "approver"
    );
    assert.ok(Array.isArray(approver.body.data.recentAudit));
  });

  await check(
    "overview: 크레딧/자원 사용량은 pending_integration(수치 미제조)",
    async () => {
      const res = await api("/v1/work/overview", "GET", undefined, a, "user");
      assert.equal(res.body.data.credits.state, "pending_integration");
      assert.equal(res.body.data.resourceUsage.state, "pending_integration");
      assert.equal(res.body.meta.collectionCycleSec, 30);
      assert.equal(res.body.meta.staleAfterSec, 120);
    }
  );

  await check(
    "운영 장애 재현: 프로젝트 SELECT 권한 누락을 부분 실패로 구분",
    async () => {
      await owner.raw(`REVOKE ALL ON portal.fc_project_members FROM ${role}`);
      const response = await api(
        "/v1/work/overview",
        "GET",
        undefined,
        a,
        "approver"
      );
      assert.equal(response.status, 200);
      assert.equal(response.body.meta.partial, true);
      assert.equal(response.body.data.sections.myProjects, "unavailable");
      assert.equal(response.body.data.sections.myRequests, "ready");
      assert.equal(response.body.data.sections.recentAudit, "ready");
      assert.ok(Array.isArray(response.body.data.recentAudit));
      assert.ok(
        !JSON.stringify(response.body).includes("permission denied for table")
      );
    }
  );

  await check("최소 GRANT 복구 후 집계 정상화, RLS·감사 불변", async () => {
    const repair = require(path.resolve(
      "backstage-portal/packages/backend/migrations/portal/20261001000001_repair_work_runtime_grants.js"
    ));
    await repair.grantWorkRuntimeAccess(owner, role);
    const response = await api(
      "/v1/work/overview",
      "GET",
      undefined,
      a,
      "user"
    );
    assert.equal(response.status, 200);
    assert.equal(response.body.meta.partial, false);
    assert.equal(response.body.data.sections.myProjects, "ready");
    assert.deepEqual(
      response.body.data.myProjects.map((p) => p.id),
      [project]
    );
    const isolated = await api(
      "/v1/work/overview",
      "GET",
      undefined,
      b,
      "approver"
    );
    assert.deepEqual(isolated.body.data.myProjects, []);
    const rls = await owner("pg_catalog.pg_class")
      .where({ relname: "fc_project_members" })
      .first("relrowsecurity", "relforcerowsecurity");
    assert.equal(rls.relrowsecurity, true);
    assert.equal(rls.relforcerowsecurity, true);
    const privileges = await owner.raw(
      "SELECT has_table_privilege(?, 'portal.fc_audit_events', 'UPDATE') AS can_update, has_table_privilege(?, 'portal.fc_audit_events', 'DELETE') AS can_delete",
      [role, role]
    );
    assert.equal(privileges.rows[0].can_update, false);
    assert.equal(privileges.rows[0].can_delete, false);
  });

  await check(
    "read-only 배포 점검은 runtime 정상 권한 통과·회수 즉시 실패",
    async () => {
      const inspect = () =>
        spawnSync(process.execPath, ["scripts/check-portal-work-runtime.mjs"], {
          encoding: "utf8",
          env: {
            ...process.env,
            POSTGRES_HOST: config.host,
            POSTGRES_PORT: String(config.port),
            POSTGRES_USER: role,
            POSTGRES_PASSWORD: password,
            POSTGRES_DB: database,
          },
        });
      assert.equal(inspect().status, 0);
      try {
        await owner.raw(
          `REVOKE SELECT ON portal.fc_project_members FROM ${role}`
        );
        const broken = inspect();
        assert.equal(broken.status, 1);
        assert.match(broken.stderr, /fc_project_members: SELECT/);
      } finally {
        await owner.raw(`GRANT SELECT ON portal.fc_project_members TO ${role}`);
      }
    }
  );

  await check("역할 승인 권한만으로 신청 권한이 생기지 않음", async () => {
    const response = await api(
      "/v1/work/requests",
      "POST",
      { type: "credit", title: "권한 없는 신청" },
      a,
      "finance"
    );
    assert.equal(response.status, 403);
  });
  await check("잘못된 프로젝트 ID는 서버 오류 대신 입력 오류", async () => {
    const response = await api(
      "/v1/work/requests",
      "POST",
      { type: "workspace", title: "잘못된 ID", projectId: "invalid" },
      a,
      "user"
    );
    assert.equal(response.status, 422);
  });

  let exportRequestId;
  await check("신청 접수 → 다른 사용자의 승인함에 표시", async () => {
    const created = await api(
      "/v1/work/requests",
      "POST",
      { type: "export", title: "E2E 반출 신청" },
      a,
      "user"
    );
    assert.equal(created.status, 201);
    exportRequestId = created.body.data.id;
    const queue = await api(
      "/v1/work/approvals",
      "GET",
      undefined,
      a,
      "approver"
    );
    assert.equal(queue.status, 200);
    assert.ok(queue.body.data.items.some((r) => r.id === exportRequestId));
    // 신청자 본인에게도 승인 권한이 없으면 승인함에 보이지 않는다.
    const mineAsRequester = await api(
      "/v1/work/approvals",
      "GET",
      undefined,
      a,
      "user"
    );
    assert.ok(
      !mineAsRequester.body.data.items.some((r) => r.id === exportRequestId)
    );
    // 내 신청 목록에는 보인다.
    const myReq = await api("/v1/work/requests", "GET", undefined, a, "user");
    assert.ok(myReq.body.data.items.some((r) => r.id === exportRequestId));
  });

  await check("프로젝트 멤버십 없는 신청은 거부", async () => {
    const res = await api(
      "/v1/work/requests",
      "POST",
      { type: "workspace", title: "타인 프로젝트 신청", projectId: project },
      a,
      "approver"
    );
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, "not_project_member");
    const ok = await api(
      "/v1/work/requests",
      "POST",
      { type: "workspace", title: "소유 프로젝트 신청", projectId: project },
      a,
      "user"
    );
    assert.equal(ok.status, 201);
  });

  await check("승인 권한 없는 사용자의 결정 시도는 403", async () => {
    const res = await api(
      `/v1/work/approvals/${exportRequestId}/decisions`,
      "POST",
      { decision: "approved" },
      a,
      "user"
    );
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, "permission_denied");
  });

  await check("version 불일치 결정은 409 version_conflict", async () => {
    const res = await api(
      `/v1/work/approvals/${exportRequestId}/decisions`,
      "POST",
      { decision: "approved", expectedVersion: 99 },
      a,
      "approver"
    );
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, "version_conflict");
  });

  await check("정상 승인: 상태·이력·감사 원자 기록", async () => {
    const res = await api(
      `/v1/work/approvals/${exportRequestId}/decisions`,
      "POST",
      { decision: "approved", note: "E2E 승인", expectedVersion: 1 },
      a,
      "approver"
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, "approved");
    assert.equal(res.body.data.version, 2);
    const detail = await api(
      `/v1/work/approvals/${exportRequestId}`,
      "GET",
      undefined,
      a,
      "approver"
    );
    const actions = detail.body.data.history.map((h) => h.action);
    assert.deepEqual(actions, ["submitted", "decided"]);
    const audit = await owner("portal.fc_audit_events")
      .where({ resource_id: exportRequestId, action: "work.request.approved" })
      .count("* as count")
      .first();
    assert.equal(Number(audit.count), 1);
  });

  await check("이미 결정된 신청 재결정은 409 already_decided", async () => {
    const res = await api(
      `/v1/work/approvals/${exportRequestId}/decisions`,
      "POST",
      { decision: "rejected", expectedVersion: 2 },
      a,
      "approver"
    );
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, "already_decided");
  });

  await check("교차 테넌트: 승인함·상세·결정이 보이지 않음(RLS)", async () => {
    const queue = await api(
      "/v1/work/approvals",
      "GET",
      undefined,
      b,
      "approver"
    );
    assert.ok(!queue.body.data.items.some((r) => r.id === exportRequestId));
    const detail = await api(
      `/v1/work/approvals/${exportRequestId}`,
      "GET",
      undefined,
      b,
      "approver"
    );
    assert.equal(detail.status, 404);
    const decision = await api(
      `/v1/work/approvals/${exportRequestId}/decisions`,
      "POST",
      { decision: "rejected" },
      b,
      "approver"
    );
    assert.equal(decision.status, 404);
  });

  await check(
    "유형별 승인함 분리: pm에게 export 항목 미노출, finance는 credit만",
    async () => {
      const creditReq = await api(
        "/v1/work/requests",
        "POST",
        { type: "credit", title: "E2E 크레딧 신청" },
        a,
        "user"
      );
      assert.equal(creditReq.status, 201);
      const pmQueue = await api(
        "/v1/work/approvals",
        "GET",
        undefined,
        a,
        "pm"
      );
      assert.ok(!pmQueue.body.data.items.some((r) => r.id === exportRequestId));
      assert.ok(!pmQueue.body.data.items.some((r) => r.type === "export"));
      const financeQueue = await api(
        "/v1/work/approvals",
        "GET",
        undefined,
        a,
        "finance"
      );
      assert.ok(financeQueue.body.data.items.every((r) => r.type === "credit"));
      assert.ok(
        financeQueue.body.data.items.some(
          (r) => r.id === creditReq.body.data.id
        )
      );
    }
  );

  await check("내 신청 커서 페이지네이션(중복 없음)", async () => {
    const page1 = await api(
      "/v1/work/requests?limit=1",
      "GET",
      undefined,
      a,
      "user"
    );
    assert.equal(page1.body.data.items.length, 1);
    assert.ok(page1.body.data.nextCursor);
    const page2 = await api(
      `/v1/work/requests?limit=1&cursor=${encodeURIComponent(
        page1.body.data.nextCursor
      )}`,
      "GET",
      undefined,
      a,
      "user"
    );
    assert.equal(page2.body.data.items.length, 1);
    assert.notEqual(page2.body.data.items[0].id, page1.body.data.items[0].id);
  });

  await check("승인 후 집계에 반영(approvalQueue 감소)", async () => {
    const overview = await api(
      "/v1/work/overview",
      "GET",
      undefined,
      a,
      "approver"
    );
    const exportEntry = overview.body.data.approvalQueue.find(
      (q) => q.type === "export"
    );
    assert.equal(exportEntry.count, 0); // 유일한 export 신청을 승인했으므로
  });

  await check("승인함 집계는 유형 수가 아닌 실제 요청 건수", async () => {
    for (let i = 0; i < 3; i++)
      await api(
        "/v1/work/requests",
        "POST",
        { type: "export", title: `추가 반출 ${i}` },
        a,
        "user"
      );
    const overview = await api(
      "/v1/work/overview",
      "GET",
      undefined,
      a,
      "approver"
    );
    assert.equal(
      overview.body.data.approvalQueue.find((q) => q.type === "export").count,
      3
    );
  });
  await check("요약은 전체 건수, 미리보기 20개/10개 제한과 구분", async () => {
    const projects = Array.from({ length: 22 }, (_, index) => ({
      id: randomUUID(),
      tenant_id: a,
      name: `추가 프로젝트 ${index}`,
      owner_user_id: uUser,
    }));
    await owner("portal.fc_projects").insert(projects);
    await owner("portal.fc_project_members").insert(
      projects.map((p) => ({ project_id: p.id, tenant_id: a, user_id: uUser }))
    );
    for (let index = 0; index < 11; index++)
      await api(
        "/v1/work/requests",
        "POST",
        { type: "export", title: `전체 건수 검증 ${index}` },
        a,
        "user"
      );
    const overview = await api(
      "/v1/work/overview",
      "GET",
      undefined,
      a,
      "user"
    );
    assert.equal(overview.body.data.myProjects.length, 20);
    assert.equal(overview.body.data.myProjectTotal, 23);
    assert.equal(overview.body.data.myRequests.length, 10);
    const total = await owner("portal.fc_work_requests")
      .where({ tenant_id: a, requester_user_id: uUser })
      .count("* as count")
      .first();
    assert.equal(overview.body.data.myRequestTotal, Number(total.count));
  });
  await check(
    "모든 조회 원장 권한 누락이면 503, 빈 목록 성공으로 위장 금지",
    async () => {
      try {
        await owner.raw(
          `REVOKE SELECT ON portal.fc_project_members, portal.fc_work_requests, portal.fc_audit_events FROM ${role}`
        );
        const response = await api(
          "/v1/work/overview",
          "GET",
          undefined,
          a,
          "approver"
        );
        assert.equal(response.status, 503);
        assert.equal(response.body.error.code, "work_sources_unavailable");
        assert.equal(response.body.error.retryable, true);
        assert.ok(response.body.error.requestId);
        const userResponse = await api(
          "/v1/work/overview",
          "GET",
          undefined,
          a,
          "user"
        );
        assert.equal(userResponse.status, 503);
      } finally {
        await owner.raw(
          `GRANT SELECT ON portal.fc_project_members, portal.fc_work_requests, portal.fc_audit_events TO ${role}`
        );
      }
    }
  );
  console.log(`\n${passed} checks passed`);
} finally {
  await server?.close();
  await runtime?.destroy();
  await owner?.destroy();
  await admin
    .raw(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`)
    .catch(() => {});
  await admin.raw(`DROP ROLE IF EXISTS ${role}`).catch(() => {});
  await admin.destroy();
  await rm(tmp, { recursive: true, force: true });
}
