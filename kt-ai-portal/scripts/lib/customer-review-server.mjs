// Loopback-only test fixture. Never use as an authentication adapter in deployment.
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const require = createRequire(
  new URL(
    "../../backstage-portal/packages/backend/package.json",
    import.meta.url
  )
);
const knex = require("knex"),
  express = require("express"),
  { build } = require("esbuild");
export async function createCustomerReviewServer() {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 10),
    database = `customer_test_${suffix}`,
    role = `customer_${suffix}`,
    password = randomUUID();
  const config = {
    host: "127.0.0.1",
    port: 5432,
    user: "portal_admin",
    password: "local-dev-only",
    database: "postgres",
  };
  const admin = knex({ client: "pg", connection: config });
  let owner, runtime, server;
  const tmp = await mkdtemp(path.join(os.tmpdir(), "portal-customer-"));
  await mkdir(path.join(tmp, "files"));
  process.env.PORTAL_FILE_STORAGE_DIR = path.join(tmp, "files");
  const close = async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (runtime) await runtime.destroy();
    if (owner) await owner.destroy();
    await admin.raw(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`);
    await admin.raw(`DROP ROLE IF EXISTS ${role}`);
    await admin.destroy();
    await rm(tmp, { recursive: true, force: true });
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
      searchPath: ["portal"],
      pool: { min: 0, max: 8 },
    });
    await build({
      stdin: {
        contents:
          "export {createRouter} from './packages/backend/src/modules/portal/router';export {ROLE_PERMISSIONS} from './packages/app/src/components/authz/rolePolicies';",
        resolveDir: path.resolve("backstage-portal"),
      },
      bundle: true,
      platform: "node",
      format: "cjs",
      packages: "external",
      outfile: path.join(tmp, "server.cjs"),
    });
    const Module = require("module"),
      compiled = new Module(path.join(tmp, "server.cjs"));
    compiled.paths = require.resolve.paths("express");
    compiled._compile(
      await readFile(path.join(tmp, "server.cjs"), "utf8"),
      path.join(tmp, "server.cjs")
    );
    const { createRouter, ROLE_PERMISSIONS } = compiled.exports;
    const policy = {
      ...ROLE_PERMISSIONS,
      "portal-admin": [
        ...new Set([
          ...ROLE_PERMISSIONS["portal-admin"],
          "krmf.manage",
          "krmf.review",
        ]),
      ],
    };
    const tenantRows = [
      ["joint", "국방부 공통"],
      ["army", "육군"],
      ["navy", "해군"],
      ["airforce", "공군"],
      ["marines", "해병대"],
    ].map(([branch, name]) => ({
      id: randomUUID(),
      code: branch.toUpperCase(),
      branch,
      name,
    }));
    await owner("portal.fc_tenants").insert(tenantRows);
    const tenants = Object.fromEntries(tenantRows.map((t) => [t.branch, t.id]));
    const actors = Object.fromEntries(
      Object.keys(policy).map((r) => [r, randomUUID()])
    );
    await owner("portal.fc_users").insert(
      Object.entries(actors).map(([r, id]) => ({
        user_id: id,
        display_name: `시연 ${r}`,
        status: "active",
      }))
    );
    await owner("portal.fc_external_identities").insert(
      Object.entries(actors).map(([r, id]) => ({
        user_id: id,
        issuer: "backstage",
        subject: `user:test/${r}`,
        verified: true,
      }))
    );
    await owner("portal.fc_roles").insert(
      Object.keys(policy).map((r) => ({
        role_id: r,
        name: r,
        scope: r === "portal-admin" ? "system" : "tenant",
      }))
    );
    await owner("portal.fc_permissions").insert(
      [...new Set(Object.values(policy).flat())].map((permission_id) => ({
        permission_id,
      }))
    );
    await owner("portal.fc_role_permissions").insert(
      Object.entries(policy).flatMap(([r, ps]) =>
        ps.map((p) => ({ role_id: r, permission_id: p }))
      )
    );
    for (const [r, id] of Object.entries(actors))
      for (const tenant of r === "portal-admin"
        ? tenantRows
        : tenantRows.filter((t) => t.branch === "army")) {
        const mid = randomUUID();
        await owner("portal.fc_tenant_memberships").insert({
          id: mid,
          tenant_id: tenant.id,
          user_id: id,
        });
        await owner("portal.fc_role_assignments").insert({
          id: randomUUID(),
          tenant_id: tenant.id,
          membership_id: mid,
          role_id: r,
        });
      }
    const apiErrors = [];
    const logger = {
      info() {},
      debug() {},
      warn() {},
      error(message) {
        apiErrors.push(String(message));
      },
    };
    const httpAuth = {
      async credentials(req) {
        const selected = (req.get("authorization") || "").replace(
          "Bearer review-",
          ""
        );
        if (!actors[selected]) {
          const e = new Error("unauthenticated");
          e.name = "AuthenticationError";
          throw e;
        }
        return {
          principal: { type: "user", userEntityRef: `user:test/${selected}` },
        };
      },
    };
    const app = express();
    app.post("/api/auth/guest/refresh", (req, res) => {
      const match = (req.get("cookie") || "").match(
        /(?:^|;\s*)review_role=([^;]+)/
      );
      const selected = actors[match?.[1]] ? match[1] : "portal-admin";
      res.json({ backstageIdentity: { token: `review-${selected}` } });
    });
    app.get("/api/auth/oidc/refresh", (_req, res) =>
      res.status(401).json({ error: "test identity required" })
    );
    app.use(
      "/api/portal",
      await createRouter({ db: runtime, logger, httpAuth })
    );
    app.use(express.static(path.resolve("backstage-portal/packages/app/dist")));
    app.get("*", (_req, res) =>
      res.sendFile(
        path.resolve("backstage-portal/packages/app/dist/index.html")
      )
    );
    server = app.listen(3001, "127.0.0.1");
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const base = "http://localhost:3001";
    const api = async (
      route,
      { method = "GET", body, tenant = "army", actor = "portal-admin" } = {}
    ) => {
      const res = await fetch(`${base}/api/portal/v1${route}`, {
        method,
        headers: {
          authorization: `Bearer review-${actor}`,
          "x-portal-tenant-id": tenants[tenant],
          "content-type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: res.status, body: await res.json() };
    };
    return { base, close, api, tenants, actors, owner, apiErrors };
  } catch (error) {
    await close();
    throw error;
  }
}
