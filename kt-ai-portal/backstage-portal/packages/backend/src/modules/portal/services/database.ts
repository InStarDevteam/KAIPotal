import { Config } from '@backstage/config';
import knex, { Knex } from 'knex';

/** node-postgres는 /로 시작하는 host를 Unix socket으로 처리한다.
 * Cloud SQL socket은 connector가 암호화하므로 pg SSL을 중복 적용하지 않는다. */
export function buildPortalDbClient(config: Config): Knex {
  const host = config.getString('portal.database.host');
  const port = Number(
    config.getOptionalString('portal.database.port') ?? '5432',
  );
  const max = config.getOptionalNumber('portal.database.poolMax') ?? 5;
  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !Number.isInteger(max) ||
    max < 1 ||
    max > 20
  ) {
    throw new Error('Invalid portal database port/poolMax');
  }
  return knex({
    client: 'pg',
    connection: {
      host,
      port,
      user: config.getString('portal.database.user'),
      password: config.getString('portal.database.password'),
      database: config.getString('portal.database.database'),
      connectionTimeoutMillis: 10000,
      statement_timeout: 15000,
      application_name: 'kai-portal-bff',
    },
    pool: { min: 0, max },
    acquireConnectionTimeout: 10000,
    searchPath: ['portal'],
  });
}
