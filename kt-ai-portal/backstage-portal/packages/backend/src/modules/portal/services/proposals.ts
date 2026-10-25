import { Knex } from 'knex';

export const PROPOSAL_TYPES = [
  'feature',
  'improvement',
  'bug',
  'operation',
] as const;

export const PROPOSAL_VISIBILITIES = [
  'public',
  'tenant',
  'private',
] as const;

export const PROPOSAL_STATUSES = [
  'submitted',
  'under_review',
  'answered',
  'notice',
] as const;

export const REVIEW_DECISIONS = ['answer', 'notice', 'supplement'] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export const PROPOSAL_SORTS = ['latest', 'sympathy'] as const;

export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Error &&
  'code' in error &&
  (error as { code?: string }).code === '23505';

export const safeHttpUrl = (value: unknown, allowEmpty = true): boolean => {
  if ((value === null || value === undefined) && allowEmpty) return true;
  if (
    typeof value !== 'string' ||
    value.length > 2048 ||
    /[\s\\<>]/.test(value)
  ) {
    return false;
  }
  if (!value) return allowEmpty;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  if (!url.hostname || url.username || url.password) return false;
  return true;
};

export const reviewDecisionToStatus = (
  decision: string,
): 'answered' | 'notice' | 'under_review' | null => {
  switch (decision) {
    case 'answer':
      return 'answered';
    case 'notice':
      return 'notice';
    case 'supplement':
      return 'under_review';
    default:
      return null;
  }
};

export const proposalReadable = (
  proposal: { visibility: string; author_id: string },
  userId: string,
  isAdmin: boolean,
): boolean =>
  proposal.visibility !== 'private' ||
  proposal.author_id === userId ||
  isAdmin;

export const proposalEditable = (
  proposal: { author_id: string },
  userId: string,
  isAdmin: boolean,
): boolean => proposal.author_id === userId || isAdmin;

export const hasBlockingReview = (
  reviews: ReadonlyArray<{ decision: string }>,
): boolean => reviews.some(review => review.decision !== 'supplement');

export type SympathyAction = 'insert' | 'delete';

export const planSympathyAction = (alreadySympathized: boolean): SympathyAction =>
  alreadySympathized ? 'delete' : 'insert';

export const PROPOSAL_ADMIN_PERMISSION = 'tenant.manage';

export const isProposalAdmin = (permissions: Set<string>): boolean =>
  permissions.has(PROPOSAL_ADMIN_PERMISSION);

export interface ListProposalsOptions {
  mine?: boolean;
  type?: string;
  status?: string;
  visibility?: string;
  sort: 'latest' | 'sympathy';
  page: number;
  pageSize: number;
}

export const listProposals = async (
  trx: Knex.Transaction,
  userId: string,
  isAdmin: boolean,
  options: ListProposalsOptions,
) => {
  const sympathyCount = trx('portal.fc_proposal_sympathy')
    .select('proposal_id')
    .count('* as sympathy_count')
    .groupBy('proposal_id')
    .as('s');
  const base = trx('portal.fc_proposal as p')
    .leftJoin(sympathyCount, 's.proposal_id', 'p.id')
    .where(function () {
      this.whereNot('p.visibility', 'private')
        .orWhere('p.author_id', userId)
        .orWhere(trx.raw('?', [isAdmin]));
    })
    .select(
      'p.id',
      'p.type',
      'p.title',
      'p.visibility',
      'p.status',
      'p.author_id',
      'p.view_count',
      'p.version',
      'p.created_at',
      'p.updated_at',
           trx.raw('COALESCE(s.sympathy_count, 0)::int AS sympathy_count'),
    );
  const summary = await base.clone().clearSelect().select(
    trx.raw('COUNT(*)::int AS total'),
    ...['submitted', 'under_review', 'answered', 'notice'].map(status =>
      trx.raw(`COUNT(*) FILTER (WHERE p.status = ?)::int AS ${status}`, [status]),
    ),
    trx.raw('COUNT(*) FILTER (WHERE p.author_id = ?)::int AS mine', [userId]),
    trx.raw(`COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM portal.fc_proposal_sympathy ms
      WHERE ms.proposal_id = p.id AND ms.user_id = ?
    ))::int AS my_sympathy`, [userId]),
  ).first();
  if (options.mine) base.where('p.author_id', userId);
  if (options.type) base.where('p.type', options.type);
  if (options.status) base.where('p.status', options.status);
  if (options.visibility) base.where('p.visibility', options.visibility);
  const totalRow = await base
    .clone()
    .clearSelect()
    .clearOrder()
    .count('* as count')
    .first();
  const ordered =
    options.sort === 'sympathy'
      ? base.orderByRaw('COALESCE(s.sympathy_count, 0) DESC, p.created_at DESC').orderBy('p.id', 'desc')
      : base.orderBy('p.created_at', 'desc').orderBy('p.id', 'desc');
  const items = await ordered
    .limit(options.pageSize)
    .offset((options.page - 1) * options.pageSize);
  return {
    items,
    summary,
    pagination: {
      page: options.page,
      pageSize: options.pageSize,
      total: Number(totalRow?.count ?? 0),
    },
  };
};

export const getProposalBundle = async (
  trx: Knex.Transaction,
  proposalId: string,
  userId: string,
) => {
  const proposal = await trx('portal.fc_proposal')
    .where({ id: proposalId })
    .first();
  if (!proposal) return null;
  const sympathyCount = await trx('portal.fc_proposal_sympathy')
    .where({ proposal_id: proposalId })
    .count('* as count')
    .first();
  const mySympathy = await trx('portal.fc_proposal_sympathy')
    .where({ proposal_id: proposalId, user_id: userId })
    .first('user_id');
  const reviews = await trx('portal.fc_proposal_review')
    .where({ proposal_id: proposalId })
    .orderBy('created_at', 'asc')
    .select('*');
  return {
    proposal,
    sympathyCount: Number(sympathyCount?.count ?? 0),
    mySympathy: Boolean(mySympathy),
    reviews,
  };
};
