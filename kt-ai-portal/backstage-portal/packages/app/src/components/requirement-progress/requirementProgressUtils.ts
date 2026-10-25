import {
  PortalFeatureRequirement,
  RequirementChangeHistory,
  RequirementImplementationStatus,
  RequirementQuestion,
  SfrRequirementSummary,
} from './types';

export interface SfrProgress {
  completedRate: number;
  partialRate: number;
  followUpRate: number;
  notStartedRate: number;
}

export function computeSfrProgress(sfr: SfrRequirementSummary): SfrProgress {
  const total = sfr.totalFeatureCount || 1;
  return {
    completedRate: Math.round((sfr.completedUiCount / total) * 100),
    partialRate: Math.round((sfr.partialUiCount / total) * 100),
    followUpRate: Math.round((sfr.followUpCount / total) * 100),
    notStartedRate: Math.round(
      ((total -
        sfr.completedUiCount -
        sfr.partialUiCount -
        sfr.followUpCount) /
        total) *
        100,
    ),
  };
}

export interface OverallProgress {
  totalFeatures: number;
  completedUiFeatures: number;
  partialUiFeatures: number;
  followUpFeatures: number;
  completedRate: number;
  partialRate: number;
  followUpRate: number;
}

export function computeOverallProgress(
  features: PortalFeatureRequirement[],
): OverallProgress {
  const total = features.length || 1;
  const completed = features.filter(
    f => f.implementationStatus === '화면구현',
  ).length;
  const partial = features.filter(
    f => f.implementationStatus === '부분구현',
  ).length;
  const followUp = features.filter(
    f =>
      f.implementationStatus === '후속개발' ||
      f.implementationStatus === '미구현' ||
      f.implementationStatus === '검토필요',
  ).length;
  return {
    totalFeatures: features.length,
    completedUiFeatures: completed,
    partialUiFeatures: partial,
    followUpFeatures: followUp,
    completedRate: Math.round((completed / total) * 100),
    partialRate: Math.round((partial / total) * 100),
    followUpRate: Math.round((followUp / total) * 100),
  };
}

export interface FeatureFilters {
  sfrId?: string;
  changeType?: string;
  impact?: string;
  priority?: string;
  status?: RequirementImplementationStatus;
  keyword?: string;
}

export function filterFeatures(
  features: PortalFeatureRequirement[],
  filters: FeatureFilters,
): PortalFeatureRequirement[] {
  const keyword = filters.keyword?.trim().toLowerCase();
  return features.filter(f => {
    if (filters.sfrId && f.rfpId !== filters.sfrId) return false;
    if (filters.changeType && f.latestStatus !== filters.changeType)
      return false;
    if (filters.impact && f.impact !== filters.impact) return false;
    if (filters.priority && f.priority !== filters.priority) return false;
    if (filters.status && f.implementationStatus !== filters.status)
      return false;
    if (keyword) {
      const text = `${f.no} ${f.category} ${f.largeFunction} ${f.middleFunction} ${f.detailFunction} ${f.description} ${f.rfpId} ${f.actionItem}`.toLowerCase();
      if (!text.includes(keyword)) return false;
    }
    return true;
  });
}

export function groupFeaturesBySfr(
  features: PortalFeatureRequirement[],
): Record<string, PortalFeatureRequirement[]> {
  return features.reduce((acc, f) => {
    const key = f.rfpId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {} as Record<string, PortalFeatureRequirement[]>);
}

export function getFeaturesByStatus(
  features: PortalFeatureRequirement[],
  status: RequirementImplementationStatus,
): PortalFeatureRequirement[] {
  return features.filter(f => f.implementationStatus === status);
}

export function getQuestionsBySfr(
  questions: RequirementQuestion[],
  sfrId: string,
): RequirementQuestion[] {
  return questions.filter(q => q.relatedSfr.includes(sfrId));
}

export function getChangesBySfr(
  changes: RequirementChangeHistory[],
  sfrId: string,
): RequirementChangeHistory[] {
  return changes.filter(c => c.relatedSfr === sfrId);
}
