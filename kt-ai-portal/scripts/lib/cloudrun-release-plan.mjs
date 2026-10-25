/** Pure release plan. Cloud Run v2 Service has top-level trafficStatuses. */
export const revisionId = name => String(name ?? '').split('/').pop();
const REVISION_TYPE = 'TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION';

export function candidatePlan(service, { image, revision, tag = 'review' }) {
  if (!image || !revision) throw new Error('Explicit image and revision are required');
  if (service.reconciling) throw new Error('Service is still reconciling');
  const statuses = service.trafficStatuses ?? [];
  const serving = statuses.filter(item => Number(item.percent) > 0);
  if (!serving.length || serving.reduce((sum, item) => sum + Number(item.percent), 0) !== 100)
    throw new Error('Cannot pin the existing 100% serving traffic');
  if (statuses.some(item => revisionId(item.revision) === revision))
    throw new Error('Candidate revision must be new');
  const template = structuredClone(service.template);
  if (template.containers?.length !== 1)
    throw new Error('Expected one container; review multi-container deployment separately');
  template.revision = revision;
  template.containers[0].image = image;
  // Keep existing Cloud SQL volumes, credentials, min/max scaling and resources.
  const traffic = statuses.filter(item => item.tag !== tag || Number(item.percent) > 0).map(item => {
    if (!item.revision) throw new Error('Observed traffic has no concrete revision');
    return {
      type: REVISION_TYPE,
      revision: revisionId(item.revision),
      percent: Number(item.percent ?? 0),
      ...(item.tag && item.tag !== tag ? { tag: item.tag } : {}),
    };
  });
  traffic.push({ type: REVISION_TYPE, revision, tag, percent: 0 });
  return { template, traffic };
}

export function promotePlan(service, revision, revisionResource, tag = 'review') {
  if (!revision || service.reconciling) throw new Error('Explicit stable candidate required');
  const target = (service.trafficStatuses ?? []).find(
    item => revisionId(item.revision) === revision && item.tag === tag,
  );
  if (!target) throw new Error('Candidate is not the expected review-tagged revision');
  if (revisionId(revisionResource?.name) !== revision || !revisionResource.conditions?.some(
    condition => condition.type === 'Ready' && condition.state === 'CONDITION_SUCCEEDED',
  )) throw new Error('Candidate revision is not Ready');
  return { traffic: [{ type: REVISION_TYPE, revision, percent: 100, tag }] };
}
