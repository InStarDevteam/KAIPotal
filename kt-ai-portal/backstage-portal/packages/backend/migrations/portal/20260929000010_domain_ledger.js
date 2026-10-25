// 공통 업무 원장 보완 + 크레딧·반입반출 도메인 원장.
// - work_requests 계열: 누락된 FK/CHECK/색인 보완(기존 데이터 보존: NOT VALID → 위반 검출 → VALIDATE)
// - fc_credit_*: 상품(단가 이력)·계정(낙관적 락)·거래(부호 규칙·멱등)·승인 요청 원장
// - fc_transfer_*: 반입반출 요청(승인 버전 고정)과 파일 버전 원장
const TENANT_ISOLATION_POLICY = table =>
  `CREATE POLICY ${table}_tenant_isolation ON portal.${table}
   USING (tenant_id = nullif(current_setting('portal.tenant_id', true), '')::uuid)
   WITH CHECK (tenant_id = nullif(current_setting('portal.tenant_id', true), '')::uuid)`;

const enableTenantRls = async (knex, tables) => {
  for (const table of tables) {
    await knex.raw(`ALTER TABLE portal.${table} ENABLE ROW LEVEL SECURITY`);
    await knex.raw(`ALTER TABLE portal.${table} FORCE ROW LEVEL SECURITY`);
    await knex.raw(TENANT_ISOLATION_POLICY(table));
  }
};

const assertNoOrphans = async (knex, label, query, params) => {
  const rows = await knex.raw(query, params);
  const count = Number(rows.rows[0]?.count ?? 0);
  if (count > 0) {
    const sampleRows = await knex.raw(
      `${query.replace(/count\(\*\)/, 'id')} LIMIT 5`,
      params,
    );
    const samples = (sampleRows.rows ?? [])
      .map(row => String(row.id))
      .join(', ');
    throw new Error(
      `migration 20260929000010 실패: ${label} 위반 ${count}건 (예시: ${samples}). ` +
        '기존 데이터 정합성 오류를 먼저 해결한 뒤 재실행하세요. 자동 삭제는 수행하지 않습니다.',
    );
  }
};

const addFkNotValid = async (knex, table, constraint, columns, refTable, refColumns) => {
  await knex.raw(
    `ALTER TABLE portal.${table} ADD CONSTRAINT ${constraint} FOREIGN KEY (${columns})
     REFERENCES portal.${refTable} (${refColumns}) NOT VALID`,
  );
};

const validateFk = async (knex, table, constraint) => {
  await knex.raw(
    `ALTER TABLE portal.${table} VALIDATE CONSTRAINT ${constraint}`,
  );
};

/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  // ── 1. work_requests 관계 보완 ────────────────────────────────
  // fc_projects PK는 id 단독이라 (tenant_id, id) 복합 참조용 unique를 먼저 둔다.
  await knex.raw(
    `CREATE UNIQUE INDEX IF NOT EXISTS fc_projects_tenant_id_id_uq
     ON portal.fc_projects (tenant_id, id)`,
  );

  await addFkNotValid(knex, 'fc_projects', 'fc_projects_owner_fk', 'owner_user_id', 'fc_users', 'user_id');
  await assertNoOrphans(
    knex,
    'fc_projects.owner_user_id → fc_users',
    `SELECT count(*) FROM portal.fc_projects p
     WHERE NOT EXISTS (SELECT 1 FROM portal.fc_users u WHERE u.user_id = p.owner_user_id)`,
    [],
  );
  await validateFk(knex, 'fc_projects', 'fc_projects_owner_fk');

  await addFkNotValid(knex, 'fc_project_members', 'fc_project_members_project_fk', 'project_id', 'fc_projects', 'id');
  await addFkNotValid(knex, 'fc_project_members', 'fc_project_members_user_fk', 'user_id', 'fc_users', 'user_id');
  await assertNoOrphans(
    knex,
    'fc_project_members.project_id → fc_projects',
    `SELECT count(*) FROM portal.fc_project_members m
     WHERE NOT EXISTS (SELECT 1 FROM portal.fc_projects p WHERE p.id = m.project_id)`,
    [],
  );
  await assertNoOrphans(
    knex,
    'fc_project_members.user_id → fc_users',
    `SELECT count(*) FROM portal.fc_project_members m
     WHERE NOT EXISTS (SELECT 1 FROM portal.fc_users u WHERE u.user_id = m.user_id)`,
    [],
  );
  await validateFk(knex, 'fc_project_members', 'fc_project_members_project_fk');
  await validateFk(knex, 'fc_project_members', 'fc_project_members_user_fk');

  await addFkNotValid(knex, 'fc_work_requests', 'fc_work_requests_requester_fk', 'requester_user_id', 'fc_users', 'user_id');
  await addFkNotValid(knex, 'fc_work_requests', 'fc_work_requests_decider_fk', 'decided_by', 'fc_users', 'user_id');
  await addFkNotValid(knex, 'fc_work_requests', 'fc_work_requests_project_fk', 'project_id', 'fc_projects', 'id');
  await assertNoOrphans(
    knex,
    'fc_work_requests.requester_user_id → fc_users',
    `SELECT count(*) FROM portal.fc_work_requests r
     WHERE NOT EXISTS (SELECT 1 FROM portal.fc_users u WHERE u.user_id = r.requester_user_id)`,
    [],
  );
  await assertNoOrphans(
    knex,
    'fc_work_requests.project_id → fc_projects',
    `SELECT count(*) FROM portal.fc_work_requests r
     WHERE r.project_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM portal.fc_projects p WHERE p.id = r.project_id)`,
    [],
  );
  await assertNoOrphans(
    knex,
    'fc_work_requests.decided_by → fc_users',
    `SELECT count(*) FROM portal.fc_work_requests r
     WHERE r.decided_by IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM portal.fc_users u WHERE u.user_id = r.decided_by)`,
    [],
  );
  await validateFk(knex, 'fc_work_requests', 'fc_work_requests_requester_fk');
  await validateFk(knex, 'fc_work_requests', 'fc_work_requests_decider_fk');
  await validateFk(knex, 'fc_work_requests', 'fc_work_requests_project_fk');

  await addFkNotValid(knex, 'fc_request_events', 'fc_request_events_request_fk', 'request_id', 'fc_work_requests', 'id');
  await addFkNotValid(knex, 'fc_request_events', 'fc_request_events_actor_fk', 'actor_user_id', 'fc_users', 'user_id');
  await assertNoOrphans(
    knex,
    'fc_request_events.request_id → fc_work_requests',
    `SELECT count(*) FROM portal.fc_request_events e
     WHERE NOT EXISTS (SELECT 1 FROM portal.fc_work_requests r WHERE r.id = e.request_id)`,
    [],
  );
  await assertNoOrphans(
    knex,
    'fc_request_events.actor_user_id → fc_users',
    `SELECT count(*) FROM portal.fc_request_events e
     WHERE e.actor_user_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM portal.fc_users u WHERE u.user_id = e.actor_user_id)`,
    [],
  );
  await validateFk(knex, 'fc_request_events', 'fc_request_events_request_fk');
  await validateFk(knex, 'fc_request_events', 'fc_request_events_actor_fk');

  // 코드(workRequests.ts)의 상태 집합과 전이 규칙을 DB에 동일하게 적용한다.
  await knex.raw(
    `ALTER TABLE portal.fc_work_requests ADD CONSTRAINT fc_work_requests_status_chk
     CHECK (status IN ('requested', 'reviewing', 'approved', 'rejected'))`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_request_events ADD CONSTRAINT fc_request_events_action_chk
     CHECK (action IN ('submitted', 'decided', 'commented'))`,
  );
  // CHECK는 이전 값을 볼 수 없으므로 종결 상태(approved/rejected) 불변은 트리거로 강제한다.
  await knex.raw(
    `CREATE OR REPLACE FUNCTION portal.fc_work_requests_terminal_guard() RETURNS trigger
     LANGUAGE plpgsql AS $$
     BEGIN
       IF OLD.status IN ('approved', 'rejected') AND NEW.status IS DISTINCT FROM OLD.status THEN
         RAISE EXCEPTION '종결된 신청(%)의 상태를 변경할 수 없습니다.', OLD.status;
       END IF;
       RETURN NEW;
     END $$`,
  );
  await knex.raw(
    `CREATE TRIGGER fc_work_requests_terminal_guard
     BEFORE UPDATE ON portal.fc_work_requests
     FOR EACH ROW
     WHEN (OLD.status IN ('approved', 'rejected') AND NEW.status IS DISTINCT FROM OLD.status)
     EXECUTE FUNCTION portal.fc_work_requests_terminal_guard()`,
  );

  // work request 생성 멱등성: 재시도/중복 클릭 시 같은 키면 기존 신청을 반환한다.
  await knex.schema.withSchema('portal').alterTable('fc_work_requests', t => {
    t.uuid('idempotency_key').nullable();
  });
  await knex.raw(
    `CREATE UNIQUE INDEX fc_work_requests_idempotency_uq
     ON portal.fc_work_requests (tenant_id, idempotency_key)
     WHERE idempotency_key IS NOT NULL`,
  );

  // ── 2. 크레딧 도메인 ─────────────────────────────────────────
  await knex.schema.withSchema('portal').createTable('fc_credit_product', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.text('code').notNullable();
    t.text('name').notNullable();
    t.text('unit').notNullable();
    t.decimal('unit_price', 20, 4).notNullable();
    t.text('currency').notNullable().defaultTo('KRW');
    t.timestamp('valid_from', { useTz: true }).notNullable();
    t.timestamp('valid_to', { useTz: true }).nullable();
    t.boolean('active').notNullable().defaultTo(true);
    t.uuid('created_by').notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.uuid('updated_by').notNullable();
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['tenant_id', 'code', 'valid_from']);
    t.index(['tenant_id', 'active']);
  });
  await knex.raw(
    `ALTER TABLE portal.fc_credit_product ADD CONSTRAINT fc_credit_product_unit_chk
     CHECK (unit IN ('cpu-hour', 'gpu-hour', 'storage-gb-day'))`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_credit_product ADD CONSTRAINT fc_credit_product_price_chk
     CHECK (unit_price >= 0)`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_credit_product ADD CONSTRAINT fc_credit_product_currency_chk
     CHECK (currency = 'KRW')`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_credit_product ADD CONSTRAINT fc_credit_product_validity_chk
     CHECK (valid_to IS NULL OR valid_to > valid_from)`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_credit_product ADD CONSTRAINT fc_credit_product_created_by_fk
     FOREIGN KEY (created_by) REFERENCES portal.fc_users (user_id)`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_credit_product ADD CONSTRAINT fc_credit_product_updated_by_fk
     FOREIGN KEY (updated_by) REFERENCES portal.fc_users (user_id)`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_credit_product ADD CONSTRAINT fc_credit_product_tenant_fk
     FOREIGN KEY (tenant_id) REFERENCES portal.fc_tenants (id)`,
  );

  await knex.schema.withSchema('portal').createTable('fc_credit_account', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.text('owner_type').notNullable();
    t.uuid('owner_id').notNullable();
    t.decimal('balance', 20, 4).notNullable().defaultTo(0);
    t.integer('version').notNullable().defaultTo(1);
    t.uuid('created_by').notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.uuid('updated_by').notNullable();
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['tenant_id', 'owner_type', 'owner_id']);
  });
  await knex.raw(
    `ALTER TABLE portal.fc_credit_account ADD CONSTRAINT fc_credit_account_owner_chk
     CHECK (owner_type IN ('user', 'project', 'tenant'))`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_credit_account ADD CONSTRAINT fc_credit_account_balance_chk
     CHECK (balance >= 0)`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_credit_account ADD CONSTRAINT fc_credit_account_created_by_fk
     FOREIGN KEY (created_by) REFERENCES portal.fc_users (user_id)`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_credit_account ADD CONSTRAINT fc_credit_account_updated_by_fk
     FOREIGN KEY (updated_by) REFERENCES portal.fc_users (user_id)`,
  );
  await knex.raw(
    `CREATE UNIQUE INDEX fc_credit_account_tenant_id_id_uq
     ON portal.fc_credit_account (tenant_id, id)`,
  );

  await knex.schema.withSchema('portal').createTable('fc_credit_transaction', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.uuid('account_id').notNullable();
    t.text('type').notNullable();
    t.decimal('amount', 20, 4).notNullable();
    t.decimal('unit_price_snapshot', 20, 4).nullable();
    t.decimal('quantity', 20, 4).nullable();
    t.text('reason').notNullable();
    t.text('ref_type').nullable();
    t.uuid('ref_id').nullable();
    t.text('idempotency_key').nullable();
    t.uuid('created_by').notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['tenant_id', 'account_id', 'created_at']);
    t.index(['tenant_id', 'type', 'created_at']);
    t.index(['tenant_id', 'ref_type', 'ref_id']);
  });
  await knex.raw(
    `ALTER TABLE portal.fc_credit_transaction ADD CONSTRAINT fc_credit_transaction_type_chk
     CHECK (type IN ('grant', 'charge', 'deduct', 'adjust'))`,
  );
  // 부호 규칙: grant/charge는 양수, deduct는 음수, adjust(정정)는 부호가 방향을 나타낸다.
  await knex.raw(
    `ALTER TABLE portal.fc_credit_transaction ADD CONSTRAINT fc_credit_transaction_sign_chk
     CHECK (
       amount <> 0
       AND (type NOT IN ('grant', 'charge') OR amount > 0)
       AND (type <> 'deduct' OR amount < 0)
     )`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_credit_transaction ADD CONSTRAINT fc_credit_transaction_account_fk
     FOREIGN KEY (tenant_id, account_id) REFERENCES portal.fc_credit_account (tenant_id, id)`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_credit_transaction ADD CONSTRAINT fc_credit_transaction_created_by_fk
     FOREIGN KEY (created_by) REFERENCES portal.fc_users (user_id)`,
  );
  await knex.raw(
    `CREATE UNIQUE INDEX fc_credit_transaction_idempotency_uq
     ON portal.fc_credit_transaction (tenant_id, idempotency_key)
     WHERE idempotency_key IS NOT NULL`,
  );

  await knex.schema.withSchema('portal').createTable('fc_credit_request', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.text('type').notNullable();
    t.text('owner_type').notNullable();
    t.uuid('owner_id').notNullable();
    t.decimal('amount', 20, 4).notNullable();
    t.text('reason').notNullable();
    t.text('status').notNullable().defaultTo('requested');
    t.uuid('requested_by').notNullable();
    t.timestamp('requested_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.uuid('decided_by').nullable();
    t.timestamp('decided_at', { useTz: true }).nullable();
    t.text('decision_reason').nullable();
    t.text('idempotency_key').nullable();
    t.integer('version').notNullable().defaultTo(1);
    t.index(['tenant_id', 'status', 'requested_at']);
  });
  await knex.raw(
    `ALTER TABLE portal.fc_credit_request ADD CONSTRAINT fc_credit_request_type_chk
     CHECK (type IN ('initial_grant', 'charge', 'adjustment'))`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_credit_request ADD CONSTRAINT fc_credit_request_owner_chk
     CHECK (owner_type IN ('user', 'project', 'tenant'))`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_credit_request ADD CONSTRAINT fc_credit_request_amount_chk
     CHECK (amount > 0)`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_credit_request ADD CONSTRAINT fc_credit_request_status_chk
     CHECK (status IN ('requested', 'approved', 'rejected', 'cancelled'))`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_credit_request ADD CONSTRAINT fc_credit_request_decision_chk
     CHECK (status = 'requested' OR decided_by IS NOT NULL)`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_credit_request ADD CONSTRAINT fc_credit_request_requester_fk
     FOREIGN KEY (requested_by) REFERENCES portal.fc_users (user_id)`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_credit_request ADD CONSTRAINT fc_credit_request_decider_fk
     FOREIGN KEY (decided_by) REFERENCES portal.fc_users (user_id)`,
  );
  await knex.raw(
    `CREATE UNIQUE INDEX fc_credit_request_idempotency_uq
     ON portal.fc_credit_request (tenant_id, idempotency_key)
     WHERE idempotency_key IS NOT NULL`,
  );

  await enableTenantRls(knex, [
    'fc_credit_product',
    'fc_credit_account',
    'fc_credit_transaction',
    'fc_credit_request',
  ]);

  // ── 3. 반입·반출 도메인 ──────────────────────────────────────
  await knex.schema.withSchema('portal').createTable('fc_transfer_request', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.text('kind').notNullable();
    t.text('subject_type').notNullable();
    t.text('title').notNullable();
    t.text('purpose').notNullable();
    t.text('security_grade').notNullable();
    t.boolean('public_consent').notNullable().defaultTo(false);
    t.text('public_scope').notNullable().defaultTo('none');
    t.text('usage_permission').nullable();
    t.text('status').notNullable().defaultTo('requested');
    t.uuid('requested_by').notNullable();
    t.timestamp('requested_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.uuid('decided_by').nullable();
    t.timestamp('decided_at', { useTz: true }).nullable();
    t.text('decision_reason').nullable();
    t.integer('approved_file_version').nullable();
    t.text('idempotency_key').nullable();
    t.integer('version').notNullable().defaultTo(1);
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['tenant_id', 'status', 'created_at']);
    t.index(['tenant_id', 'kind', 'subject_type']);
  });
  await knex.raw(
    `ALTER TABLE portal.fc_transfer_request ADD CONSTRAINT fc_transfer_request_kind_chk
     CHECK (kind IN ('import', 'export'))`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_transfer_request ADD CONSTRAINT fc_transfer_request_subject_chk
     CHECK (subject_type IN ('server', 'artifact'))`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_transfer_request ADD CONSTRAINT fc_transfer_request_grade_chk
     CHECK (security_grade IN ('public', 'internal', 'confidential', 'secret'))`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_transfer_request ADD CONSTRAINT fc_transfer_request_scope_chk
     CHECK (public_scope IN ('none', 'tenant', 'all'))`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_transfer_request ADD CONSTRAINT fc_transfer_request_consent_chk
     CHECK (public_scope = 'none' OR public_consent)`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_transfer_request ADD CONSTRAINT fc_transfer_request_status_chk
     CHECK (status IN ('requested', 'in_review', 'approved', 'rejected', 'supplement_requested', 'cancelled'))`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_transfer_request ADD CONSTRAINT fc_transfer_request_decision_chk
     CHECK (
       status IN ('requested', 'in_review', 'supplement_requested')
       OR decided_by IS NOT NULL
     )`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_transfer_request ADD CONSTRAINT fc_transfer_request_approve_chk
     CHECK (status <> 'approved' OR approved_file_version IS NOT NULL)`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_transfer_request ADD CONSTRAINT fc_transfer_request_requester_fk
     FOREIGN KEY (requested_by) REFERENCES portal.fc_users (user_id)`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_transfer_request ADD CONSTRAINT fc_transfer_request_decider_fk
     FOREIGN KEY (decided_by) REFERENCES portal.fc_users (user_id)`,
  );
  await knex.raw(
    `CREATE UNIQUE INDEX fc_transfer_request_tenant_id_id_uq
     ON portal.fc_transfer_request (tenant_id, id)`,
  );
  await knex.raw(
    `CREATE UNIQUE INDEX fc_transfer_request_idempotency_uq
     ON portal.fc_transfer_request (tenant_id, idempotency_key)
     WHERE idempotency_key IS NOT NULL`,
  );

  await knex.schema.withSchema('portal').createTable('fc_transfer_file', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('tenant_id').notNullable();
    t.uuid('request_id').notNullable();
    t.text('stored_name').notNullable();
    t.text('original_name').notNullable();
    t.text('mime').notNullable();
    t.bigInteger('size_bytes').notNullable();
    t.text('sha256').notNullable();
    t.integer('version').notNullable();
    t.uuid('created_by').notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['request_id', 'version']);
    t.index(['tenant_id', 'request_id', 'created_at']);
  });
  await knex.raw(
    `ALTER TABLE portal.fc_transfer_file ADD CONSTRAINT fc_transfer_file_request_fk
     FOREIGN KEY (tenant_id, request_id) REFERENCES portal.fc_transfer_request (tenant_id, id)`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_transfer_file ADD CONSTRAINT fc_transfer_file_stored_name_chk
     CHECK (stored_name !~ '[/\\\\]')`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_transfer_file ADD CONSTRAINT fc_transfer_file_size_chk
     CHECK (size_bytes > 0)`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_transfer_file ADD CONSTRAINT fc_transfer_file_sha256_chk
     CHECK (sha256 ~ '^[0-9a-f]{64}$')`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_transfer_file ADD CONSTRAINT fc_transfer_file_version_chk
     CHECK (version >= 1)`,
  );
  await knex.raw(
    `ALTER TABLE portal.fc_transfer_file ADD CONSTRAINT fc_transfer_file_created_by_fk
     FOREIGN KEY (created_by) REFERENCES portal.fc_users (user_id)`,
  );

  await enableTenantRls(knex, ['fc_transfer_request', 'fc_transfer_file']);
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  await knex.raw(
    'DROP TRIGGER IF EXISTS fc_work_requests_terminal_guard ON portal.fc_work_requests',
  );
  await knex.raw(
    'DROP FUNCTION IF EXISTS portal.fc_work_requests_terminal_guard()',
  );
  for (const table of ['fc_transfer_file', 'fc_transfer_request']) {
    await knex.raw(`DROP TABLE IF EXISTS portal.${table} CASCADE`);
  }
  for (const table of [
    'fc_credit_request',
    'fc_credit_transaction',
    'fc_credit_account',
    'fc_credit_product',
  ]) {
    await knex.raw(`DROP TABLE IF EXISTS portal.${table} CASCADE`);
  }
  await knex.raw(
    'DROP INDEX IF EXISTS portal.fc_work_requests_idempotency_uq',
  );
  await knex.schema.withSchema('portal').alterTable('fc_work_requests', t => {
    t.dropColumn('idempotency_key');
  });
  await knex.raw(
    'ALTER TABLE portal.fc_request_events DROP CONSTRAINT IF EXISTS fc_request_events_actor_fk',
  );
  await knex.raw(
    'ALTER TABLE portal.fc_request_events DROP CONSTRAINT IF EXISTS fc_request_events_request_fk',
  );
  await knex.raw(
    'ALTER TABLE portal.fc_request_events DROP CONSTRAINT IF EXISTS fc_request_events_action_chk',
  );
  await knex.raw(
    'ALTER TABLE portal.fc_work_requests DROP CONSTRAINT IF EXISTS fc_work_requests_project_fk',
  );
  await knex.raw(
    'ALTER TABLE portal.fc_work_requests DROP CONSTRAINT IF EXISTS fc_work_requests_decider_fk',
  );
  await knex.raw(
    'ALTER TABLE portal.fc_work_requests DROP CONSTRAINT IF EXISTS fc_work_requests_requester_fk',
  );
  await knex.raw(
    'ALTER TABLE portal.fc_work_requests DROP CONSTRAINT IF EXISTS fc_work_requests_status_chk',
  );
  await knex.raw(
    'ALTER TABLE portal.fc_project_members DROP CONSTRAINT IF EXISTS fc_project_members_user_fk',
  );
  await knex.raw(
    'ALTER TABLE portal.fc_project_members DROP CONSTRAINT IF EXISTS fc_project_members_project_fk',
  );
  await knex.raw(
    'ALTER TABLE portal.fc_projects DROP CONSTRAINT IF EXISTS fc_projects_owner_fk',
  );
  await knex.raw(
    'DROP INDEX IF EXISTS portal.fc_projects_tenant_id_id_uq',
  );
};
