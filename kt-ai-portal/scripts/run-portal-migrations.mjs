#!/usr/bin/env node
/**
 * 포털 업무 스키마(fc_*) migration 실행 job.
 *
 * 운영에서는 이 스크립트를 migration 전용 계정(portal_migrator)으로 실행한다.
 * 백엔드 시작 시 자동 migration(portal.migrations.runOnStartup)은
 * local-integration 개발 프로파일 전용이다.
 *
 * 사용:
 *   POSTGRES_HOST=localhost POSTGRES_PORT=5432 \
 *   POSTGRES_USER=portal_admin POSTGRES_PASSWORD=local-dev-only \
 *   POSTGRES_DB=portal_business node scripts/run-portal-migrations.mjs
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../backstage-portal/packages/backend/package.json',
  ),
);
const knexFactory = require('knex');

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

const migrationsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../backstage-portal/packages/backend/migrations/portal',
);

const db = knexFactory({
  client: 'pg',
  connection: {
    host: POSTGRES_HOST,
    port: Number(POSTGRES_PORT),
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: POSTGRES_DB,
  },
  migrations: { directory: migrationsDir, schemaName: 'portal', tableName: 'fc_knex_migrations' },
});

try {
  // migration 이력 테이블이 portal 스키마에 생성되므로 스키마를 먼저 보장한다.
  await db.raw('CREATE SCHEMA IF NOT EXISTS portal');
  const [batch, applied] = await db.migrate.latest();
  if (applied.length === 0) {
    console.log('적용할 migration이 없습니다. (최신 상태)');
  } else {
    console.log(`batch ${batch} 적용 완료:`);
    for (const m of applied) console.log(`  - ${m}`);
  }
} catch (e) {
  console.error('migration 실패:', e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await db.destroy();
}
