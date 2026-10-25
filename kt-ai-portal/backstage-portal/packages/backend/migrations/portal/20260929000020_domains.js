// 프로젝트 / 제안 게시판 / 서비스·도구 카탈로그 / 공통 환경설정 원장.
// - fc_project, fc_project_member, fc_project_invite: 4상태 프로젝트 생명주기 + 멤버·초대
// - fc_proposal, fc_proposal_sympathy, fc_proposal_review: 제안·공감(중복 방지)·검토
// - fc_catalog_item, fc_catalog_application: 카탈로그와 신청(도메인 상세 원천, 공통 work request 원장과 논리 참조)
// - fc_portal_setting, fc_portal_setting_history: 분류·버전·변경 이력이 있는 공통 설정
// 모든 테이블은 tenant_id 필수 + FORCE RLS. 감사 원장은 기존 UPDATE/DELETE 금지 정책을 그대로 쓴다.

const STATUSES = {
  project: ['active', 'suspended', 'closing', 'closed'],
  visibility: ['public', 'member'],
  memberRole: ['manager', 'member', 'viewer'],
  inviteStatus: ['invited', 'accepted', 'declined', 'expired'],
  proposalType: ['feature', 'improvement', 'bug', 'operation'],
  proposalVisibility: ['public', 'tenant', 'private'],
  proposalStatus: ['submitted', 'under_review', 'answered', 'notice'],
  reviewDecision: ['answer', 'notice', 'supplement'],
  catalogKind: ['tool', 'service', 'dataset', 'model'],
  catalogCategory: ['analysis', 'development', 'data', 'visualization', 'labeling'],
  catalogProvider: ['portal', 'external'],
  catalogAccess: ['apply', 'direct_link'],
  applicationStatus: ['requested', 'approved', 'rejected', 'cancelled'],
  executionStatus: ['pending_platform', 'provisioning', 'failed'],
  settingCategory: ['common', 'security', 'resource', 'operation'],
  settingValueType: ['string', 'number', 'boolean', 'json'],
};

const checkIn = (column, values) =>
  `ALTER TABLE ?? ADD CONSTRAINT ?? CHECK (${column} IN (${values
    .map(v => `'${v}'`)
    .join(', ')}))`;
const checkName = (table, column) => `${table}_${column}_chk`.replace(/\./g, '_');

const tenantIsolationPolicy = table =>
  `CREATE POLICY ${table.replace(/\./g, '_')}_tenant_isolation ON ${table}
   USING (tenant_id = nullif(current_setting('portal.tenant_id', true), '')::uuid)
   WITH CHECK (tenant_id = nullif(current_setting('portal.tenant_id', true), '')::uuid)`;

/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.withSchema('portal').createTable('fc_project', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.text('name').notNullable();
    t.text('description').nullable();
    t.text('purpose').nullable();
    t.text('status').notNullable().defaultTo('active');
    t.uuid('owner_id').notNullable();
    t.timestamp('start_at', { useTz: true }).nullable();
    t.timestamp('end_at', { useTz: true }).nullable();
    t.text('visibility').notNullable().defaultTo('public');
    t.integer('version').notNullable().defaultTo(1);
    t.text('idempotency_key').nullable();
    t.uuid('created_by').notNullable();
    t.uuid('updated_by').notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['tenant_id', 'idempotency_key']);
    t.index(['tenant_id', 'status', 'created_at']);
    t.index(['tenant_id', 'owner_id']);
  });
  await knex.raw(checkIn('status', STATUSES.project), [
    'portal.fc_project',
    checkName('fc_project', 'status'),
  ]);
  await knex.raw(checkIn('visibility', STATUSES.visibility), [
    'portal.fc_project',
    checkName('fc_project', 'visibility'),
  ]);

  await knex.schema.withSchema('portal').createTable('fc_project_member', t => {
    t.uuid('project_id').notNullable()
      .references('id').inTable('portal.fc_project');
    t.uuid('tenant_id').notNullable();
    t.uuid('user_id').notNullable();
    t.text('role').notNullable().defaultTo('member');
    t.timestamp('joined_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.primary(['project_id', 'user_id']);
    t.index(['tenant_id', 'user_id']);
  });
  await knex.raw(checkIn('role', STATUSES.memberRole), [
    'portal.fc_project_member',
    checkName('fc_project_member', 'role'),
  ]);

  await knex.schema.withSchema('portal').createTable('fc_project_invite', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.uuid('project_id').notNullable()
      .references('id').inTable('portal.fc_project');
    t.uuid('invitee_id').notNullable();
    t.text('role').notNullable().defaultTo('member');
    t.text('status').notNullable().defaultTo('invited');
    t.uuid('invited_by').notNullable();
    t.timestamp('invited_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('responded_at', { useTz: true }).nullable();
    t.index(['tenant_id', 'invitee_id', 'status']);
    t.index(['tenant_id', 'project_id']);
  });
  await knex.raw(checkIn('role', STATUSES.memberRole), [
    'portal.fc_project_invite',
    checkName('fc_project_invite', 'role'),
  ]);
  await knex.raw(checkIn('status', STATUSES.inviteStatus), [
    'portal.fc_project_invite',
    checkName('fc_project_invite', 'status'),
  ]);

  await knex.schema.withSchema('portal').createTable('fc_proposal', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.text('type').notNullable();
    t.text('title').notNullable();
    t.text('necessity').nullable();
    t.text('utilization_plan').nullable();
    t.text('visibility').notNullable().defaultTo('tenant');
    t.text('status').notNullable().defaultTo('submitted');
    t.uuid('author_id').notNullable();
    t.text('attachment_uri').nullable();
    t.integer('view_count').notNullable().defaultTo(0);
    t.integer('version').notNullable().defaultTo(1);
    t.text('idempotency_key').nullable();
    t.uuid('created_by').notNullable();
    t.uuid('updated_by').notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['tenant_id', 'idempotency_key']);
    t.index(['tenant_id', 'status', 'created_at']);
    t.index(['tenant_id', 'type', 'created_at']);
    t.index(['tenant_id', 'author_id']);
  });
  await knex.raw(checkIn('type', STATUSES.proposalType), [
    'portal.fc_proposal',
    checkName('fc_proposal', 'type'),
  ]);
  await knex.raw(checkIn('visibility', STATUSES.proposalVisibility), [
    'portal.fc_proposal',
    checkName('fc_proposal', 'visibility'),
  ]);
  await knex.raw(checkIn('status', STATUSES.proposalStatus), [
    'portal.fc_proposal',
    checkName('fc_proposal', 'status'),
  ]);

  await knex.schema.withSchema('portal').createTable('fc_proposal_sympathy', t => {
    t.uuid('proposal_id').notNullable()
      .references('id').inTable('portal.fc_proposal');
    t.uuid('tenant_id').notNullable();
    t.uuid('user_id').notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.primary(['proposal_id', 'user_id']);
    t.index(['tenant_id', 'user_id']);
  });

  await knex.schema.withSchema('portal').createTable('fc_proposal_review', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.uuid('proposal_id').notNullable()
      .references('id').inTable('portal.fc_proposal');
    t.uuid('reviewer_id').notNullable();
    t.text('decision').notNullable();
    t.text('body').notNullable();
    t.text('attachment_uri').nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['tenant_id', 'proposal_id', 'created_at']);
  });
  await knex.raw(checkIn('decision', STATUSES.reviewDecision), [
    'portal.fc_proposal_review',
    checkName('fc_proposal_review', 'decision'),
  ]);

  await knex.schema.withSchema('portal').createTable('fc_catalog_item', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.text('kind').notNullable();
    t.text('category').notNullable();
    t.text('name').notNullable();
    t.text('summary').nullable();
    t.text('description').nullable();
    t.text('provider').notNullable().defaultTo('portal');
    t.text('access_type').notNullable().defaultTo('apply');
    t.text('link_url').nullable();
    t.boolean('active').notNullable().defaultTo(true);
    t.integer('sort_order').notNullable().defaultTo(0);
    t.uuid('created_by').notNullable();
    t.uuid('updated_by').notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['tenant_id', 'name', 'kind']);
    t.index(['tenant_id', 'active', 'sort_order']);
    t.index(['tenant_id', 'kind', 'category']);
  });
  await knex.raw(checkIn('kind', STATUSES.catalogKind), [
    'portal.fc_catalog_item',
    checkName('fc_catalog_item', 'kind'),
  ]);
  await knex.raw(checkIn('category', STATUSES.catalogCategory), [
    'portal.fc_catalog_item',
    checkName('fc_catalog_item', 'category'),
  ]);
  await knex.raw(checkIn('provider', STATUSES.catalogProvider), [
    'portal.fc_catalog_item',
    checkName('fc_catalog_item', 'provider'),
  ]);
  await knex.raw(checkIn('access_type', STATUSES.catalogAccess), [
    'portal.fc_catalog_item',
    checkName('fc_catalog_item', 'access_type'),
  ]);

  await knex.schema.withSchema('portal').createTable('fc_catalog_application', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.uuid('item_id').notNullable()
      .references('id').inTable('portal.fc_catalog_item');
    t.uuid('project_id').nullable();
    t.text('reason').notNullable();
    t.text('status').notNullable().defaultTo('requested');
    t.text('execution_status').notNullable().defaultTo('pending_platform');
    t.text('idempotency_key').nullable();
    t.uuid('work_request_id').nullable();
    t.uuid('requested_by').notNullable();
    t.uuid('decided_by').nullable();
    t.timestamp('decided_at', { useTz: true }).nullable();
    t.integer('version').notNullable().defaultTo(1);
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['tenant_id', 'idempotency_key']);
    t.index(['tenant_id', 'status', 'created_at']);
    t.index(['tenant_id', 'requested_by', 'created_at']);
  });
  await knex.raw(checkIn('status', STATUSES.applicationStatus), [
    'portal.fc_catalog_application',
    checkName('fc_catalog_application', 'status'),
  ]);
  await knex.raw(checkIn('execution_status', STATUSES.executionStatus), [
    'portal.fc_catalog_application',
    checkName('fc_catalog_application', 'execution_status'),
  ]);

  await knex.schema.withSchema('portal').createTable('fc_portal_setting', t => {
    t.uuid('tenant_id').notNullable();
    t.text('category').notNullable();
    t.text('key').notNullable();
    t.jsonb('value').notNullable();
    t.text('value_type').notNullable();
    t.text('description').nullable();
    t.uuid('updated_by').notNullable();
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.integer('version').notNullable().defaultTo(1);
    t.primary(['tenant_id', 'category', 'key']);
  });
  await knex.raw(checkIn('category', STATUSES.settingCategory), [
    'portal.fc_portal_setting',
    checkName('fc_portal_setting', 'category'),
  ]);
  await knex.raw(checkIn('value_type', STATUSES.settingValueType), [
    'portal.fc_portal_setting',
    checkName('fc_portal_setting', 'value_type'),
  ]);

  await knex.schema.withSchema('portal').createTable('fc_portal_setting_history', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.text('category').notNullable();
    t.text('key').notNullable();
    t.jsonb('old_value').nullable();
    t.jsonb('new_value').notNullable();
    t.uuid('changed_by').notNullable();
    t.timestamp('changed_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['tenant_id', 'category', 'key', 'changed_at']);
  });

  const tenantScoped = [
    'portal.fc_project',
    'portal.fc_project_member',
    'portal.fc_project_invite',
    'portal.fc_proposal',
    'portal.fc_proposal_sympathy',
    'portal.fc_proposal_review',
    'portal.fc_catalog_item',
    'portal.fc_catalog_application',
    'portal.fc_portal_setting',
    'portal.fc_portal_setting_history',
  ];
  for (const table of tenantScoped) {
    await knex.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    await knex.raw(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    await knex.raw(tenantIsolationPolicy(table));
  }
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  const tables = [
    'portal.fc_portal_setting_history',
    'portal.fc_portal_setting',
    'portal.fc_catalog_application',
    'portal.fc_catalog_item',
    'portal.fc_proposal_review',
    'portal.fc_proposal_sympathy',
    'portal.fc_proposal',
    'portal.fc_project_invite',
    'portal.fc_project_member',
    'portal.fc_project',
  ];
  for (const table of tables) {
    await knex.raw(`DROP TABLE IF EXISTS ${table} CASCADE`);
  }
};
