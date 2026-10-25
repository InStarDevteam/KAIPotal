import {
  RequirementChangeHistory,
  RequirementImplementationStatus,
  RequirementQuestion,
  SfrRequirementSummary,
} from '../requirement-progress/types';

export type PlatformRole =
  | '포털'
  | '데이터 플랫폼'
  | 'AI 플랫폼'
  | '지능형 클라우드/CMP'
  | '인증/권한'
  | '보안/K-RMF'
  | '지능형 서비스';

export interface MenuRequirementCoverage {
  menuId: string;
  menuName: string;
  route: string;
  visibleTo: 'all' | 'admin';
  relatedSfrIds: string[];
  relatedFeatureNos: number[];
  coverageSummary: string;
  implementedItems: string[];
  partialItems: string[];
  followUpItems: string[];
  rfpMappingReason: string;
  relatedPlatformRoles: PlatformRole[];
}

export interface FeatureCoverageDetail {
  no: number;
  sfrId: string;
  category: string;
  detailFunction: string;
  relatedMenuId: string;
  relatedMenuName: string;
  implementationStatus: RequirementImplementationStatus;
  relatedPlatformRoles: PlatformRole[];
  apiIntegrationRequired: boolean;
  followUpAction: string;
}

export interface SfrCoverageDetail extends SfrRequirementSummary {
  relatedMenuIds: string[];
  relatedMenuNames: string[];
  rfpMappingReason: string;
}

export type {
  RequirementChangeHistory,
  RequirementQuestion,
  RequirementImplementationStatus,
};
