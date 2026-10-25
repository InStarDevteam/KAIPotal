/** User supplied personnel/contact details. These attributes grant no access. */
exports.up = async knex => {
  await knex.schema.withSchema('portal').createTable('fc_user_profiles', t => {
    t.uuid('tenant_id')
      .notNullable()
      .references('id')
      .inTable('portal.fc_tenants');
    t.uuid('user_id')
      .notNullable()
      .references('user_id')
      .inTable('portal.fc_users');
    t.jsonb('profile').notNullable().defaultTo('{}');
    t.integer('version').notNullable().defaultTo(1);
    t.timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    t.primary(['tenant_id', 'user_id']);
  });
  await knex.raw(
    'ALTER TABLE portal.fc_user_profiles ENABLE ROW LEVEL SECURITY',
  );
  await knex.raw(
    'ALTER TABLE portal.fc_user_profiles FORCE ROW LEVEL SECURITY',
  );
  await knex.raw(`CREATE POLICY fc_user_profiles_tenant_isolation ON portal.fc_user_profiles
    USING (tenant_id = nullif(current_setting('portal.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('portal.tenant_id', true), '')::uuid)`);
  await knex.raw(`DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'portal_runtime') THEN
      GRANT SELECT, INSERT, UPDATE ON portal.fc_user_profiles TO portal_runtime;
    END IF;
  END $$`);
};
exports.down = async knex => {
  await knex.schema.withSchema('portal').dropTableIfExists('fc_user_profiles');
};
