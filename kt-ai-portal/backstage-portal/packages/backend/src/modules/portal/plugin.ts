import { buildPortalDbClient } from './services/database';
import {
  coreServices,
  createBackendPlugin,
  resolvePackagePath,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';

/**
 * 포털 업무 BFF 플러그인.
 *
 * `/api/portal/v1/...`을 명시 등록하며, 내부는 auth/context, tenancy, audit,
 * outbox 모듈로 분리한다(점진 확장).
 *
 * DB 소유 분리(시험 사양 §2.2, ADR-002):
 * Backstage database service는 플러그인별 DB(backstage_plugin_*)를 자동 생성하는
 * framework 내부 저장소다. 포털 업무 데이터(fc_*)는 이 경로를 쓰지 않고,
 * `portal.database` 설정의 전용 업무 DB(portal_business, schema=portal)에
 * 별도 knex 풀로 접속한다. 소유·권한·migration 실행 주체가 framework와 분리된다.
 *
 * migration은 기본적으로 시작 시 실행하지 않는다(portal.migrations.runOnStartup).
 * 운영에서는 별도 migration job(scripts/run-portal-migrations.mjs, portal_migrator
 * 계정)으로 실행하고, 이 플래그는 local-integration 개발 프로파일에서만 true다.
 */

export const portalPlugin = createBackendPlugin({
  pluginId: 'portal',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.rootLogger,
        config: coreServices.rootConfig,
        httpAuth: coreServices.httpAuth,
        lifecycle: coreServices.lifecycle,
      },
      async init({ httpRouter, logger, config, httpAuth, lifecycle }) {
        const db = buildPortalDbClient(config);
        lifecycle.addShutdownHook(() => db.destroy());

        const runOnStartup =
          config.getOptionalBoolean('portal.migrations.runOnStartup') === true;
        if (runOnStartup) {
          // 로컬 개발 편의 경로. dist 번들에는 migrations 디렉터리가 포함되지
          // 않을 수 있으므로, 운영 migration job은 저장소에서 직접 실행한다.
          const migrationsDir = resolvePackagePath(
            'backend',
            'migrations/portal',
          );
          logger.info(`portal migrations 실행: ${migrationsDir}`);
          await db.migrate.latest({
            directory: migrationsDir,
            schemaName: 'portal',
            tableName: 'fc_knex_migrations',
          });
        } else {
          logger.info(
            'portal migrations runOnStartup=false — 별도 migration job으로 실행하세요',
          );
        }

        const router = await createRouter({
          db,
          logger: logger.child({ plugin: 'portal' }),
          httpAuth,
        });
        httpRouter.use(router);
        // /api/portal/v1/health는 무인증 liveness로 개방한다.
        httpRouter.addAuthPolicy({
          path: '/v1/health',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
