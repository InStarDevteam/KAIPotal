import { createHash, randomUUID } from 'crypto';
import { Knex } from 'knex';
import { PortalPrincipal, setTenantContext } from './context';
import { recordAuditEvent } from './audit';
import {
  ACTION_STATUSES,
  ACTION_TRANSITIONS,
  APPLICABILITIES,
  Applicability,
  BASELINE_STATUSES,
  BASELINE_TRANSITIONS,
  BaselineStatus,
  CHANGE_STATUSES,
  CHANGE_TRANSITIONS,
  CHANGE_TYPES,
  computeImplementationRate,
  controlVisibleToMember,
  EVAL_KINDS,
  EVAL_TRANSITIONS,
  EvidenceKind,
  EVIDENCE_KINDS,
  IMPACTS,
  REVIEW_STATUSES,
  ScopeIdentity,
  toCsv,
  transitionError,
  applicabilityChangeError,
  TRR_TRANSITIONS,
  UUID_PATTERN,
  CONTROL_TRANSITIONS,
} from './krmfDomain';

const NULL_UUID = '00000000-0000-0000-0000-000000000000';

export type KrmfResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; code: string; message: string };

const ok = <T>(value: T): KrmfResult<T> => ({ ok: true, value });
const fail = <T>(
  status: number,
  code: string,
  message: string,
): KrmfResult<T> => ({ ok: false, status, code, message });

export const loadMemberProjectIds = async (
  trx: Knex.Transaction,
  userId: string,
): Promise<string[]> => {
  const rows = await trx('portal.fc_project_members')
    .where({ user_id: userId })
    .select('project_id');
  return rows.map(row => row.project_id as string);
};

const projectIdList = (scope: ScopeIdentity): string[] =>
  scope.memberProjectIds.size > 0 ? [...scope.memberProjectIds] : [NULL_UUID];

const scopedControlQuery = (
  trx: Knex.Transaction,
  scope: ScopeIdentity,
) => {
  let qb = trx('portal.fc_krmf_control as c').join(
    'portal.fc_krmf_baseline as b',
    'b.id',
    'c.baseline_id',
  );
  if (!scope.canViewAll) {
    qb = qb.where(sub =>
      sub
        .where('c.owner_id', scope.userId)
        .orWhereIn('b.project_id', projectIdList(scope)),
    );
  }
  return qb;
};

const hashPayload = (payload: unknown): string =>
  createHash('sha256').update(JSON.stringify(payload ?? {})).digest('hex');

const idempotent = async <T>(
  trx: Knex.Transaction,
  tenantId: string,
  actor: string,
  action: string,
  key: string | undefined,
  payload: unknown,
  execute: () => Promise<T>,
): Promise<KrmfResult<{ replayed: boolean; value: T }>> => {
  if (key === undefined) {
    return ok({ replayed: false, value: await execute() });
  }
  if (!UUID_PATTERN.test(key)) {
    return fail(422, 'invalid_idempotency_key', '멱등 키는 UUID 형식이어야 합니다.');
  }
  const digest = hashPayload(payload);
  const existing = await trx('portal.fc_idempotency_keys')
    .where({ tenant_id: tenantId, actor, action, key })
    .first();
  if (existing) {
    if (existing.payload_hash !== digest) {
      return fail(
        409,
        'idempotency_key_conflict',
        '동일한 멱등 키로 서로 다른 요청을 처리할 수 없습니다. 새 키를 사용하세요.',
      );
    }
    return ok({ replayed: true, value: existing.result as T });
  }
  const value = await execute();
  await trx('portal.fc_idempotency_keys').insert({
    tenant_id: tenantId,
    actor,
    action,
    key,
    payload_hash: digest,
    result: JSON.stringify(value),
    expires_at: trx.raw(`now() + interval '1 day'`),
  });
  return ok({ replayed: false, value });
};

const dueDateFrom = (value: unknown): Date | null | 'invalid' => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || !value.trim()) return 'invalid';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : 'invalid';
};

const sameInstant = (a: Date | string, b: Date | string): boolean => {
  const left = a instanceof Date ? a : new Date(a);
  const right = b instanceof Date ? b : new Date(b);
  return left.getTime() === right.getTime();
};

const validText = (value: unknown, max: number): value is string =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  Array.from(value).every(ch => ch.charCodeAt(0) >= 32) &&
  value.length <= max;

// ── 개요 집계 ────────────────────────────────────────────────────

export interface OverviewFilters {
  baseline_id?: string;
  project_id?: string;
}

export const buildKrmfOverview = async (
  trx: Knex.Transaction,
  tenantId: string,
  scope: ScopeIdentity,
  filters: OverviewFilters,
): Promise<KrmfResult<Record<string, unknown>>> => {
  await setTenantContext(trx, tenantId);
  if (filters.baseline_id && !UUID_PATTERN.test(filters.baseline_id)) {
    return fail(422, 'invalid_baseline_id', 'baseline_id 형식이 올바르지 않습니다.');
  }
  if (filters.project_id && !UUID_PATTERN.test(filters.project_id)) {
    return fail(422, 'invalid_project_id', 'project_id 형식이 올바르지 않습니다.');
  }

  let controlQb = scopedControlQuery(trx, scope);
  if (filters.baseline_id) controlQb = controlQb.where('c.baseline_id', filters.baseline_id);
  if (filters.project_id) controlQb = controlQb.where('b.project_id', filters.project_id);

  const totals = await controlQb
    .clone()
    .select(
      trx.raw(`COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE c.applicability = 'applied')::int AS applied,
        COUNT(*) FILTER (WHERE c.applicability = 'excluded')::int AS excluded,
        COUNT(*) FILTER (WHERE c.applicability = 'alternative')::int AS alternative,
        COUNT(*) FILTER (WHERE c.applicability = 'applied'
          AND NOT EXISTS (SELECT 1 FROM portal.fc_krmf_evidence e WHERE e.control_id = c.id))::int AS evidence_missing,
        COUNT(*) FILTER (WHERE c.applicability = 'applied'
          AND EXISTS (SELECT 1 FROM portal.fc_krmf_evidence e
            WHERE e.control_id = c.id AND e.review_status = 'approved'))::int AS with_approved,
        MIN(c.due_date) FILTER (WHERE c.applicability = 'applied' AND c.due_date IS NOT NULL) AS next_due`),
    )
    .first();

  const evidenceQb = (extra: (qb: Knex.QueryBuilder) => Knex.QueryBuilder) => {
    let qb = trx('portal.fc_krmf_evidence as e')
      .join('portal.fc_krmf_control as c', 'c.id', 'e.control_id')
      .join('portal.fc_krmf_baseline as b', 'b.id', 'c.baseline_id');
    if (!scope.canViewAll) {
      qb = qb.where(sub =>
        sub
          .where('c.owner_id', scope.userId)
          .orWhereIn('b.project_id', projectIdList(scope)),
      );
    }
    if (filters.baseline_id) qb = qb.where('c.baseline_id', filters.baseline_id);
    if (filters.project_id) qb = qb.where('b.project_id', filters.project_id);
    return extra(qb);
  };

  const reviewPendingRow = await evidenceQb(qb =>
    qb.where('e.review_status', 'pending'),
  ).count('* as count');

  const actionBase = () => {
    let qb = trx('portal.fc_krmf_action as a')
      .join('portal.fc_krmf_control as c', 'c.id', 'a.control_id')
      .join('portal.fc_krmf_baseline as b', 'b.id', 'c.baseline_id')
      .whereIn('a.status', ['open', 'in_progress']);
    if (!scope.canViewAll) {
      qb = qb.where(sub =>
        sub
          .where('c.owner_id', scope.userId)
          .orWhereIn('b.project_id', projectIdList(scope)),
      );
    }
    if (filters.baseline_id) qb = qb.where('c.baseline_id', filters.baseline_id);
    if (filters.project_id) qb = qb.where('b.project_id', filters.project_id);
    return qb;
  };
  const actionsOpenRow = await actionBase().count('* as count');
  const actionsOverdueRow = await actionBase()
    .where('a.due_date', '<', trx.fn.now())
    .count('* as count');

  let changeQb = trx('portal.fc_krmf_change').where({ tenant_id: tenantId });
  if (!scope.canViewAll) {
    changeQb = changeQb.where(qb =>
      qb.whereNull('project_id').orWhereIn('project_id', projectIdList(scope)),
    );
  }
  if (filters.project_id) changeQb = changeQb.where({ project_id: filters.project_id });
  const changesReassessPendingRow = await changeQb
    .clone()
    .where('reassess_required', true)
    .whereNot('status', 'reassessed')
    .count('* as count');
  const recentChanges = await changeQb
    .clone()
    .orderBy('updated_at', 'desc')
    .orderBy('id', 'desc')
    .limit(5)
    .select('*');

  let nextDue: Date | null = (totals?.next_due as Date | null) ?? null;
  const pendingChanges = await changeQb
    .clone()
    .where('reassess_required', true)
    .whereNot('status', 'reassessed')
    .select('id', 'updated_at', 'affected_control_ids');
  const affectedIds = [
    ...new Set(
      pendingChanges.flatMap(
        row => (row.affected_control_ids as string[] | null) ?? [],
      ),
    ),
  ];
  if (affectedIds.length > 0) {
    const affectedControls = await trx('portal.fc_krmf_control')
      .whereIn('id', affectedIds)
      .select('id', 'due_date');
    const dueById = new Map(
      affectedControls.map(row => [row.id as string, row.due_date as Date | null]),
    );
    for (const row of pendingChanges) {
      const updatedAt = row.updated_at as Date;
      for (const controlId of (row.affected_control_ids as string[]) ?? []) {
        const candidate = dueById.get(controlId) ?? updatedAt;
        if (candidate && (!nextDue || candidate < nextDue)) nextDue = candidate;
      }
    }
  }

  const applied = Number(totals?.applied ?? 0);
  const rate = computeImplementationRate(
    applied,
    Number(totals?.with_approved ?? 0),
  );

  return ok({
    total_controls: Number(totals?.total ?? 0),
    applied,
    excluded: Number(totals?.excluded ?? 0),
    alternative: Number(totals?.alternative ?? 0),
    evidence_missing: Number(totals?.evidence_missing ?? 0),
    review_pending: Number((reviewPendingRow[0] as { count: string } | undefined)?.count ?? 0),
    actions_open: Number((actionsOpenRow[0] as { count: string } | undefined)?.count ?? 0),
    actions_overdue: Number((actionsOverdueRow[0] as { count: string } | undefined)?.count ?? 0),
    changes_reassess_pending: Number(
      (changesReassessPendingRow[0] as { count: string } | undefined)?.count ?? 0,
    ),
    implementation_rate: rate.rate,
    rate_label: rate.label,
    next_due: nextDue ? nextDue.toISOString() : null,
    recent_changes: recentChanges,
    computed_at: new Date().toISOString(),
  });
};

// ── 기준선 ───────────────────────────────────────────────────────

export const listBaselines = async (
  trx: Knex.Transaction,
  tenantId: string,
  scope: ScopeIdentity,
  filters: { status?: string; project_id?: string },
) => {
  await setTenantContext(trx, tenantId);
  if (filters.status && !BASELINE_STATUSES.includes(filters.status as BaselineStatus)) {
    return fail(422, 'invalid_status', '기준선 상태 값이 올바르지 않습니다.');
  }
  if (filters.project_id && !UUID_PATTERN.test(filters.project_id)) {
    return fail(422, 'invalid_project_id', 'project_id 형식이 올바르지 않습니다.');
  }
  let qb = trx('portal.fc_krmf_baseline as b')
    .leftJoin('portal.fc_projects as p', join =>
      join.on('p.id', 'b.project_id').andOn('p.tenant_id', 'b.tenant_id'),
    )
    .orderBy('b.name', 'asc')
    .orderBy('b.version', 'asc');
  if (!scope.canViewAll) {
    qb = qb.where(qb2 =>
      qb2.whereNull('b.project_id').orWhereIn('b.project_id', projectIdList(scope)),
    );
  }
  if (filters.status) qb = qb.where('b.status', filters.status);
  if (filters.project_id) qb = qb.where('b.project_id', filters.project_id);
  return ok(await qb.select('b.*', 'p.name as project_name'));
};

const getBaselineRow = async (
  trx: Knex.Transaction,
  tenantId: string,
  id: string,
) => {
  await setTenantContext(trx, tenantId);
  if (!UUID_PATTERN.test(id)) return { error: 'invalid_id' as const };
  const row = await trx('portal.fc_krmf_baseline').where({ id }).first();
  if (!row) return { error: 'not_found' as const };
  return { row };
};

export const createBaseline = async (
  trx: Knex.Transaction,
  tenantId: string,
  principal: PortalPrincipal,
  actorId: string,
  input: {
    name: string;
    version: string;
    description?: string;
    status?: string;
    project_id?: string;
  },
) => {
  await setTenantContext(trx, tenantId);
  if (!validText(input.name, 200)) {
    return fail(422, 'invalid_name', '기준선 이름을 확인하세요.');
  }
  if (!validText(input.version, 50)) {
    return fail(422, 'invalid_version', '기준선 버전을 확인하세요.');
  }
  const status = (input.status ?? 'draft') as BaselineStatus;
  if (!BASELINE_STATUSES.includes(status)) {
    return fail(422, 'invalid_status', '기준선 상태 값이 올바르지 않습니다.');
  }
  if (input.project_id) {
    if (!UUID_PATTERN.test(input.project_id)) {
      return fail(422, 'invalid_project_id', 'project_id 형식이 올바르지 않습니다.');
    }
    const project = await trx('portal.fc_projects')
      .where({ id: input.project_id })
      .first('id');
    if (!project) {
      return fail(422, 'project_not_found', '지정한 프로젝트가 존재하지 않습니다.');
    }
  }
  const id = randomUUID();
  try {
    await trx('portal.fc_krmf_baseline').insert({
      id,
      tenant_id: tenantId,
      name: input.name.trim(),
      version: input.version.trim(),
      description: input.description?.trim() ? input.description.trim() : null,
      status,
      project_id: input.project_id ?? null,
      created_by: actorId,
      updated_by: actorId,
    });
  } catch (e) {
    if ((e as { code?: string }).code === '23505') {
      return fail(
        409,
        'baseline_duplicate',
        '동일 프로젝트에 이름과 버전이 같은 기준선이 이미 존재합니다.',
      );
    }
    throw e;
  }
  await recordAuditEvent(trx, principal, {
    tenantId,
    actorId,
    action: 'krmf.baseline.create',
    resourceType: 'krmf_baseline',
    resourceId: id,
    result: 'success',
    changedFields: ['name', 'version', 'status', 'project_id'],
  });
  const row = await trx('portal.fc_krmf_baseline').where({ id }).first();
  return ok(row);
};

export const updateBaseline = async (
  trx: Knex.Transaction,
  tenantId: string,
  principal: PortalPrincipal,
  actorId: string,
  id: string,
  patch: {
    name?: string;
    description?: string;
    status?: string;
    expected_updated_at?: string;
  },
) => {
  const found = await getBaselineRow(trx, tenantId, id);
  if ('error' in found) {
    return found.error === 'invalid_id'
      ? fail(422, 'invalid_id', '기준선 ID 형식이 올바르지 않습니다.')
      : fail(404, 'not_found', '기준선을 찾을 수 없습니다.');
  }
  const current = found.row;
  if (
    patch.expected_updated_at !== undefined &&
    !sameInstant(patch.expected_updated_at, current.updated_at as Date)
  ) {
    return fail(
      409,
      'version_conflict',
      '다른 관리자가 기준선을 변경했습니다. 새로 불러온 후 다시 저장하세요.',
    );
  }
  if (patch.status !== undefined) {
    const message = transitionError(
      '기준선',
      BASELINE_TRANSITIONS,
      current.status as string,
      patch.status,
    );
    if (message) return fail(400, 'invalid_status_transition', message);
  }
  if (patch.name !== undefined && !validText(patch.name, 200)) {
    return fail(422, 'invalid_name', '기준선 이름을 확인하세요.');
  }
  const changedFields: string[] = [];
  const update: Record<string, unknown> = {
    updated_by: actorId,
    updated_at: trx.fn.now(),
  };
  if (patch.name !== undefined && patch.name !== current.name) {
    update.name = patch.name.trim();
    changedFields.push('name');
  }
  if (patch.description !== undefined) {
    update.description = patch.description.trim() ? patch.description.trim() : null;
    changedFields.push('description');
  }
  if (patch.status !== undefined && patch.status !== current.status) {
    update.status = patch.status;
    changedFields.push('status');
  }
  if (changedFields.length > 0) {
    try {
      await trx('portal.fc_krmf_baseline').where({ id }).update(update);
    } catch (e) {
      if ((e as { code?: string }).code === '23505') {
        return fail(
          409,
          'baseline_duplicate',
          '이름과 버전이 같은 기준선이 이미 존재합니다.',
        );
      }
      throw e;
    }
    await recordAuditEvent(trx, principal, {
      tenantId,
      actorId,
      action: 'krmf.baseline.update',
      resourceType: 'krmf_baseline',
      resourceId: id,
      result: 'success',
      changedFields,
    });
  }
  const row = await trx('portal.fc_krmf_baseline').where({ id }).first();
  return ok(row);
};

export const exportBaselineCsv = async (
  trx: Knex.Transaction,
  tenantId: string,
  principal: PortalPrincipal,
  actorId: string,
  scope: ScopeIdentity,
  id: string,
): Promise<KrmfResult<{ csv: string }>> => {
  const found = await getBaselineRow(trx, tenantId, id);
  if ('error' in found) {
    return found.error === 'invalid_id'
      ? fail(422, 'invalid_id', '기준선 ID 형식이 올바르지 않습니다.')
      : fail(404, 'not_found', '기준선을 찾을 수 없습니다.');
  }
  const baseline = found.row;
  if (
    !scope.canViewAll &&
    baseline.project_id !== null &&
    !scope.memberProjectIds.has(baseline.project_id as string)
  ) {
    return fail(403, 'permission_denied', '이 기준선을 조회할 권한이 없습니다.');
  }
  const controls = await trx('portal.fc_krmf_control')
    .where({ baseline_id: id })
    .orderBy('sort_order', 'asc')
    .orderBy('control_code', 'asc')
    .select('*');
  const csv = toCsv(
    [
      '통제코드',
      '제목',
      '설명',
      '적용여부',
      '제외·대체 사유',
      '상태',
      '담당자',
      '기한',
      '정렬',
    ],
    controls.map(row => [
      row.control_code as string,
      row.title as string,
      (row.description as string | null) ?? null,
      row.applicability as string,
      (row.alternative_reason as string | null) ?? null,
      row.status as string,
      (row.owner_id as string | null) ?? null,
      row.due_date ? (row.due_date as Date).toISOString() : null,
      row.sort_order as number,
    ]),
  );
  await recordAuditEvent(trx, principal, {
    tenantId,
    actorId,
    action: 'krmf.baseline.export',
    resourceType: 'krmf_baseline',
    resourceId: id,
    result: 'success',
  });
  return ok({ csv });
};

// ── 통제 ─────────────────────────────────────────────────────────

export const listControls = async (
  trx: Knex.Transaction,
  tenantId: string,
  scope: ScopeIdentity,
  baselineId: string,
  filters: { applicability?: string; status?: string },
) => {
  await setTenantContext(trx, tenantId);
  if (!UUID_PATTERN.test(baselineId)) {
    return fail(422, 'invalid_id', '기준선 ID 형식이 올바르지 않습니다.');
  }
  const baseline = await trx('portal.fc_krmf_baseline')
    .where({ id: baselineId })
    .first();
  if (!baseline) return fail(404, 'not_found', '기준선을 찾을 수 없습니다.');
  let qb = scopedControlQuery(trx, scope).where('c.baseline_id', baselineId);
  if (filters.applicability) {
    if (!APPLICABILITIES.includes(filters.applicability as Applicability)) {
      return fail(422, 'invalid_applicability', '적용여부 값이 올바르지 않습니다.');
    }
    qb = qb.where('c.applicability', filters.applicability);
  }
  if (filters.status) {
    if (!(filters.status in CONTROL_TRANSITIONS)) {
      return fail(422, 'invalid_status', '통제 상태 값이 올바르지 않습니다.');
    }
    qb = qb.where('c.status', filters.status);
  }
  const rows = await qb
    .orderBy('c.sort_order', 'asc')
    .orderBy('c.control_code', 'asc')
    .select('c.*');
  return ok(rows);
};

export const createControl = async (
  trx: Knex.Transaction,
  tenantId: string,
  principal: PortalPrincipal,
  actorId: string,
  baselineId: string,
  input: {
    control_code: string;
    title: string;
    description?: string;
    applicability?: string;
    alternative_reason?: string;
    owner_id?: string;
    due_date?: string;
    sort_order?: number;
  },
) => {
  await setTenantContext(trx, tenantId);
  if (!UUID_PATTERN.test(baselineId)) {
    return fail(422, 'invalid_id', '기준선 ID 형식이 올바르지 않습니다.');
  }
  const baseline = await trx('portal.fc_krmf_baseline')
    .where({ id: baselineId })
    .first();
  if (!baseline) return fail(404, 'not_found', '기준선을 찾을 수 없습니다.');
  if (!validText(input.control_code, 100)) {
    return fail(422, 'invalid_control_code', '통제 코드를 확인하세요.');
  }
  if (!validText(input.title, 300)) {
    return fail(422, 'invalid_title', '통제 제목을 확인하세요.');
  }
  const applicability = (input.applicability ?? 'applied') as Applicability;
  if (!APPLICABILITIES.includes(applicability)) {
    return fail(422, 'invalid_applicability', '적용여부 값이 올바르지 않습니다.');
  }
  const alternativeReason =
    applicability === 'applied' ? null : input.alternative_reason;
  if (applicability !== 'applied' && !validText(alternativeReason, 1000)) {
    return fail(
      422,
      'alternative_reason_required',
      '제외 또는 대체 통제는 사유를 입력해야 합니다.',
    );
  }
  const alternativeReasonTrimmed =
    applicability === 'applied' || !alternativeReason
      ? null
      : alternativeReason.trim();
  const dueDate = dueDateFrom(input.due_date);
  if (dueDate === 'invalid') {
    return fail(422, 'invalid_due_date', '기한 형식이 올바르지 않습니다.');
  }
  if (input.owner_id !== undefined && !UUID_PATTERN.test(input.owner_id)) {
    return fail(422, 'invalid_owner', '담당자 ID 형식이 올바르지 않습니다.');
  }
  const sortOrder = Number.isSafeInteger(input.sort_order) ? input.sort_order : 0;
  const id = randomUUID();
  try {
    await trx('portal.fc_krmf_control').insert({
      id,
      tenant_id: tenantId,
      baseline_id: baselineId,
      control_code: input.control_code.trim(),
      title: input.title.trim(),
      description: input.description?.trim() ? input.description.trim() : null,
      applicability,
      alternative_reason: alternativeReasonTrimmed,
      owner_id: input.owner_id ?? null,
      due_date: dueDate,
      sort_order: sortOrder,
      created_by: actorId,
      updated_by: actorId,
    });
  } catch (e) {
    if ((e as { code?: string }).code === '23505') {
      return fail(409, 'control_duplicate', '같은 기준선에 통제 코드가 중복됩니다.');
    }
    throw e;
  }
  await recordAuditEvent(trx, principal, {
    tenantId,
    actorId,
    action: 'krmf.control.create',
    resourceType: 'krmf_control',
    resourceId: id,
    result: 'success',
    changedFields: ['control_code', 'title', 'applicability'],
  });
  const row = await trx('portal.fc_krmf_control').where({ id }).first();
  return ok(row);
};

const getControlWithBaseline = async (
  trx: Knex.Transaction,
  tenantId: string,
  id: string,
) => {
  await setTenantContext(trx, tenantId);
  if (!UUID_PATTERN.test(id)) return { error: 'invalid_id' as const };
  const row = await trx('portal.fc_krmf_control as c')
    .join('portal.fc_krmf_baseline as b', 'b.id', 'c.baseline_id')
    .where('c.id', id)
    .select(
      'c.*',
      'b.project_id as baseline_project_id',
      'b.status as baseline_status',
      'b.name as baseline_name',
    )
    .first();
  if (!row) return { error: 'not_found' as const };
  return { row };
};

export const getControlDetail = async (
  trx: Knex.Transaction,
  tenantId: string,
  scope: ScopeIdentity,
  id: string,
) => {
  const found = await getControlWithBaseline(trx, tenantId, id);
  if ('error' in found) {
    return found.error === 'invalid_id'
      ? fail(422, 'invalid_id', '통제 ID 형식이 올바르지 않습니다.')
      : fail(404, 'not_found', '통제를 찾을 수 없습니다.');
  }
  const control = found.row;
  if (
    !controlVisibleToMember(
      control.owner_id as string | null,
      control.baseline_project_id as string | null,
      scope,
    )
  ) {
    return fail(403, 'permission_denied', '이 통제를 조회할 권한이 없습니다.');
  }
  const evidences = await trx('portal.fc_krmf_evidence')
    .where({ control_id: id })
    .orderBy('version', 'desc')
    .select('*');
  const actions = await trx('portal.fc_krmf_action')
    .where({ control_id: id })
    .orderBy('created_at', 'desc')
    .select('*');
  const links = await trx('portal.fc_krmf_control_link')
    .where({ control_id: id })
    .orderBy('link_type', 'asc')
    .orderBy('ref_id', 'asc')
    .select('*');
  const changes = await trx('portal.fc_krmf_change')
    .whereRaw('affected_control_ids @> ?', [JSON.stringify([id])])
    .orderBy('updated_at', 'desc')
    .select('*');
  return ok({ control, evidences, actions, links, changes });
};

export const updateControl = async (
  trx: Knex.Transaction,
  tenantId: string,
  principal: PortalPrincipal,
  actorId: string,
  id: string,
  patch: {
    title?: string;
    description?: string;
    owner_id?: string | null;
    due_date?: string | null;
    status?: string;
    applicability?: string;
    alternative_reason?: string | null;
    sort_order?: number;
  },
  permissions: { canManage: boolean },
) => {
  const found = await getControlWithBaseline(trx, tenantId, id);
  if ('error' in found) {
    return found.error === 'invalid_id'
      ? fail(422, 'invalid_id', '통제 ID 형식이 올바르지 않습니다.')
      : fail(404, 'not_found', '통제를 찾을 수 없습니다.');
  }
  const current = found.row;
  const isOwner = current.owner_id === actorId;
  if (!permissions.canManage && !isOwner) {
    return fail(403, 'permission_denied', '이 통제를 수정할 권한이 없습니다.');
  }
  if (patch.status !== undefined) {
    const message = transitionError(
      '통제',
      CONTROL_TRANSITIONS,
      current.status as string,
      patch.status,
    );
    if (message) return fail(400, 'invalid_status_transition', message);
  }
  if (patch.applicability !== undefined) {
    if (!APPLICABILITIES.includes(patch.applicability as Applicability)) {
      return fail(422, 'invalid_applicability', '적용여부 값이 올바르지 않습니다.');
    }
    const message = applicabilityChangeError(
      current.applicability as Applicability,
      patch.applicability as Applicability,
      patch.alternative_reason,
    );
    if (message) return fail(422, 'alternative_reason_required', message);
  }
  if (!permissions.canManage) {
    const restricted = [
      patch.title,
      patch.description,
      patch.owner_id,
      patch.applicability,
      patch.alternative_reason,
      patch.sort_order,
    ];
    if (restricted.some(value => value !== undefined)) {
      return fail(
        403,
        'permission_denied',
        '통제 정의 변경은 관리 권한이 필요합니다.',
      );
    }
  }
  const update: Record<string, unknown> = {
    updated_by: actorId,
    updated_at: trx.fn.now(),
  };
  const changedFields: string[] = [];
  if (patch.title !== undefined && patch.title !== current.title) {
    update.title = patch.title;
    changedFields.push('title');
  }
  if (patch.description !== undefined) {
    update.description = patch.description.trim() ? patch.description.trim() : null;
    changedFields.push('description');
  }
  if (patch.owner_id !== undefined) {
    if (patch.owner_id !== null && !UUID_PATTERN.test(patch.owner_id)) {
      return fail(422, 'invalid_owner', '담당자 ID 형식이 올바르지 않습니다.');
    }
    update.owner_id = patch.owner_id;
    changedFields.push('owner_id');
  }
  if (patch.due_date !== undefined) {
    const dueDate = patch.due_date === null ? null : dueDateFrom(patch.due_date);
    if (dueDate === 'invalid') {
      return fail(422, 'invalid_due_date', '기한 형식이 올바르지 않습니다.');
    }
    update.due_date = dueDate;
    changedFields.push('due_date');
  }
  if (patch.status !== undefined && patch.status !== current.status) {
    update.status = patch.status;
    changedFields.push('status');
  }
  if (
    patch.applicability !== undefined &&
    patch.applicability !== current.applicability
  ) {
    const reason =
      patch.applicability === 'applied'
        ? null
        : (patch.alternative_reason ?? (current.alternative_reason as string | null));
    update.applicability = patch.applicability;
    update.alternative_reason = reason ? reason.trim() : null;
    changedFields.push('applicability', 'alternative_reason');
  }
  if (patch.sort_order !== undefined && Number.isSafeInteger(patch.sort_order)) {
    update.sort_order = patch.sort_order;
    changedFields.push('sort_order');
  }
  if (changedFields.length > 0) {
    await trx('portal.fc_krmf_control').where({ id }).update(update);
    await recordAuditEvent(trx, principal, {
      tenantId,
      actorId,
      action: 'krmf.control.update',
      resourceType: 'krmf_control',
      resourceId: id,
      result: 'success',
      changedFields,
    });
  }
  const row = await trx('portal.fc_krmf_control').where({ id }).first();
  return ok(row);
};

// ── 추적 연결 ────────────────────────────────────────────────────

export const getTraceability = async (
  trx: Knex.Transaction,
  tenantId: string,
  scope: ScopeIdentity,
  baselineId: string,
): Promise<KrmfResult<Record<string, unknown>>> => {
  await setTenantContext(trx, tenantId);
  if (!UUID_PATTERN.test(baselineId)) {
    return fail(422, 'invalid_id', '기준선 ID 형식이 올바르지 않습니다.');
  }
  const baseline = await trx('portal.fc_krmf_baseline')
    .where({ id: baselineId })
    .first();
  if (!baseline) return fail(404, 'not_found', '기준선을 찾을 수 없습니다.');
  const controls = await scopedControlQuery(trx, scope)
    .where('c.baseline_id', baselineId)
    .orderBy('c.sort_order', 'asc')
    .orderBy('c.control_code', 'asc')
    .select('c.id', 'c.control_code', 'c.title', 'c.status');
  const controlIds = controls.map(row => row.id as string);
  const links = controlIds.length
    ? await trx('portal.fc_krmf_control_link')
        .whereIn('control_id', controlIds)
        .select('*')
    : [];
  const byControl = new Map<string, Array<Record<string, unknown>>>();
  for (const link of links) {
    const list = byControl.get(link.control_id as string) ?? [];
    list.push(link);
    byControl.set(link.control_id as string, list);
  }
  const items = controls.map(control => {
    const controlLinks = byControl.get(control.id as string) ?? [];
    const grouped: Record<string, unknown[]> = {
      requirement: [],
      implementation: [],
      test: [],
      defect: [],
    };
    for (const link of controlLinks) {
      const bucket = grouped[link.link_type as string];
      if (bucket) bucket.push(link);
    }
    return {
      control_id: control.id,
      control_code: control.control_code,
      title: control.title,
      status: control.status,
      links: grouped,
      unresolved_count: controlLinks.filter(link => link.status === 'unresolved')
        .length,
    };
  });
  return ok({
    baseline_id: baselineId,
    controls: items,
    unlinked_control_ids: items
      .filter(item =>
        Object.values(item.links as Record<string, unknown[]>).every(
          list => list.length === 0,
        ),
      )
      .map(item => item.control_id),
  });
};

export const exportTraceabilityCsv = async (
  trx: Knex.Transaction,
  tenantId: string,
  principal: PortalPrincipal,
  actorId: string,
  scope: ScopeIdentity,
  baselineId: string,
): Promise<KrmfResult<{ csv: string }>> => {
  const result = await getTraceability(trx, tenantId, scope, baselineId);
  if (!result.ok) return result;
  const data = result.value;
  const rows = (data.controls as Array<Record<string, unknown>>).map(control => {
    const links = control.links as Record<string, unknown[]>;
    const unresolved = control.unresolved_count as number;
    return [
      control.control_code as string,
      control.title as string,
      links.requirement.length,
      links.implementation.length,
      links.test.length,
      links.defect.length,
      unresolved > 0 ? 'Y' : 'N',
      unresolved > 0 ? '미해결' : '연결됨',
    ];
  });
  const csv = toCsv(
    [
      '통제코드',
      '통제제목',
      '요구링크수',
      '구현링크수',
      '시험링크수',
      '결함링크수',
      '미해결여부',
      '연결상태',
    ],
    rows,
  );
  await recordAuditEvent(trx, principal, {
    tenantId,
    actorId,
    action: 'krmf.traceability.export',
    resourceType: 'krmf_baseline',
    resourceId: baselineId,
    result: 'success',
  });
  return ok({ csv });
};

// ── 증적 ─────────────────────────────────────────────────────────

export const listEvidences = async (
  trx: Knex.Transaction,
  tenantId: string,
  scope: ScopeIdentity,
  filters: { control_id?: string; review_status?: string; latest_only?: boolean },
) => {
  await setTenantContext(trx, tenantId);
  if (filters.control_id && !UUID_PATTERN.test(filters.control_id)) {
    return fail(422, 'invalid_control_id', 'control_id 형식이 올바르지 않습니다.');
  }
  if (filters.review_status && !REVIEW_STATUSES.includes(filters.review_status as never)) {
    return fail(422, 'invalid_review_status', '검토 상태 값이 올바르지 않습니다.');
  }
  let qb = trx('portal.fc_krmf_evidence as e')
    .join('portal.fc_krmf_control as c', 'c.id', 'e.control_id')
    .join('portal.fc_krmf_baseline as b', 'b.id', 'c.baseline_id');
  if (!scope.canViewAll) {
    qb = qb.where(sub =>
      sub
        .where('c.owner_id', scope.userId)
        .orWhereIn('b.project_id', projectIdList(scope)),
    );
  }
  if (filters.control_id) qb = qb.where('e.control_id', filters.control_id);
  if (filters.review_status) qb = qb.where('e.review_status', filters.review_status);
  if (filters.latest_only) {
    qb = qb.whereRaw(
      `e.version = (SELECT MAX(e2.version) FROM portal.fc_krmf_evidence e2 WHERE e2.control_id = e.control_id)`,
    );
  }
  const rows = await qb
    .orderBy('e.submitted_at', 'desc')
    .orderBy('e.id', 'desc')
    .select('e.*');
  return ok(rows);
};

export interface EvidenceFileMeta {
  stored_name: string;
  original_name: string;
  mime: string;
  size_bytes: number;
  sha256: string;
}

export const submitEvidence = async (
  trx: Knex.Transaction,
  tenantId: string,
  principal: PortalPrincipal,
  actorId: string,
  scope: ScopeIdentity,
  input: {
    control_id: string;
    title: string;
    kind: EvidenceKind;
    reference_uri?: string;
    scope_text?: string;
    idempotency_key?: string;
  },
  fileMeta?: EvidenceFileMeta,
) => {
  await setTenantContext(trx, tenantId);
  if (!UUID_PATTERN.test(input.control_id)) {
    return fail(422, 'invalid_control_id', 'control_id 형식이 올바르지 않습니다.');
  }
  if (!validText(input.title, 300)) {
    return fail(422, 'invalid_title', '증적 제목을 확인하세요.');
  }
  if (!EVIDENCE_KINDS.includes(input.kind)) {
    return fail(422, 'invalid_kind', '증적 종류는 file 또는 reference여야 합니다.');
  }
  const controlFound = await getControlWithBaseline(trx, tenantId, input.control_id);
  if ('error' in controlFound) {
    return controlFound.error === 'invalid_id'
      ? fail(422, 'invalid_control_id', 'control_id 형식이 올바르지 않습니다.')
      : fail(404, 'not_found', '통제를 찾을 수 없습니다.');
  }
  const control = controlFound.row;
  const isOwner = control.owner_id === actorId;
  const projectId = control.baseline_project_id as string | null;
  if (!isOwner && (projectId === null || !scope.memberProjectIds.has(projectId))) {
    await recordAuditEvent(trx, principal, {
      tenantId,
      actorId,
      action: 'krmf.evidence.submit',
      resourceType: 'krmf_control',
      resourceId: input.control_id,
      result: 'denied',
      reasonCode: 'outside_project_scope',
    });
    return fail(
      403,
      'outside_project_scope',
      '증적은 본인이 담당하거나 소속 프로젝트 범위의 통제에만 제출할 수 있습니다.',
    );
  }
  if (input.kind === 'file' && !fileMeta) {
    return fail(422, 'file_required', '파일 증적은 업로드 파일이 필요합니다.');
  }
  let referenceUriTrimmed: string | null = null;
  if (input.kind === 'reference') {
    if (!validText(input.reference_uri, 1000)) {
      return fail(422, 'reference_required', '참조 증적은 참조 주소가 필요합니다.');
    }
    referenceUriTrimmed = input.reference_uri.trim();
  }
  const result = await idempotent(
    trx,
    tenantId,
    actorId,
    'krmf.evidence.submit',
    input.idempotency_key,
    input,
    async () => {
      let duplicate: { id: string } | undefined;
      if (input.kind === 'file' && fileMeta) {
        duplicate = await trx('portal.fc_krmf_evidence as e')
          .join('portal.fc_krmf_file as f', 'f.evidence_id', 'e.id')
          .where('e.control_id', input.control_id)
          .where('f.sha256', fileMeta.sha256)
          .first('e.id');
      } else if (input.kind === 'reference') {
        duplicate = await trx('portal.fc_krmf_evidence')
          .where({
            control_id: input.control_id,
            reference_uri: referenceUriTrimmed,
          })
          .first('id');
      }
      if (duplicate) {
        return null;
      }
      const versionRow = await trx('portal.fc_krmf_evidence')
        .where({ control_id: input.control_id })
        .max('version as max_version')
        .first();
      const version = Number(versionRow?.max_version ?? 0) + 1;
      const evidenceId = randomUUID();
      await trx('portal.fc_krmf_evidence').insert({
        id: evidenceId,
        tenant_id: tenantId,
        control_id: input.control_id,
        title: input.title.trim(),
        kind: input.kind,
        file_id: fileMeta ? evidenceId : null,
        reference_uri: referenceUriTrimmed,
        scope: input.scope_text?.trim()
          ? input.scope_text.trim().slice(0, 100)
          : 'project',
        version,
        submitted_by: actorId,
        review_status: 'pending',
      });
      if (fileMeta) {
        await trx('portal.fc_krmf_file').insert({
          id: evidenceId,
          tenant_id: tenantId,
          evidence_id: evidenceId,
          stored_name: fileMeta.stored_name,
          original_name: fileMeta.original_name,
          mime: fileMeta.mime,
          size_bytes: fileMeta.size_bytes,
          sha256: fileMeta.sha256,
          created_by: actorId,
        });
      }
      await recordAuditEvent(trx, principal, {
        tenantId,
        actorId,
        action: 'krmf.evidence.submit',
        resourceType: 'krmf_evidence',
        resourceId: evidenceId,
        result: 'success',
        changedFields: ['version', 'review_status'],
      });
      return { id: evidenceId, version };
    },
  );
  if (!result.ok) return result;
  if (result.value.value === null) {
    return fail(
      409,
      'duplicate_evidence',
      '동일 통제에 같은 내용의 증적이 이미 등록되어 있습니다.',
    );
  }
  const row = await trx('portal.fc_krmf_evidence')
    .where({ id: result.value.value.id })
    .first();
  return ok({ ...row, replayed: result.value.replayed });
};

export const reviewEvidence = async (
  trx: Knex.Transaction,
  tenantId: string,
  principal: PortalPrincipal,
  actorId: string,
  evidenceId: string,
  input: {
    decision: 'approved' | 'rejected';
    comment?: string;
    expected_version?: number;
    idempotency_key?: string;
  },
) => {
  await setTenantContext(trx, tenantId);
  if (!UUID_PATTERN.test(evidenceId)) {
    return fail(422, 'invalid_id', '증적 ID 형식이 올바르지 않습니다.');
  }
  if (input.decision !== 'approved' && input.decision !== 'rejected') {
    return fail(422, 'invalid_decision', 'decision은 approved 또는 rejected여야 합니다.');
  }
  if (input.decision === 'rejected' && !validText(input.comment, 1000)) {
    return fail(422, 'comment_required', '반려할 때는 사유를 입력해야 합니다.');
  }
  const current = await trx('portal.fc_krmf_evidence')
    .where({ id: evidenceId })
    .first();
  if (!current) return fail(404, 'not_found', '증적을 찾을 수 없습니다.');
  if (current.review_status !== 'pending') {
    const sameReview =
      input.expected_version !== undefined &&
      input.expected_version === current.version &&
      current.review_status === input.decision;
    if (!sameReview) {
      return fail(
        409,
        'already_reviewed',
        '이미 검토 처리된 증적입니다. 최신 버전을 확인하세요.',
      );
    }
  }
  const result = await idempotent(
    trx,
    tenantId,
    actorId,
    'krmf.evidence.review',
    input.idempotency_key,
    input,
    async () => {
      await trx('portal.fc_krmf_evidence')
        .where({ id: evidenceId })
        .update({
          review_status: input.decision,
          reviewed_by: actorId,
          reviewed_at: trx.fn.now(),
          review_comment: input.comment?.trim() ? input.comment.trim() : null,
        });
      await recordAuditEvent(trx, principal, {
        tenantId,
        actorId,
        action: `krmf.evidence.${input.decision}`,
        resourceType: 'krmf_evidence',
        resourceId: evidenceId,
        resourceVersion: String(current.version as number),
        result: 'success',
        changedFields: [
          'review_status',
          'reviewed_by',
          'reviewed_at',
          'review_comment',
        ],
      });
      return { id: evidenceId, review_status: input.decision };
    },
  );
  if (!result.ok) return result;
  const row = await trx('portal.fc_krmf_evidence').where({ id: evidenceId }).first();
  return ok({ ...row, replayed: result.value.replayed });
};

export const getEvidenceFile = async (
  trx: Knex.Transaction,
  tenantId: string,
  scope: ScopeIdentity,
  evidenceId: string,
): Promise<
  KrmfResult<{
    evidence: Record<string, unknown>;
    file: Record<string, unknown>;
  }>
> => {
  await setTenantContext(trx, tenantId);
  if (!UUID_PATTERN.test(evidenceId)) {
    return fail(422, 'invalid_id', '증적 ID 형식이 올바르지 않습니다.');
  }
  const evidence = await trx('portal.fc_krmf_evidence as e')
    .join('portal.fc_krmf_control as c', 'c.id', 'e.control_id')
    .join('portal.fc_krmf_baseline as b', 'b.id', 'c.baseline_id')
    .where('e.id', evidenceId)
    .select(
      'e.*',
      'c.owner_id as control_owner_id',
      'b.project_id as baseline_project_id',
    )
    .first();
  if (!evidence) return fail(404, 'not_found', '증적을 찾을 수 없습니다.');
  if (
    !controlVisibleToMember(
      evidence.control_owner_id as string | null,
      evidence.baseline_project_id as string | null,
      scope,
    )
  ) {
    return fail(403, 'permission_denied', '이 증적을 다운로드할 권한이 없습니다.');
  }
  if (evidence.kind !== 'file' || !evidence.file_id) {
    return fail(422, 'no_file', '파일 형태의 증적이 아닙니다.');
  }
  const file = await trx('portal.fc_krmf_file')
    .where({ evidence_id: evidenceId })
    .first();
  if (!file) return fail(404, 'file_not_found', '증적 파일을 찾을 수 없습니다.');
  return ok({ evidence, file });
};

// ── 미흡·보완 조치 ───────────────────────────────────────────────

export const listActions = async (
  trx: Knex.Transaction,
  tenantId: string,
  scope: ScopeIdentity,
  filters: { status?: string; overdue?: boolean },
) => {
  await setTenantContext(trx, tenantId);
  if (filters.status && !ACTION_STATUSES.includes(filters.status as never)) {
    return fail(422, 'invalid_status', '조치 상태 값이 올바르지 않습니다.');
  }
  let qb = trx('portal.fc_krmf_action as a')
    .join('portal.fc_krmf_control as c', 'c.id', 'a.control_id')
    .join('portal.fc_krmf_baseline as b', 'b.id', 'c.baseline_id');
  if (!scope.canViewAll) {
    qb = qb.where(sub =>
      sub
        .where('c.owner_id', scope.userId)
        .orWhere('a.owner_id', scope.userId)
        .orWhereIn('b.project_id', projectIdList(scope)),
    );
  }
  if (filters.status) qb = qb.where('a.status', filters.status);
  if (filters.overdue) qb = qb.where('a.due_date', '<', trx.fn.now());
  const rows = await qb
    .orderBy('a.due_date', 'asc')
    .orderBy('a.created_at', 'desc')
    .select('a.*');
  return ok(rows);
};

export const createAction = async (
  trx: Knex.Transaction,
  tenantId: string,
  principal: PortalPrincipal,
  actorId: string,
  scope: ScopeIdentity,
  input: {
    control_id: string;
    title: string;
    cause: string;
    impact?: string;
    owner_id?: string;
    due_date?: string;
    idempotency_key?: string;
  },
) => {
  await setTenantContext(trx, tenantId);
  if (!UUID_PATTERN.test(input.control_id)) {
    return fail(422, 'invalid_control_id', 'control_id 형식이 올바르지 않습니다.');
  }
  if (!validText(input.title, 300)) {
    return fail(422, 'invalid_title', '조치 제목을 확인하세요.');
  }
  if (!validText(input.cause, 1000)) {
    return fail(422, 'invalid_cause', '미흡 원인을 입력해야 합니다.');
  }
  const impact = input.impact ?? 'medium';
  if (!IMPACTS.includes(impact as never)) {
    return fail(422, 'invalid_impact', '영향도 값이 올바르지 않습니다.');
  }
  const controlFound = await getControlWithBaseline(trx, tenantId, input.control_id);
  if ('error' in controlFound) {
    return fail(404, 'not_found', '통제를 찾을 수 없습니다.');
  }
  const control = controlFound.row;
  if (
    !controlVisibleToMember(
      control.owner_id as string | null,
      control.baseline_project_id as string | null,
      scope,
    )
  ) {
    return fail(403, 'permission_denied', '이 통제에 조치를 등록할 권한이 없습니다.');
  }
  const ownerId = input.owner_id ?? (control.owner_id as string | null);
  if (!ownerId) {
    return fail(
      422,
      'owner_required',
      '통제에 담당자가 없으면 조치 담당자를 지정해야 합니다.',
    );
  }
  const dueDate = dueDateFrom(input.due_date);
  if (dueDate === 'invalid') {
    return fail(422, 'invalid_due_date', '기한 형식이 올바르지 않습니다.');
  }
  const result = await idempotent(
    trx,
    tenantId,
    actorId,
    'krmf.action.create',
    input.idempotency_key,
    input,
    async () => {
      const id = randomUUID();
      await trx('portal.fc_krmf_action').insert({
        id,
        tenant_id: tenantId,
        control_id: input.control_id,
        title: input.title.trim(),
        cause: input.cause.trim(),
        impact,
        owner_id: ownerId,
        due_date: dueDate,
        status: 'open',
        created_by: actorId,
        updated_by: actorId,
      });
      await recordAuditEvent(trx, principal, {
        tenantId,
        actorId,
        action: 'krmf.action.create',
        resourceType: 'krmf_action',
        resourceId: id,
        result: 'success',
        changedFields: ['status', 'impact', 'owner_id', 'due_date'],
      });
      return { id };
    },
  );
  if (!result.ok) return result;
  const row = await trx('portal.fc_krmf_action')
    .where({ id: result.value.value.id })
    .first();
  return ok({ ...row, replayed: result.value.replayed });
};

export const transitionAction = async (
  trx: Knex.Transaction,
  tenantId: string,
  principal: PortalPrincipal,
  actorId: string,
  actionId: string,
  input: {
    status: string;
    resolution?: string;
    idempotency_key?: string;
  },
  permissions: { canReview: boolean; canManage: boolean },
) => {
  await setTenantContext(trx, tenantId);
  if (!UUID_PATTERN.test(actionId)) {
    return fail(422, 'invalid_id', '조치 ID 형식이 올바르지 않습니다.');
  }
  const current = await trx('portal.fc_krmf_action')
    .where({ id: actionId })
    .first();
  if (!current) return fail(404, 'not_found', '조치를 찾을 수 없습니다.');
  const message = transitionError(
    '조치',
    ACTION_TRANSITIONS,
    current.status as string,
    input.status,
  );
  if (message) return fail(400, 'invalid_status_transition', message);
  if (input.status === 'reconfirmed' && !permissions.canReview) {
    return fail(403, 'permission_denied', '재확인은 검토 권한이 필요합니다.');
  }
  if (
    input.status !== 'reconfirmed' &&
    !permissions.canReview &&
    !permissions.canManage &&
    current.owner_id !== actorId
  ) {
    return fail(403, 'permission_denied', '이 조치를 처리할 권한이 없습니다.');
  }
  if (input.status === 'resolved' && !validText(input.resolution, 2000)) {
    return fail(
      422,
      'resolution_required',
      '조치 완료 시 해결 내용을 입력해야 합니다.',
    );
  }
  const result = await idempotent(
    trx,
    tenantId,
    actorId,
    'krmf.action.transition',
    input.idempotency_key,
    input,
    async () => {
      const update: Record<string, unknown> = {
        status: input.status,
        updated_by: actorId,
        updated_at: trx.fn.now(),
      };
      const changedFields = ['status'];
      if (input.resolution !== undefined) {
        update.resolution = input.resolution.trim();
        changedFields.push('resolution');
      }
      if (input.status === 'reconfirmed') {
        update.reconfirmed_by = actorId;
        update.reconfirmed_at = trx.fn.now();
        changedFields.push('reconfirmed_by', 'reconfirmed_at');
      }
      await trx('portal.fc_krmf_action').where({ id: actionId }).update(update);
      await recordAuditEvent(trx, principal, {
        tenantId,
        actorId,
        action: `krmf.action.${input.status}`,
        resourceType: 'krmf_action',
        resourceId: actionId,
        result: 'success',
        changedFields,
      });
      return { id: actionId, status: input.status };
    },
  );
  if (!result.ok) return result;
  const row = await trx('portal.fc_krmf_action').where({ id: actionId }).first();
  return ok({ ...row, replayed: result.value.replayed });
};

// ── 운영 변경 ────────────────────────────────────────────────────

export const listChanges = async (
  trx: Knex.Transaction,
  tenantId: string,
  scope: ScopeIdentity,
  filters: { status?: string; project_id?: string },
) => {
  await setTenantContext(trx, tenantId);
  if (filters.status && !CHANGE_STATUSES.includes(filters.status as never)) {
    return fail(422, 'invalid_status', '변경 상태 값이 올바르지 않습니다.');
  }
  if (filters.project_id && !UUID_PATTERN.test(filters.project_id)) {
    return fail(422, 'invalid_project_id', 'project_id 형식이 올바르지 않습니다.');
  }
  let qb = trx('portal.fc_krmf_change')
    .orderBy('updated_at', 'desc')
    .orderBy('id', 'desc');
  if (!scope.canViewAll) {
    qb = qb.where(qb2 =>
      qb2.whereNull('project_id').orWhereIn('project_id', projectIdList(scope)),
    );
  }
  if (filters.status) qb = qb.where({ status: filters.status });
  if (filters.project_id) qb = qb.where({ project_id: filters.project_id });
  return ok(await qb.select('*'));
};

export const createChange = async (
  trx: Knex.Transaction,
  tenantId: string,
  principal: PortalPrincipal,
  actorId: string,
  input: {
    project_id?: string;
    title: string;
    change_type: string;
    description: string;
    affected_control_ids?: string[];
    reassess_required?: boolean;
    reassess_reason?: string;
    idempotency_key?: string;
  },
) => {
  await setTenantContext(trx, tenantId);
  if (!validText(input.title, 300)) {
    return fail(422, 'invalid_title', '변경 제목을 확인하세요.');
  }
  if (!CHANGE_TYPES.includes(input.change_type as never)) {
    return fail(422, 'invalid_change_type', '변경 유형은 policy 또는 config여야 합니다.');
  }
  if (!validText(input.description, 5000)) {
    return fail(422, 'invalid_description', '변경 설명을 입력해야 합니다.');
  }
  if (input.project_id) {
    if (!UUID_PATTERN.test(input.project_id)) {
      return fail(422, 'invalid_project_id', 'project_id 형식이 올바르지 않습니다.');
    }
    const project = await trx('portal.fc_projects')
      .where({ id: input.project_id })
      .first('id');
    if (!project) {
      return fail(422, 'project_not_found', '지정한 프로젝트가 존재하지 않습니다.');
    }
  }
  const affected = Array.isArray(input.affected_control_ids)
    ? [...new Set(input.affected_control_ids)]
    : [];
  if (affected.length > 500 || affected.some(id => !UUID_PATTERN.test(id))) {
    return fail(422, 'invalid_affected_controls', '영향 통제 ID 목록을 확인하세요.');
  }
  if (affected.length > 0) {
    const found = await trx('portal.fc_krmf_control')
      .whereIn('id', affected)
      .select('id');
    if (found.length !== affected.length) {
      return fail(
        422,
        'invalid_affected_controls',
        '존재하지 않는 통제가 포함되어 있습니다.',
      );
    }
  }
  const reassessRequired = input.reassess_required === true;
  const reassessReason = reassessRequired ? input.reassess_reason : undefined;
  if (reassessRequired && !validText(reassessReason, 1000)) {
    return fail(
      422,
      'reassess_reason_required',
      '재평가가 필요하면 사유를 입력해야 합니다.',
    );
  }
  const reassessReasonTrimmed =
    reassessRequired && reassessReason ? reassessReason.trim() : null;
  const result = await idempotent(
    trx,
    tenantId,
    actorId,
    'krmf.change.create',
    input.idempotency_key,
    input,
    async () => {
      const id = randomUUID();
      await trx('portal.fc_krmf_change').insert({
        id,
        tenant_id: tenantId,
        project_id: input.project_id ?? null,
        title: input.title.trim(),
        change_type: input.change_type,
        description: input.description.trim(),
        affected_control_ids: JSON.stringify(affected),
        reassess_required: reassessRequired,
        reassess_reason: reassessReasonTrimmed,
        status: 'recorded',
        created_by: actorId,
        updated_by: actorId,
      });
      await recordAuditEvent(trx, principal, {
        tenantId,
        actorId,
        action: 'krmf.change.create',
        resourceType: 'krmf_change',
        resourceId: id,
        result: 'success',
        changedFields: ['status', 'reassess_required', 'affected_control_ids'],
      });
      return { id };
    },
  );
  if (!result.ok) return result;
  const row = await trx('portal.fc_krmf_change')
    .where({ id: result.value.value.id })
    .first();
  return ok({ ...row, replayed: result.value.replayed });
};

export const updateChange = async (
  trx: Knex.Transaction,
  tenantId: string,
  principal: PortalPrincipal,
  actorId: string,
  changeId: string,
  patch: {
    title?: string;
    description?: string;
    status?: string;
    reassess_reason?: string;
    idempotency_key?: string;
  },
) => {
  await setTenantContext(trx, tenantId);
  if (!UUID_PATTERN.test(changeId)) {
    return fail(422, 'invalid_id', '변경 ID 형식이 올바르지 않습니다.');
  }
  const current = await trx('portal.fc_krmf_change').where({ id: changeId }).first();
  if (!current) return fail(404, 'not_found', '변경을 찾을 수 없습니다.');
  if (patch.status !== undefined) {
    const message = transitionError(
      '변경',
      CHANGE_TRANSITIONS,
      current.status as string,
      patch.status,
    );
    if (message) return fail(400, 'invalid_status_transition', message);
  }
  if (patch.title !== undefined && !validText(patch.title, 300)) {
    return fail(422, 'invalid_title', '변경 제목을 확인하세요.');
  }
  if (patch.description !== undefined && !validText(patch.description, 5000)) {
    return fail(422, 'invalid_description', '변경 설명을 확인하세요.');
  }
  const result = await idempotent(
    trx,
    tenantId,
    actorId,
    'krmf.change.update',
    patch.idempotency_key,
    patch,
    async () => {
      const update: Record<string, unknown> = {
        updated_by: actorId,
        updated_at: trx.fn.now(),
      };
      const changedFields: string[] = [];
      if (patch.title !== undefined) {
        update.title = patch.title.trim();
        changedFields.push('title');
      }
      if (patch.description !== undefined) {
        update.description = patch.description.trim();
        changedFields.push('description');
      }
      if (patch.status !== undefined && patch.status !== current.status) {
        update.status = patch.status;
        changedFields.push('status');
      }
      if (patch.reassess_reason !== undefined) {
        update.reassess_reason = patch.reassess_reason.trim() || null;
        changedFields.push('reassess_reason');
      }
      if (changedFields.length > 0) {
        await trx('portal.fc_krmf_change').where({ id: changeId }).update(update);
        await recordAuditEvent(trx, principal, {
          tenantId,
          actorId,
          action: 'krmf.change.update',
          resourceType: 'krmf_change',
          resourceId: changeId,
          result: 'success',
          changedFields,
        });
      }
      return { id: changeId };
    },
  );
  if (!result.ok) return result;
  const row = await trx('portal.fc_krmf_change').where({ id: changeId }).first();
  return ok({ ...row, replayed: result.value.replayed });
};

// ── TRR 체크리스트 ───────────────────────────────────────────────

export const listTrrChecks = async (
  trx: Knex.Transaction,
  tenantId: string,
  scope: ScopeIdentity,
  projectId?: string,
) => {
  await setTenantContext(trx, tenantId);
  const effectiveProjectId = projectId;
  if (!scope.canViewAll) {
    if (!effectiveProjectId) {
      return fail(422, 'project_required', 'project_id를 지정해야 합니다.');
    }
    if (!scope.memberProjectIds.has(effectiveProjectId)) {
      return fail(
        403,
        'permission_denied',
        '소속되지 않은 프로젝트의 TRR 현황은 조회할 수 없습니다.',
      );
    }
  }
  let qb = trx('portal.fc_krmf_trr_check').orderBy('item_code', 'asc');
  if (effectiveProjectId) {
    if (!UUID_PATTERN.test(effectiveProjectId)) {
      return fail(422, 'invalid_project_id', 'project_id 형식이 올바르지 않습니다.');
    }
    qb = qb.where({ project_id: effectiveProjectId });
  }
  return ok(await qb.select('*'));
};

export const upsertTrrItems = async (
  trx: Knex.Transaction,
  tenantId: string,
  principal: PortalPrincipal,
  actorId: string,
  projectId: string,
  items: Array<{
    item_code: string;
    title: string;
    test_criteria?: string;
    test_data?: string;
    evidence_ready?: boolean;
    status?: string;
    note?: string;
  }>,
) => {
  await setTenantContext(trx, tenantId);
  if (!UUID_PATTERN.test(projectId)) {
    return fail(422, 'invalid_project_id', 'project_id 형식이 올바르지 않습니다.');
  }
  const project = await trx('portal.fc_projects')
    .where({ id: projectId })
    .first('id');
  if (!project) {
    return fail(422, 'project_not_found', '지정한 프로젝트가 존재하지 않습니다.');
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 200) {
    return fail(422, 'invalid_items', '등록할 항목은 1~200개여야 합니다.');
  }
  for (const item of items) {
    if (!validText(item.item_code, 100)) {
      return fail(422, 'invalid_item_code', '항목 코드를 확인하세요.');
    }
    if (!validText(item.title, 300)) {
      return fail(
        422,
        'invalid_title',
        `항목(${item.item_code})의 제목을 확인하세요.`,
      );
    }
    if (item.status !== undefined && !(item.status in TRR_TRANSITIONS)) {
      return fail(
        422,
        'invalid_status',
        `항목(${item.item_code})의 상태 값이 올바르지 않습니다.`,
      );
    }
  }
  const written: string[] = [];
  for (const item of items) {
    const testCriteria = item.test_criteria?.trim() ? item.test_criteria.trim() : null;
    const testData = item.test_data?.trim() ? item.test_data.trim() : null;
    const note = item.note?.trim() ? item.note.trim() : null;
    await trx('portal.fc_krmf_trr_check')
      .insert({
        id: randomUUID(),
        tenant_id: tenantId,
        project_id: projectId,
        item_code: item.item_code.trim(),
        title: item.title.trim(),
        test_criteria: testCriteria,
        test_data: testData,
        evidence_ready: item.evidence_ready === true,
        status: item.status ?? 'not_ready',
        note,
        created_by: actorId,
        updated_by: actorId,
      })
      .onConflict(['tenant_id', 'project_id', 'item_code'])
      .merge({
        title: item.title.trim(),
        test_criteria: testCriteria,
        test_data: testData,
        evidence_ready: item.evidence_ready === true,
        status: item.status ?? 'not_ready',
        note,
        updated_by: actorId,
        updated_at: trx.fn.now(),
      });
    written.push(item.item_code.trim());
  }
  await recordAuditEvent(trx, principal, {
    tenantId,
    actorId,
    action: 'krmf.trr.upsert',
    resourceType: 'project',
    resourceId: projectId,
    result: 'success',
    changedFields: written.slice(0, 20),
  });
  const rows = await trx('portal.fc_krmf_trr_check')
    .where({ project_id: projectId })
    .orderBy('item_code', 'asc')
    .select('*');
  return ok({ items: rows, upserted: written.length });
};

export const updateTrrItem = async (
  trx: Knex.Transaction,
  tenantId: string,
  principal: PortalPrincipal,
  actorId: string,
  itemId: string,
  patch: {
    title?: string;
    test_criteria?: string | null;
    test_data?: string | null;
    evidence_ready?: boolean;
    status?: string;
    note?: string | null;
    expected_updated_at?: string;
  },
) => {
  await setTenantContext(trx, tenantId);
  if (!UUID_PATTERN.test(itemId)) {
    return fail(422, 'invalid_id', '항목 ID 형식이 올바르지 않습니다.');
  }
  const current = await trx('portal.fc_krmf_trr_check').where({ id: itemId }).first();
  if (!current) return fail(404, 'not_found', 'TRR 항목을 찾을 수 없습니다.');
  if (
    patch.expected_updated_at !== undefined &&
    !sameInstant(patch.expected_updated_at, current.updated_at as Date)
  ) {
    return fail(
      409,
      'version_conflict',
      '다른 사용자가 항목을 변경했습니다. 새로 불러온 후 다시 저장하세요.',
    );
  }
  if (patch.status !== undefined) {
    const message = transitionError(
      'TRR 항목',
      TRR_TRANSITIONS,
      current.status as string,
      patch.status,
    );
    if (message) return fail(400, 'invalid_status_transition', message);
  }
  const update: Record<string, unknown> = {
    updated_by: actorId,
    updated_at: trx.fn.now(),
  };
  const changedFields: string[] = [];
  if (patch.title !== undefined) {
    if (!validText(patch.title, 300)) {
      return fail(422, 'invalid_title', '항목 제목을 확인하세요.');
    }
    update.title = patch.title.trim();
    changedFields.push('title');
  }
  if (patch.test_criteria !== undefined) {
    update.test_criteria = patch.test_criteria?.trim()
      ? patch.test_criteria.trim()
      : null;
    changedFields.push('test_criteria');
  }
  if (patch.test_data !== undefined) {
    update.test_data = patch.test_data?.trim() ? patch.test_data.trim() : null;
    changedFields.push('test_data');
  }
  if (patch.evidence_ready !== undefined) {
    update.evidence_ready = patch.evidence_ready === true;
    changedFields.push('evidence_ready');
  }
  if (patch.status !== undefined && patch.status !== current.status) {
    update.status = patch.status;
    changedFields.push('status');
  }
  if (patch.note !== undefined) {
    update.note = patch.note?.trim() ? patch.note.trim() : null;
    changedFields.push('note');
  }
  if (changedFields.length > 0) {
    await trx('portal.fc_krmf_trr_check').where({ id: itemId }).update(update);
    await recordAuditEvent(trx, principal, {
      tenantId,
      actorId,
      action: 'krmf.trr.update',
      resourceType: 'krmf_trr_check',
      resourceId: itemId,
      result: 'success',
      changedFields,
    });
  }
  const row = await trx('portal.fc_krmf_trr_check').where({ id: itemId }).first();
  return ok(row);
};

// ── 평가·인가 지원 기록 ─────────────────────────────────────────

export const listEvalRecords = async (
  trx: Knex.Transaction,
  tenantId: string,
  scope: ScopeIdentity,
  filters: { kind?: string; status?: string; project_id?: string },
) => {
  await setTenantContext(trx, tenantId);
  if (filters.kind && !EVAL_KINDS.includes(filters.kind as never)) {
    return fail(422, 'invalid_kind', '기록 유형 값이 올바르지 않습니다.');
  }
  if (filters.status && !(filters.status in EVAL_TRANSITIONS)) {
    return fail(422, 'invalid_status', '기록 상태 값이 올바르지 않습니다.');
  }
  if (filters.project_id && !UUID_PATTERN.test(filters.project_id)) {
    return fail(422, 'invalid_project_id', 'project_id 형식이 올바르지 않습니다.');
  }
  let qb = trx('portal.fc_krmf_eval_record')
    .orderBy('recorded_at', 'desc')
    .orderBy('id', 'desc');
  if (!scope.canViewAll) {
    qb = qb.where(qb2 =>
      qb2.whereNull('project_id').orWhereIn('project_id', projectIdList(scope)),
    );
  }
  if (filters.kind) qb = qb.where({ kind: filters.kind });
  if (filters.status) qb = qb.where({ status: filters.status });
  if (filters.project_id) qb = qb.where({ project_id: filters.project_id });
  return ok(await qb.select('*'));
};

export const createEvalRecord = async (
  trx: Knex.Transaction,
  tenantId: string,
  principal: PortalPrincipal,
  actorId: string,
  input: {
    project_id?: string;
    kind: string;
    title: string;
    body: string;
    residual_risk?: string;
    source: string;
    idempotency_key?: string;
  },
) => {
  await setTenantContext(trx, tenantId);
  if (!EVAL_KINDS.includes(input.kind as never)) {
    return fail(422, 'invalid_kind', '기록 유형 값이 올바르지 않습니다.');
  }
  if (!validText(input.title, 300)) {
    return fail(422, 'invalid_title', '기록 제목을 입력해야 합니다.');
  }
  if (!validText(input.body, 10000)) {
    return fail(422, 'invalid_body', '기록 내용을 입력해야 합니다.');
  }
  if (!validText(input.source, 300)) {
    return fail(422, 'invalid_source', '기록 출처를 입력해야 합니다.');
  }
  if (input.kind === 'risk_acceptance' && !validText(input.residual_risk, 1000)) {
    return fail(422, 'residual_risk_required', '잔여 위험 수준을 입력해야 합니다.');
  }
  if (input.project_id) {
    if (!UUID_PATTERN.test(input.project_id)) {
      return fail(422, 'invalid_project_id', 'project_id 형식이 올바르지 않습니다.');
    }
    const project = await trx('portal.fc_projects')
      .where({ id: input.project_id })
      .first('id');
    if (!project) {
      return fail(422, 'project_not_found', '지정한 프로젝트가 존재하지 않습니다.');
    }
  }
  const result = await idempotent(
    trx,
    tenantId,
    actorId,
    'krmf.eval.create',
    input.idempotency_key,
    input,
    async () => {
      const id = randomUUID();
      await trx('portal.fc_krmf_eval_record').insert({
        id,
        tenant_id: tenantId,
        project_id: input.project_id ?? null,
        kind: input.kind,
        title: input.title.trim(),
        body: input.body.trim(),
        residual_risk: input.residual_risk?.trim() ? input.residual_risk.trim() : null,
        source: input.source.trim(),
        status: 'open',
        asked_by: actorId,
        recorded_by: actorId,
      });
      await recordAuditEvent(trx, principal, {
        tenantId,
        actorId,
        action: 'krmf.eval.create',
        resourceType: 'krmf_eval_record',
        resourceId: id,
        result: 'success',
        changedFields: ['kind', 'status'],
      });
      return { id };
    },
  );
  if (!result.ok) return result;
  const row = await trx('portal.fc_krmf_eval_record')
    .where({ id: result.value.value.id })
    .first();
  return ok({ ...row, replayed: result.value.replayed });
};

export const answerEvalRecord = async (
  trx: Knex.Transaction,
  tenantId: string,
  principal: PortalPrincipal,
  actorId: string,
  recordId: string,
  input: { answer: string; idempotency_key?: string },
) => {
  await setTenantContext(trx, tenantId);
  if (!UUID_PATTERN.test(recordId)) {
    return fail(422, 'invalid_id', '기록 ID 형식이 올바르지 않습니다.');
  }
  if (!validText(input.answer, 10000)) {
    return fail(422, 'invalid_answer', '답변 내용을 입력해야 합니다.');
  }
  const current = await trx('portal.fc_krmf_eval_record')
    .where({ id: recordId })
    .first();
  if (!current) return fail(404, 'not_found', '기록을 찾을 수 없습니다.');
  const message = transitionError(
    '평가 기록',
    EVAL_TRANSITIONS,
    current.status as string,
    'answered',
  );
  if (message) {
    return fail(409, 'invalid_status_transition', '이미 답변 처리된 기록입니다.');
  }
  const result = await idempotent(
    trx,
    tenantId,
    actorId,
    'krmf.eval.answer',
    input.idempotency_key,
    input,
    async () => {
      await trx('portal.fc_krmf_eval_record')
        .where({ id: recordId })
        .update({
          body: `${current.body as string}\n\n[답변]\n${input.answer.trim()}`,
          status: 'answered',
          answered_by: actorId,
          answered_at: trx.fn.now(),
        });
      await recordAuditEvent(trx, principal, {
        tenantId,
        actorId,
        action: 'krmf.eval.answer',
        resourceType: 'krmf_eval_record',
        resourceId: recordId,
        result: 'success',
        changedFields: ['status', 'answered_by', 'answered_at'],
      });
      return { id: recordId };
    },
  );
  if (!result.ok) return result;
  const row = await trx('portal.fc_krmf_eval_record')
    .where({ id: recordId })
    .first();
  return ok({ ...row, replayed: result.value.replayed });
};

export const updateEvalStatus = async (
  trx: Knex.Transaction,
  tenantId: string,
  principal: PortalPrincipal,
  actorId: string,
  recordId: string,
  status: string,
) => {
  await setTenantContext(trx, tenantId);
  if (!UUID_PATTERN.test(recordId)) {
    return fail(422, 'invalid_id', '기록 ID 형식이 올바르지 않습니다.');
  }
  const current = await trx('portal.fc_krmf_eval_record')
    .where({ id: recordId })
    .first();
  if (!current) return fail(404, 'not_found', '기록을 찾을 수 없습니다.');
  const message = transitionError(
    '평가 기록',
    EVAL_TRANSITIONS,
    current.status as string,
    status,
  );
  if (message) return fail(400, 'invalid_status_transition', message);
  if (status !== current.status) {
    await trx('portal.fc_krmf_eval_record')
      .where({ id: recordId })
      .update({ status });
    await recordAuditEvent(trx, principal, {
      tenantId,
      actorId,
      action: 'krmf.eval.update',
      resourceType: 'krmf_eval_record',
      resourceId: recordId,
      result: 'success',
      changedFields: ['status'],
    });
  }
  const row = await trx('portal.fc_krmf_eval_record').where({ id: recordId }).first();
  return ok(row);
};

// ── 구현 현황 납품용 CSV ─────────────────────────────────────────

export const exportImplementationCsv = async (
  trx: Knex.Transaction,
  tenantId: string,
  principal: PortalPrincipal,
  actorId: string,
  scope: ScopeIdentity,
  baselineId: string,
): Promise<KrmfResult<{ csv: string }>> => {
  await setTenantContext(trx, tenantId);
  if (!UUID_PATTERN.test(baselineId)) {
    return fail(422, 'invalid_id', '기준선 ID 형식이 올바르지 않습니다.');
  }
  const baseline = await trx('portal.fc_krmf_baseline')
    .where({ id: baselineId })
    .first();
  if (!baseline) return fail(404, 'not_found', '기준선을 찾을 수 없습니다.');
  const controls = await scopedControlQuery(trx, scope)
    .where('c.baseline_id', baselineId)
    .orderBy('c.sort_order', 'asc')
    .orderBy('c.control_code', 'asc')
    .select('c.*');
  const controlIds = controls.map(row => row.id as string);
  const stats = controlIds.length
    ? await trx('portal.fc_krmf_evidence')
        .whereIn('control_id', controlIds)
        .select(
          'control_id',
          trx.raw(`COUNT(*)::int AS total`),
          trx.raw(
            `COUNT(*) FILTER (WHERE review_status = 'approved')::int AS approved`,
          ),
          trx.raw(`MAX(version)::int AS latest_version`),
        )
        .groupBy('control_id')
    : [];
  const statByControl = new Map(stats.map(row => [row.control_id as string, row]));
  const rows = controls.map(control => {
    const stat = statByControl.get(control.id as string);
    return [
      control.control_code as string,
      control.title as string,
      control.applicability as string,
      control.status as string,
      (control.owner_id as string | null) ?? null,
      control.due_date ? (control.due_date as Date).toISOString() : null,
      stat ? Number(stat.total) : 0,
      stat ? Number(stat.approved) : 0,
      stat ? Number(stat.latest_version) : 0,
    ];
  });
  const csv = toCsv(
    [
      '통제코드',
      '통제제목',
      '적용여부',
      '통제상태',
      '담당자',
      '기한',
      '증적수',
      '승인증적수',
      '최신증적버전',
    ],
    rows,
  );
  await recordAuditEvent(trx, principal, {
    tenantId,
    actorId,
    action: 'krmf.implementation.export',
    resourceType: 'krmf_baseline',
    resourceId: baselineId,
    result: 'success',
  });
  return ok({ csv });
};

export const exportEvidenceCsv = async (
  trx: Knex.Transaction,
  tenantId: string,
  principal: PortalPrincipal,
  actorId: string,
  scope: ScopeIdentity,
  baselineId: string,
): Promise<KrmfResult<{ csv: string }>> => {
  await setTenantContext(trx, tenantId);
  if (!UUID_PATTERN.test(baselineId)) {
    return fail(422, 'invalid_id', '기준선 ID 형식이 올바르지 않습니다.');
  }
  const baseline = await trx('portal.fc_krmf_baseline')
    .where({ id: baselineId })
    .first();
  if (!baseline) return fail(404, 'not_found', '기준선을 찾을 수 없습니다.');
  let qb = trx('portal.fc_krmf_evidence as e')
    .join('portal.fc_krmf_control as c', 'c.id', 'e.control_id')
    .join('portal.fc_krmf_baseline as b', 'b.id', 'c.baseline_id')
    .where('c.baseline_id', baselineId);
  if (!scope.canViewAll) {
    qb = qb.where(sub =>
      sub
        .where('c.owner_id', scope.userId)
        .orWhereIn('b.project_id', projectIdList(scope)),
    );
  }
  const evidences = await qb
    .orderBy('c.sort_order', 'asc')
    .orderBy('e.version', 'desc')
    .select('e.*', 'c.control_code as control_code');
  const rows = evidences.map(evidence => [
    evidence.control_code as string,
    evidence.title as string,
    evidence.kind as string,
    evidence.version as number,
    evidence.review_status as string,
    evidence.submitted_by as string,
    (evidence.submitted_at as Date).toISOString(),
    evidence.reviewed_at
      ? (evidence.reviewed_at as Date).toISOString()
      : null,
  ]);
  const csv = toCsv(
    [
      '통제코드',
      '증적제목',
      '종류',
      '버전',
      '검토상태',
      '제출자',
      '제출시각',
      '검토시각',
    ],
    rows,
  );
  await recordAuditEvent(trx, principal, {
    tenantId,
    actorId,
    action: 'krmf.evidence.export',
    resourceType: 'krmf_baseline',
    resourceId: baselineId,
    result: 'success',
  });
  return ok({ csv });
};
