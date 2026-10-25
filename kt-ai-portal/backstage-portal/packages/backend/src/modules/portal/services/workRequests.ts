import { Knex } from 'knex';
import { randomUUID } from 'crypto';
import { setTenantContext } from './context';

/**
 * 포털 업무 첫 화면 집계와 공유 승인함의 비즈니스 로직.
 *
 * 경계:
 * - 크레딧·자원 사용량의 원천 시스템은 각 플랫폼(기존 40개 연계 계약)이다.
 *   이 서비스는 그 수치를 만들어내지 않고 'pending_integration' 상태로만 표시한다.
 * - 프로젝트 멤버십은 fc_project_members 서버 원장으로만 확인한다.
 *   로컬 샘플·브라우저 저장소를 '내 프로젝트'로 간주하지 않는다.
 */

export type WorkRequestType = 'workspace' | 'export' | 'credit';

export const WORK_REQUEST_TYPES: WorkRequestType[] = [
  'workspace',
  'export',
  'credit',
];

/** 신청 유형 → 승인에 필요한 기존 권한(정책 변경 없음, 기존 rolePolicies 기준). */
export const typeRequestPermissions: Record<WorkRequestType, string> = {
  workspace: 'workspace.request',
  export: 'export.request',
  credit: 'credit.view',
};

export const typeApprovalPermissions: Record<
  WorkRequestType,
  readonly string[]
> = {
  workspace: ['workspace.approve', 'project.approve'],
  export: ['export.review'],
  credit: ['credit.approve'],
};

export const permittedRequestTypes = (
  permissions: Set<string>,
): WorkRequestType[] =>
  WORK_REQUEST_TYPES.filter(type =>
    typeApprovalPermissions[type].some(p => permissions.has(p)),
  );

export const canDecideType = (
  type: WorkRequestType,
  permissions: Set<string>,
): boolean => typeApprovalPermissions[type].some(p => permissions.has(p));

const REVIEWABLE: string[] = ['requested', 'reviewing'];

export type OverviewSection =
  | 'myProjects'
  | 'myRequests'
  | 'approvalQueue'
  | 'recentAudit';
export type OverviewSectionState =
  | 'ready'
  | 'unavailable'
  | 'permission_missing';

export interface OverviewResult {
  sections: Record<OverviewSection, OverviewSectionState>;
  myProjectTotal: number | null;
  myRequestTotal: number | null;
  myProjects: Array<{
    id: string;
    name: string;
    status: string;
    memberRole: string;
  }>;
  myRequests: Array<Record<string, unknown>>;
  approvalQueue: Array<{ type: WorkRequestType; count: number }>;
  recentAudit: Array<Record<string, unknown>> | null;
  auditExcludedReason: 'permission_missing' | null;
  credits: { state: 'pending_integration' };
  resourceUsage: { state: 'pending_integration' };
}

/** 역할별 첫 화면 집계. 트랜잭션 밖에서 호출하면 tenant context가 없어 RLS가 0건을 반환하므로 반드시 trx 사용. */
export const buildWorkOverview = async (
  trx: Knex.Transaction,
  tenantId: string,
  userId: string,
  permissions: Set<string>,
  onSectionError?: (section: OverviewSection, error: unknown) => void,
): Promise<OverviewResult> => {
  await setTenantContext(trx, tenantId);
  const sections: OverviewResult['sections'] = {
    myProjects: 'ready',
    myRequests: 'ready',
    approvalQueue: permittedRequestTypes(permissions).length
      ? 'ready'
      : 'permission_missing',
    recentAudit: permissions.has('audit.view') ? 'ready' : 'permission_missing',
  };
  // PostgreSQL 에러를 잡기만 하면 transaction 전체가 aborted 상태로 남는다.
  // 각 읽기는 savepoint로 격리해 한 원장의 설정 장애가 다른 현황을 가리지 않게 한다.
  const readSection = async <T>(
    section: OverviewSection,
    query: (read: Knex.Transaction) => Promise<T>,
    unavailable: T,
  ): Promise<T> => {
    try {
      return await trx.transaction(query);
    } catch (error) {
      const code = (error as { code?: string }).code;
      // ACL, 미적용 migration만 부분 실패로 분류한다. 연결/코드 오류는 전체 실패다.
      if (!code || !['42501', '42P01', '42703'].includes(code)) throw error;
      sections[section] = 'unavailable';
      onSectionError?.(section, error);
      return unavailable;
    }
  };
  const memberships = await readSection(
    'myProjects',
    async read => {
      const query = read('portal.fc_project_members as m')
        .join('portal.fc_projects as p', 'p.id', 'm.project_id')
        .where({ 'm.user_id': userId, 'p.status': 'active' });
      const count = await query.clone().count('* as count').first();
      const rows = await query
        .select('p.id', 'p.name', 'p.status', 'm.member_role')
        .orderBy('p.created_at', 'desc')
        .limit(20);
      return { rows, total: Number(count?.count ?? 0) };
    },
    { rows: [], total: 0 },
  );
  const myRequests = await readSection(
    'myRequests',
    async read => {
      const query = read('portal.fc_work_requests').where({
        requester_user_id: userId,
      });
      const count = await query.clone().count('* as count').first();
      const rows = await query
        .orderBy('created_at', 'desc')
        .limit(10)
        .select('*');
      let total = Number(count?.count ?? 0);
      // Domain requests remain in their existing ledgers. Merge summaries only;
      // never duplicate them into the work ledger to manufacture a dashboard.
      for (const source of [
        { table: 'fc_credit_request', type: 'credit', title: 'reason',
          allowed: permissions.has('credit.view') || permissions.has('credit.approve') },
        { table: 'fc_transfer_request', type: 'export', title: 'title',
          allowed: permissions.has('export.request') || permissions.has('export.review') },
      ]) {
        if (!source.allowed) continue;
        const domain = read(`portal.${source.table}`).where({ requested_by: userId });
        const domainCount = await domain.clone().count('* as count').first();
        const domainRows = await domain.orderBy('requested_at', 'desc').limit(10)
          .select('id', `${source.title} as title`, 'status', 'requested_at as created_at');
        total += Number(domainCount?.count ?? 0);
        rows.push(...domainRows.map(row => ({ ...row, type: source.type })));
      }
      rows.sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
      return { rows: rows.slice(0, 10), total };
    },
    { rows: [], total: 0 },
  );
  const approvalQueue = await readSection(
    'approvalQueue',
    async read => {
      const types = permittedRequestTypes(permissions);
      if (!types.length) return [];
      const counts = await read('portal.fc_work_requests')
        .whereIn('type', types)
        .whereIn('status', REVIEWABLE)
        .groupBy('type')
        .select('type')
        .count('* as count');
      const entries = types.map(type => ({
        type,
        count: Number(counts.find(row => row.type === type)?.count ?? 0),
      }));
      for (const [type, table] of [
        ['credit', 'fc_credit_request'], ['export', 'fc_transfer_request'],
      ] as const) {
        const entry = entries.find(item => item.type === type);
        if (!entry) continue;
        const domainCount = await read(`portal.${table}`)
          .whereIn('status', REVIEWABLE).count('* as count').first();
        entry.count += Number(domainCount?.count ?? 0);
      }
      return entries;
    },
    [],
  );
  const canAudit = permissions.has('audit.view');
  const recentAudit = canAudit
    ? await readSection(
        'recentAudit',
        async read =>
          read('portal.fc_audit_events')
            .orderBy('occurred_at', 'desc')
            .limit(10)
            .select(
              'event_id',
              'action',
              'resource_type',
              'result',
              'occurred_at',
            ),
        null,
      )
    : null;
  return {
    sections,
    myProjectTotal: sections.myProjects === 'ready' ? memberships.total : null,
    myRequestTotal: sections.myRequests === 'ready' ? myRequests.total : null,
    myProjects: memberships.rows.map(row => ({
      id: row.id as string,
      name: row.name as string,
      status: row.status as string,
      memberRole: row.member_role as string,
    })),
    myRequests: myRequests.rows,
    approvalQueue,
    recentAudit,
    auditExcludedReason: canAudit ? null : 'permission_missing',
    credits: { state: 'pending_integration' },
    resourceUsage: { state: 'pending_integration' },
  };
};

export interface ListOptions {
  status?: string;
  cursor?: string; // "created_at|id" 커서
  limit?: number;
}

const parseCursor = (cursor: string): { at: string; id: string } | null => {
  const [at, id] = cursor.split('|');
  return at && id ? { at, id } : null;
};

/** 공유 승인함: 내 권한으로 검토 가능한 유형만, 교차 테넌트는 RLS가 차단. */
export const listApprovalQueue = async (
  trx: Knex.Transaction,
  tenantId: string,
  permissions: Set<string>,
  options: ListOptions = {},
) => {
  await setTenantContext(trx, tenantId);
  const types = permittedRequestTypes(permissions);
  if (types.length === 0) return { items: [], nextCursor: null };
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  let qb = trx('portal.fc_work_requests')
    .whereIn('type', types)
    .whereIn('status', REVIEWABLE)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
    .limit(limit + 1);
  if (options.status) qb = qb.where({ status: options.status });
  if (options.cursor) {
    const c = parseCursor(options.cursor);
    if (c) {
      qb = qb.where(function () {
        this.where('created_at', '<', c.at).orWhere(function () {
          this.where('created_at', c.at).andWhere('id', '<', c.id);
        });
      });
    }
  }
  const rows = await qb.select('*');
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return {
    items,
    nextCursor:
      hasMore && last
        ? `${(last.created_at as Date).toISOString()}|${last.id}`
        : null,
  };
};

export const getRequestWithHistory = async (
  trx: Knex.Transaction,
  tenantId: string,
  requestId: string,
) => {
  await setTenantContext(trx, tenantId);
  const request = await trx('portal.fc_work_requests')
    .where({ id: requestId })
    .first();
  if (!request) return null;
  const history = await trx('portal.fc_request_events')
    .where({ request_id: requestId })
    .orderBy('created_at', 'asc')
    .select('*');
  return { request, history };
};

export type DecisionResult =
  | { ok: true; request: Record<string, unknown> }
  | { ok: false; code: 'not_found' | 'already_decided' | 'version_conflict' };

/**
 * 승인/반려 결정. 낙관적 락(version)으로 동시 승인을 막고,
 * 상태 변경·이력·감사를 한 트랜잭션에 원자적으로 기록한다.
 */
export const decideRequest = async (
  trx: Knex.Transaction,
  tenantId: string,
  requestId: string,
  actorUserId: string,
  decision: 'approved' | 'rejected',
  expectedVersion: number | undefined,
): Promise<DecisionResult> => {
  await setTenantContext(trx, tenantId);
  const current = await trx('portal.fc_work_requests')
    .where({ id: requestId })
    .first();
  if (!current) return { ok: false, code: 'not_found' };
  if (!REVIEWABLE.includes(current.status as string)) {
    return { ok: false, code: 'already_decided' };
  }
  if (expectedVersion !== undefined && expectedVersion !== current.version) {
    return { ok: false, code: 'version_conflict' };
  }
  const updated = await trx('portal.fc_work_requests')
    .where({ id: requestId })
    .whereIn('status', REVIEWABLE)
    .update({
      status: decision,
      decided_by: actorUserId,
      decided_at: trx.fn.now(),
      version: trx.raw('version + 1'),
      updated_at: trx.fn.now(),
    });
  if (updated === 0) {
    return {
      ok: false,
      code:
        expectedVersion !== undefined ? 'version_conflict' : 'already_decided',
    };
  }
  const request = await trx('portal.fc_work_requests')
    .where({ id: requestId })
    .first();
  return { ok: true, request: request as Record<string, unknown> };
};

export interface CreateWorkRequestInput {
  tenantId: string;
  type: WorkRequestType;
  title: string;
  requesterUserId: string;
  projectId?: string | undefined;
  payload?: Record<string, unknown> | undefined;
  idempotencyKey?: string | undefined;
}

export type CreateWorkRequestResult =
  | { ok: true; request: Record<string, unknown>; duplicate: boolean }
  | { ok: false; code: 'not_project_member' | 'invalid_input' };

export const createWorkRequest = async (
  trx: Knex.Transaction,
  input: CreateWorkRequestInput,
): Promise<CreateWorkRequestResult> => {
  await setTenantContext(trx, input.tenantId);

  if (!WORK_REQUEST_TYPES.includes(input.type)) {
    return { ok: false, code: 'invalid_input' };
  }
  const title = input.title.trim();
  if (!title || title.length > 200) {
    return { ok: false, code: 'invalid_input' };
  }

  if (input.idempotencyKey) {
    const existing = await trx('portal.fc_work_requests')
      .where({
        tenant_id: input.tenantId,
        idempotency_key: input.idempotencyKey,
      })
      .first();
    if (existing) {
      return {
        ok: true,
        request: existing as Record<string, unknown>,
        duplicate: true,
      };
    }
  }

  if (input.projectId) {
    const member = await trx('portal.fc_project_members')
      .where({ project_id: input.projectId, user_id: input.requesterUserId })
      .first('project_id');
    if (!member) return { ok: false, code: 'not_project_member' };
  }

  const id = randomUUID();
  await trx('portal.fc_work_requests').insert({
    id,
    tenant_id: input.tenantId,
    project_id: input.projectId ?? null,
    type: input.type,
    title,
    payload: JSON.stringify(input.payload ?? {}),
    requester_user_id: input.requesterUserId,
    idempotency_key: input.idempotencyKey ?? null,
  });
  await trx('portal.fc_request_events').insert({
    tenant_id: input.tenantId,
    request_id: id,
    actor_user_id: input.requesterUserId,
    action: 'submitted',
    note: null,
  });
  const request = await trx('portal.fc_work_requests').where({ id }).first();
  return {
    ok: true,
    request: request as Record<string, unknown>,
    duplicate: false,
  };
};
