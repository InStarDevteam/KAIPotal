export type ProposalCategory =
  | 'AI 모델 개발'
  | '빅데이터 분석 모델 개발'
  | '데이터셋 구축'
  | 'LLM/RAG 서비스'
  | 'MLOps 자동화'
  | '데이터 시각화'
  | '기타';

export type ProposalStatus =
  | '등록'
  | '검토중'
  | '보완요청'
  | '공지승인'
  | '진행검토'
  | '반려'
  | '완료';

export type DataAccessLevel = '공개' | '내부' | '비밀';

export interface ProposalComment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface ProposalStatusHistory {
  status: ProposalStatus;
  updatedAt: string;
  updatedBy: string;
  note: string;
}

export interface Proposal {
  id: string;
  title: string;
  category: ProposalCategory;
  proposer: string;
  organization: string;
  contact: string;
  email: string;
  necessity: string;
  applicability: string;
  expectedEffect: string;
  requiredData: string;
  expectedUsers: string;
  expectedBenefit: string;
  relatedProjects: string[];
  securityLevel: DataAccessLevel;
  isPublic: boolean;
  privacyAgreed: boolean;
  likes: number;
  recommends: number;
  interests: number;
  comments: ProposalComment[];
  status: ProposalStatus;
  isNoticed: boolean;
  registeredAt: string;
  statusHistory: ProposalStatusHistory[];
  nextAction?: string;
  ownerId?: string;
  myReactions?: ProposalReaction[];
}

export type ProposalReaction = 'likes' | 'recommends' | 'interests';
export type ProposalDraft = Pick<
  Proposal,
  | 'title'
  | 'category'
  | 'proposer'
  | 'organization'
  | 'contact'
  | 'email'
  | 'necessity'
  | 'applicability'
  | 'expectedEffect'
  | 'requiredData'
  | 'expectedUsers'
  | 'securityLevel'
  | 'isPublic'
  | 'privacyAgreed'
>;

export type ProposalTab =
  | '전체 제안'
  | 'AI 모델 개발'
  | '빅데이터 분석'
  | '데이터셋 구축'
  | '내 제안'
  | '관리자 검토'
  | '요구사항 대응 현황';
