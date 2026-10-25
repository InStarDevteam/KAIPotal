#!/usr/bin/env node
/**
 * seed:reference — 역할/권한 최소 기준 데이터 적재.
 *
 * 원천은 프런트의 단일 정책 파일 rolePolicies.ts다(역할 6, 권한 22).
 * 이 스크립트는 해당 파일을 직접 import해(fc_roles/fc_permissions/fc_role_permissions)
 * 멱등 upsert하므로, 프런트 정책과 DB 기준 데이터의 drift를 방지한다.
 * 허구 사용자·성과·증적은 생성하지 않는다(지시서 §9).
 *
 * 사용:
 *   POSTGRES_HOST=localhost POSTGRES_USER=portal_admin POSTGRES_PASSWORD=local-dev-only \
 *   node --experimental-strip-types scripts/seed-portal-reference.mjs
 *
 * production/staging에서는 허용 플래그가 필요하다:
 *   ALLOW_REFERENCE_SEED=true (테스트 데이터 seed:integration/performance와 구분)
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'backstage-portal/packages/backend/package.json'));
const knexFactory = require('knex');

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_REFERENCE_SEED !== 'true') {
  console.error('ERROR: production에서는 ALLOW_REFERENCE_SEED=true 명시가 필요합니다.');
  process.exit(1);
}

const { ROLE_PERMISSIONS } = await (async () => {
  // rolePolicies.ts를 esbuild로 번들해 평가한다 — Node strip-types는
  // 확장자 없는 상대 import를 해석하지 못하므로 번들 방식을 사용한다.
  const esbuild = require('esbuild');
  const entry = path.join(
    root,
    'backstage-portal/packages/app/src/components/authz/rolePolicies.ts',
  );
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'node',
  });
  const mod = { exports: {} };
  new Function('module', 'exports', result.outputFiles[0].text)(mod, mod.exports);
  return mod.exports;
})();

const ROLE_SCOPE = {
  'general-user': 'project',
  'project-manager': 'project',
  'branch-admin': 'tenant',
  'portal-admin': 'system',
  'security-manager': 'tenant',
  'security-auditor': 'tenant',
};
const ROLE_NAMES = {
  'general-user': '일반 사용자',
  'project-manager': '프로젝트 관리자',
  'branch-admin': '군별 관리자',
  'portal-admin': '포털 관리자',
  'security-manager': '보안 관리자',
  'security-auditor': '보안 감사관',
};

const {
  POSTGRES_HOST = 'localhost',
  POSTGRES_PORT = '5432',
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DB = 'portal_business',
} = process.env;
if (!POSTGRES_USER || !POSTGRES_PASSWORD) {
  console.error('ERROR: POSTGRES_USER/POSTGRES_PASSWORD 환경변수가 필요합니다.');
  process.exit(1);
}

const db = knexFactory({
  client: 'pg',
  connection: {
    host: POSTGRES_HOST,
    port: Number(POSTGRES_PORT),
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: POSTGRES_DB,
  },
  searchPath: ['portal'],
});

try {
  const roles = Object.keys(ROLE_PERMISSIONS);
  const permissionIds = [...new Set(Object.values(ROLE_PERMISSIONS).flat())];

  await db.transaction(async trx => {
    for (const roleId of roles) {
      await trx('fc_roles')
        .insert({
          role_id: roleId,
          name: ROLE_NAMES[roleId] ?? roleId,
          scope: ROLE_SCOPE[roleId] ?? 'project',
        })
        .onConflict('role_id')
        .merge(['name', 'scope']);
    }
    for (const pid of permissionIds) {
      await trx('fc_permissions')
        .insert({ permission_id: pid })
        .onConflict('permission_id')
        .ignore();
    }
    for (const roleId of roles) {
      for (const pid of ROLE_PERMISSIONS[roleId]) {
        await trx('fc_role_permissions')
          .insert({ role_id: roleId, permission_id: pid })
          .onConflict(['role_id', 'permission_id'])
          .ignore();
      }
    }
  });

  console.log(`seed:reference 완료 — 역할 ${roles.length}, 권한 ${permissionIds.length}`);
} catch (e) {
  console.error('seed 실패:', e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await db.destroy();
}
