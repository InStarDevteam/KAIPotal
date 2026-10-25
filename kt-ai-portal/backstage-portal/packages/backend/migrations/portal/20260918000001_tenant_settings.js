/** Tenant branding/menu configuration is versioned, audited, and isolated by RLS. */
exports.up = async knex => {
  await knex.schema
    .withSchema('portal')
    .createTable('fc_tenant_settings', t => {
      t.uuid('tenant_id')
        .primary()
        .references('id')
        .inTable('portal.fc_tenants');
      t.integer('version').notNullable().defaultTo(1);
      t.jsonb('branding').notNullable();
      t.jsonb('menus').notNullable();
      t.uuid('updated_by')
        .notNullable()
        .references('user_id')
        .inTable('portal.fc_users');
      t.timestamp('updated_at', { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
    });
  await knex.raw(
    'ALTER TABLE portal.fc_tenant_settings ENABLE ROW LEVEL SECURITY',
  );
  await knex.raw(
    'ALTER TABLE portal.fc_tenant_settings FORCE ROW LEVEL SECURITY',
  );
  await knex.raw(`CREATE POLICY fc_tenant_settings_tenant_isolation ON portal.fc_tenant_settings
    USING (tenant_id = nullif(current_setting('portal.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('portal.tenant_id', true), '')::uuid)`);
  await knex.raw(`CREATE INDEX fc_audit_events_tenant_result_time
    ON portal.fc_audit_events (tenant_id, result, occurred_at DESC)`);
  await knex.raw(`CREATE INDEX fc_audit_events_tenant_actor_time
    ON portal.fc_audit_events (tenant_id, actor_id, occurred_at DESC)`);
};

exports.down = async knex => {
  await knex.raw(
    'DROP INDEX IF EXISTS portal.fc_audit_events_tenant_actor_time',
  );
  await knex.raw(
    'DROP INDEX IF EXISTS portal.fc_audit_events_tenant_result_time',
  );
  await knex.schema
    .withSchema('portal')
    .dropTableIfExists('fc_tenant_settings');
};
