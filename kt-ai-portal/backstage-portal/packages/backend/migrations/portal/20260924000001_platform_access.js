/** Platform launch policy and personal preferences use the selected tenant RLS. */
exports.up = async knex => {
  await knex.schema
    .withSchema('portal')
    .createTable('fc_platform_access', t => {
      t.uuid('tenant_id')
        .primary()
        .references('id')
        .inTable('portal.fc_tenants');
      t.integer('version').notNullable().defaultTo(1);
      t.jsonb('platforms').notNullable();
      t.jsonb('user_grants').notNullable().defaultTo('{}');
      t.uuid('updated_by')
        .notNullable()
        .references('user_id')
        .inTable('portal.fc_users');
      t.timestamp('updated_at', { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
    });
  await knex.schema
    .withSchema('portal')
    .createTable('fc_portal_preferences', t => {
      t.uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('portal.fc_tenants');
      t.uuid('user_id')
        .notNullable()
        .references('user_id')
        .inTable('portal.fc_users');
      t.jsonb('preferences').notNullable();
      t.timestamp('updated_at', { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
      t.primary(['tenant_id', 'user_id']);
    });
  for (const table of ['fc_platform_access', 'fc_portal_preferences']) {
    await knex.raw(`ALTER TABLE portal.${table} ENABLE ROW LEVEL SECURITY`);
    await knex.raw(`ALTER TABLE portal.${table} FORCE ROW LEVEL SECURITY`);
    await knex.raw(`CREATE POLICY ${table}_tenant_isolation ON portal.${table}
      USING (tenant_id = nullif(current_setting('portal.tenant_id', true), '')::uuid)
      WITH CHECK (tenant_id = nullif(current_setting('portal.tenant_id', true), '')::uuid)`);
  }
  await knex.raw(
    'ALTER TABLE portal.fc_tenants DROP CONSTRAINT fc_tenants_branch_chk',
  );
  await knex.raw(
    "ALTER TABLE portal.fc_tenants ADD CONSTRAINT fc_tenants_branch_chk CHECK (branch IN ('army','navy','airforce','joint','marines'))",
  );
};
exports.down = async knex => {
  await knex.schema
    .withSchema('portal')
    .dropTableIfExists('fc_portal_preferences');
  await knex.schema
    .withSchema('portal')
    .dropTableIfExists('fc_platform_access');
  // Existing marines tenants remain valid; downgrades must not destroy tenant data.
};
