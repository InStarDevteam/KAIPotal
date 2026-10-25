import { NextFunction, Request, Response, Router } from 'express';
import { Knex } from 'knex';
import { createHash, randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import multer from 'multer';
import { HttpAuthService, LoggerService } from '@backstage/backend-plugin-api';
import { getPortalContext, requireMembership } from '../services/middleware';
import { setTenantContext } from '../services/context';
import { recordAuditEvent } from '../services/audit';
import {
  addTransferFileVersion,
  cancelTransferRequest,
  createTransferRequest,
  decideTransferRequest,
  getTransferRequestDetail,
  resolveTransferDownload,
  TRANSFER_FILE_MAX_BYTES,
  TRANSFER_KINDS,
  TRANSFER_STATUSES,
  TRANSFER_SUBJECT_TYPES,
  TransferKind,
  TransferPublicScope,
  TransferSecurityGrade,
  TransferSubjectType,
} from '../services/transfers';

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
  collectionCycleSec: 30,
  staleAfterSec: 120,
});

const errorBody = (
  code: string,
  message: string,
  requestId: string,
  retryable = false,
) => ({ error: { code, message, retryable, requestId } });

const TRANSFER_STATUS_CODE: Record<string, number> = {
  not_found: 404,
  invalid_input: 422,
  invalid_state: 409,
  version_conflict: 409,
  not_approved_version: 409,
  forbidden: 403,
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const resolveInsideStorage = (root: string, name: string): string | null => {
  if (name.includes('/') || name.includes('\\') || name.includes('..')) {
    return null;
  }
  const resolved = path.resolve(root, name);
  return resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
};

const sha256OfFile = async (filePath: string): Promise<string> => {
  const hash = createHash('sha256');
  await pipeline(fs.createReadStream(filePath), hash);
  return hash.digest('hex');
};

export const createTransferRequestsRouter = ({
  db,
  httpAuth,
  logger,
}: RouterDeps) => {
  const router = Router();
  const deps = { db, httpAuth, logger };

  const storageBase = process.env.PORTAL_FILE_STORAGE_DIR;
  const storageRoot = storageBase
    ? path.resolve(storageBase, 'transfer')
    : null;
  if (storageRoot) {
    fs.mkdirSync(storageRoot, { recursive: true });
  } else {
    logger.warn(
      'PORTAL_FILE_STORAGE_DIR 미설정 — 파일 업로드/다운로드 엔드포인트는 503으로 거부됩니다.',
    );
  }

  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        if (!storageRoot) {
          cb(new Error('storage_unavailable'), '');
          return;
        }
        cb(null, storageRoot);
      },
      filename: (_req, _file, cb) => cb(null, randomUUID()),
    }),
    limits: { fileSize: TRANSFER_FILE_MAX_BYTES, files: 1 },
  });

  const withUpload = (field: string) => {
    const handler = upload.single(field) as unknown as (
      req: Request,
      res: Response,
      cb: (err?: unknown) => void,
    ) => void;
    return (req: Request, res: Response, next: NextFunction): void => {
      handler(req, res, err => {
        if (!err) {
          next();
          return;
        }
        const requestId = randomUUID();
        const code =
          (err as { code?: string }).code === 'LIMIT_FILE_SIZE'
            ? 'file_too_large'
            : 'invalid_upload';
        const message =
          code === 'file_too_large'
            ? '파일 크기가 허용 범위(100MB)를 초과했습니다.'
            : '파일 업로드가 실패했습니다.';
        res.status(422).json(errorBody(code, message, requestId));
      });
    };
  };

  const requireStorage = (req: Request, res: Response): boolean => {
    if (storageRoot) return true;
    res
      .status(503)
      .json(
        errorBody(
          'storage_unavailable',
          '파일 저장소(PORTAL_FILE_STORAGE_DIR)가 설정되지 않았습니다.',
          getPortalContext(req).requestId,
          true,
        ),
      );
    return false;
  };

  const decisionAudit = async (
    trx: Knex.Transaction,
    ctx: ReturnType<typeof getPortalContext>,
    requestRow: Record<string, unknown>,
    decision: string,
  ) => {
    await recordAuditEvent(trx, ctx.principal, {
      tenantId: ctx.tenantId,
      actorId: ctx.identity.userId,
      action: `transfer.request.${decision}`,
      resourceType: 'transfer_request',
      resourceId: requestRow.id as string,
      resourceVersion: String(requestRow.version ?? ''),
      result: 'success',
      changedFields: ['status', 'decided_by', 'decided_at', 'approved_file_version'],
      requestId: ctx.requestId,
    });
  };

  router.get('/v1/transfer-requests', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    const kind = req.query.kind as TransferKind | undefined;
    const subjectType = req.query.subject_type as TransferSubjectType | undefined;
    const status = (req.query.status ?? '').toString();
    if (
      (kind && !TRANSFER_KINDS.includes(kind)) ||
      (subjectType && !TRANSFER_SUBJECT_TYPES.includes(subjectType)) ||
      (status && !TRANSFER_STATUSES.includes(status as never))
    ) {
      return res
        .status(422)
        .json(errorBody('invalid_filter', '필터 값이 올바르지 않습니다.', ctx.requestId));
    }
    const canViewAll =
      ctx.permissions.has('export.review') || ctx.permissions.has('audit.view');
    try {
      const items = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        let qb = trx('portal.fc_transfer_request').orderBy('created_at', 'desc');
        if (!canViewAll) qb = qb.where({ requested_by: ctx.identity.userId });
        if (kind) qb = qb.where({ kind });
        if (subjectType) qb = qb.where({ subject_type: subjectType });
        if (status) qb = qb.where({ status });
        return qb.limit(200).select('*');
      });
      return res.json({ data: { items }, meta: meta(ctx.requestId) });
    } catch (e) {
      logger.error(`transfer list error: ${(e as Error).message}`, {
        requestId: ctx.requestId,
      });
      return res
        .status(500)
        .json(errorBody('internal_error', '신청 목록 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.post(
    '/v1/transfer-requests',
    requireMembership(deps),
    withUpload('file'),
    async (req, res) => {
      const ctx = getPortalContext(req);
      const requestId = ctx.requestId;
      if (!requireStorage(req, res)) return res;
      const body = req.body ?? {};
      const kind = body.kind as TransferKind;
      const subjectType = body.subject_type as TransferSubjectType;
      const securityGrade = body.security_grade as TransferSecurityGrade;
      const publicScope = (body.public_scope ?? 'none') as TransferPublicScope;
      const file = req.file;
      if (!file) {
        return res
          .status(422)
          .json(errorBody('file_required', '첨부 파일이 필요합니다.', requestId));
      }
      try {
        const result = await db.transaction(async trx => {
          const created = await createTransferRequest(trx, ctx.tenantId, {
            kind,
            subjectType,
            title: String(body.title ?? ''),
            purpose: String(body.purpose ?? ''),
            securityGrade,
            publicConsent: body.public_consent === 'true' || body.public_consent === true,
            publicScope,
            usagePermission: body.usage_permission
              ? String(body.usage_permission)
              : undefined,
            requestedBy: ctx.identity.userId,
            idempotencyKey: body.idempotency_key
              ? String(body.idempotency_key).slice(0, 200)
              : undefined,
          });
          if (!created.ok) return created;

          // 멱등 replay는 기존 신청을 그대로 반환한다 — 파일 버전과 감사를 다시 쌓지 않는다.
          if (created.value.replayed === true) {
            await fs.promises.unlink(file.path).catch(() => undefined);
            return created;
          }

          const sha256 = await sha256OfFile(file.path);
          const added = await addTransferFileVersion(
            trx,
            ctx.tenantId,
            created.value.id as string,
            ctx.identity.userId,
            {
              storedName: file.filename,
              originalName: path.basename(file.originalname),
              mime: file.mimetype,
              sizeBytes: file.size,
              sha256,
            },
          );
          if (!added.ok) return added;

          await recordAuditEvent(trx, ctx.principal, {
            tenantId: ctx.tenantId,
            actorId: ctx.identity.userId,
            action: 'transfer.request.submit',
            resourceType: 'transfer_request',
            resourceId: created.value.id as string,
            result: 'success',
            requestId,
          });
          return created;
        });
        if (!result.ok) {
          await fs.promises.unlink(file.path).catch(() => undefined);
          return res
            .status(TRANSFER_STATUS_CODE[result.code] ?? 500)
            .json(errorBody(result.code, result.message, requestId));
        }
        return res.status(201).json({ data: result.value, meta: meta(requestId) });
      } catch (e) {
        await fs.promises.unlink(file.path).catch(() => undefined);
        logger.error(`transfer create error: ${(e as Error).message}`, { requestId });
        return res
          .status(500)
          .json(errorBody('internal_error', '신청 접수 중 오류가 발생했습니다.', requestId, true));
      }
    },
  );

  router.get(
    '/v1/transfer-requests/files/:fileId/download',
    requireMembership(deps),
    async (req, res) => {
      const ctx = getPortalContext(req);
      const requestId = ctx.requestId;
      const respond = (status: number, code: string, message: string, retryable = false) => {
        res.status(status).json(errorBody(code, message, requestId, retryable));
      };
      if (!requireStorage(req, res)) return;
      const fileId = req.params.fileId;
      if (!UUID_PATTERN.test(fileId)) {
        respond(422, 'invalid_file_id', '파일 ID가 올바르지 않습니다.');
        return;
      }
      try {
        const result = await db.transaction(async trx =>
          resolveTransferDownload(trx, ctx.tenantId, fileId),
        );
        if (!result.ok) {
          respond(
            TRANSFER_STATUS_CODE[result.code] ?? 500,
            result.code,
            result.message,
          );
          return;
        }
        const requestRow = result.value.request;
        const allowed =
          requestRow.requested_by === ctx.identity.userId ||
          ctx.permissions.has('export.review') ||
          ctx.permissions.has('audit.view');
        if (!allowed) {
          respond(403, 'permission_denied', '파일을 다운로드할 권한이 없습니다.');
          return;
        }
        const fileRow = result.value.file;
        const filePath = storageRoot
          ? resolveInsideStorage(storageRoot, fileRow.stored_name as string)
          : null;
        if (!filePath || !fs.existsSync(filePath)) {
          respond(410, 'file_missing', '저장된 파일을 찾을 수 없습니다.');
          return;
        }
        await db.transaction(async trx => {
          await recordAuditEvent(trx, ctx.principal, {
            tenantId: ctx.tenantId,
            actorId: ctx.identity.userId,
            action: 'transfer.file.download',
            resourceType: 'transfer_file',
            resourceId: fileId,
            result: 'success',
            requestId,
          });
        });
        res.setHeader(
          'Content-Disposition',
          `attachment; filename*=UTF-8''${encodeURIComponent(
            fileRow.original_name as string,
          )}`,
        );
        res.setHeader('Content-Type', fileRow.mime as string);
        fs.createReadStream(filePath).pipe(res);
      } catch (e) {
        logger.error(`transfer download error: ${(e as Error).message}`, {
          requestId,
        });
        respond(500, 'internal_error', '다운로드 처리 중 오류가 발생했습니다.', true);
      }
    },
  );

  router.get('/v1/transfer-requests/:id', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const result = await db.transaction(async trx =>
        getTransferRequestDetail(trx, ctx.tenantId, req.params.id),
      );
      if (!result.ok) {
        return res
          .status(TRANSFER_STATUS_CODE[result.code] ?? 500)
          .json(errorBody(result.code, result.message, ctx.requestId));
      }
      const allowed =
        result.value.requested_by === ctx.identity.userId ||
        ctx.permissions.has('export.review') ||
        ctx.permissions.has('audit.view');
      if (!allowed) {
        return res
          .status(403)
          .json(errorBody('permission_denied', '이 신청을 조회할 권한이 없습니다.', ctx.requestId));
      }
      return res.json({ data: result.value, meta: meta(ctx.requestId) });
    } catch (e) {
      logger.error(`transfer detail error: ${(e as Error).message}`, {
        requestId: ctx.requestId,
      });
      return res
        .status(500)
        .json(errorBody('internal_error', '신청 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.post(
    '/v1/transfer-requests/:id/decision',
    requireMembership(deps),
    async (req, res) => {
      const ctx = getPortalContext(req);
      const requestId = ctx.requestId;
      const body = req.body ?? {};
      const decision = body.decision;
      if (
        decision !== 'approved' &&
        decision !== 'rejected' &&
        decision !== 'request_supplement'
      ) {
        return res
          .status(422)
          .json(
            errorBody(
              'invalid_decision',
              'decision은 approved, rejected, request_supplement 중 하나여야 합니다.',
              requestId,
            ),
          );
      }
      const reason = (body.reason ?? '').toString().trim();
      if (!reason || reason.length > 500) {
        return res
          .status(422)
          .json(errorBody('invalid_reason', '결정 사유는 1~500자로 입력해야 합니다.', requestId));
      }
      if (!ctx.permissions.has('export.review')) {
        return res
          .status(403)
          .json(errorBody('permission_denied', '반입·반출 신청을 결정할 권한이 없습니다.', requestId));
      }
      const expectedVersion =
        body.expectedVersion === undefined || body.expectedVersion === null
          ? undefined
          : Number(body.expectedVersion);
      try {
        const result = await db.transaction(async trx => {
          const decided = await decideTransferRequest(
            trx,
            ctx.tenantId,
            req.params.id,
            ctx.identity.userId,
            decision,
            reason,
            Number.isFinite(expectedVersion) ? expectedVersion : undefined,
          );
          if (!decided.ok) return decided;
          await decisionAudit(trx, ctx, decided.value, decision);
          return decided;
        });
        if (!result.ok) {
          return res
            .status(TRANSFER_STATUS_CODE[result.code] ?? 500)
            .json(errorBody(result.code, result.message, requestId));
        }
        return res.json({ data: result.value, meta: meta(requestId) });
      } catch (e) {
        logger.error(`transfer decision error: ${(e as Error).message}`, {
          requestId,
        });
        return res
          .status(500)
          .json(errorBody('internal_error', '결정 처리 중 오류가 발생했습니다.', requestId, true));
      }
    },
  );

  router.post(
    '/v1/transfer-requests/:id/cancel',
    requireMembership(deps),
    async (req, res) => {
      const ctx = getPortalContext(req);
      try {
        const result = await db.transaction(async trx => {
          const cancelled = await cancelTransferRequest(
            trx,
            ctx.tenantId,
            req.params.id,
            ctx.identity.userId,
          );
          if (!cancelled.ok) return cancelled;
          await recordAuditEvent(trx, ctx.principal, {
            tenantId: ctx.tenantId,
            actorId: ctx.identity.userId,
            action: 'transfer.request.cancel',
            resourceType: 'transfer_request',
            resourceId: req.params.id,
            result: 'success',
            changedFields: ['status'],
            requestId: ctx.requestId,
          });
          return cancelled;
        });
        if (!result.ok) {
          return res
            .status(TRANSFER_STATUS_CODE[result.code] ?? 500)
            .json(errorBody(result.code, result.message, ctx.requestId));
        }
        return res.json({ data: result.value, meta: meta(ctx.requestId) });
      } catch (e) {
        logger.error(`transfer cancel error: ${(e as Error).message}`, {
          requestId: ctx.requestId,
        });
        return res
          .status(500)
          .json(errorBody('internal_error', '취소 처리 중 오류가 발생했습니다.', ctx.requestId, true));
      }
    },
  );

  router.post(
    '/v1/transfer-requests/:id/files',
    requireMembership(deps),
    withUpload('file'),
    async (req, res) => {
      const ctx = getPortalContext(req);
      const requestId = ctx.requestId;
      if (!requireStorage(req, res)) return res;
      const file = req.file;
      if (!file) {
        return res
          .status(422)
          .json(errorBody('file_required', '첨부 파일이 필요합니다.', requestId));
      }
      try {
        const result = await db.transaction(async trx => {
          const sha256 = await sha256OfFile(file.path);
          const added = await addTransferFileVersion(
            trx,
            ctx.tenantId,
            req.params.id,
            ctx.identity.userId,
            {
              storedName: file.filename,
              originalName: path.basename(file.originalname),
              mime: file.mimetype,
              sizeBytes: file.size,
              sha256,
            },
          );
          if (!added.ok) return added;
          await recordAuditEvent(trx, ctx.principal, {
            tenantId: ctx.tenantId,
            actorId: ctx.identity.userId,
            action: 'transfer.file.upload',
            resourceType: 'transfer_request',
            resourceId: req.params.id,
            result: 'success',
            changedFields:
              added.value.status === 'in_review'
                ? ['file_version', 'status']
                : ['file_version'],
            requestId,
          });
          return added;
        });
        if (!result.ok) {
          await fs.promises.unlink(file.path).catch(() => undefined);
          return res
            .status(TRANSFER_STATUS_CODE[result.code] ?? 500)
            .json(errorBody(result.code, result.message, requestId));
        }
        return res.status(201).json({ data: result.value, meta: meta(requestId) });
      } catch (e) {
        await fs.promises.unlink(file.path).catch(() => undefined);
        logger.error(`transfer file upload error: ${(e as Error).message}`, {
          requestId,
        });
        return res
          .status(500)
          .json(errorBody('internal_error', '파일 업로드 중 오류가 발생했습니다.', requestId, true));
      }
    },
  );

  return router;
};
