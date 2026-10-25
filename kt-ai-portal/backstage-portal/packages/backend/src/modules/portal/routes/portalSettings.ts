import { Router } from 'express';
import { Knex } from 'knex';
import { randomUUID } from 'crypto';
import { HttpAuthService, LoggerService } from '@backstage/backend-plugin-api';
import { getPortalContext, requirePermission } from '../services/middleware';
import { setTenantContext } from '../services/context';
import { recordAuditEvent } from '../services/audit';
import {
  parseStoredValue,
  protectSettingValues,
  SETTING_CATEGORIES,
  SETTING_KEY_PATTERN,
  SETTING_VALUE_TYPES,
  settingValueValid,
  valueTypeMismatchMessage,
} from '../services/portalSettings';

interface RouterDeps {
  db: Knex;
  httpAuth: HttpAuthService;
  logger: LoggerService;
}

const meta = (requestId: string) => ({
  requestId,
  asOf: new Date().toISOString(),
  dataMode: 'live' as const,
  sourceSystem: 'portal',
  connectionState: 'connected' as const,
  freshness: 'fresh' as const,
  nextCursor: null,
});

const errorBody = (
  code: string,
  message: string,
  requestId: string,
  retryable = false,
) => ({ error: { code, message, retryable, requestId } });

interface SettingRow {
  tenant_id: string;
  category: string;
  key: string;
  value: unknown;
  value_type: string;
  description: string | null;
  updated_by: string;
  updated_at: Date;
  version: number;
}

const presentSetting = (row: SettingRow) => {
  const protectedValue = protectSettingValues(
    row.key,
    parseStoredValue(row.value, row.value_type),
  );
  return {
    category: row.category,
    key: row.key,
    value: protectedValue.values[0],
    valueType: row.value_type,
    description: row.description,
    sensitive: protectedValue.sensitive,
    version: row.version,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
};

export const createPortalSettingsRouter = ({
  db,
  httpAuth,
  logger,
}: RouterDeps) => {
  const router = Router();
  const deps = { db, httpAuth, logger };
  const settingsManage = requirePermission(deps, 'settings.manage');

  router.get(
    '/v1/portal-settings/history',
    settingsManage,
    async (req, res) => {
      const ctx = getPortalContext(req);
      const category = req.query.category;
      const key = req.query.key;
      const page = Number(req.query.page ?? 1);
      const pageSize = Number(req.query.pageSize ?? 20);
      if (
        (category !== undefined &&
          (typeof category !== 'string' ||
            !SETTING_CATEGORIES.includes(category as never))) ||
        (key !== undefined &&
          (typeof key !== 'string' || !SETTING_KEY_PATTERN.test(key))) ||
        !Number.isSafeInteger(page) ||
        page < 1 ||
        page > 10000 ||
        !Number.isSafeInteger(pageSize) ||
        pageSize < 1 ||
        pageSize > 100
      )
        return res
          .status(422)
          .json(
            errorBody(
              'invalid_history_query',
              '이력 분류·키·페이지 범위를 확인하세요.',
              ctx.requestId,
            ),
          );
      try {
        const data = await db.transaction(async trx => {
          await setTenantContext(trx, ctx.tenantId);
          const query = trx('portal.fc_portal_setting_history as h').where(
            'h.tenant_id',
            ctx.tenantId,
          );
          if (category) query.where('h.category', category);
          if (key) query.where('h.key', key);
          const count = await query
            .clone()
            .count<{ count: string }>('* as count')
            .first();
          const rows = await query
            .clone()
            .leftJoin('portal.fc_users as u', 'u.user_id', 'h.changed_by')
            .select('h.*', 'u.display_name as changed_by_name')
            .orderBy('h.changed_at', 'desc')
            .orderBy('h.id', 'desc')
            .offset((page - 1) * pageSize)
            .limit(pageSize);
          return {
            items: rows.map(row => {
              const protectedValue = protectSettingValues(
                row.key,
                row.old_value,
                row.new_value,
              );
              return {
                id: row.id,
                category: row.category,
                key: row.key,
                oldValue: protectedValue.values[0],
                newValue: protectedValue.values[1],
                sensitive: protectedValue.sensitive,
                changedBy: row.changed_by,
                changedByName: row.changed_by_name || '등록 사용자',
                changedAt: row.changed_at,
              };
            }),
            page,
            pageSize,
            total: Number(count?.count ?? 0),
          };
        });
        return res.json({ data, meta: meta(ctx.requestId) });
      } catch (e) {
        logger.error(
          `portal settings history read error: ${(e as Error).message}`,
          { requestId: ctx.requestId },
        );
        return res
          .status(500)
          .json(
            errorBody(
              'internal_error',
              '설정 변경 이력을 불러오지 못했습니다.',
              ctx.requestId,
              true,
            ),
          );
      }
    },
  );

  router.get('/v1/portal-settings', settingsManage, async (req, res) => {
    const ctx = getPortalContext(req);
    const category = req.query.category as string | undefined;
    if (category && !SETTING_CATEGORIES.includes(category as never)) {
      return res
        .status(422)
        .json(
          errorBody(
            'invalid_category',
            '설정 분류를 확인하세요.',
            ctx.requestId,
          ),
        );
    }
    try {
      const data = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        const base = trx('portal.fc_portal_setting').where({
          tenant_id: ctx.tenantId,
        });
        if (category) base.where({ category });
        const rows = (await base
          .orderBy('category', 'asc')
          .orderBy('key', 'asc')) as SettingRow[];
        return { items: rows.map(presentSetting) };
      });
      return res.json({ data, meta: meta(ctx.requestId) });
    } catch (e) {
      logger.error(`portal settings read error: ${(e as Error).message}`, {
        requestId: ctx.requestId,
      });
      return res
        .status(500)
        .json(
          errorBody(
            'internal_error',
            '설정 조회 중 오류가 발생했습니다.',
            ctx.requestId,
            true,
          ),
        );
    }
  });

  router.put(
    '/v1/portal-settings/:category/:key',
    settingsManage,
    async (req, res) => {
      const ctx = getPortalContext(req);
      const requestId = ctx.requestId;
      const category = req.params.category;
      const key = req.params.key;
      const body = req.body ?? {};
      if (
        !SETTING_CATEGORIES.includes(category as never) ||
        !SETTING_KEY_PATTERN.test(key) ||
        typeof body !== 'object' ||
        body === null ||
        !('value' in body) ||
        (body.expectedVersion !== undefined &&
          (!Number.isSafeInteger(body.expectedVersion) ||
            (body.expectedVersion as number) < 0)) ||
        (body.description !== undefined &&
          body.description !== null &&
          (typeof body.description !== 'string' ||
            body.description.length > 500 ||
            /[<>]/.test(body.description))) ||
        (body.valueType !== undefined &&
          !SETTING_VALUE_TYPES.includes(body.valueType as never))
      ) {
        return res
          .status(422)
          .json(
            errorBody('invalid_setting', '분류·키·값을 확인하세요.', requestId),
          );
      }
      try {
        const result = await db.transaction(async trx => {
          await setTenantContext(trx, ctx.tenantId);
          await trx.raw('SELECT pg_advisory_xact_lock(hashtext(?))', [
            `portal-setting:${ctx.tenantId}:${category}:${key}`,
          ]);
          const current = (await trx('portal.fc_portal_setting')
            .where({ tenant_id: ctx.tenantId, category, key })
            .first()) as SettingRow | undefined;
          const valueType = current
            ? current.value_type
            : (body.valueType as string);
          if (!SETTING_VALUE_TYPES.includes(valueType as never)) {
            return {
              status: 422,
              code: 'value_type_required',
              message: '신규 설정은 valueType을 지정해야 합니다.',
            };
          }
          if (!settingValueValid(body.value, valueType)) {
            return {
              status: 400,
              code: 'value_type_mismatch',
              message: valueTypeMismatchMessage(key, valueType),
            };
          }
          if (
            current &&
            body.expectedVersion !== undefined &&
            body.expectedVersion !== current.version
          ) {
            return {
              status: 409,
              code: 'version_conflict',
              message:
                '다른 관리자가 설정을 변경했습니다. 새로 불러온 후 다시 저장하세요.',
            };
          }
          const nextVersion = current ? current.version + 1 : 1;
          await trx('portal.fc_portal_setting')
            .insert({
              tenant_id: ctx.tenantId,
              category,
              key,
              value: JSON.stringify(body.value),
              value_type: valueType,
              description:
                body.description !== undefined
                  ? body.description
                  : current?.description ?? null,
              updated_by: ctx.identity.userId,
              updated_at: trx.fn.now(),
              version: nextVersion,
            })
            .onConflict(['tenant_id', 'category', 'key'])
            .merge();
          await trx('portal.fc_portal_setting_history').insert({
            id: randomUUID(),
            tenant_id: ctx.tenantId,
            category,
            key,
            old_value: current ? JSON.stringify(current.value) : null,
            new_value: JSON.stringify(body.value),
            changed_by: ctx.identity.userId,
          });
          await recordAuditEvent(trx, ctx.principal, {
            tenantId: ctx.tenantId,
            actorId: ctx.identity.userId,
            action: 'portal.setting.update',
            resourceType: 'portal_setting',
            resourceId: `${category}/${key}`,
            resourceVersion: String(nextVersion),
            result: 'success',
            changedFields: ['value'],
            requestId,
          });
          const updated = (await trx('portal.fc_portal_setting')
            .where({ tenant_id: ctx.tenantId, category, key })
            .first()) as SettingRow;
          return { status: 200, data: presentSetting(updated) };
        });
        if (result.status !== 200) {
          return res
            .status(result.status)
            .json(
              errorBody(
                result.code ?? 'internal_error',
                result.message ?? '요청을 처리하지 못했습니다.',
                requestId,
              ),
            );
        }
        return res.json({ data: result.data, meta: meta(requestId) });
      } catch (e) {
        logger.error(`portal settings update error: ${(e as Error).message}`, {
          requestId,
        });
        return res
          .status(500)
          .json(
            errorBody(
              'internal_error',
              '설정 저장 중 오류가 발생했습니다.',
              requestId,
              true,
            ),
          );
      }
    },
  );

  return router;
};
