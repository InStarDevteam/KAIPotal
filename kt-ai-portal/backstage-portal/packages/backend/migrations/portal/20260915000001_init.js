/*
 * 포털 업무 스키마 초기 migration (P1)
 *
 * - 신규 업무 테이블은 모두 fc_ 접두어를 사용한다(운영 전환 지시서 §0-5).
 * - tenant 소유 객체는 tenant_id NOT NULL + (tenant_id, id) 복합 unique를 적용하고,
 *   tenant 간 참조는 복합 FK로 차단한다(시험 사양 §2.1).
 * - 전역 신원(fc_users) FK는 user_id를 사용하고, tenant 내부 소속 참조는
 *   fc_tenant_memberships(tenant_id, user_id)를 경유한다.
 * - 모든 시각은 UTC timestamptz. 금액/크레딧은 decimal(정수 오차 없음).
 * - RLS: tenant 범위 테이블은 current_setting('portal.tenant_id') 기반 정책을 적용하고
 *   context 미설정 시 default deny다. 런타임 계정(NOSUPERUSER/NOBYPASSRLS/non-owner)과
 *   migration 계정 분리는 infra/db/roles.sql 참조.
 */

/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  // gen_random_uuid()는 PostgreSQL 13+ 내장(pgcrypto 불필요)
  // 업무 스키마는 Backstage pluginDivisionMode: schema 기본값과 같은 'portal'을 사용한다.
  await knex.raw('CREATE SCHEMA IF NOT EXISTS portal');
  await knex.raw('SET search_path TO portal, public');

  // ── tenant / 조직 ──────────────────────────────────────────────
  await knex.schema.createTable('fc_tenants', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.text('code').notNullable().unique();
    t.text('name').notNullable();
    // 군 구분은 tenant의 속성이다. '공통'은 전체 조회 우회 tenant가 아니다(지시서 §4.1).
    t.text('branch').notNullable();
    t.uuid('parent_id').nullable().references('id').inTable('fc_tenants');
    t.text('status').notNullable().defaultTo('active');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.integer('version').notNullable().defaultTo(1);
  });
  await knex.raw(
    `ALTER TABLE fc_tenants ADD CONSTRAINT fc_tenants_branch_chk
     CHECK (branch IN ('army','navy','airforce','joint'))`,
  );

  await knex.schema.createTable('fc_organizations', t => {
    t.uuid('id').notNullable().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.text('code').notNullable();
    t.text('name').notNullable();
    t.uuid('parent_id').nullable();
    t.text('status').notNullable().defaultTo('active');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.primary(['tenant_id', 'id']);
    t.unique(['tenant_id', 'code']);
    // 계층 순환 방지는 애플리케이션 + 추적 시험으로 검증한다(시험 사양 AT-03).
    t.foreign(['tenant_id', 'parent_id'])
      .references(['tenant_id', 'id'])
      .inTable('fc_organizations');
  });

  // ── 전역 신원 ──────────────────────────────────────────────────
  await knex.schema.createTable('fc_users', t => {
    t.uuid('user_id').primary().defaultTo(knex.fn.uuid());
    t.text('display_name').notNullable();
    // email은 영구 식별자가 아니라 표시/연락 속성이다(시험 사양 §2).
    t.text('email').nullable();
    t.text('status').notNullable().defaultTo('pending'); // pending/active/suspended/closed
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.integer('version').notNullable().defaultTo(1);
  });

  await knex.schema.createTable('fc_external_identities', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('user_id').notNullable().references('user_id').inTable('fc_users');
    t.text('issuer').notNullable();
    t.text('subject').notNullable();
    t.boolean('verified').notNullable().defaultTo(false);
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['issuer', 'subject']);
  });

  // ── 소속 ──────────────────────────────────────────────────────
  await knex.schema.createTable('fc_tenant_memberships', t => {
    t.uuid('id').notNullable().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.uuid('user_id').notNullable().references('user_id').inTable('fc_users');
    t.uuid('organization_id').nullable();
    t.text('status').notNullable().defaultTo('active'); // active/suspended/ended
    t.timestamp('valid_from', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('valid_until', { useTz: true }).nullable();
    t.uuid('approved_by').nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.primary(['tenant_id', 'id']);
    t.foreign('tenant_id').references('id').inTable('fc_tenants');
    t.foreign(['tenant_id', 'organization_id'])
      .references(['tenant_id', 'id'])
      .inTable('fc_organizations');
  });
  // 동일 (tenant, user)의 active membership 중복 금지
  await knex.raw(
    `CREATE UNIQUE INDEX fc_tenant_memberships_active_uq
     ON fc_tenant_memberships (tenant_id, user_id) WHERE status = 'active'`,
  );

  // ── 역할·권한 ─────────────────────────────────────────────────
  await knex.schema.createTable('fc_roles', t => {
    t.text('role_id').primary();
    t.text('name').notNullable();
    t.text('scope').notNullable(); // system/tenant/project
    t.integer('policy_version').notNullable().defaultTo(1);
  });
  await knex.raw(
    `ALTER TABLE fc_roles ADD CONSTRAINT fc_roles_scope_chk
     CHECK (scope IN ('system','tenant','project'))`,
  );

  await knex.schema.createTable('fc_permissions', t => {
    t.text('permission_id').primary();
    t.text('description').nullable();
  });

  await knex.schema.createTable('fc_role_permissions', t => {
    t.text('role_id').notNullable().references('role_id').inTable('fc_roles');
    t.text('permission_id').notNullable()
      .references('permission_id').inTable('fc_permissions');
    t.primary(['role_id', 'permission_id']);
  });

  await knex.schema.createTable('fc_role_assignments', t => {
    t.uuid('id').notNullable().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    // 소속 기준 참조: membership(tenant_id, id) 복합 FK
    t.uuid('membership_id').notNullable();
    t.text('role_id').notNullable().references('role_id').inTable('fc_roles');
    t.timestamp('valid_from', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('valid_until', { useTz: true }).nullable();
    t.uuid('delegated_by').nullable();
    t.text('reason').nullable();
    t.integer('policy_version').notNullable().defaultTo(1);
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.primary(['tenant_id', 'id']);
    t.foreign(['tenant_id', 'membership_id'])
      .references(['tenant_id', 'id'])
      .inTable('fc_tenant_memberships');
  });

  // ── 감사 원장 ─────────────────────────────────────────────────
  // 원장은 UPDATE/DELETE 금지(런타임 권한으로 차단, infra/db/roles.sql).
  // hash chain은 tenant/기간 batch 단위로 분리해 쓰기 병목을 피한다(시험 사양 §6.1).
  await knex.schema.createTable('fc_audit_events', t => {
    t.uuid('event_id').primary().defaultTo(knex.fn.uuid());
    t.timestamp('occurred_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('recorded_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.uuid('tenant_id').nullable(); // 인증 전 이벤트는 null + actor_type='system'
    t.uuid('actor_id').nullable();
    t.text('actor_type').notNullable().defaultTo('user'); // user/service/system
    t.text('issuer').nullable();
    t.text('subject').nullable();
    t.text('action').notNullable();
    t.text('resource_type').nullable();
    t.text('resource_id').nullable();
    t.text('resource_version').nullable();
    t.text('result').notNullable(); // success/denied/failed
    t.text('reason_code').nullable();
    t.text('request_id').nullable();
    t.text('trace_id').nullable();
    t.text('operation_id').nullable();
    t.integer('policy_version').nullable();
    // 민감 before/after 원문 금지 — allowlist 필드의 digest만 저장한다.
    t.jsonb('changed_fields').nullable();
    t.text('integrity_digest').nullable();
    t.index(['tenant_id', 'occurred_at']);
    t.index(['action', 'occurred_at']);
  });

  // ── 비동기 outbox / 멱등성 ────────────────────────────────────
  await knex.schema.createTable('fc_outbox_events', t => {
    t.uuid('event_id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').nullable();
    t.text('type').notNullable();
    t.jsonb('payload').notNullable();
    t.text('status').notNullable().defaultTo('pending'); // pending/leased/done/failed
    t.integer('attempts').notNullable().defaultTo(0);
    t.timestamp('retry_at', { useTz: true }).nullable();
    t.timestamp('lease_until', { useTz: true }).nullable();
    t.text('claimed_by').nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['status', 'retry_at']);
  });

  await knex.schema.createTable('fc_idempotency_keys', t => {
    t.uuid('tenant_id').notNullable();
    t.text('actor').notNullable();
    t.text('action').notNullable();
    t.text('key').notNullable();
    t.text('payload_hash').notNullable();
    t.jsonb('result').nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('expires_at', { useTz: true }).notNullable();
    t.primary(['tenant_id', 'actor', 'action', 'key']);
  });

  // ── RLS: tenant 범위 테이블, context 미설정 시 default deny ──
  const tenantScoped = ['fc_organizations', 'fc_tenant_memberships', 'fc_role_assignments'];
  for (const table of tenantScoped) {
    await knex.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    await knex.raw(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    await knex.raw(
      `CREATE POLICY ${table}_tenant_isolation ON ${table}
       USING (tenant_id = nullif(current_setting('portal.tenant_id', true), '')::uuid)
       WITH CHECK (tenant_id = nullif(current_setting('portal.tenant_id', true), '')::uuid)`,
    );
  }
  // 감사 원장은 조회 정책만 tenant 범위로 제한한다(쓰기는 감사 서비스 경유).
  await knex.raw(`ALTER TABLE fc_audit_events ENABLE ROW LEVEL SECURITY`);
  await knex.raw(
    `CREATE POLICY fc_audit_events_tenant_read ON fc_audit_events
     FOR SELECT
     USING (tenant_id = nullif(current_setting('portal.tenant_id', true), '')::uuid)`,
  );
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  // 파괴적 down은 rollback의 유일한 수단이 아니다(지시서 §6) — 개발 초기 단계 한정 제공.
  const tables = [
    'fc_idempotency_keys',
    'fc_outbox_events',
    'fc_audit_events',
    'fc_role_assignments',
    'fc_role_permissions',
    'fc_permissions',
    'fc_roles',
    'fc_tenant_memberships',
    'fc_external_identities',
    'fc_users',
    'fc_organizations',
    'fc_tenants',
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
};
