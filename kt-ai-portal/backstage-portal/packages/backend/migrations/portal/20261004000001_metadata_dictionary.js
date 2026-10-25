/** Project dictionary snapshots; institution identifiers are never invented.
 * Global technical metadata contains no personnel values. Runtime is read-only.
 */
exports.up = async knex => {
  await knex.schema.withSchema('portal').createTable('fc_metadata_releases', t => {
    t.uuid('release_id').primary();
    t.text('version').notNullable().unique();
    t.text('source_type').notNullable().defaultTo('project_draft');
    t.text('source_uri').notNullable();
    t.text('source_hash').notNullable();
    t.text('mapping_status').notNullable().defaultTo('provisional');
    t.text('institution_version').nullable();
    t.text('institution_source').nullable();
    t.integer('table_count').notNullable();
    t.integer('column_count').notNullable();
    t.timestamp('imported_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.withSchema('portal').createTable('fc_metadata_domains', t => {
    t.uuid('release_id').notNullable().references('release_id').inTable('portal.fc_metadata_releases');
    t.text('domain_id').notNullable();
    t.text('logical_name').notNullable();
    t.text('data_type').notNullable();
    t.text('precision').nullable();
    t.text('definition').notNullable();
    t.text('institution_domain_id').nullable();
    t.primary(['release_id', 'domain_id']);
  });
  await knex.schema.withSchema('portal').createTable('fc_metadata_words', t => {
    t.uuid('release_id').notNullable().references('release_id').inTable('portal.fc_metadata_releases');
    t.text('word_id').notNullable();
    t.text('logical_name').notNullable();
    t.text('english_name').notNullable();
    t.text('abbreviation').notNullable();
    t.text('definition').notNullable();
    t.text('institution_word_id').nullable();
    t.primary(['release_id', 'word_id']);
  });
  await knex.schema.withSchema('portal').createTable('fc_metadata_terms', t => {
    t.uuid('release_id').notNullable().references('release_id').inTable('portal.fc_metadata_releases');
    t.text('term_id').notNullable();
    t.text('logical_name').notNullable();
    t.text('english_name').notNullable();
    t.jsonb('word_ids').notNullable().defaultTo('[]');
    t.text('definition').notNullable();
    t.text('institution_term_id').nullable();
    t.primary(['release_id', 'term_id']);
  });
  await knex.schema.withSchema('portal').createTable('fc_metadata_codes', t => {
    t.uuid('release_id').notNullable().references('release_id').inTable('portal.fc_metadata_releases');
    t.text('code_group').notNullable();
    t.text('code_value').notNullable();
    t.text('logical_name').notNullable();
    t.text('definition').notNullable();
    t.text('applies_to').notNullable();
    t.text('institution_code_id').nullable();
    t.primary(['release_id', 'code_group', 'code_value']);
  });
  await knex.schema.withSchema('portal').createTable('fc_metadata_columns', t => {
    t.uuid('release_id').notNullable().references('release_id').inTable('portal.fc_metadata_releases');
    t.text('schema_name').notNullable();
    t.text('table_name').notNullable();
    t.text('column_name').notNullable();
    t.text('logical_name').notNullable();
    t.text('definition').notNullable();
    t.text('term_id').nullable();
    t.text('domain_id').notNullable();
    t.text('data_type').notNullable();
    t.boolean('is_nullable').notNullable();
    t.boolean('is_primary_key').notNullable();
    t.text('default_expression').nullable();
    t.jsonb('references').notNullable().defaultTo('[]');
    t.jsonb('constraints').notNullable().defaultTo('[]');
    t.text('sensitivity').notNullable();
    t.text('retention_policy').notNullable();
    t.text('source_migration').notNullable();
    t.text('mapping_status').notNullable().defaultTo('provisional');
    t.text('institution_term_id').nullable();
    t.primary(['release_id', 'schema_name', 'table_name', 'column_name']);
    t.foreign(['release_id', 'domain_id']).references(['release_id', 'domain_id']).inTable('portal.fc_metadata_domains');
    t.foreign(['release_id', 'term_id']).references(['release_id', 'term_id']).inTable('portal.fc_metadata_terms');
    t.index(['release_id', 'table_name']);
  });
  await knex.raw("ALTER TABLE portal.fc_metadata_releases ADD CONSTRAINT fc_metadata_releases_source_type_chk CHECK (source_type IN ('project_draft','institution'))");
  await knex.raw("ALTER TABLE portal.fc_metadata_releases ADD CONSTRAINT fc_metadata_releases_mapping_status_chk CHECK (mapping_status IN ('provisional','confirmed'))");
  await knex.raw(`ALTER TABLE portal.fc_metadata_releases ADD CONSTRAINT fc_metadata_releases_institution_chk CHECK (
    (mapping_status='provisional' AND source_type='project_draft' AND institution_version IS NULL AND institution_source IS NULL)
    OR (mapping_status='confirmed' AND source_type='institution' AND length(trim(institution_version))>0 AND institution_version IS NOT NULL AND length(trim(institution_source))>0 AND institution_source IS NOT NULL))`);
  await knex.raw("ALTER TABLE portal.fc_metadata_releases ADD CONSTRAINT fc_metadata_releases_counts_chk CHECK (table_count>0 AND column_count>0 AND source_hash ~ '^[0-9a-f]{64}$')");
  await knex.raw("ALTER TABLE portal.fc_metadata_columns ADD CONSTRAINT fc_metadata_columns_mapping_status_chk CHECK (mapping_status IN ('provisional','confirmed'))");
  // Default grants can be broad: explicitly remove all write capabilities.
  await knex.raw(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='portal_runtime') THEN
    REVOKE ALL ON portal.fc_metadata_releases, portal.fc_metadata_domains, portal.fc_metadata_words, portal.fc_metadata_terms, portal.fc_metadata_codes, portal.fc_metadata_columns FROM portal_runtime;
    GRANT SELECT ON portal.fc_metadata_releases, portal.fc_metadata_domains, portal.fc_metadata_words, portal.fc_metadata_terms, portal.fc_metadata_codes, portal.fc_metadata_columns TO portal_runtime;
  END IF; END $$`);
};
exports.down = async knex => {
  for (const table of ['fc_metadata_columns', 'fc_metadata_codes', 'fc_metadata_terms', 'fc_metadata_words', 'fc_metadata_domains', 'fc_metadata_releases']) {
    await knex.schema.withSchema('portal').dropTableIfExists(table);
  }
};
