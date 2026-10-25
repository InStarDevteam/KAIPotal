import { Knex } from 'knex';

export const PROJECT_STATUSES = [
  'active',
  'suspended',
  'closing',
  'closed',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_VISIBILITIES = ['public', 'member'] as const;
export const PROJECT_MEMBER_ROLES = ['manager', 'member', 'viewer'] as const;
export type ProjectMemberRole = (typeof PROJECT_MEMBER_ROLES)[number];

export const INVITE_STATUSES = [
  'invited',
  'accepted',
  'declined',
  'expired',
] as const;

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const PROJECT_TRANSITIONS: Record<ProjectStatus, readonly ProjectStatus[]> = {
  active: ['suspended', 'closing'],
  suspended: ['active', 'closing'],
  closing: ['closed', 'active'],
  closed: [],
};

export const canTransitionProject = (
  from: string,
  to: string,
): boolean =>
  (PROJECT_TRANSITIONS[from as ProjectStatus] ?? []).includes(
    to as ProjectStatus,
  );

export interface ProjectRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  purpose: string | null;
  status: string;
  owner_id: string;
  start_at: Date | null;
  end_at: Date | null;
  visibility: string;
  version: number;
  idempotency_key: string | null;
  created_by: string;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}

export const isProjectAdmin = (
  permissions: Set<string>,
): boolean => permissions.has('project.approve');

export const canManageProject = (
  project: Pick<ProjectRow, 'owner_id'>,
  userId: string,
  permissions: Set<string>,
): boolean =>
  project.owner_id === userId || isProjectAdmin(permissions);

export const projectVisibleTo = (
  project: Pick<ProjectRow, 'visibility'>,
  isMember: boolean,
): boolean => project.visibility === 'public' || isMember;

export const memberCanInvite = (
  role: string | undefined,
  isOwner: boolean,
  permissions: Set<string>,
): boolean =>
  isOwner || isProjectAdmin(permissions) || role === 'manager';

export interface CloseBlocker {
  kind: 'work_request' | 'catalog_application';
  id: string;
  title: string;
}

const PENDING_WORK_STATUSES = ['requested', 'reviewing'];

export const findCloseBlockers = async (
  trx: Knex.Transaction,
  projectId: string,
): Promise<CloseBlocker[]> => {
  const workRequests = await trx('portal.fc_work_requests')
    .where({ project_id: projectId })
    .whereIn('status', PENDING_WORK_STATUSES)
    .select('id', 'type', 'title');
  const applications = await trx('portal.fc_catalog_application')
    .where({ project_id: projectId, status: 'requested' })
    .select('id', 'reason');
  return [
    ...workRequests.map(row => ({
      kind: 'work_request' as const,
      id: row.id as string,
      title: `${row.type as string}: ${row.title as string}`,
    })),
    ...applications.map(row => ({
      kind: 'catalog_application' as const,
      id: row.id as string,
      title: row.reason as string,
    })),
  ];
};

export const closeBlockerMessage = (blockers: CloseBlocker[]): string =>
  `종료할 수 없습니다. 미처리 업무 ${blockers.length}건이 있습니다: ${blockers
    .map(blocker => `[${blocker.kind === 'work_request' ? '업무신청' : '카탈로그신청'}] ${blocker.title}`)
    .join('; ')}`;

export interface ListProjectsOptions {
  query?: string;
  status?: string;
  visibility?: string;
  mine?: boolean;
  page: number;
  pageSize: number;
}

export const listProjects = async (
  trx: Knex.Transaction,
  userId: string,
  options: ListProjectsOptions,
) => {
  const offset = (options.page - 1) * options.pageSize;
  const base = trx('portal.fc_project as p')
    .leftJoin('portal.fc_project_member as m', join =>
      join
        .on('m.project_id', 'p.id')
        .andOn('m.user_id', trx.raw('?', [userId])),
    )
    .where(function () {
      this.where('p.visibility', 'public').orWhereNotNull('m.user_id');
    })
    .select(
      'p.*',
      'm.role as my_role',
      trx.raw('(m.user_id IS NOT NULL) AS is_member'),
    );
  if (options.status) base.where('p.status', options.status);
  if (options.visibility) base.where('p.visibility', options.visibility);
  if (options.mine) {
    base.whereNotNull('m.user_id');
  }
  if (options.query?.trim()) {
    // Escape LIKE metacharacters so a literal %, _ or backslash does not
    // expand the user's search to unrelated projects.
    const pattern = `%${options.query.trim().replace(/[\\%_]/g, '\\$&')}%`;
    base.andWhere(function matchProjectQuery() {
      this.whereILike('p.name', pattern)
        .orWhereILike('p.description', pattern)
        .orWhereILike('p.purpose', pattern);
    });
  }
  const totalRow = await base
    .clone()
    .clearSelect()
    .clearOrder()
    .count('* as count')
    .first();
  const items = await base
    .orderBy('p.created_at', 'desc')
    .orderBy('p.id', 'desc')
    .limit(options.pageSize)
    .offset(offset);
  return {
    items,
    pagination: {
      page: options.page,
      pageSize: options.pageSize,
      total: Number(totalRow?.count ?? 0),
    },
  };
};

export const getProjectDetail = async (
  trx: Knex.Transaction,
  projectId: string,
) => {
  const project = await trx('portal.fc_project')
    .where({ id: projectId })
    .first();
  if (!project) return null;
  const members = await trx('portal.fc_project_member as m')
    .leftJoin('portal.fc_users as u', 'u.user_id', 'm.user_id')
    .where({ 'm.project_id': projectId })
    .select('m.user_id', 'm.role', 'm.joined_at', 'u.display_name')
    .orderBy('m.joined_at', 'asc');
  const invites = await trx('portal.fc_project_invite')
    .where({ project_id: projectId })
    .whereIn('status', ['invited', 'accepted', 'declined'])
    .orderBy('invited_at', 'desc')
    .select('*');
  return { project, members, invites };
};

export const addProjectMember = async (
  trx: Knex.Transaction,
  tenantId: string,
  projectId: string,
  userId: string,
  role: ProjectMemberRole,
): Promise<void> => {
  await trx('portal.fc_project_member')
    .insert({ project_id: projectId, tenant_id: tenantId, user_id: userId, role })
    .onConflict(['project_id', 'user_id'])
    .merge({ role, tenant_id: tenantId });
};

export interface UpdateProjectPatch {
  name?: string;
  description?: string | null;
  purpose?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  visibility?: string;
  status?: string;
}

export type UpdateProjectResult =
  | { ok: true; project: Record<string, unknown> }
  | { ok: false; code: 'invalid_transition' | 'version_conflict' };

export const updateProject = async (
  trx: Knex.Transaction,
  projectId: string,
  actorUserId: string,
  patch: UpdateProjectPatch,
  expectedVersion: number | undefined,
): Promise<UpdateProjectResult> => {
  const current = await trx('portal.fc_project')
    .where({ id: projectId })
    .first();
  if (!current) return { ok: false, code: 'invalid_transition' };
  if (
    expectedVersion !== undefined &&
    expectedVersion !== (current.version as number)
  ) {
    return { ok: false, code: 'version_conflict' };
  }
  if (
    patch.status !== undefined &&
    patch.status !== current.status &&
    !canTransitionProject(current.status as string, patch.status)
  ) {
    return { ok: false, code: 'invalid_transition' };
  }
  const updated = await trx('portal.fc_project')
    .where({ id: projectId })
    .update({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.description !== undefined
        ? { description: patch.description }
        : {}),
      ...(patch.purpose !== undefined ? { purpose: patch.purpose } : {}),
      ...(patch.startAt !== undefined ? { start_at: patch.startAt } : {}),
      ...(patch.endAt !== undefined ? { end_at: patch.endAt } : {}),
      ...(patch.visibility !== undefined
        ? { visibility: patch.visibility }
        : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      version: trx.raw('version + 1'),
      updated_by: actorUserId,
      updated_at: trx.fn.now(),
    });
  if (updated === 0) return { ok: false, code: 'version_conflict' };
  if (patch.name !== undefined || patch.status !== undefined) {
    // 업무 원장(fc_projects: 통합검색·K-RMF 범위 원천)과 이름·상태를 같이 둔다.
    await trx('portal.fc_projects')
      .where({ id: projectId })
      .update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.status !== undefined
          ? { status: patch.status === 'closed' ? 'closed' : 'active' }
          : {}),
        updated_at: trx.fn.now(),
      });
  }
  const project = await trx('portal.fc_project')
    .where({ id: projectId })
    .first();
  return { ok: true, project: project as Record<string, unknown> };
};

export const versionConflictMessage =
  '다른 사용자가 먼저 수정했습니다. 최신 내용을 다시 불러온 후 시도하세요.';

export const invalidTransitionMessage = (from: string, to: string): string =>
  `프로젝트 상태를 ${from}에서 ${to}(으)로 변경할 수 없습니다.`;
