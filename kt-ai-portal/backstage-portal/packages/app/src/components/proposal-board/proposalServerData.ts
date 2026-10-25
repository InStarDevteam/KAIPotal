export const PROPOSAL_TYPE_LABELS: Record<string, string> = {
  feature: '기능 제안',
  improvement: '개선 제안',
  bug: '오류 수정',
  operation: '운영 개선',
};

export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  submitted: '등록',
  under_review: '검토중',
  answered: '답변완료',
  notice: '공지',
};

export const PROPOSAL_VISIBILITY_LABELS: Record<string, string> = {
  public: '전체 공개',
  tenant: '소속 공개',
  private: '비공개(본인·관리자)',
};

export const REVIEW_DECISION_LABELS: Record<string, string> = {
  answer: '답변',
  notice: '공지',
  supplement: '보완 요청',
};

export interface ServerProposalSummary {
  id: string;
  title: string;
  type: string;
  typeLabel: string;
  status: string;
  statusLabel: string;
  visibility: string;
  visibilityLabel: string;
  authorId: string;
  viewCount: number;
  sympathyCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServerProposalReview {
  id: string;
  reviewerId: string;
  decision: string;
  decisionLabel: string;
  body: string;
  createdAt: string;
}

export interface ServerProposalDetailView {
  id: string;
  title: string;
  type: string;
  typeLabel: string;
  status: string;
  statusLabel: string;
  visibility: string;
  visibilityLabel: string;
  authorId: string;
  necessity: string;
  utilizationPlan: string;
  attachmentUri: string;
  viewCount: number;
  sympathyCount: number;
  mySympathy: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  reviews: ServerProposalReview[];
}

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const asNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const labelOf = (map: Record<string, string>, value: string) =>
  map[value] ?? value;

export const mapServerProposalSummary = (
  row: Record<string, unknown>,
): ServerProposalSummary => {
  const type = asString(row.type);
  const status = asString(row.status);
  const visibility = asString(row.visibility);
  return {
    id: asString(row.id),
    title: asString(row.title),
    type,
    typeLabel: labelOf(PROPOSAL_TYPE_LABELS, type),
    status,
    statusLabel: labelOf(PROPOSAL_STATUS_LABELS, status),
    visibility,
    visibilityLabel: labelOf(PROPOSAL_VISIBILITY_LABELS, visibility),
    authorId: asString(row.author_id),
    viewCount: asNumber(row.view_count),
    sympathyCount: asNumber(row.sympathy_count),
    version: asNumber(row.version),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
};

export const mapServerProposalDetail = (bundle: {
  proposal: Record<string, unknown>;
  sympathyCount: number;
  mySympathy: boolean;
  reviews: Array<Record<string, unknown>>;
}): ServerProposalDetailView => {
  const proposal = bundle.proposal ?? {};
  const base = mapServerProposalSummary({
    ...proposal,
    sympathy_count: bundle.sympathyCount,
  });
  return {
    ...base,
    necessity: asString(proposal.necessity),
    utilizationPlan: asString(proposal.utilization_plan),
    attachmentUri: asString(proposal.attachment_uri),
    mySympathy: bundle.mySympathy === true,
    reviews: (bundle.reviews ?? []).map(review => {
      const decision = asString(review.decision);
      return {
        id: asString(review.id),
        reviewerId: asString(review.reviewer_id),
        decision,
        decisionLabel: labelOf(REVIEW_DECISION_LABELS, decision),
        body: asString(review.body),
        createdAt: asString(review.created_at),
      };
    }),
  };
};

export const formatProposalDate = (value: string): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};
