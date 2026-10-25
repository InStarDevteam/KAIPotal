/*
 * P1-2: 조직 위임·그룹·소속 변경 이력 (시험 사양 §2 '조직·위임' 도메인)
 *
 * - fc_groups: tenant 범위 그룹. 중첩 허용 여부는 allow_nesting으로 제한하고
 *   순환은 애플리케이션 검증 + 시험으로 막는다(DB CHECK로는 순환 탐지 불가).
 * - fc_delegations: 기간 한정 권한 위임. 위임 범위 밖 권한 상승은 서버에서 거부한다.
 * - fc_membership_changes: 조직 이동·소속 변경의 전후 scope와 승인을 추적한다.
 */

/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  await knex.raw('SET search_path TO portal, public');

  await knex.schema.createTable('fc_groups', t => {
    t.uuid('id').notNullable().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.text('code').notNullable();
    t.text('name').notNullable();
    t.uuid('parent_id').nullable();
    t.boolean('allow_nesting').notNullable().defaultTo(false);
    t.text('status').notNullable().defaultTo('active');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.integer('version').notNullable().defaultTo(1);
    t.primary(['tenant_id', 'id']);
    t.unique(['tenant_id', 'code']);
    t.foreign('tenant_id').references('id').inTable('fc_tenants');
    t.foreign(['tenant_id', 'parent_id'])
      .references(['tenant_id', 'id'])
      .inTable('fc_groups');
  });

  await knex.schema.createTable('fc_group_memberships', t => {
    t.uuid('tenant_id').notNullable();
    t.uuid('group_id').notNullable();
    // 그룹 소속은 유효한 tenant membership에 연결한다(시험 사양 §2.1).
    t.uuid('membership_id').notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.primary(['tenant_id', 'group_id', 'membership_id']);
    t.foreign(['tenant_id', 'group_id'])
      .references(['tenant_id', 'id'])
      .inTable('fc_groups');
    t.foreign(['tenant_id', 'membership_id'])
      .references(['tenant_id', 'id'])
      .inTable('fc_tenant_memberships');
  });

  await knex.schema.createTable('fc_delegations', t => {
    t.uuid('id').notNullable().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    // 위임자/수임자 모두 유효 membership이어야 한다.
    t.uuid('delegator_membership_id').notNullable();
    t.uuid('delegatee_membership_id').notNullable();
    t.text('role_id').notNullable().references('role_id').inTable('fc_roles');
    t.timestamp('valid_from', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('valid_until', { useTz: true }).notNullable();
    t.text('reason').notNullable();
    t.text('status').notNullable().defaultTo('active'); // active/revoked/expired
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.primary(['tenant_id', 'id']);
    t.foreign(['tenant_id', 'delegator_membership_id'])
      .references(['tenant_id', 'id'])
      .inTable('fc_tenant_memberships');
    t.foreign(['tenant_id', 'delegatee_membership_id'])
      .references(['tenant_id', 'id'])
      .inTable('fc_tenant_memberships');
  });

  await knex.schema.createTable('fc_membership_changes', t => {
    t.uuid('id').notNullable().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.uuid('membership_id').notNullable();
    t.text('change_type').notNullable(); // org_move/suspend/reactivate/end/role_revoke
    t.jsonb('before_scope').nullable();
    t.jsonb('after_scope').nullable();
    t.uuid('approved_by').nullable();
    t.text('reason').nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.primary(['tenant_id', 'id']);
    t.foreign(['tenant_id', 'membership_id'])
      .references(['tenant_id', 'id'])
      .inTable('fc_tenant_memberships');
  });

  // tenant 범위 RLS (0001과 동일 정책)
  const tenantScoped = ['fc_groups', 'fc_group_memberships', 'fc_delegations', 'fc_membership_changes'];
  for (const table of tenantScoped) {
    await knex.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    await knex.raw(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    await knex.raw(
      `CREATE POLICY ${table}_tenant_isolation ON ${table}
       USING (tenant_id = nullif(current_setting('portal.tenant_id', true), '')::uuid)
       WITH CHECK (tenant_id = nullif(current_setting('portal.tenant_id', true), '')::uuid)`,
    );
  }
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  await knex.raw('SET search_path TO portal, public');
  for (const table of [
    'fc_membership_changes',
    'fc_delegations',
    'fc_group_memberships',
    'fc_groups',
  ]) {
    await knex.schema.dropTableIfExists(table);
  }
};
