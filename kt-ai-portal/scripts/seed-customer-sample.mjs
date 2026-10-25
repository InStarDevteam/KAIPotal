#!/usr/bin/env node
/**
 * Customer demonstration data, kept separate from real institutional records.
 * Dry-run is the default. No tenant/user/role/identity/settings are created.
 * Credentials come only from POSTGRES_*; --apply is required to write.
 */
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'backstage-portal/packages/backend/package.json'));
const knex = require('knex');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const namespace = Buffer.from('df1b5414f01852dca3c77a3f7649da9d', 'hex');
export const SAMPLE_BATCH = 'kai-customer-sample-20261004-v1';
export const SAMPLE_PREFIX = '[시연 샘플]';
const createdAt = '2026-10-04T00:00:00.000Z';
const recordedAt = day => `2026-10-${String(day).padStart(2, '0')}T00:00:00.000Z`;

/** RFC 4122 version 5 UUID; tenant and batch are part of every identity. */
export const sampleId = (tenantId, logicalName) => {
  if (!UUID.test(tenantId)) throw new Error('tenant-id must be a UUID');
  const bytes = createHash('sha1').update(namespace).update(`${tenantId.toLowerCase()}:${SAMPLE_BATCH}:${logicalName}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export const buildCustomerSamplePlan = ({ tenantId, userId, publicBaseUrl = 'https://kai-platform-d0ae0.web.app' }) => {
  if (!UUID.test(tenantId) || !UUID.test(userId)) throw new Error('tenant-id and user-id must be UUIDs');
  const url = new URL(publicBaseUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('public-base-url must be an HTTPS origin or base path');
  const base = publicBaseUrl.replace(/\/$/, '');
  const id = label => sampleId(tenantId, label);
  const plan = [];
  const actor = { created_by: userId, updated_by: userId, created_at: createdAt, updated_at: createdAt };
  const add = (table, key, row, ownership = []) => {
    plan.push({ table, key, row: { tenant_id: tenantId, ...row }, ownership: ['tenant_id', ...ownership] });
  };
  // Unassigned synthetic hierarchy nodes. They do not change the account's
  // organization, tenant membership, group membership or effective permissions.
  for (const [logical, code, name, parent] of [
    ['review', 'SAMPLE-ORG-REVIEW-20261004', '포털 화면 검토 조직', null],
    ['data', 'SAMPLE-ORG-DATA-20261004', '합성 데이터 검토 팀', 'review'],
  ]) {
    const organizationId = id(`organization:${logical}`);
    add('fc_organizations', { tenant_id: tenantId, id: organizationId }, {
      id: organizationId, code, name: `${SAMPLE_PREFIX} ${name}`,
      parent_id: parent ? id(`organization:${parent}`) : null,
      status: 'active', created_at: createdAt,
    }, ['code']);
  }
  for (const [logical, code, name, parent] of [
    ['review', 'SAMPLE-GROUP-REVIEW-20261004', '포털 화면 검토 그룹', null],
    ['data', 'SAMPLE-GROUP-DATA-20261004', '합성 데이터 검토 그룹', 'review'],
  ]) {
    const groupId = id(`group:${logical}`);
    add('fc_groups', { tenant_id: tenantId, id: groupId }, {
      id: groupId, code, name: `${SAMPLE_PREFIX} ${name}`,
      parent_id: parent ? id(`group:${parent}`) : null,
      allow_nesting: parent === null, status: 'active', created_at: createdAt,
    }, ['code']);
  }
  const projectDefinitions = [
    ['document', '공개문서 분류 모델 검토', 'active', '공개문서 대신 합성 텍스트를 사용하여 프로젝트·신청·검토 화면을 설명합니다.'],
    ['quality', '합성 데이터 품질 점검', 'active', '합성 데이터의 누락값·형식 점검을 설명하는 화면 시연 프로젝트입니다.'],
    ['archive', '종료된 포털 화면 검토', 'closed', '종료 상태와 조회 화면을 설명하는 샘플입니다. 실제 플랫폼 작업 이력이 아닙니다.'],
  ];
  for (const [logical, name, status, description] of projectDefinitions) {
    const projectId = id(`project:${logical}`);
    add('fc_project', { id: projectId }, {
      id: projectId, name: `${SAMPLE_PREFIX} ${name}`, description: `${SAMPLE_PREFIX} ${description}`,
      purpose: '고객 협의용 합성 시연 데이터. 실제 군 자료·실증 과제·서비스 실행이 아닙니다.',
      status, owner_id: userId, visibility: 'member', start_at: recordedAt(4),
      end_at: logical === 'archive' ? recordedAt(4) : '2026-12-31T14:59:59.000Z',
      idempotency_key: `${SAMPLE_BATCH}:project:${logical}`, ...actor,
    }, ['created_by', 'idempotency_key']);
    add('fc_projects', { id: projectId }, {
      id: projectId, name: `${SAMPLE_PREFIX} ${name}`, description: `${SAMPLE_PREFIX} ${description}`,
      status, owner_user_id: userId, created_at: createdAt, updated_at: createdAt,
    }, ['owner_user_id']);
    add('fc_project_member', { project_id: projectId, user_id: userId }, {
      project_id: projectId, user_id: userId, role: 'manager', joined_at: createdAt,
    }, ['project_id', 'user_id']);
    add('fc_project_members', { project_id: projectId, user_id: userId }, {
      project_id: projectId, user_id: userId, member_role: 'owner', joined_at: createdAt,
    }, ['project_id', 'user_id']);
  }

  const projectId = id('project:document');
  const addWorkRequest = (logical, title, status, payload = {}) => {
    const workId = id(`work:${logical}`);
    const decided = status === 'approved' || status === 'rejected';
    add('fc_work_requests', { id: workId }, {
      id: workId, project_id: projectId, type: 'workspace', title: `${SAMPLE_PREFIX} ${title}`,
      payload: JSON.stringify({ ...payload, sample: true, sampleBatch: SAMPLE_BATCH, executionStatus: 'pending_platform', platformConnectionState: 'pending_integration' }),
      requester_user_id: userId, status, version: decided ? 2 : 1,
      decided_by: decided ? userId : null, decided_at: decided ? createdAt : null,
      idempotency_key: id(`work-key:${logical}`), created_at: createdAt, updated_at: createdAt,
    }, ['requester_user_id', 'idempotency_key']);
    add('fc_request_events', { event_id: id(`work-event:${logical}`) }, {
      event_id: id(`work-event:${logical}`), request_id: workId, actor_user_id: null,
      action: 'commented', note: `${SAMPLE_PREFIX} 고객 협의용 ${status} 상태 데이터 적재. 실제 사용자 승인·플랫폼 실행 이력이 아닙니다.`,
      created_at: createdAt,
    }, ['request_id']);
    return workId;
  };
  addWorkRequest('workspace-requested', '문서 분류 개발환경 신청', 'requested', { purpose: `${SAMPLE_PREFIX} 신청 후 검토 흐름 확인`, cpu: 4, memoryGb: 16, gpu: 0, storageGb: 100 });
  addWorkRequest('workspace-reviewing', '데이터 점검 개발환경 검토', 'reviewing', { purpose: `${SAMPLE_PREFIX} 검토 화면 확인`, cpu: 8, memoryGb: 32, gpu: 1, storageGb: 200 });
  addWorkRequest('workspace-approved', '승인 후 플랫폼 연동 대기', 'approved', { purpose: `${SAMPLE_PREFIX} 승인과 서비스 실행을 구분하는 시연`, cpu: 4, memoryGb: 16, gpu: 0, storageGb: 100 });
  addWorkRequest('workspace-rejected', '자원 신청 반려 예시', 'rejected', { purpose: `${SAMPLE_PREFIX} 신청 정보 보완 안내 예시`, cpu: 8, memoryGb: 32, gpu: 0, storageGb: 100 });

  const catalogDefinitions = [
    ['notebook', 'tool', 'analysis', 'Jupyter Notebook 개발환경', '노트북 기반 분석환경 신청 예시. 실제 자원 생성은 플랫폼 연동 후 진행됩니다.'],
    ['label', 'tool', 'labeling', '합성 텍스트 라벨링 도구', '합성 텍스트 라벨링 도구 신청 및 검토 흐름을 설명합니다.'],
    ['quality', 'service', 'data', '합성 데이터 품질 점검', '누락값과 데이터 형식 점검 서비스 신청 예시입니다.'],
    ['dataset', 'dataset', 'data', '합성 문서 분류 데이터', '실제 국방자료를 포함하지 않는 화면 설명용 합성 데이터 신청 예시입니다.'],
    ['model', 'model', 'development', '문서 분류 모델 검토', '모델 검토 요청 화면용 샘플이며 실제 모델 서비스는 연결되지 않았습니다.'],
    ['guide', 'tool', 'visualization', '포털 시연 데이터 안내', '공개된 합성 시연 데이터 안내문입니다.'],
  ];
  for (let index = 0; index < catalogDefinitions.length; index++) {
    const [logical, kind, category, name, description] = catalogDefinitions[index];
    const itemId = id(`catalog:${logical}`);
    add('fc_catalog_item', { id: itemId }, {
      id: itemId, kind, category, name: `${SAMPLE_PREFIX} ${name}`, summary: `${SAMPLE_PREFIX} ${description}`,
      description: `${SAMPLE_PREFIX} ${description} ${logical === 'guide' ? '실제로 배포한 안내문을 엽니다.' : '신청·검토 원장만 동작하며 실제 서비스 실행 완료를 의미하지 않습니다.'}`,
      provider: logical === 'guide' ? 'portal' : 'external', access_type: logical === 'guide' ? 'direct_link' : 'apply',
      link_url: logical === 'guide' ? `${base}/sample-data/portal-reference-20261004.txt` : null,
      active: true, sort_order: 100 + index, ...actor,
    }, ['created_by']);
  }
  for (const [logical, itemLogical, status] of [['new', 'notebook', 'requested'], ['accepted', 'quality', 'approved'], ['returned', 'label', 'rejected']]) {
    const applicationId = id(`catalog-application:${logical}`);
    const itemId = id(`catalog:${itemLogical}`);
    const workId = addWorkRequest(`catalog:${logical}`, `카탈로그 ${itemLogical} 신청`, status, { refType: 'catalog_application', refId: applicationId, item_id: itemId, project_id: projectId });
    add('fc_catalog_application', { id: applicationId }, {
      id: applicationId, item_id: itemId, project_id: projectId,
      reason: `${SAMPLE_PREFIX} ${status} 상태의 신청·검토 화면 확인용. 실제 서비스 실행이 아닙니다.`,
      status, execution_status: 'pending_platform', idempotency_key: `${SAMPLE_BATCH}:catalog:${logical}`,
      work_request_id: workId, requested_by: userId, decided_by: status === 'requested' ? null : userId,
      decided_at: status === 'requested' ? null : createdAt, version: status === 'requested' ? 1 : 2,
      created_at: createdAt, updated_at: createdAt,
    }, ['requested_by', 'idempotency_key', 'work_request_id']);
  }

  const accountId = id('credit-account:document');
  const grants = [
    ['grant', 'grant', '100000.0000', '초기 지급 원장 예시', null, null],
    ['charge', 'charge', '25000.0000', '추가 충전 원장 예시', null, null],
    ['deduct', 'deduct', '-18000.0000', '가상 GPU 사용 차감 예시(실측 아님)', '3000.0000', '6.0000'],
    ['adjust', 'adjust', '1000.0000', '정정 거래 원장 예시', null, null],
  ];
  add('fc_credit_account', { id: accountId }, {
    id: accountId, owner_type: 'project', owner_id: projectId, balance: '108000.0000', version: 5, ...actor,
  }, ['owner_type', 'owner_id', 'created_by']);
  for (const [logical, type, amount, description, price, quantity] of grants) {
    add('fc_credit_transaction', { id: id(`credit-transaction:${logical}`) }, {
      id: id(`credit-transaction:${logical}`), account_id: accountId, type, amount,
      unit_price_snapshot: price, quantity, reason: `${SAMPLE_PREFIX} ${description}. 실제 지급·과금·CMP 계량값이 아닙니다.`,
      ref_type: 'sample_seed', ref_id: projectId, idempotency_key: `${SAMPLE_BATCH}:credit-transaction:${logical}`,
      created_by: userId, created_at: createdAt,
    }, ['account_id', 'created_by', 'idempotency_key']);
  }
  for (const [logical, unit, price, name] of [
    ['CPU', 'cpu-hour', '200.0000', '가상 CPU 단가'],
    ['GPU', 'gpu-hour', '3000.0000', '가상 GPU 단가'],
    ['STORAGE', 'storage-gb-day', '10.0000', '가상 저장공간 단가'],
  ]) {
    add('fc_credit_product', { id: id(`credit-product:${logical}`) }, {
      id: id(`credit-product:${logical}`), code: `SAMPLE-${logical}-20261004`, name: `${SAMPLE_PREFIX} ${name} (실제 계약단가 아님)`,
      unit, unit_price: price, currency: 'KRW', valid_from: createdAt, valid_to: null, active: true, ...actor,
    }, ['code', 'created_by', 'valid_from']);
  }
  for (const [logical, type, amount, status] of [['new', 'charge', '30000.0000', 'requested'], ['returned', 'charge', '50000.0000', 'rejected'], ['cancelled', 'initial_grant', '20000.0000', 'cancelled']]) {
    add('fc_credit_request', { id: id(`credit-request:${logical}`) }, {
      id: id(`credit-request:${logical}`), type, owner_type: 'project', owner_id: projectId, amount,
      reason: `${SAMPLE_PREFIX} 크레딧 ${status} 상태 확인용 신청. 실제 사업비·지급액이 아닙니다.`, status,
      requested_by: userId, requested_at: createdAt, decided_by: status === 'requested' ? null : userId,
      decided_at: status === 'requested' ? null : createdAt, decision_reason: status === 'requested' ? null : `${SAMPLE_PREFIX} ${status} 상태 데이터`,
      idempotency_key: `${SAMPLE_BATCH}:credit-request:${logical}`, version: status === 'requested' ? 1 : 2,
    }, ['owner_id', 'requested_by', 'idempotency_key']);
  }

  for (const [logical, kind, subjectType, status] of [['import', 'import', 'artifact', 'requested'], ['export', 'export', 'artifact', 'in_review'], ['supplement', 'export', 'server', 'supplement_requested'], ['rejected', 'import', 'artifact', 'rejected']]) {
    add('fc_transfer_request', { id: id(`transfer:${logical}`) }, {
      id: id(`transfer:${logical}`), kind, subject_type: subjectType, title: `${SAMPLE_PREFIX} 합성 문서 ${kind === 'import' ? '반입' : '반출'} ${status} 예시`,
      purpose: `${SAMPLE_PREFIX} 신청·검토 화면 확인용. 파일은 아직 등록하지 않았으며 실제 망 간 전송은 수행되지 않았습니다.`,
      security_grade: 'public', public_consent: false, public_scope: 'none', usage_permission: `${SAMPLE_PREFIX} 고객 협의 시연에만 사용`,
      status, requested_by: userId, requested_at: createdAt, decided_by: status === 'rejected' ? userId : null,
      decided_at: status === 'rejected' ? createdAt : null, decision_reason: status === 'rejected' ? `${SAMPLE_PREFIX} 첨부·출처 확인이 필요함` : null,
      approved_file_version: null, idempotency_key: `${SAMPLE_BATCH}:transfer:${logical}`, version: status === 'requested' ? 1 : 2,
      created_at: createdAt, updated_at: createdAt,
    }, ['requested_by', 'idempotency_key']);
  }

  for (const [logical, type, title, status] of [
    ['improvement', 'improvement', '프로젝트별 신청 현황 개선 의견', 'submitted'],
    ['feature', 'feature', '검색 결과 필터 편의성 의견', 'under_review'],
    ['answer', 'operation', '플랫폼 실행과 포털 승인 안내', 'answered'],
    ['notice', 'operation', '합성 시연 데이터 이용 안내', 'notice'],
  ]) {
    const proposalId = id(`proposal:${logical}`);
    add('fc_proposal', { id: proposalId }, {
      id: proposalId, type, title: `${SAMPLE_PREFIX} ${title}`, necessity: `${SAMPLE_PREFIX} 고객 협의용 제안 원장 예시입니다. 실제 사용자 민원이나 확정 요구사항이 아닙니다.`,
      utilization_plan: `${SAMPLE_PREFIX} 등록·공감·검토·답변 기능의 사용 흐름을 설명합니다.`,
      visibility: 'tenant', status, author_id: userId, view_count: 0, idempotency_key: `${SAMPLE_BATCH}:proposal:${logical}`, ...actor,
    }, ['author_id', 'created_by', 'idempotency_key']);
    if (status === 'answered' || status === 'notice') {
      add('fc_proposal_review', { id: id(`proposal-review:${logical}`) }, {
        id: id(`proposal-review:${logical}`), proposal_id: proposalId, reviewer_id: userId,
        decision: status === 'notice' ? 'notice' : 'answer',
        body: `${SAMPLE_PREFIX} 합성 답변입니다. 포털 신청·승인 원장은 실제로 동작하며, 상세 플랫폼 실행·기관 인증은 외부 연동 후 제공됩니다.`,
        created_at: createdAt,
      }, ['proposal_id', 'reviewer_id']);
    }
  }

  const baselineId = id('krmf-baseline:draft');
  add('fc_krmf_baseline', { id: baselineId }, {
    id: baselineId, name: `${SAMPLE_PREFIX} 보안 통제 화면 검토 기준선`, version: 'sample-0.1', status: 'draft',
    description: `${SAMPLE_PREFIX} 공식 국방 K-RMF 기준선이나 인가 결과가 아닙니다. 통제·증적·조치 화면 시연 전용입니다.`,
    project_id: projectId, ...actor,
  }, ['created_by', 'project_id']);
  const controlDefinitions = [
    ['account', 'SAMPLE-ACCOUNT', '계정 목록 점검', 'applied', 'evidence_submitted'],
    ['access', 'SAMPLE-ACCESS', '플랫폼 접근 정책 점검', 'applied', 'in_progress'],
    ['log', 'SAMPLE-LOG', '감사 로그 보존 검토', 'applied', 'not_started'],
    ['physical', 'SAMPLE-PHYSICAL', '시설 통제 범위 검토', 'excluded', 'not_started'],
    ['backup', 'SAMPLE-BACKUP', '백업 확인 대체 자료 검토', 'alternative', 'in_progress'],
  ];
  for (let index = 0; index < controlDefinitions.length; index++) {
    const [logical, code, title, applicability, status] = controlDefinitions[index];
    add('fc_krmf_control', { id: id(`krmf-control:${logical}`) }, {
      id: id(`krmf-control:${logical}`), baseline_id: baselineId, control_code: code, title: `${SAMPLE_PREFIX} ${title}`,
      description: `${SAMPLE_PREFIX} 공식 통제 항목·준수 판정이 아닌 합성 시나리오입니다.`, applicability,
      alternative_reason: applicability === 'applied' ? null : `${SAMPLE_PREFIX} 실제 적용·제외·대체 판단은 기관 보안 담당자와 협의해야 합니다.`,
      owner_id: userId, due_date: '2026-10-31T14:59:59.000Z', status, sort_order: index, ...actor,
    }, ['baseline_id', 'created_by']);
  }
  add('fc_krmf_evidence', { id: id('krmf-evidence:reference') }, {
    id: id('krmf-evidence:reference'), control_id: id('krmf-control:account'), title: `${SAMPLE_PREFIX} 공개 시연 안내문 참조 (공식 증적 아님)`,
    kind: 'reference', file_id: null, reference_uri: `${base}/sample-data/portal-reference-20261004.txt`,
    scope: 'project', version: 1, submitted_by: userId, submitted_at: createdAt, review_status: 'pending',
  }, ['control_id', 'submitted_by']);
  for (const [logical, status, impact, due] of [['access', 'open', 'medium', '2026-10-20T14:59:59.000Z'], ['log', 'in_progress', 'low', '2026-10-31T14:59:59.000Z']]) {
    add('fc_krmf_action', { id: id(`krmf-action:${logical}`) }, {
      id: id(`krmf-action:${logical}`), control_id: id(`krmf-control:${logical}`), title: `${SAMPLE_PREFIX} ${logical === 'access' ? '접근정책 검토 자료 보완' : '감사 보존 기준 협의'}`,
      cause: `${SAMPLE_PREFIX} 외부 연동·정책 협의 전 조치 관리 화면 설명용`, impact, owner_id: userId,
      due_date: due, status, resolution: null, ...actor,
    }, ['control_id', 'created_by']);
  }
  add('fc_krmf_change', { id: id('krmf-change:policy') }, {
    id: id('krmf-change:policy'), project_id: projectId, title: `${SAMPLE_PREFIX} 접근정책 변경 검토 예시`, change_type: 'policy',
    description: `${SAMPLE_PREFIX} 실제 정책 변경이 아닌 변경관리 원장 시연입니다.`,
    affected_control_ids: JSON.stringify([id('krmf-control:access')]), reassess_required: true,
    reassess_reason: `${SAMPLE_PREFIX} 접근 범위 영향 검토 예시`, status: 'recorded', ...actor,
  }, ['project_id', 'created_by']);
  for (const [logical, code, title] of [['data', 'SAMPLE-DATA', '합성 시험 데이터 준비'], ['evidence', 'SAMPLE-EVIDENCE', '증적 검토 준비']]) {
    add('fc_krmf_trr_check', { id: id(`krmf-trr:${logical}`) }, {
      id: id(`krmf-trr:${logical}`), project_id: projectId, item_code: code, title: `${SAMPLE_PREFIX} ${title}`,
      test_criteria: `${SAMPLE_PREFIX} 화면 검토용 자료 확인`, test_data: '합성 안내문·신청 원장', evidence_ready: false,
      status: 'not_ready', note: `${SAMPLE_PREFIX} 실제 TRR 승인·준비 완료 판정이 아닙니다.`, ...actor,
    }, ['project_id', 'created_by']);
  }
  add('fc_krmf_eval_record', { id: id('krmf-eval:query') }, {
    id: id('krmf-eval:query'), project_id: projectId, kind: 'query', title: `${SAMPLE_PREFIX} 증적 보존 범위 협의 질의`,
    body: `${SAMPLE_PREFIX} 고객 협의용 합성 질의입니다. 실제 평가기관의 질의나 인가 결과가 아닙니다.`,
    residual_risk: null, source: '합성 시연 데이터', status: 'open', asked_by: userId, asked_at: createdAt,
    recorded_by: userId, recorded_at: createdAt,
  }, ['project_id', 'recorded_by']);
  add('fc_krmf_control_link', { id: id('krmf-link:guide') }, {
    id: id('krmf-link:guide'), control_id: id('krmf-control:account'), link_type: 'test', ref_id: 'SAMPLE-PORTAL-REFERENCE-20261004',
    ref_title: `${SAMPLE_PREFIX} 합성 안내문 검토`, status: 'unresolved', created_at: createdAt,
  }, ['control_id', 'ref_id']);
  return plan;
};

// Existing migrations include some single-column foreign keys. Validate every
// effective row (including preserved, previously edited samples) explicitly.
const parentReferences = {
  fc_organizations: { parent_id: 'fc_organizations' },
  fc_groups: { parent_id: 'fc_groups' },
  fc_project_member: { project_id: 'fc_project' },
  fc_project_members: { project_id: 'fc_projects' },
  fc_work_requests: { project_id: 'fc_projects' },
  fc_request_events: { request_id: 'fc_work_requests' },
  fc_catalog_application: { item_id: 'fc_catalog_item', project_id: 'fc_projects', work_request_id: 'fc_work_requests' },
  fc_credit_transaction: { account_id: 'fc_credit_account' },
  fc_proposal_review: { proposal_id: 'fc_proposal' },
  fc_krmf_baseline: { project_id: 'fc_projects' },
  fc_krmf_control: { baseline_id: 'fc_krmf_baseline' },
  fc_krmf_evidence: { control_id: 'fc_krmf_control', file_id: 'fc_krmf_file' },
  fc_krmf_action: { control_id: 'fc_krmf_control' },
  fc_krmf_change: { project_id: 'fc_projects' },
  fc_krmf_trr_check: { project_id: 'fc_projects' },
  fc_krmf_eval_record: { project_id: 'fc_projects' },
  fc_krmf_control_link: { control_id: 'fc_krmf_control' },
};
const userReferenceFields = ['created_by', 'updated_by', 'user_id', 'owner_user_id', 'requester_user_id', 'actor_user_id', 'requested_by', 'decided_by', 'author_id', 'reviewer_id', 'submitted_by', 'reviewed_by', 'reconfirmed_by', 'asked_by', 'answered_by', 'recorded_by'];

const validateEffectiveReferences = async (trx, tenantId, effectiveEntries) => {
  const plannedParents = new Map(effectiveEntries.filter(entry => entry.row.id).map(entry => [`${entry.table}:${entry.row.id}`, entry.row]));
  const userChecks = new Set();
  const checkParent = async (table, value, source) => {
    if (value === null || value === undefined) return;
    const parent = plannedParents.get(`${table}:${value}`) ?? await trx(`portal.${table}`).where({ id: value }).first();
    if (!parent || parent.tenant_id !== tenantId) throw new Error(`Cross-tenant or missing reference in ${source}; no data is written.`);
  };
  for (const { table, row } of effectiveEntries) {
    for (const [field, parentTable] of Object.entries(parentReferences[table] ?? {})) await checkParent(parentTable, row[field], `${table}.${field}`);
    const userFields = [...userReferenceFields];
    if (['fc_project', 'fc_krmf_control', 'fc_krmf_action'].includes(table)) userFields.push('owner_id');
    for (const field of userFields) if (row[field]) userChecks.add(row[field]);
    if (['fc_credit_account', 'fc_credit_request'].includes(table)) {
      if (row.owner_type === 'project') await checkParent('fc_projects', row.owner_id, `${table}.owner_id`);
      else if (row.owner_type === 'user') userChecks.add(row.owner_id);
      else if (row.owner_type === 'tenant' && row.owner_id !== tenantId) throw new Error(`Cross-tenant owner in ${table}; no data is written.`);
    }
    if (table === 'fc_krmf_change') {
      const affected = typeof row.affected_control_ids === 'string' ? JSON.parse(row.affected_control_ids) : row.affected_control_ids;
      if (!Array.isArray(affected)) throw new Error('Invalid affected_control_ids; no data is written.');
      for (const controlId of affected) await checkParent('fc_krmf_control', controlId, `${table}.affected_control_ids`);
    }
    if (table === 'fc_work_requests') {
      const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
      if (payload.refType === 'catalog_application') await checkParent('fc_catalog_application', payload.refId, `${table}.payload.refId`);
    }
  }
  for (const userId of userChecks) {
    const user = await trx('portal.fc_users').where({ user_id: userId }).first('user_id');
    const membership = await trx('portal.fc_tenant_memberships').where({ tenant_id: tenantId, user_id: userId }).first('id');
    if (!user || !membership) throw new Error('A sample record refers to a user outside the selected tenant; no data is written.');
  }
};

export const seedCustomerSample = async (db, options) => {
  const { tenantId, userId, apply = false } = options;
  const plan = buildCustomerSamplePlan(options);
  return db.transaction(async trx => {
    if (!apply) await trx.raw('SET TRANSACTION READ ONLY');
    await trx.raw("SELECT set_config('portal.tenant_id', ?, true)", [tenantId]);
    await trx.raw("SET LOCAL lock_timeout = '5s'");
    await trx.raw("SET LOCAL statement_timeout = '30s'");
    if (apply) await trx.raw('SELECT pg_advisory_xact_lock(hashtext(?))', [`${SAMPLE_BATCH}:${tenantId}`]);
    const tenant = await trx('portal.fc_tenants').where({ id: tenantId, status: 'active' }).first('id', 'name');
    const user = await trx('portal.fc_users').where({ user_id: userId, status: 'active' }).first('user_id');
    const membership = await trx('portal.fc_tenant_memberships').where({ tenant_id: tenantId, user_id: userId, status: 'active' })
      .where('valid_from', '<=', trx.fn.now()).where(builder => builder.whereNull('valid_until').orWhere('valid_until', '>', trx.fn.now())).first('id');
    if (!tenant || !user || !membership) throw new Error('An existing active tenant, user and current active membership are required; no membership or permission is created.');
    const columns = await trx('information_schema.columns').where({ table_schema: 'portal' }).select('table_name', 'column_name');
    const columnSets = new Map();
    for (const column of columns) {
      if (!columnSets.has(column.table_name)) columnSets.set(column.table_name, new Set());
      columnSets.get(column.table_name).add(column.column_name);
    }
    const tableCounts = {};
    const existingEntries = [];
    const missingEntries = [];
    const effectiveEntries = [];
    for (const entry of plan) {
      const supported = columnSets.get(entry.table);
      if (!supported || Object.keys(entry.row).some(column => !supported.has(column))) throw new Error(`Schema is incomplete for portal.${entry.table}; run reviewed migrations first.`);
      const existing = await trx(`portal.${entry.table}`).where(entry.key).first();
      effectiveEntries.push({ table: entry.table, row: existing ?? entry.row });
      tableCounts[entry.table] ??= { planned: 0, existing: 0, insert: 0 };
      tableCounts[entry.table].planned++;
      if (existing) {
        for (const field of entry.ownership) {
          const actual = existing[field] instanceof Date ? existing[field].toISOString() : existing[field];
          if (String(actual) !== String(entry.row[field])) throw new Error(`Sample identity collision in portal.${entry.table}; existing row will not be modified.`);
        }
        tableCounts[entry.table].existing++;
        existingEntries.push(entry);
      } else {
        tableCounts[entry.table].insert++;
        missingEntries.push(entry);
      }
    }
    // Restoring a partial monetary fixture could break a balance changed through real UI actions.
    const creditPlan = plan.filter(entry => ['fc_credit_account', 'fc_credit_transaction'].includes(entry.table));
    const existingCredit = existingEntries.filter(entry => creditPlan.includes(entry));
    if (existingCredit.length > 0 && existingCredit.length !== creditPlan.length) throw new Error('Partial sample credit ledger detected; automatic repair is refused to preserve balances.');
    await validateEffectiveReferences(trx, tenantId, effectiveEntries);
    let auditEventsInserted = 0;
    if (apply && missingEntries.length > 0) {
      // Every operation is INSERT only. A non-primary natural-key conflict aborts the entire transaction.
      for (const entry of missingEntries) await trx(`portal.${entry.table}`).insert(entry.row);
      await trx('portal.fc_audit_events').insert({
        event_id: randomUUID(), occurred_at: trx.raw('clock_timestamp()'), recorded_at: trx.raw('clock_timestamp()'),
        tenant_id: tenantId, actor_id: null, actor_type: 'system', action: 'sample.import', resource_type: 'sample_batch',
        resource_id: SAMPLE_BATCH, result: 'success', reason_code: 'customer_demo_synthetic',
        operation_id: SAMPLE_BATCH, changed_fields: JSON.stringify(Object.keys(tableCounts)),
      });
      auditEventsInserted = 1;
    }
    return {
      batch: SAMPLE_BATCH, mode: apply ? 'apply' : 'dry-run', synthetic: true, tenantId, tenantName: tenant.name,
      userId, existingMembershipUsed: true, privilegesChanged: false, existingRowsChanged: false,
      plannedRows: plan.length, existingRows: existingEntries.length,
      rowsToInsert: missingEntries.length, insertedRows: apply ? missingEntries.length : 0, auditEventsInserted,
      tables: tableCounts,
      sampleProjectId: sampleId(tenantId, 'project:document'), sampleCreditAccountId: sampleId(tenantId, 'credit-account:document'),
      sampleBaselineId: sampleId(tenantId, 'krmf-baseline:draft'),
      limitations: ['Synthetic fixtures, not official MDR or K-RMF compliance.', 'No platform execution, resource telemetry, institutional identity sessions or real file transfers.', 'No actual file-storage ledger is fabricated.', 'Synthetic credit values belong only to a sample project; existing user/tenant balances are untouched.'],
      checkedAt: new Date().toISOString(),
    };
  });
};

const parseArguments = argv => {
  const options = { apply: false };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === '--apply') options.apply = true;
    else if (flag === '--help' || flag === '-h') options.help = true;
    else if (['--tenant-id', '--user-id', '--public-base-url', '--report'].includes(flag)) {
      const value = argv[++index];
      if (!value || value.startsWith('--')) throw new Error(`Value required for ${flag}`);
      options[{ '--tenant-id': 'tenantId', '--user-id': 'userId', '--public-base-url': 'publicBaseUrl', '--report': 'reportPath' }[flag]] = value;
    } else throw new Error(`Unknown argument: ${flag}`);
  }
  return options;
};

const main = async () => {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log('Usage: node scripts/seed-customer-sample.mjs --tenant-id UUID --user-id UUID [--public-base-url HTTPS_URL] [--report FILE] [--apply]\nDefault: read-only dry-run. POSTGRES_USER and POSTGRES_PASSWORD are required.');
    return;
  }
  buildCustomerSamplePlan(options); // Validate inputs before opening any connection.
  if (options.apply && process.env.NODE_ENV === 'production' && process.env.ALLOW_CUSTOMER_SAMPLE_SEED !== 'true') throw new Error('Production writes additionally require ALLOW_CUSTOMER_SAMPLE_SEED=true.');
  const { POSTGRES_HOST = '127.0.0.1', POSTGRES_PORT = '5432', POSTGRES_DB = 'portal_business', POSTGRES_USER, POSTGRES_PASSWORD } = process.env;
  if (!POSTGRES_USER || !POSTGRES_PASSWORD) throw new Error('POSTGRES_USER and POSTGRES_PASSWORD are required.');
  const db = knex({ client: 'pg', connection: { host: POSTGRES_HOST, port: Number(POSTGRES_PORT), database: POSTGRES_DB, user: POSTGRES_USER, password: POSTGRES_PASSWORD }, pool: { min: 0, max: 2 }, searchPath: ['portal'] });
  try {
    const report = await seedCustomerSample(db, options);
    if (options.reportPath) {
      const destination = path.resolve(options.reportPath);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
    }
    console.log(JSON.stringify(report, null, 2));
  } finally { await db.destroy(); }
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`Sample seed failed: ${String(error.message).slice(0, 600)}`); process.exitCode = 1; });
}
