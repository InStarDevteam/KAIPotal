// 포털 업무 첫 화면 집계와 공유 승인함을 위한 업무 원장.
// - fc_projects / fc_project_members: 서버 검증 프로젝트 멤버십(로컬 샘플을 '내 프로젝트'로 간주 금지)
// - fc_work_requests / fc_request_events: 신청·승인 상태와 이력(낙관적 락 version, 감사와 원자적 기록)
// 크레딧/자원 사용량 원천은 플랫폼 측 계약(기존 40개 연계 계약)이 담당하며,
// 이 마이그레이션은 포털 낮 추적 원장만 둔다. 미연동 수치를 만들지 않는다.

/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.withSchema('portal').createTable('fc_projects', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.text('name').notNullable();
    t.text('description').nullable();
    t.text('status').notNullable().defaultTo('active'); // active/closed
    t.uuid('owner_user_id').notNullable();
    t.integer('version').notNullable().defaultTo(1);
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['tenant_id', 'status']);
  });

  await knex.schema.withSchema('portal').createTable('fc_project_members', t => {
    t.uuid('project_id').notNullable();
    t.uuid('tenant_id').notNullable(); // RLS 범위 컬럼(프로젝트와 동일 테넌트)
    t.uuid('user_id').notNullable();
    t.text('member_role').notNullable().defaultTo('member'); // owner/manager/member
    t.timestamp('joined_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.primary(['project_id', 'user_id']);
    t.index(['tenant_id', 'user_id']);
  });

  await knex.schema.withSchema('portal').createTable('fc_work_requests', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.uuid('project_id').nullable();
    t.text('type').notNullable(); // workspace/export/credit
    t.text('title').notNullable();
    t.jsonb('payload').notNullable().defaultTo('{}');
    t.uuid('requester_user_id').notNullable();
    t.text('status').notNullable().defaultTo('requested'); // requested/reviewing/approved/rejected
    t.integer('version').notNullable().defaultTo(1); // 낙관적 락
    t.uuid('decided_by').nullable();
    t.timestamp('decided_at', { useTz: true }).nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['tenant_id', 'status', 'created_at']);
    t.index(['tenant_id', 'requester_user_id', 'created_at']);
  });

  await knex.schema.withSchema('portal').createTable('fc_request_events', t => {
    t.uuid('event_id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.uuid('request_id').notNullable();
    t.uuid('actor_user_id').nullable();
    t.text('action').notNullable(); // submitted/decided/commented
    t.text('note').nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['tenant_id', 'request_id', 'created_at']);
  });

  // ── RLS: tenant 범위, context 미설정 시 default deny ──
  const tenantScoped = [
    'fc_projects',
    'fc_project_members',
    'fc_work_requests',
    'fc_request_events',
  ];
  for (const table of tenantScoped) {
    await knex.raw(`ALTER TABLE portal.${table} ENABLE ROW LEVEL SECURITY`);
    await knex.raw(`ALTER TABLE portal.${table} FORCE ROW LEVEL SECURITY`);
    await knex.raw(
      `CREATE POLICY ${table}_tenant_isolation ON portal.${table}
       USING (tenant_id = nullif(current_setting('portal.tenant_id', true), '')::uuid)
       WITH CHECK (tenant_id = nullif(current_setting('portal.tenant_id', true), '')::uuid)`,
    );
  }
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  const tables = [
    'fc_request_events',
    'fc_work_requests',
    'fc_project_members',
    'fc_projects',
  ];
  for (const table of tables) {
    await knex.raw(`DROP TABLE IF EXISTS portal.${table} CASCADE`);
  }
};
