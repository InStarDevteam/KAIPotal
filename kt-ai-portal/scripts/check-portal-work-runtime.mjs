#!/usr/bin/env node
// 읽기 전용: 운영 DB나 ACL을 수정하지 않는 배포 전후 점검.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(
  new URL("../backstage-portal/packages/backend/package.json", import.meta.url)
);
const {
  POSTGRES_HOST,
  POSTGRES_PORT = "5432",
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DB = "portal_business",
} = process.env;
export const inspectRuntimeRole = async (connection) => {
  const role = await connection("pg_catalog.pg_roles")
    .whereRaw("rolname = current_user")
    .first("rolsuper", "rolbypassrls", "rolcreatedb", "rolcreaterole", "rolreplication");
  const findings = [];
  if (role?.rolsuper || role?.rolbypassrls)
    findings.push("runtime 계정이 RLS 우회 권한을 가지고 있습니다.");
  if (role?.rolcreatedb || role?.rolcreaterole || role?.rolreplication)
    findings.push("runtime 계정에 불필요한 DB/역할 생성 또는 복제 권한이 있습니다.");
  // NOINHERIT alone is insufficient: reachable membership can still allow SET ROLE.
  const parents = await connection("pg_catalog.pg_roles")
    .whereRaw("rolname <> current_user AND pg_has_role(current_user, oid, 'MEMBER')")
    .andWhere(builder => builder
      .where({ rolsuper: true }).orWhere({ rolbypassrls: true })
      .orWhere({ rolcreatedb: true }).orWhere({ rolcreaterole: true })
      .orWhere({ rolreplication: true }).orWhere({ rolname: "cloudsqlsuperuser" }))
    .select("rolname");
  for (const parent of parents)
    findings.push(`runtime 계정에 관리 역할 멤버십이 있습니다: ${parent.rolname}`);
  const owned = await connection("pg_catalog.pg_class as c")
    .join("pg_catalog.pg_namespace as n", "n.oid", "c.relnamespace")
    .where("n.nspname", "portal")
    .whereIn("c.relkind", ["r", "p", "S", "v", "m", "f"])
    .whereRaw("pg_has_role(current_user, c.relowner, 'MEMBER')")
    .select("c.relname");
  if (owned.length)
    findings.push(`runtime 계정이 portal 객체 소유자 역할에 접근할 수 있습니다: ${owned.map(row => row.relname).join(", ")}`);
  const schemaOwner = await connection("pg_catalog.pg_namespace")
    .where("nspname", "portal")
    .whereRaw("pg_has_role(current_user, nspowner, 'MEMBER')")
    .first("nspname");
  if (schemaOwner)
    findings.push("runtime 계정이 portal 스키마 소유자 역할에 접근할 수 있습니다.");
  return findings;
};
export const inspectWorkRuntime = async (connection) => {
  const findings = await inspectRuntimeRole(connection);
  for (const table of [
    "fc_projects",
    "fc_project_members",
    "fc_work_requests",
    "fc_request_events",
  ]) {
    const flags = await connection("pg_catalog.pg_class as c")
      .join("pg_catalog.pg_namespace as n", "n.oid", "c.relnamespace")
      .where({ "n.nspname": "portal", "c.relname": table })
      .first("c.relrowsecurity", "c.relforcerowsecurity");
    if (!flags) {
      findings.push(`portal.${table}: 테이블 없음`);
      continue;
    }
    if (!flags.relrowsecurity || !flags.relforcerowsecurity)
      findings.push(`portal.${table}: FORCE RLS 확인 필요`);
    for (const privilege of table === "fc_request_events"
      ? ["SELECT", "INSERT"]
      : ["SELECT", "INSERT", "UPDATE"]) {
      const { rows } = await connection.raw(
        "SELECT has_table_privilege(current_user, ?, ?) AS allowed",
        [`portal.${table}`, privilege]
      );
      if (!rows[0].allowed)
        findings.push(`portal.${table}: ${privilege} 권한 없음`);
    }
  }
  return findings;
};

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (!POSTGRES_HOST || !POSTGRES_USER || !POSTGRES_PASSWORD) {
    throw new Error(
      "런타임 계정의 POSTGRES_HOST/POSTGRES_USER/POSTGRES_PASSWORD 환경변수가 필요합니다."
    );
  }
  const db = require("knex")({
    client: "pg",
    connection: {
      host: POSTGRES_HOST,
      port: Number(POSTGRES_PORT),
      user: POSTGRES_USER,
      password: POSTGRES_PASSWORD,
      database: POSTGRES_DB,
    },
  });
  try {
    const findings = await inspectWorkRuntime(db);
    if (findings.length) {
      findings.forEach((item) => console.error(`FAIL ${item}`));
      process.exitCode = 1;
    } else {
      console.log("PASS 업무 원장 4개: 런타임 권한·FORCE RLS 확인");
    }
  } catch (error) {
    console.error(`FAIL 점검 실패: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}
