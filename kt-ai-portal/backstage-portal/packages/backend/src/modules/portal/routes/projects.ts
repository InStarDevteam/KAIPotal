import { Request, Response, Router } from 'express';
import { Knex } from 'knex';
import { randomUUID } from 'crypto';
import { HttpAuthService, LoggerService } from '@backstage/backend-plugin-api';
import { getPortalContext, requireMembership, requirePermission } from '../services/middleware';
import { setTenantContext } from '../services/context';
import { recordAuditEvent } from '../services/audit';
import {
  addProjectMember,
  canManageProject,
  canTransitionProject,
  closeBlockerMessage,
  findCloseBlockers,
  getProjectDetail,
  invalidTransitionMessage,
  INVITE_TTL_MS,
  listProjects,
  memberCanInvite,
  PROJECT_MEMBER_ROLES,
  PROJECT_STATUSES,
  PROJECT_VISIBILITIES,
  projectVisibleTo,
  updateProject,
  versionConflictMessage,
  ProjectMemberRole,
} from '../services/projects';

import { validPortalText as validText } from '../services/textValidation';

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

const validDate = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) &&
  Number.isFinite(new Date(value).getTime());

export const createProjectsRouter = ({ db, httpAuth, logger }: RouterDeps) => {
  const router = Router();
  const deps = { db, httpAuth, logger };

  router.get('/v1/projects', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const status = req.query.status as string | undefined;
      const visibility = req.query.visibility as string | undefined;
      const query = req.query.q;
      const page = Number(req.query.page ?? 1);
      const pageSize = Number(req.query.pageSize ?? 20);
      if (
        (status && !PROJECT_STATUSES.includes(status as never)) ||
        (visibility && !PROJECT_VISIBILITIES.includes(visibility as never)) ||
        (query !== undefined && !validText(query, 0, 100)) ||
        !Number.isSafeInteger(page) ||
        page < 1 ||
        !Number.isSafeInteger(pageSize) ||
        pageSize < 1 ||
        pageSize > 200
      ) {
        return res
          .status(422)
          .json(errorBody('invalid_filters', '조회 조건을 확인하세요.', ctx.requestId));
      }
      const data = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        return listProjects(trx, ctx.identity.userId, {
          status,
          visibility,
          mine: req.query.mine === 'true',
          query: typeof query === 'string' ? query.trim() : undefined,
          page,
          pageSize,
        });
      });
      return res.json({ data, meta: meta(ctx.requestId) });
    } catch (e) {
      logger.error(`project list error: ${(e as Error).message}`, {
        requestId: ctx.requestId,
      });
      return res
        .status(500)
        .json(errorBody('internal_error', '프로젝트 목록 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.post('/v1/projects', requirePermission(deps, 'project.request'), async (req, res) => {
    const ctx = getPortalContext(req);
    const requestId = ctx.requestId;
    const body = req.body ?? {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const visibility = body.visibility ?? 'public';
    const idempotencyKey =
      body.idempotencyKey === undefined || body.idempotencyKey === null
        ? null
        : String(body.idempotencyKey).slice(0, 120);
    if (
      !validText(name, 1, 200) ||
      (body.description !== undefined &&
        body.description !== null &&
        !validText(body.description, 0, 2000, true)) ||
      (body.purpose !== undefined &&
        body.purpose !== null &&
        !validText(body.purpose, 0, 2000, true)) ||
      !PROJECT_VISIBILITIES.includes(visibility) ||
      (body.startAt !== undefined && body.startAt !== null && !validDate(body.startAt)) ||
      (body.endAt !== undefined && body.endAt !== null && !validDate(body.endAt))
    ) {
      return res
        .status(422)
        .json(errorBody('invalid_project', '프로젝트 이름·설명·공개범위·기간을 확인하세요.', requestId));
    }
    try {
      const result = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        if (idempotencyKey) {
          const existing = await trx('portal.fc_project')
            .where({ tenant_id: ctx.tenantId, idempotency_key: idempotencyKey })
            .first();
          if (existing) {
            if (existing.owner_id !== ctx.identity.userId) {
              const err = new Error('idempotency_conflict');
              (err as { statusCode?: number }).statusCode = 409;
              throw err;
            }
            return { status: 200, project: existing };
          }
        }
        const id = randomUUID();
        await trx('portal.fc_project').insert({
          id,
          tenant_id: ctx.tenantId,
          name,
          description: body.description ?? null,
          purpose: body.purpose ?? null,
          status: 'active',
          owner_id: ctx.identity.userId,
          start_at: body.startAt ?? null,
          end_at: body.endAt ?? null,
          visibility,
          idempotency_key: idempotencyKey,
          created_by: ctx.identity.userId,
          updated_by: ctx.identity.userId,
        });
        await addProjectMember(
          trx,
          ctx.tenantId,
          id,
          ctx.identity.userId,
          'manager' as ProjectMemberRole,
        );
        // 업무 원장(K-RMF 범위·통합검색·카탈로그 신청 원장 FK)과 동일 프로젝트를 공유한다.
        await trx('portal.fc_projects')
          .insert({
            id,
            tenant_id: ctx.tenantId,
            name,
            description: body.description ?? null,
            status: 'active',
            owner_user_id: ctx.identity.userId,
          })
          .onConflict('id')
          .merge({ tenant_id: ctx.tenantId, name, owner_user_id: ctx.identity.userId });
        await trx('portal.fc_project_members')
          .insert({
            project_id: id,
            tenant_id: ctx.tenantId,
            user_id: ctx.identity.userId,
            member_role: 'owner',
          })
          .onConflict(['project_id', 'user_id'])
          .merge({ tenant_id: ctx.tenantId });
        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          action: 'project.create',
          resourceType: 'project',
          resourceId: id,
          result: 'success',
          requestId,
        });
        const project = await trx('portal.fc_project').where({ id }).first();
        return { status: 201, project };
      });
      return res
        .status(result.status)
        .json({ data: result.project, meta: meta(requestId) });
    } catch (e) {
      if ((e as { statusCode?: number }).statusCode === 409) {
        return res
          .status(409)
          .json(errorBody('idempotency_conflict', '동일한 생성 요청이 다른 사용자에 의해 처리되었습니다.', requestId));
      }
      logger.error(`project create error: ${(e as Error).message}`, { requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '프로젝트 생성 중 오류가 발생했습니다.', requestId, true));
    }
  });

  const loadVisibleProject = async (
    trx: Knex.Transaction,
    projectId: string,
    userId: string,
  ) => {
    const project = await trx('portal.fc_project').where({ id: projectId }).first();
    if (!project) return { project: null, membership: null };
    const membership = await trx('portal.fc_project_member')
      .where({ project_id: projectId, user_id: userId })
      .first('role');
    return { project, membership };
  };

  router.get('/v1/projects/:id', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    try {
      const data = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        const { project, membership } = await loadVisibleProject(
          trx,
          req.params.id,
          ctx.identity.userId,
        );
        if (!project || !projectVisibleTo(project, Boolean(membership))) {
          return null;
        }
        return getProjectDetail(trx, req.params.id);
      });
      if (!data) {
        return res
          .status(404)
          .json(errorBody('not_found', '프로젝트를 찾을 수 없습니다.', ctx.requestId));
      }
      return res.json({ data, meta: meta(ctx.requestId) });
    } catch (e) {
      logger.error(`project detail error: ${(e as Error).message}`, {
        requestId: ctx.requestId,
      });
      return res
        .status(500)
        .json(errorBody('internal_error', '프로젝트 조회 중 오류가 발생했습니다.', ctx.requestId, true));
    }
  });

  router.patch('/v1/projects/:id', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    const requestId = ctx.requestId;
    const body = req.body ?? {};
    const allowedKeys = [
      'name',
      'description',
      'purpose',
      'startAt',
      'endAt',
      'visibility',
      'status',
      'expectedVersion',
    ];
    const patch: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
    if (
      Object.keys(patch).length === 0 ||
      (patch.name !== undefined && !validText(patch.name, 1, 200)) ||
      (patch.description !== undefined &&
        patch.description !== null &&
        !validText(patch.description, 0, 2000, true)) ||
      (patch.purpose !== undefined &&
        patch.purpose !== null &&
        !validText(patch.purpose, 0, 2000, true)) ||
      (patch.visibility !== undefined &&
        !PROJECT_VISIBILITIES.includes(patch.visibility as never)) ||
      (patch.status !== undefined && !PROJECT_STATUSES.includes(patch.status as never)) ||
      (patch.startAt !== undefined && patch.startAt !== null && !validDate(patch.startAt)) ||
      (patch.endAt !== undefined && patch.endAt !== null && !validDate(patch.endAt))
    ) {
      return res
        .status(422)
        .json(errorBody('invalid_project', '수정할 필드와 값을 확인하세요.', requestId));
    }
    try {
      const result = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        const { project, membership } = await loadVisibleProject(
          trx,
          req.params.id,
          ctx.identity.userId,
        );
        if (!project || !projectVisibleTo(project, Boolean(membership))) {
          return { status: 404, code: 'not_found', message: '프로젝트를 찾을 수 없습니다.' };
        }
        if (!canManageProject(project, ctx.identity.userId, ctx.permissions)) {
          await recordAuditEvent(trx, ctx.principal, {
            tenantId: ctx.tenantId,
            actorId: ctx.identity.userId,
            action: 'project.update',
            resourceType: 'project',
            resourceId: req.params.id,
            result: 'denied',
            reasonCode: 'missing_permission',
            requestId,
          });
          return {
            status: 403,
            code: 'permission_denied',
            message: '프로젝트를 수정할 권한이 없습니다.',
          };
        }
        if (project.status === 'closed') {
          return {
            status: 409,
            code: 'project_closed',
            message: '종료된 프로젝트는 수정할 수 없습니다.',
          };
        }
        if (
          patch.status !== undefined &&
          patch.status !== project.status &&
          !canTransitionProject(project.status as string, patch.status as string)
        ) {
          return {
            status: 409,
            code: 'invalid_transition',
            message: invalidTransitionMessage(
              project.status as string,
              patch.status as string,
            ),
          };
        }
        const expectedVersion =
          patch.expectedVersion === undefined
            ? undefined
            : Number(patch.expectedVersion);
        const updated = await updateProject(
          trx,
          req.params.id,
          ctx.identity.userId,
          {
            name: patch.name as string | undefined,
            description:
              'description' in patch
                ? (patch.description as string | null)
                : undefined,
            purpose:
              'purpose' in patch ? (patch.purpose as string | null) : undefined,
            startAt:
              'startAt' in patch ? (patch.startAt as string | null) : undefined,
            endAt: 'endAt' in patch ? (patch.endAt as string | null) : undefined,
            visibility: patch.visibility as string | undefined,
            status: patch.status as string | undefined,
          },
          Number.isSafeInteger(expectedVersion) ? expectedVersion : undefined,
        );
        if (!updated.ok) {
          return {
            status: 409,
            code: updated.code,
            message:
              updated.code === 'version_conflict'
                ? versionConflictMessage
                : '상태를 변경할 수 없습니다.',
          };
        }
        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          action: 'project.update',
          resourceType: 'project',
          resourceId: req.params.id,
          resourceVersion: String((updated.project.version as number) ?? ''),
          result: 'success',
          changedFields: Object.keys(patch).filter(key => key !== 'expectedVersion'),
          requestId,
        });
        return { status: 200, data: updated.project };
      });
      if (result.status !== 200) {
        return res
          .status(result.status)
          .json(errorBody(result.code ?? 'internal_error', result.message ?? '요청을 처리하지 못했습니다.', requestId));
      }
      return res.json({ data: result.data, meta: meta(requestId) });
    } catch (e) {
      logger.error(`project update error: ${(e as Error).message}`, { requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '프로젝트 수정 중 오류가 발생했습니다.', requestId, true));
    }
  });

  router.post('/v1/projects/:id/members', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    const requestId = ctx.requestId;
    const body = req.body ?? {};
    const role = body.role ?? 'member';
    if (
      typeof body.userId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.userId) ||
      !PROJECT_MEMBER_ROLES.includes(role)
    ) {
      return res
        .status(422)
        .json(errorBody('invalid_member', '추가할 사용자와 역할을 확인하세요.', requestId));
    }
    try {
      const result = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        const project = await trx('portal.fc_project')
          .where({ id: req.params.id })
          .first();
        if (!project) {
          return { status: 404, code: 'not_found', message: '프로젝트를 찾을 수 없습니다.' };
        }
        const myMembership = await trx('portal.fc_project_member')
          .where({ project_id: req.params.id, user_id: ctx.identity.userId })
          .first('role');
        if (
          !memberCanInvite(
            myMembership?.role as string | undefined,
            project.owner_id === ctx.identity.userId,
            ctx.permissions,
          )
        ) {
          return {
            status: 403,
            code: 'permission_denied',
            message: '멤버를 관리할 권한이 없습니다.',
          };
        }
        const existing = await trx('portal.fc_project_member')
          .where({ project_id: req.params.id, user_id: body.userId })
          .first('user_id');
        if (existing) {
          return {
            status: 409,
            code: 'already_member',
            message: '이미 프로젝트 멤버입니다.',
          };
        }
        await addProjectMember(
          trx,
          ctx.tenantId,
          req.params.id,
          body.userId,
          role as ProjectMemberRole,
        );
        await trx('portal.fc_project_members')
          .insert({
            project_id: req.params.id,
            tenant_id: ctx.tenantId,
            user_id: body.userId,
            member_role: role === 'manager' ? 'manager' : 'member',
          })
          .onConflict(['project_id', 'user_id'])
          .merge({
            tenant_id: ctx.tenantId,
            member_role: role === 'manager' ? 'manager' : 'member',
          });
        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          action: 'project.member.add',
          resourceType: 'project',
          resourceId: req.params.id,
          result: 'success',
          requestId,
        });
        return { status: 201, data: { projectId: req.params.id, userId: body.userId, role } };
      });
      if (result.status !== 201) {
        return res
          .status(result.status)
          .json(errorBody(result.code ?? 'internal_error', result.message ?? '요청을 처리하지 못했습니다.', requestId));
      }
      return res.status(201).json({ data: result.data, meta: meta(requestId) });
    } catch (e) {
      logger.error(`project member add error: ${(e as Error).message}`, { requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '멤버 추가 중 오류가 발생했습니다.', requestId, true));
    }
  });

  router.post('/v1/projects/:id/invites', requireMembership(deps), async (req, res) => {
    const ctx = getPortalContext(req);
    const requestId = ctx.requestId;
    const body = req.body ?? {};
    const role = body.role ?? 'member';
    if (
      typeof body.inviteeId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.inviteeId) ||
      !PROJECT_MEMBER_ROLES.includes(role)
    ) {
      return res
        .status(422)
        .json(errorBody('invalid_invite', '초대할 사용자와 역할을 확인하세요.', requestId));
    }
    try {
      const result = await db.transaction(async trx => {
        await setTenantContext(trx, ctx.tenantId);
        const project = await trx('portal.fc_project')
          .where({ id: req.params.id })
          .first();
        if (!project) {
          return { status: 404, code: 'not_found', message: '프로젝트를 찾을 수 없습니다.' };
        }
        const myMembership = await trx('portal.fc_project_member')
          .where({ project_id: req.params.id, user_id: ctx.identity.userId })
          .first('role');
        if (
          !memberCanInvite(
            myMembership?.role as string | undefined,
            project.owner_id === ctx.identity.userId,
            ctx.permissions,
          )
        ) {
          return {
            status: 403,
            code: 'permission_denied',
            message: '초대할 권한이 없습니다.',
          };
        }
        const member = await trx('portal.fc_project_member')
          .where({ project_id: req.params.id, user_id: body.inviteeId })
          .first('user_id');
        if (member) {
          return {
            status: 409,
            code: 'already_member',
            message: '이미 프로젝트 멤버입니다.',
          };
        }
        const pending = await trx('portal.fc_project_invite')
          .where({ project_id: req.params.id, invitee_id: body.inviteeId, status: 'invited' })
          .first('id');
        if (pending) {
          return {
            status: 409,
            code: 'invite_pending',
            message: '이미 초대 대기 중인 사용자입니다.',
          };
        }
        const id = randomUUID();
        await trx('portal.fc_project_invite').insert({
          id,
          tenant_id: ctx.tenantId,
          project_id: req.params.id,
          invitee_id: body.inviteeId,
          role,
          status: 'invited',
          invited_by: ctx.identity.userId,
        });
        await recordAuditEvent(trx, ctx.principal, {
          tenantId: ctx.tenantId,
          actorId: ctx.identity.userId,
          action: 'project.invite.send',
          resourceType: 'project_invite',
          resourceId: id,
          result: 'success',
          requestId,
        });
        return { status: 201, data: { id, projectId: req.params.id, inviteeId: body.inviteeId, role } };
      });
      if (result.status !== 201) {
        return res
          .status(result.status)
          .json(errorBody(result.code ?? 'internal_error', result.message ?? '요청을 처리하지 못했습니다.', requestId));
      }
      return res.status(201).json({ data: result.data, meta: meta(requestId) });
    } catch (e) {
      logger.error(`project invite error: ${(e as Error).message}`, { requestId });
      return res
        .status(500)
        .json(errorBody('internal_error', '초대 처리 중 오류가 발생했습니다.', requestId, true));
    }
  });

  router.post(
    '/v1/projects/invites/:id/respond',
    requireMembership(deps),
    async (req, res) => {
      const ctx = getPortalContext(req);
      const requestId = ctx.requestId;
      const action = (req.body ?? {}).action;
      if (action !== 'accept' && action !== 'decline') {
        return res
          .status(422)
          .json(errorBody('invalid_action', 'action은 accept 또는 decline이어야 합니다.', requestId));
      }
      try {
        const result = await db.transaction(async trx => {
          await setTenantContext(trx, ctx.tenantId);
          const invite = await trx('portal.fc_project_invite')
            .where({ id: req.params.id })
            .first();
          if (!invite) {
            return { status: 404, code: 'not_found', message: '초대를 찾을 수 없습니다.' };
          }
          if (invite.invitee_id !== ctx.identity.userId) {
            return {
              status: 403,
              code: 'permission_denied',
              message: '본인의 초대만 응답할 수 있습니다.',
            };
          }
          if (invite.status !== 'invited') {
            return {
              status: 409,
              code: 'invite_not_pending',
              message: `초대 상태가 ${invite.status}이므로 응답할 수 없습니다.`,
            };
          }
          if (
            Date.now() - new Date(invite.invited_at as string).getTime() >
            INVITE_TTL_MS
          ) {
            await trx('portal.fc_project_invite')
              .where({ id: req.params.id })
              .update({ status: 'expired', responded_at: trx.fn.now() });
            return {
              status: 409,
              code: 'invite_expired',
              message: '초대 유효기간이 지났습니다. 새 초대를 요청하세요.',
            };
          }
          if (action === 'decline') {
            await trx('portal.fc_project_invite')
              .where({ id: req.params.id })
              .update({ status: 'declined', responded_at: trx.fn.now() });
          } else {
            const member = await trx('portal.fc_project_member')
              .where({ project_id: invite.project_id, user_id: ctx.identity.userId })
              .first('user_id');
            if (member) {
              return {
                status: 409,
                code: 'already_member',
                message: '이미 프로젝트 멤버입니다.',
              };
            }
            await addProjectMember(
              trx,
              ctx.tenantId,
              invite.project_id as string,
              ctx.identity.userId,
              invite.role as ProjectMemberRole,
            );
            await trx('portal.fc_project_members')
              .insert({
                project_id: invite.project_id as string,
                tenant_id: ctx.tenantId,
                user_id: ctx.identity.userId,
                member_role:
                  invite.role === 'manager' ? 'manager' : 'member',
              })
              .onConflict(['project_id', 'user_id'])
              .merge({
                tenant_id: ctx.tenantId,
                member_role:
                  invite.role === 'manager' ? 'manager' : 'member',
              });
            await trx('portal.fc_project_invite')
              .where({ id: req.params.id })
              .update({ status: 'accepted', responded_at: trx.fn.now() });
          }
          await recordAuditEvent(trx, ctx.principal, {
            tenantId: ctx.tenantId,
            actorId: ctx.identity.userId,
            action: `project.invite.${action}`,
            resourceType: 'project_invite',
            resourceId: req.params.id,
            result: 'success',
            requestId,
          });
          return { status: 200, data: { id: req.params.id, action } };
        });
        if (result.status !== 200 && result.status !== 201) {
          return res
            .status(result.status)
            .json(errorBody(result.code ?? 'internal_error', result.message ?? '요청을 처리하지 못했습니다.', requestId));
        }
        return res.json({ data: result.data, meta: meta(requestId) });
      } catch (e) {
        logger.error(`project invite respond error: ${(e as Error).message}`, { requestId });
        return res
          .status(500)
          .json(errorBody('internal_error', '초대 응답 처리 중 오류가 발생했습니다.', requestId, true));
      }
    },
  );

  const closeRequestHandler = (targetStatus: 'closing' | 'closed') =>
    async (req: Request, res: Response) => {
      const ctx = getPortalContext(req);
      const requestId = ctx.requestId;
      const body = req.body ?? {};
      if (
        targetStatus === 'closed' &&
        body.preserveOutputs !== true
      ) {
        return res
          .status(422)
          .json(
            errorBody(
              'preserve_outputs_required',
              '프로젝트 종료는 산출물 보존 확인(preserveOutputs: true)이 필요합니다.',
              requestId,
            ),
          );
      }
      try {
        const result = await db.transaction(async trx => {
          await setTenantContext(trx, ctx.tenantId);
          const project = await trx('portal.fc_project')
            .where({ id: req.params.id })
            .first();
          if (!project) {
            return { status: 404, code: 'not_found', message: '프로젝트를 찾을 수 없습니다.' };
          }
          if (!canManageProject(project, ctx.identity.userId, ctx.permissions)) {
            await recordAuditEvent(trx, ctx.principal, {
              tenantId: ctx.tenantId,
              actorId: ctx.identity.userId,
              action: 'project.close',
              resourceType: 'project',
              resourceId: req.params.id,
              result: 'denied',
              reasonCode: 'missing_permission',
              requestId,
            });
            return {
              status: 403,
              code: 'permission_denied',
              message: '프로젝트를 종료할 권한이 없습니다.',
            };
          }
          if (project.status === 'closed') {
            return {
              status: 409,
              code: 'project_closed',
              message: '이미 종료된 프로젝트입니다.',
            };
          }
          if (targetStatus === 'closing') {
            if (!canTransitionProject(project.status as string, 'closing')) {
              return {
                status: 409,
                code: 'invalid_transition',
                message: invalidTransitionMessage(project.status as string, 'closing'),
              };
            }
          } else {
            if (project.status !== 'closing') {
              return {
                status: 409,
                code: 'invalid_transition',
                message: '종료 요청(closing) 상태에서만 프로젝트를 종료할 수 있습니다.',
              };
            }
            const blockers = await findCloseBlockers(trx, req.params.id);
            if (blockers.length > 0) {
              return {
                status: 409,
                code: 'close_blocked',
                message: closeBlockerMessage(blockers),
                blockers,
              };
            }
          }
          const updated = await updateProject(
            trx,
            req.params.id,
            ctx.identity.userId,
            { status: targetStatus },
            undefined,
          );
          if (!updated.ok) {
            return {
              status: 409,
              code: updated.code,
              message:
                updated.code === 'version_conflict'
                  ? versionConflictMessage
                  : '상태를 변경할 수 없습니다.',
            };
          }
          await recordAuditEvent(trx, ctx.principal, {
            tenantId: ctx.tenantId,
            actorId: ctx.identity.userId,
            action:
              targetStatus === 'closing' ? 'project.close.request' : 'project.close',
            resourceType: 'project',
            resourceId: req.params.id,
            resourceVersion: String((updated.project.version as number) ?? ''),
            result: 'success',
            requestId,
          });
          return { status: 200, data: updated.project };
        });
        if (result.status !== 200) {
          const responseBody: Record<string, unknown> = {
            error: {
              code: result.code ?? 'internal_error',
              message: result.message ?? '요청을 처리하지 못했습니다.',
              retryable: false,
              requestId,
            },
          };
          if ('blockers' in result && Array.isArray(result.blockers)) {
            (responseBody.error as Record<string, unknown>).blockers = result.blockers;
          }
          return res.status(result.status).json(responseBody);
        }
        return res.json({ data: result.data, meta: meta(requestId) });
      } catch (e) {
        logger.error(`project close error: ${(e as Error).message}`, { requestId });
        return res
          .status(500)
          .json(errorBody('internal_error', '프로젝트 종료 처리 중 오류가 발생했습니다.', requestId, true));
      }
    };

  router.post('/v1/projects/:id/close-request', requireMembership(deps), closeRequestHandler('closing'));
  router.post('/v1/projects/:id/close', requireMembership(deps), closeRequestHandler('closed'));

  return router;
};
