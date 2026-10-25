import { Proposal, ProposalDraft, ProposalReaction } from './types';

export const proposalStorageKey = (tenantId: string, actorId: string) =>
  `kai.demo.proposals.v1:${encodeURIComponent(tenantId)}:${encodeURIComponent(
    actorId,
  )}`;

export const proposalId = () =>
  `prop-${
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }`;

export const readDemoProposals = (
  key: string,
  fallback: Proposal[],
): { items: Proposal[]; error?: string } => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { items: fallback };
    const data = JSON.parse(raw);
    const stringFields = [
      'id',
      'title',
      'category',
      'proposer',
      'organization',
      'contact',
      'email',
      'necessity',
      'applicability',
      'expectedEffect',
      'requiredData',
      'expectedUsers',
      'expectedBenefit',
      'securityLevel',
      'status',
      'registeredAt',
    ];
    if (
      data.version !== 1 ||
      !Array.isArray(data.items) ||
      data.items.length > 300 ||
      !data.items.every(
        (item: Proposal) =>
          item &&
          stringFields.every(
            field =>
              typeof (item as unknown as Record<string, unknown>)[field] ===
              'string',
          ) &&
          ['likes', 'recommends', 'interests'].every(
            field =>
              Number.isFinite(
                (item as unknown as Record<string, unknown>)[field],
              ) &&
              Number((item as unknown as Record<string, unknown>)[field]) >= 0,
          ) &&
          Array.isArray(item.relatedProjects) &&
          item.relatedProjects.every(value => typeof value === 'string') &&
          Array.isArray(item.comments) &&
          item.comments.every(
            comment =>
              comment &&
              ['id', 'author', 'content', 'createdAt'].every(
                field =>
                  typeof (comment as unknown as Record<string, unknown>)[
                    field
                  ] === 'string',
              ),
          ) &&
          Array.isArray(item.statusHistory) &&
          (item.myReactions === undefined ||
            (Array.isArray(item.myReactions) &&
              item.myReactions.every(value =>
                ['likes', 'recommends', 'interests'].includes(value),
              ))),
      )
    )
      throw new Error('invalid');
    return { items: data.items };
  } catch {
    return {
      items: fallback,
      error:
        '저장된 제안을 읽지 못했습니다. 샘플 목록을 표시합니다. 다시 저장하면 현재 목록으로 복구됩니다.',
    };
  }
};

export const saveDemoProposals = (key: string, items: Proposal[]) => {
  if (items.length > 300)
    throw new Error(
      '이 브라우저에서는 제안을 최대 300개까지 보관합니다. 필요 없는 내 제안을 삭제해 주세요.',
    );
  try {
    localStorage.setItem(key, JSON.stringify({ version: 1, items }));
  } catch {
    throw new Error(
      '브라우저에 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인하세요. 입력 내용은 유지됩니다.',
    );
  }
};

export const normalizeProposalDraft = (draft: ProposalDraft): ProposalDraft => {
  const result = Object.fromEntries(
    Object.entries(draft).map(([key, value]) => [
      key,
      typeof value === 'string' ? value.trim() : value,
    ]),
  ) as ProposalDraft;
  if (
    !result.title ||
    !result.proposer ||
    !result.necessity ||
    !result.privacyAgreed
  )
    throw new Error('제목, 제안자, 필요성과 개인정보 동의를 확인하세요.');
  if (
    result.title.length > 160 ||
    Object.values(result).some(
      value => typeof value === 'string' && value.length > 10000,
    )
  )
    throw new Error('제목은 160자, 각 입력 항목은 10,000자 이내로 작성하세요.');
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email))
    throw new Error('이메일 형식을 확인하세요.');
  return {
    ...result,
    isPublic: result.securityLevel === '비밀' ? false : result.isPublic,
  };
};

export const createDemoProposal = (
  draft: ProposalDraft,
  actorId: string,
): Proposal => ({
  ...normalizeProposalDraft(draft),
  id: proposalId(),
  ownerId: actorId,
  expectedBenefit: draft.expectedEffect.trim(),
  relatedProjects: [],
  likes: 0,
  recommends: 0,
  interests: 0,
  myReactions: [],
  comments: [],
  status: '등록',
  isNoticed: false,
  registeredAt: new Date().toISOString().slice(0, 10),
  statusHistory: [
    {
      status: '등록',
      updatedAt: new Date().toISOString(),
      updatedBy: draft.proposer.trim(),
      note: '제안 등록',
    },
  ],
  nextAction: '담당자 검토 대기',
});

export const toggleProposalReaction = (
  proposal: Proposal,
  reaction: ProposalReaction,
): Proposal => {
  const selected = proposal.myReactions || [];
  const hadReaction = selected.includes(reaction);
  return {
    ...proposal,
    [reaction]: Math.max(0, proposal[reaction] + (hadReaction ? -1 : 1)),
    myReactions: hadReaction
      ? selected.filter(value => value !== reaction)
      : [...selected, reaction],
  };
};
