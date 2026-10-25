import assert from 'node:assert/strict';
import { candidatePlan, promotePlan } from './lib/cloudrun-release-plan.mjs';
const service = {
  template: { revision: 'portal-old', scaling: { minInstanceCount: 1, maxInstanceCount: 20 },
    containers: [{ image: 'old-image', env: [{ name: 'PORTAL_DB_PASSWORD', valueSource: { secretKeyRef: { secret: 'db', version: '1' } } }] }],
    volumes: [{ name: 'cloudsql', cloudSqlInstance: { instances: ['sql-instance'] } }] },
  trafficStatuses: [{ revision: 'projects/p/locations/r/services/portal/revisions/portal-old', percent: 100 }],
};
const candidate = { image: 'new-image', revision: 'portal-new' };
const plan = candidatePlan(service, candidate);
assert.equal(plan.traffic[0].revision, 'portal-old');
assert.equal(plan.traffic[0].percent, 100);
assert.equal(plan.traffic[1].percent, 0);
assert.equal(plan.template.containers[0].image, 'new-image');
assert.deepEqual(plan.template.scaling, service.template.scaling);
assert.deepEqual(plan.template.containers[0].env, service.template.containers[0].env);
assert.deepEqual(plan.template.volumes, service.template.volumes);
assert.equal(service.template.containers[0].image, 'old-image');
assert.throws(() => candidatePlan({ ...service, trafficStatuses: [] }, candidate));
assert.throws(() => candidatePlan({ ...service, trafficStatuses: [{ revision: 'portal-old', percent: 50 }] }, candidate));
assert.throws(() => candidatePlan({ ...service, reconciling: true }, candidate));
assert.throws(() => candidatePlan(service, { revision: 'portal-new' }));
assert.throws(() => candidatePlan(service, { ...candidate, revision: 'portal-old' }));
const split = candidatePlan({ ...service, trafficStatuses: [
  { revision: 'portal-a', percent: 20 }, { revision: 'portal-b', percent: 80 },
] }, candidate);
assert.deepEqual(split.traffic.map(item => item.percent), [20, 80, 0]);
const oldTag = candidatePlan({ ...service, trafficStatuses: [
  { revision: 'portal-old', tag: 'review', percent: 100 },
] }, candidate);
assert.equal(oldTag.traffic[0].percent, 100);
assert.equal(oldTag.traffic[0].tag, undefined);
const deployed = { ...service, trafficStatuses: [...service.trafficStatuses, { revision: 'portal-new', tag: 'review', percent: 0 }] };
const ready = { name: 'portal-new', conditions: [{ type: 'Ready', state: 'CONDITION_SUCCEEDED' }] };
assert.equal(promotePlan(deployed, 'portal-new', ready).traffic[0].revision, 'portal-new');
assert.throws(() => promotePlan(deployed, 'other-latest', ready));
assert.throws(() => promotePlan(deployed, 'portal-new', { ...ready, conditions: [] }));
console.log('PASS release planning: candidate stays at 0%, exact Ready revision promoted, config preserved, missing/unstable state rejected');
