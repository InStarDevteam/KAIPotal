// K-RMF 모니터링 백엔드 원장 (기준선-통제-증적-조치-변경-TRR-평가인가-추적연결).
// - fc_ 접두 유지, tenant_id NOT NULL, 시각은 UTC timestamptz.
// - 증적은 통제 내 version 정수가 단조 증가(교체 시에도 검토는 처음부터 다시 진행).
// - 자동 인가 판정 컬럼은 두지 않는다 — 인가는 사람이 입력한 기록(evidence 근거)만 남긴다.
// - RLS는 기존 테이블과 동일하게 portal.tenant_id 기반, context 미설정 시 default deny.

/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.withSchema('portal').createTable('fc_krmf_baseline', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.text('name').notNullable();
    t.text('version').notNullable();
    t.text('description').nullable();
    t.text('status').notNullable().defaultTo('draft'); // draft/active/archived
    t.uuid('project_id').nullable().references('id').inTable('portal.fc_projects');
    t.uuid('created_by').nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.uuid('updated_by').nullable();
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['tenant_id', 'status']);
    t.index(['tenant_id', 'project_id']);
  });
  await knex.raw(
    `CREATE UNIQUE INDEX fc_krmf_baseline_name_version_uq
     ON portal.fc_krmf_baseline (tenant_id, coalesce(project_id, '00000000-0000-0000-0000-000000000000'), name, version)`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_krmf_baseline ADD CONSTRAINT fc_krmf_baseline_status_chk
     CHECK (status IN ('draft','active','archived'))`,
  );

  await knex.schema.withSchema('portal').createTable('fc_krmf_control', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.uuid('baseline_id').notNullable().references('id').inTable('portal.fc_krmf_baseline');
    t.text('control_code').notNullable();
    t.text('title').notNullable();
    t.text('description').nullable();
    t.text('applicability').notNullable().defaultTo('applied'); // applied/excluded/alternative
    t.text('alternative_reason').nullable();
    t.uuid('owner_id').nullable();
    t.timestamp('due_date', { useTz: true }).nullable();
    t.text('status').notNullable().defaultTo('not_started'); // not_started/in_progress/evidence_submitted/verified
    t.integer('sort_order').notNullable().defaultTo(0);
    t.uuid('created_by').nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.uuid('updated_by').nullable();
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['baseline_id', 'control_code']);
    t.index(['tenant_id', 'status']);
    t.index(['tenant_id', 'owner_id']);
    t.index(['baseline_id', 'sort_order']);
    t.index(['tenant_id', 'due_date']);
  });
  await knex.raw(
    `ALTER TABLE portal.fc_krmf_control ADD CONSTRAINT fc_krmf_control_applicability_chk
     CHECK (applicability IN ('applied','excluded','alternative'))`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_krmf_control ADD CONSTRAINT fc_krmf_control_status_chk
     CHECK (status IN ('not_started','in_progress','evidence_submitted','verified'))`,
  );

  await knex.schema.withSchema('portal').createTable('fc_krmf_evidence', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.uuid('control_id').notNullable().references('id').inTable('portal.fc_krmf_control');
    t.text('title').notNullable();
    t.text('kind').notNullable(); // file/reference
    t.uuid('file_id').nullable(); // fc_krmf_file 참조(순환 방지로 FK 없음)
    t.text('reference_uri').nullable();
    t.text('scope').notNullable().defaultTo('project');
    t.integer('version').notNullable();
    t.uuid('submitted_by').notNullable();
    t.timestamp('submitted_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.text('review_status').notNullable().defaultTo('pending'); // pending/approved/rejected
    t.uuid('reviewed_by').nullable();
    t.timestamp('reviewed_at', { useTz: true }).nullable();
    t.text('review_comment').nullable();
    t.unique(['control_id', 'version']);
    t.index(['tenant_id', 'review_status']);
    t.index(['control_id', 'submitted_at']);
  });
  await knex.raw(
    `ALTER TABLE portal.fc_krmf_evidence ADD CONSTRAINT fc_krmf_evidence_kind_chk
     CHECK (kind IN ('file','reference'))`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_krmf_evidence ADD CONSTRAINT fc_krmf_evidence_review_chk
     CHECK (review_status IN ('pending','approved','rejected'))`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_krmf_evidence ADD CONSTRAINT fc_krmf_evidence_body_chk
     CHECK ((kind = 'file' AND file_id IS NOT NULL AND reference_uri IS NULL)
         OR (kind = 'reference' AND reference_uri IS NOT NULL AND file_id IS NULL))`,
  );

  await knex.schema.withSchema('portal').createTable('fc_krmf_file', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.uuid('evidence_id').notNullable().references('id').inTable('portal.fc_krmf_evidence');
    t.text('stored_name').notNullable();
    t.text('original_name').notNullable();
    t.text('mime').notNullable();
    t.bigInteger('size_bytes').notNullable();
    t.text('sha256').notNullable();
    t.uuid('created_by').notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['tenant_id', 'sha256']);
  });

  await knex.schema.withSchema('portal').createTable('fc_krmf_action', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.uuid('control_id').notNullable().references('id').inTable('portal.fc_krmf_control');
    t.text('title').notNullable();
    t.text('cause').notNullable();
    t.text('impact').notNullable().defaultTo('medium'); // high/medium/low
    t.uuid('owner_id').notNullable();
    t.timestamp('due_date', { useTz: true }).nullable();
    t.text('status').notNullable().defaultTo('open'); // open/in_progress/resolved/reconfirmed
    t.text('resolution').nullable();
    t.uuid('reconfirmed_by').nullable();
    t.timestamp('reconfirmed_at', { useTz: true }).nullable();
    t.uuid('created_by').nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.uuid('updated_by').nullable();
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['tenant_id', 'status']);
    t.index(['tenant_id', 'owner_id', 'status']);
    t.index(['control_id', 'status']);
    t.index(['tenant_id', 'due_date']);
  });
  await knex.raw(
    `ALTER TABLE portal.fc_krmf_action ADD CONSTRAINT fc_krmf_action_status_chk
     CHECK (status IN ('open','in_progress','resolved','reconfirmed'))`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_krmf_action ADD CONSTRAINT fc_krmf_action_impact_chk
     CHECK (impact IN ('high','medium','low'))`,
  );

  await knex.schema.withSchema('portal').createTable('fc_krmf_change', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.uuid('project_id').nullable().references('id').inTable('portal.fc_projects');
    t.text('title').notNullable();
    t.text('change_type').notNullable(); // policy/config
    t.text('description').notNullable();
    t.jsonb('affected_control_ids').notNullable().defaultTo('[]');
    t.boolean('reassess_required').notNullable().defaultTo(false);
    t.text('reassess_reason').nullable();
    t.text('status').notNullable().defaultTo('recorded'); // recorded/under_review/reassessed
    t.uuid('created_by').nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.uuid('updated_by').nullable();
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['tenant_id', 'status']);
    t.index(['tenant_id', 'project_id']);
  });
  await knex.raw(
    `ALTER TABLE portal.fc_krmf_change ADD CONSTRAINT fc_krmf_change_type_chk
     CHECK (change_type IN ('policy','config'))`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_krmf_change ADD CONSTRAINT fc_krmf_change_status_chk
     CHECK (status IN ('recorded','under_review','reassessed'))`,
  );

  await knex.schema.withSchema('portal').createTable('fc_krmf_trr_check', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.uuid('project_id').notNullable().references('id').inTable('portal.fc_projects');
    t.text('item_code').notNullable();
    t.text('title').notNullable();
    t.text('test_criteria').nullable();
    t.text('test_data').nullable();
    t.boolean('evidence_ready').notNullable().defaultTo(false);
    t.text('status').notNullable().defaultTo('not_ready'); // not_ready/ready/na
    t.text('note').nullable();
    t.uuid('created_by').nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.uuid('updated_by').nullable();
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['tenant_id', 'project_id', 'item_code']);
    t.index(['tenant_id', 'project_id', 'status']);
  });
  await knex.raw(
    `ALTER TABLE portal.fc_krmf_trr_check ADD CONSTRAINT fc_krmf_trr_status_chk
     CHECK (status IN ('not_ready','ready','na'))`,
  );

  await knex.schema.withSchema('portal').createTable('fc_krmf_eval_record', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.uuid('project_id').nullable().references('id').inTable('portal.fc_projects');
    t.text('kind').notNullable(); // submission/query/answer/supplement/risk_acceptance/authority_confirmation
    t.text('title').notNullable();
    t.text('body').notNullable();
    t.text('residual_risk').nullable();
    t.text('source').notNullable();
    t.text('status').notNullable().defaultTo('open'); // open/answered/closed
    t.uuid('asked_by').notNullable();
    t.timestamp('asked_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.uuid('answered_by').nullable();
    t.timestamp('answered_at', { useTz: true }).nullable();
    t.uuid('recorded_by').notNullable();
    t.timestamp('recorded_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['tenant_id', 'kind', 'status']);
    t.index(['tenant_id', 'project_id']);
  });
  await knex.raw(
    `ALTER TABLE portal.fc_krmf_eval_record ADD CONSTRAINT fc_krmf_eval_kind_chk
     CHECK (kind IN ('submission','query','answer','supplement','risk_acceptance','authority_confirmation'))`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_krmf_eval_record ADD CONSTRAINT fc_krmf_eval_status_chk
     CHECK (status IN ('open','answered','closed'))`,
  );

  await knex.schema.withSchema('portal').createTable('fc_krmf_control_link', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.uuid('control_id').notNullable().references('id').inTable('portal.fc_krmf_control');
    t.text('link_type').notNullable(); // requirement/implementation/test/defect
    t.text('ref_id').notNullable();
    t.text('ref_title').nullable();
    t.text('status').notNullable().defaultTo('linked'); // linked/unresolved
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['control_id', 'link_type', 'ref_id']);
    t.index(['tenant_id', 'link_type', 'status']);
  });
  await knex.raw(
    `ALTER TABLE portal.fc_krmf_control_link ADD CONSTRAINT fc_krmf_link_type_chk
     CHECK (link_type IN ('requirement','implementation','test','defect'))`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_krmf_control_link ADD CONSTRAINT fc_krmf_link_status_chk
     CHECK (status IN ('linked','unresolved'))`,
  );

  // ── RLS: tenant 범위, context 미설정 시 default deny ──
  const tenantScoped = [
    'fc_krmf_baseline',
    'fc_krmf_control',
    'fc_krmf_evidence',
    'fc_krmf_file',
    'fc_krmf_action',
    'fc_krmf_change',
    'fc_krmf_trr_check',
    'fc_krmf_eval_record',
    'fc_krmf_control_link',
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
    'fc_krmf_control_link',
    'fc_krmf_eval_record',
    'fc_krmf_trr_check',
    'fc_krmf_change',
    'fc_krmf_action',
    'fc_krmf_file',
    'fc_krmf_evidence',
    'fc_krmf_control',
    'fc_krmf_baseline',
  ];
  for (const table of tables) {
    await knex.raw(`DROP TABLE IF EXISTS portal.${table} CASCADE`);
  }
};
