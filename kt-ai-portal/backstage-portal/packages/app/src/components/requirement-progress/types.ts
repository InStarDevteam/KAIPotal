export type RequirementChangeType = '유지' | '수정' | '신규';
export type RequirementImpact = '낮음' | '중간' | '높음';
export type RequirementPriority = '하' | '중' | '상';
export type RequirementImplementationStatus =
  | '화면구현'
  | '부분구현'
  | '후속개발'
  | '미구현'
  | '검토필요';

export interface SfrRequirementSummary {
  sfrId: string;
  title: string;
  area: string;
  latestSummary: string;
  changeType: RequirementChangeType;
  impact: RequirementImpact;
  priority: RequirementPriority;
  recommendation: string;
  status: RequirementImplementationStatus;
  totalFeatureCount: number;
  completedUiCount: number;
  partialUiCount: number;
  followUpCount: number;
}

export interface PortalFeatureRequirement {
  no: number;
  previousNo?: number | '신규';
  category: string;
  largeFunction: string;
  middleFunction: string;
  detailFunction: string;
  description: string;
  rfpId: string;
  estimateType: string;
  screenStage: string;
  latestStatus: RequirementChangeType;
  impact: RequirementImpact;
  priority: RequirementPriority;
  actionItem: string;
  implementationStatus: RequirementImplementationStatus;
  relatedScreenRoute?: string;
}

export interface RequirementChangeHistory {
  changeId: string;
  area: string;
  relatedSfr: string;
  changeType: string;
  summary: string;
  impact: RequirementImpact;
  priority: RequirementPriority;
  affectedFeatureNos: string;
  followUpAction: string;
}

export interface RequirementQuestion {
  no: number;
  area: string;
  question: string;
  relatedSfr: string;
  reason: string;
  priority: RequirementPriority;
}
