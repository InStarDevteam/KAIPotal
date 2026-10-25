import { Request, Response, Router } from 'express';
import { Knex } from 'knex';
import multer from 'multer';
import { HttpAuthService, LoggerService } from '@backstage/backend-plugin-api';
import { getPortalContext, requireMembership, requirePermission } from '../services/middleware';
import { setTenantContext } from '../services/context';
import { recordAuditEvent } from '../services/audit';
import { KRMF_PERMISSIONS, ScopeIdentity, isBlockedUpload, MAX_UPLOAD_BYTES } from '../services/krmfDomain';
import {
  buildKrmfOverview,
  createAction,
  createBaseline,
  createChange,
  createControl,
  createEvalRecord,
  answerEvalRecord,
  updateEvalStatus,
  EvidenceFileMeta,
  exportBaselineCsv,
  exportEvidenceCsv,
  exportImplementationCsv,
  exportTraceabilityCsv,
  getControlDetail,
  getEvidenceFile,
  getTraceability,
  listActions,
  listBaselines,
  listChanges,
  listControls,
  listEvalRecords,
  listEvidences,
  listTrrChecks,
  loadMemberProjectIds,
  reviewEvidence,
  submitEvidence,
  transitionAction,
  updateBaseline,
  updateChange,
  updateControl,
  updateTrrItem,
  upsertTrrItems,
} from '../services/krmf';
import {
  ensureKrmfStorageDir,
  readKrmfFile,
  removeKrmfFile,
  resolveKrmfStorageDir,
  sha256Hex,
  writeKrmfFile,
} from '../services/krmfStorage';

interface KrmfRouterDeps {
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

type ServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; code: string; message: string };

export function buildKrmfRouter({ db, httpAuth, logger }: KrmfRouterDeps): Router {
  const router = Router();
  const deps = { db, httpAuth, logger };
  const storageDir = resolveKrmfStorageDir();
  if (storageDir) ensureKrmfStorageDir(storageDir).catch(e => {
    logger.error(`krmf file storage 초기화 실패: ${(e as Error).message}`);
  });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  });

  const multerMiddleware = upload.single('file');

  const runUpload = (req: Request, res: Response) =>
    new Promise<void>((resolve, reject) => {
      const handler = multerMiddleware as unknown as (
        request: Request,
        response: Response,
        next: (err?: unknown) => void,
      ) => void;
      handler(req, res, err => (err ? reject(err) : resolve()));
    });

  const buildScope = async (
    trx: Knex.Transaction,
    ctx: ReturnType<typeof getPortalContext>,
  ): Promise<ScopeIdentity> => {
    await setTenantContext(trx, ctx.tenantId);
    const ids = await loadMemberProjectIds(trx, ctx.identity.userId);
    const canViewAll =
      ctx.permissions.has(KRMF_PERMISSIONS.view) ||
      ctx.permissions.has(KRMF_PERMISSIONS.manage);
    return {
      userId: ctx.identity.userId,
      canViewAll,
      memberProjectIds: new Set(ids),
    };
  };

  const respond = <T>(
    res: Response,
    requestId: string,
    result: ServiceResult<T>,
    successStatus = 200,
  ) => {
    if (!result.ok) {
      return res
        .status(result.status)
        .json(errorBody(result.code, result.message, requestId));
    }
    return res.status(successStatus).json({ data: result.value, meta: meta(requestId) });
  };

  const respondCsv = (
    res: Response,
    requestId: string,
    result: ServiceResult<{ csv: string }>,
    filename: string,
  ) => {
    if (!result.ok) {
      return res
        .status(result.status)
        .json(errorBody(result.code, result.message, requestId));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    return res.status(200).send(result.value.csv);
  };

  const str = (value: unknown): string | undefined =>
    typeof value === 'string' && value.length > 0 ? value : undefined;

  const bool = (value: unknown): boolean | undefined => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  };

  // ── 개요 ──
  router.get('/v1/krmf/overview', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const result = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        const scope = await buildScope(trx, ctx);
        return buildKrmfOverview(trx, ctx.tenantId, scope, {
          baseline_id: str(req.query.baseline_id),
          project_id: str(req.query.project_id),
        });
      });
      return respond(res, ctx.requestId, result.ok
        ? { ok: true, value: { ...result.value, file_storage_configured: Boolean(storageDir) } }
        : result);
    } catch (e) {
      logger.error(`krmf overview error: ${(e as Error).message}`, {
        requestId: ctx.requestId,
      });
      return res
        .status(500)
        .json(errorBody('internal_error', '개요 집계 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  // ── 납품용 CSV 출력 ──
  router.get('/v1/krmf/export', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    const type = str(req.query.type);
    const baselineId = str(req.query.baseline_id);
    if (!type || !baselineId) {
      return res
        .status(422)
        .json(errorBody('invalid_export', 'type과 baseline_id가 필요합니다.', ctx.requestId));
    }
    try {
      if (type === 'implementation') {
        const result = await db.transaction(async trx => {
          const scope = await buildScope(trx, ctx);
          return exportImplementationCsv(trx, ctx.tenantId, ctx.principal, ctx.identity.userId, scope, baselineId);
        });
        return respondCsv(res, ctx.requestId, result, `krmf-implementation-${baselineId}.csv`);
      }
      if (type === 'traceability') {
        const result = await db.transaction(async trx => {
          const scope = await buildScope(trx, ctx);
          return exportTraceabilityCsv(trx, ctx.tenantId, ctx.principal, ctx.identity.userId, scope, baselineId);
        });
        return respondCsv(res, ctx.requestId, result, `krmf-traceability-${baselineId}.csv`);
      }
      if (type === 'evidence') {
        const result = await db.transaction(async trx => {
          const scope = await buildScope(trx, ctx);
          return exportEvidenceCsv(trx, ctx.tenantId, ctx.principal, ctx.identity.userId, scope, baselineId);
        });
        return respondCsv(res, ctx.requestId, result, `krmf-evidence-${baselineId}.csv`);
      }
      return res
        .status(422)
        .json(errorBody('invalid_export_type', 'type은 implementation, traceability, evidence 중 하나여야 합니다.', ctx.requestId));
    } catch (e) {
      logger.error(`krmf export error: ${(e as Error).message}`, {
        requestId: ctx.requestId,
      });
      return res
        .status(500)
        .json(errorBody('internal_error', '납품 파일 생성 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  // ── 기준선 ──
  router.get('/v1/krmf/baselines', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const result = await db.transaction(async trx => {
        const scope = await buildScope(trx, ctx);
        return listBaselines(trx, ctx.tenantId, scope, {
          status: str(req.query.status),
          project_id: str(req.query.project_id),
        });
      });
      return respond(res, ctx.requestId, result);
    } catch (e) {
      logger.error(`krmf baselines error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '기준선 목록 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.post('/v1/krmf/baselines', requirePermission(deps, KRMF_PERMISSIONS.manage), async (req, res) => {
    const ctx = getPortalContext(req);
    const body = req.body ?? {};
    try {
      const result = await db.transaction(async trx =>
        createBaseline(trx, ctx.tenantId, ctx.principal, ctx.identity.userId, {
          name: body.name,
          version: body.version,
          description: str(body.description),
          status: str(body.status),
          project_id: str(body.project_id),
        }),
      );
      return respond(res, ctx.requestId, result, 201);
    } catch (e) {
      logger.error(`krmf baseline create error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '기준선 등록 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.get('/v1/krmf/baselines/:id', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const result = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        const scope = await buildScope(trx, ctx);
        const row = await trx('portal.fc_krmf_baseline')
          .where({ id: req.params.id })
          .first();
        if (!row) {
          return { ok: false as const, status: 404, code: 'not_found', message: '기준선을 찾을 수 없습니다.' };
        }
        if (
          !scope.canViewAll &&
          row.project_id !== null &&
          !scope.memberProjectIds.has(row.project_id as string)
        ) {
          return { ok: false as const, status: 403, code: 'permission_denied', message: '이 기준선을 조회할 권한이 없습니다.' };
        }
        return { ok: true as const, value: row };
      });
      return respond(res, ctx.requestId, result);
    } catch (e) {
      logger.error(`krmf baseline detail error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '기준선 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.patch('/v1/krmf/baselines/:id', requirePermission(deps, KRMF_PERMISSIONS.manage), async (req, res) => {
    const ctx = getPortalContext(req);
    const body = req.body ?? {};
    try {
      const result = await db.transaction(async trx =>
        updateBaseline(trx, ctx.tenantId, ctx.principal, ctx.identity.userId, req.params.id, {
          name: body.name,
          description: body.description,
          status: str(body.status),
          expected_updated_at: str(body.expectedUpdatedAt),
        }),
      );
      return respond(res, ctx.requestId, result);
    } catch (e) {
      logger.error(`krmf baseline update error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '기준선 수정 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.get('/v1/krmf/baselines/:id/export', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const result = await db.transaction(async trx => {
        const scope = await buildScope(trx, ctx);
        return exportBaselineCsv(trx, ctx.tenantId, ctx.principal, ctx.identity.userId, scope, req.params.id);
      });
      return respondCsv(res, ctx.requestId, result, `krmf-baseline-${req.params.id}.csv`);
    } catch (e) {
      logger.error(`krmf baseline export error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '기준선 납품 파일 생성 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  // ── 통제 ──
  router.get('/v1/krmf/baselines/:id/controls', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const result = await db.transaction(async trx => {
        const scope = await buildScope(trx, ctx);
        return listControls(trx, ctx.tenantId, scope, req.params.id, {
          applicability: str(req.query.applicability),
          status: str(req.query.status),
        });
      });
      return respond(res, ctx.requestId, result);
    } catch (e) {
      logger.error(`krmf controls error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '통제 목록 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.post('/v1/krmf/baselines/:id/controls', requirePermission(deps, KRMF_PERMISSIONS.manage), async (req, res) => {
    const ctx = getPortalContext(req);
    const body = req.body ?? {};
    try {
      const result = await db.transaction(async trx =>
        createControl(trx, ctx.tenantId, ctx.principal, ctx.identity.userId, req.params.id, {
          control_code: body.control_code,
          title: body.title,
          description: str(body.description),
          applicability: str(body.applicability),
          alternative_reason: str(body.alternative_reason),
          owner_id: str(body.owner_id),
          due_date: str(body.due_date),
          sort_order: Number.isSafeInteger(body.sort_order) ? body.sort_order : undefined,
        }),
      );
      return respond(res, ctx.requestId, result, 201);
    } catch (e) {
      logger.error(`krmf control create error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '통제 등록 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.get('/v1/krmf/controls/:id', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const result = await db.transaction(async trx => {
        const scope = await buildScope(trx, ctx);
        return getControlDetail(trx, ctx.tenantId, scope, req.params.id);
      });
      return respond(res, ctx.requestId, result);
    } catch (e) {
      logger.error(`krmf control detail error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '통제 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.patch('/v1/krmf/controls/:id', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    const body = req.body ?? {};
    try {
      const result = await db.transaction(async trx =>
        updateControl(
          trx,
          ctx.tenantId,
          ctx.principal,
          ctx.identity.userId,
          req.params.id,
          {
            title: body.title,
            description: body.description,
            owner_id: body.owner_id === null ? null : str(body.owner_id),
            due_date: body.due_date === null ? null : str(body.due_date),
            status: str(body.status),
            applicability: str(body.applicability),
            alternative_reason: body.alternative_reason === null ? null : str(body.alternative_reason),
            sort_order: Number.isSafeInteger(body.sort_order) ? body.sort_order : undefined,
          },
          { canManage: ctx.permissions.has(KRMF_PERMISSIONS.manage) },
        ),
      );
      return respond(res, ctx.requestId, result);
    } catch (e) {
      logger.error(`krmf control update error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '통제 수정 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  // ── 추적 연결 ──
  router.get('/v1/krmf/traceability', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    const baselineId = str(req.query.baseline_id);
    if (!baselineId) {
      return res
        .status(422)
        .json(errorBody('invalid_baseline_id', 'baseline_id가 필요합니다.', ctx.requestId));
    }
    try {
      const result = await db.transaction(async trx => {
        const scope = await buildScope(trx, ctx);
        return getTraceability(trx, ctx.tenantId, scope, baselineId);
      });
      return respond(res, ctx.requestId, result);
    } catch (e) {
      logger.error(`krmf traceability error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '추적 현황 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.get('/v1/krmf/traceability/export', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    const baselineId = str(req.query.baseline_id);
    if (!baselineId) {
      return res
        .status(422)
        .json(errorBody('invalid_baseline_id', 'baseline_id가 필요합니다.', ctx.requestId));
    }
    try {
      const result = await db.transaction(async trx => {
        const scope = await buildScope(trx, ctx);
        return exportTraceabilityCsv(trx, ctx.tenantId, ctx.principal, ctx.identity.userId, scope, baselineId);
      });
      return respondCsv(res, ctx.requestId, result, `krmf-traceability-${baselineId}.csv`);
    } catch (e) {
      logger.error(`krmf traceability export error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '추적 납품 파일 생성 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  // ── 증적 ──
  router.get('/v1/krmf/evidences', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const result = await db.transaction(async trx => {
        const scope = await buildScope(trx, ctx);
        return listEvidences(trx, ctx.tenantId, scope, {
          control_id: str(req.query.control_id),
          review_status: str(req.query.review_status),
          latest_only: req.query.latest_only === 'true',
        });
      });
      return respond(res, ctx.requestId, result);
    } catch (e) {
      logger.error(`krmf evidences error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '증적 목록 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.post('/v1/krmf/evidences', requirePermission(deps, KRMF_PERMISSIONS.evidenceSubmit), async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      await runUpload(req, res);
    } catch (e) {
      if (e instanceof multer.MulterError && e.code === 'LIMIT_FILE_SIZE') {
        return res
          .status(422)
          .json(errorBody('file_too_large', '업로드 파일 크기는 20MB를 초과할 수 없습니다.', ctx.requestId));
      }
      logger.error(`krmf evidence upload error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '파일 수신 중 오류가 발생했습니다.', ctx.requestId, true));
    }
    const body = req.body ?? {};
    const uploaded = req.file;
    const referenceUri = str(body.reference_uri);
    if (uploaded && referenceUri) {
      return res
        .status(422)
        .json(errorBody('invalid_evidence', '파일과 참조 주소는 하나만 지정할 수 있습니다.', ctx.requestId));
    }
    if (!uploaded && !referenceUri) {
      return res
        .status(422)
        .json(errorBody('invalid_evidence', '파일 또는 참조 주소 중 하나는 필수입니다.', ctx.requestId));
    }
    let fileMeta: EvidenceFileMeta | undefined;
    let storedName: string | null = null;
    if (uploaded) {
      if (!storageDir) {
        return res.status(503).json(errorBody('storage_unavailable',
          '증적 파일 저장소가 연결되지 않았습니다. 참조 URI로 등록하거나 관리자에게 문의하세요.', ctx.requestId));
      }
      const originalName = uploaded.originalname || 'evidence.bin';
      if (isBlockedUpload(originalName, uploaded.mimetype)) {
        return res
          .status(422)
          .json(errorBody('blocked_file_type', '실행 가능한 형식의 파일은 증적으로 등록할 수 없습니다.', ctx.requestId));
      }
      try {
        const stored = await writeKrmfFile(storageDir, uploaded.buffer);
        storedName = stored.storedName;
        fileMeta = {
          stored_name: stored.storedName,
          original_name: originalName.slice(0, 255),
          mime: (uploaded.mimetype || 'application/octet-stream').slice(0, 100),
          size_bytes: stored.sizeBytes,
          sha256: stored.sha256,
        };
      } catch (e) {
        logger.error(`krmf evidence store error: ${(e as Error).message}`, { requestId: ctx.requestId });
        return res
          .status(500)
          .json(errorBody('internal_error', '증적 파일 저장 중 오류가 발생했습니다.', ctx.requestId, true));
      }
    }
    try {
      const result = await db.transaction(async trx => {
        const scope = await buildScope(trx, ctx);
        return submitEvidence(
          trx,
          ctx.tenantId,
          ctx.principal,
          ctx.identity.userId,
          scope,
          {
            control_id: str(body.control_id) ?? '',
            title: str(body.title) ?? '',
            kind: uploaded ? 'file' : 'reference',
            reference_uri: referenceUri,
            scope_text: str(body.scope),
            idempotency_key: str(body.idempotency_key),
          },
          fileMeta,
        );
      });
      if (!result.ok && storedName && storageDir) {
        await removeKrmfFile(storageDir, storedName).catch(() => undefined);
      }
      return respond(res, ctx.requestId, result, 201);
    } catch (e) {
      if (storedName && storageDir) {
        await removeKrmfFile(storageDir, storedName).catch(() => undefined);
      }
      logger.error(`krmf evidence submit error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '증적 제출 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.post('/v1/krmf/evidences/:id/review', requirePermission(deps, KRMF_PERMISSIONS.review), async (req, res) => {
    const ctx = getPortalContext(req);
    const body = req.body ?? {};
    const expectedVersion =
      body.expectedVersion === undefined || body.expectedVersion === null
        ? undefined
        : Number(body.expectedVersion);
    try {
      const result = await db.transaction(async trx =>
        reviewEvidence(trx, ctx.tenantId, ctx.principal, ctx.identity.userId, req.params.id, {
          decision: body.decision,
          comment: str(body.comment),
          expected_version:
            expectedVersion !== undefined && Number.isSafeInteger(expectedVersion)
              ? expectedVersion
              : undefined,
          idempotency_key: str(body.idempotency_key),
        }),
      );
      return respond(res, ctx.requestId, result);
    } catch (e) {
      logger.error(`krmf evidence review error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '증적 검토 처리 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.get('/v1/krmf/evidences/:id/file', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const result = await db.transaction(async trx => {
        const scope = await buildScope(trx, ctx);
        return getEvidenceFile(trx, ctx.tenantId, scope, req.params.id);
      });
      if (!result.ok) {
        return res
          .status(result.status)
          .json(errorBody(result.code, result.message, ctx.requestId));
      }
      const { file } = result.value;
      if (!storageDir) {
        return res.status(503).json(errorBody('storage_unavailable',
          '증적 파일 저장소가 연결되지 않았습니다. 관리자에게 문의하세요.', ctx.requestId));
      }
      let buffer: Buffer;
      try {
        buffer = await readKrmfFile(storageDir, file.stored_name as string);
      } catch (e) {
        logger.error(`krmf evidence file read error: ${(e as Error).message}`, { requestId: ctx.requestId });
        return res
          .status(500)
          .json(errorBody('internal_error', '증적 파일 읽기 중 오류가 발생했습니다.', ctx.requestId, true));
      }
      if (sha256Hex(buffer) !== file.sha256) {
        await db.transaction(async trx => {
          await recordAuditEvent(trx, ctx.principal, {
            tenantId: ctx.tenantId,
            actorId: ctx.identity.userId,
            action: 'krmf.evidence.download',
            resourceType: 'krmf_evidence',
            resourceId: req.params.id,
            result: 'failed',
            reasonCode: 'integrity_mismatch',
            requestId: ctx.requestId,
          });
        });
        return res
          .status(500)
          .json(errorBody('integrity_mismatch', '증적 파일 무결성 검증에 실패했습니다.', ctx.requestId, true));
      }
      res.setHeader('Content-Type', file.mime as string);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(file.original_name as string)}`,
      );
      return res.status(200).send(buffer);
    } catch (e) {
      logger.error(`krmf evidence download error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '증적 파일 다운로드 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  // ── 미흡·보완 조치 ──
  router.get('/v1/krmf/actions', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const result = await db.transaction(async trx => {
        const scope = await buildScope(trx, ctx);
        return listActions(trx, ctx.tenantId, scope, {
          status: str(req.query.status),
          overdue: bool(req.query.overdue),
        });
      });
      return respond(res, ctx.requestId, result);
    } catch (e) {
      logger.error(`krmf actions error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '조치 목록 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.post('/v1/krmf/actions', requirePermission(deps, KRMF_PERMISSIONS.review), async (req, res) => {
    const ctx = getPortalContext(req);
    const body = req.body ?? {};
    try {
      const result = await db.transaction(async trx => {
        const scope = await buildScope(trx, ctx);
        return createAction(trx, ctx.tenantId, ctx.principal, ctx.identity.userId, scope, {
          control_id: str(body.control_id) ?? '',
          title: str(body.title) ?? '',
          cause: str(body.cause) ?? '',
          impact: str(body.impact),
          owner_id: str(body.owner_id),
          due_date: str(body.due_date),
          idempotency_key: str(body.idempotency_key),
        });
      });
      return respond(res, ctx.requestId, result, 201);
    } catch (e) {
      logger.error(`krmf action create error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '조치 등록 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.patch('/v1/krmf/actions/:id', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    const body = req.body ?? {};
    try {
      const result = await db.transaction(async trx =>
        transitionAction(
          trx,
          ctx.tenantId,
          ctx.principal,
          ctx.identity.userId,
          req.params.id,
          {
            status: str(body.status) ?? '',
            resolution: str(body.resolution),
            idempotency_key: str(body.idempotency_key),
          },
          {
            canReview: ctx.permissions.has(KRMF_PERMISSIONS.review),
            canManage: ctx.permissions.has(KRMF_PERMISSIONS.manage),
          },
        ),
      );
      return respond(res, ctx.requestId, result);
    } catch (e) {
      logger.error(`krmf action transition error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '조치 상태 변경 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  // ── 운영 변경 ──
  router.get('/v1/krmf/changes', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const result = await db.transaction(async trx => {
        const scope = await buildScope(trx, ctx);
        return listChanges(trx, ctx.tenantId, scope, {
          status: str(req.query.status),
          project_id: str(req.query.project_id),
        });
      });
      return respond(res, ctx.requestId, result);
    } catch (e) {
      logger.error(`krmf changes error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '변경 목록 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.post('/v1/krmf/changes', requirePermission(deps, KRMF_PERMISSIONS.manage), async (req, res) => {
    const ctx = getPortalContext(req);
    const body = req.body ?? {};
    try {
      const result = await db.transaction(async trx =>
        createChange(trx, ctx.tenantId, ctx.principal, ctx.identity.userId, {
          project_id: str(body.project_id),
          title: str(body.title) ?? '',
          change_type: str(body.change_type) ?? '',
          description: str(body.description) ?? '',
          affected_control_ids: Array.isArray(body.affected_control_ids)
            ? body.affected_control_ids
            : [],
          reassess_required: body.reassess_required === true,
          reassess_reason: str(body.reassess_reason),
          idempotency_key: str(body.idempotency_key),
        }),
      );
      return respond(res, ctx.requestId, result, 201);
    } catch (e) {
      logger.error(`krmf change create error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '변경 등록 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.patch('/v1/krmf/changes/:id', requirePermission(deps, KRMF_PERMISSIONS.manage), async (req, res) => {
    const ctx = getPortalContext(req);
    const body = req.body ?? {};
    try {
      const result = await db.transaction(async trx =>
        updateChange(trx, ctx.tenantId, ctx.principal, ctx.identity.userId, req.params.id, {
          title: body.title,
          description: body.description,
          status: str(body.status),
          reassess_reason: str(body.reassess_reason),
          idempotency_key: str(body.idempotency_key),
        }),
      );
      return respond(res, ctx.requestId, result);
    } catch (e) {
      logger.error(`krmf change update error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '변경 수정 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  // ── TRR 체크리스트 ──
  router.get('/v1/krmf/trr', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const result = await db.transaction(async trx => {
        const scope = await buildScope(trx, ctx);
        return listTrrChecks(trx, ctx.tenantId, scope, str(req.query.project_id));
      });
      return respond(res, ctx.requestId, result);
    } catch (e) {
      logger.error(`krmf trr error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', 'TRR 현황 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.post('/v1/krmf/trr/items', requirePermission(deps, KRMF_PERMISSIONS.manage), async (req, res) => {
    const ctx = getPortalContext(req);
    const body = req.body ?? {};
    try {
      const result = await db.transaction(async trx =>
        upsertTrrItems(
          trx,
          ctx.tenantId,
          ctx.principal,
          ctx.identity.userId,
          str(body.project_id) ?? '',
          Array.isArray(body.items) ? body.items : [],
        ),
      );
      return respond(res, ctx.requestId, result, 201);
    } catch (e) {
      logger.error(`krmf trr upsert error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', 'TRR 항목 등록 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.patch('/v1/krmf/trr/items/:id', requirePermission(deps, KRMF_PERMISSIONS.manage), async (req, res) => {
    const ctx = getPortalContext(req);
    const body = req.body ?? {};
    try {
      const result = await db.transaction(async trx =>
        updateTrrItem(trx, ctx.tenantId, ctx.principal, ctx.identity.userId, req.params.id, {
          title: body.title,
          test_criteria: body.test_criteria === null ? null : str(body.test_criteria),
          test_data: body.test_data === null ? null : str(body.test_data),
          evidence_ready: typeof body.evidence_ready === 'boolean' ? body.evidence_ready : undefined,
          status: str(body.status),
          note: body.note === null ? null : str(body.note),
          expected_updated_at: str(body.expectedUpdatedAt),
        }),
      );
      return respond(res, ctx.requestId, result);
    } catch (e) {
      logger.error(`krmf trr update error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', 'TRR 항목 수정 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  // ── 평가·인가 지원 기록 ──
  router.get('/v1/krmf/eval-records', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const result = await db.transaction(async trx => {
        const scope = await buildScope(trx, ctx);
        return listEvalRecords(trx, ctx.tenantId, scope, {
          kind: str(req.query.kind),
          status: str(req.query.status),
          project_id: str(req.query.project_id),
        });
      });
      return respond(res, ctx.requestId, result);
    } catch (e) {
      logger.error(`krmf eval-records error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '평가 기록 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.post('/v1/krmf/eval-records', requirePermission(deps, KRMF_PERMISSIONS.manage), async (req, res) => {
    const ctx = getPortalContext(req);
    const body = req.body ?? {};
    try {
      const result = await db.transaction(async trx =>
        createEvalRecord(trx, ctx.tenantId, ctx.principal, ctx.identity.userId, {
          project_id: str(body.project_id),
          kind: str(body.kind) ?? '',
          title: str(body.title) ?? '',
          body: str(body.body) ?? '',
          residual_risk: str(body.residual_risk),
          source: str(body.source) ?? '',
          idempotency_key: str(body.idempotency_key),
        }),
      );
      return respond(res, ctx.requestId, result, 201);
    } catch (e) {
      logger.error(`krmf eval-record create error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '평가 기록 등록 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.patch('/v1/krmf/eval-records/:id/answer', requirePermission(deps, KRMF_PERMISSIONS.manage), async (req, res) => {
    const ctx = getPortalContext(req);
    const body = req.body ?? {};
    try {
      const result = await db.transaction(async trx =>
        answerEvalRecord(trx, ctx.tenantId, ctx.principal, ctx.identity.userId, req.params.id, {
          answer: str(body.answer) ?? '',
          idempotency_key: str(body.idempotency_key),
        }),
      );
      return respond(res, ctx.requestId, result);
    } catch (e) {
      logger.error(`krmf eval-record answer error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '답변 처리 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.patch('/v1/krmf/eval-records/:id', requirePermission(deps, KRMF_PERMISSIONS.manage), async (req, res) => {
    const ctx = getPortalContext(req);
    const status = str((req.body ?? {}).status);
    if (!status) {
      return res
        .status(422)
        .json(errorBody('invalid_status', '변경할 상태를 입력하세요.', ctx.requestId));
    }
    try {
      const result = await db.transaction(async trx =>
        updateEvalStatus(trx, ctx.tenantId, ctx.principal, ctx.identity.userId, req.params.id, status),
      );
      return respond(res, ctx.requestId, result);
    } catch (e) {
      logger.error(`krmf eval-record update error: ${(e as Error).message}`, { requestId: ctx.requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '평가 기록 수정 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  return router;
}
