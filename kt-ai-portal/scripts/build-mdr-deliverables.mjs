#!/usr/bin/env node
// 포털 업무 스키마(portal, fc_ 접두) migration을 파싱해 MDR 산출물 CSV를 생성한다.
// 기관 표준사전(표준단어·용어·도메인·코드)은 아직 수령하지 못했으므로
// 프로젝트 임시 정의만 생성하고 매핑상태는 전부 "임시정의"로 표기한다.
// MDR_OUTPUT_DIR로 기준일별 산출물을 분리할 수 있다(기본 경로는 기존 산출물과 호환).
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIG_DIR = path.join(ROOT, 'backstage-portal/packages/backend/migrations/portal');
const OUT_DIR = path.resolve(ROOT, process.env.MDR_OUTPUT_DIR ?? 'docs/final-completion/data');

// ── knex 스키마 DSL 파싱 ─────────────────────────────────────────────

const COLUMN_METHODS = new Set(['uuid', 'text', 'string', 'date', 'integer', 'boolean', 'timestamp', 'jsonb', 'bigInteger', 'decimal']);

function upBody(src) {
  const start = src.indexOf('exports.up');
  const end = src.indexOf('exports.down');
  return src.slice(start, end === -1 ? undefined : end);
}

// createTable/alterTable 콜백 본문을 brace 매칭으로 추출(문자열 리터럴 고려)
function extractCallbackBodies(body, keyword) {
  const blocks = [];
  let idx = 0;
  for (;;) {
    const at = body.indexOf(keyword + '(', idx);
    if (at === -1) break;
    const tableMatch = body.slice(at).match(new RegExp('^' + keyword + '\\(\\s*\'([^\']+)\''));
    if (!tableMatch) { idx = at + keyword.length; continue; }
    const arrow = body.indexOf('=>', at);
    const open = body.indexOf('{', arrow);
    let depth = 0, i = open, quote = null;
    for (; i < body.length; i++) {
      const ch = body[i];
      if (quote) {
        if (ch === '\\') { i++; continue; }
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
      if (ch === '{') depth++;
      if (ch === '}' && --depth === 0) break;
    }
    blocks.push({ table: tableMatch[1], body: body.slice(open + 1, i) });
    idx = i;
  }
  return blocks;
}

function splitStatements(blockBody) {
  const out = [];
  let cur = '', depth = 0, quote = null;
  for (let i = 0; i < blockBody.length; i++) {
    const ch = blockBody[i];
    if (quote) {
      cur += ch;
      if (ch === '\\') { cur += blockBody[++i]; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && blockBody[i + 1] === '/') { while (i < blockBody.length && blockBody[i] !== '\n') i++; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; cur += ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === ';' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  return out.map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function parseChainColumn(stmt, table, file) {
  const m = stmt.match(/^t\.(\w+)\(\s*'([^']+)'([\s\S]*)$/);
  if (!m || !COLUMN_METHODS.has(m[1])) return null;
  const [, method, name, rest] = m;
  const col = { name, table, file, type: null, length: null, nullable: true, primary: false, default: null, fk: [] };
  if (method === 'uuid') col.type = 'uuid';
  else if (method === 'text') col.type = 'text';
  else if (method === 'string') {
    col.type = 'varchar';
    col.length = rest.match(/,\s*(\d+)\s*\)/)?.[1] ?? '255';
  }
  else if (method === 'date') col.type = 'date';
  else if (method === 'integer') col.type = 'integer';
  else if (method === 'bigInteger') col.type = 'bigint';
  else if (method === 'boolean') col.type = 'boolean';
  else if (method === 'jsonb') col.type = 'jsonb';
  else if (method === 'timestamp') col.type = /useTz\s*:\s*false/.test(rest) ? 'timestamp' : 'timestamptz';
  else if (method === 'decimal') {
    const d = rest.match(/,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    col.type = 'numeric';
    col.length = `${d[1]},${d[2]}`;
  }
  if (/\.notNullable\(\)/.test(rest) || /\.primary\(\)/.test(rest)) col.nullable = false;
  if (/\.nullable\(\)/.test(rest)) col.nullable = true;
  if (/\.primary\(\)/.test(rest)) col.primary = true;
  if (/defaultTo\(knex\.fn\.uuid\(\)\)/.test(rest)) col.default = 'gen_random_uuid()';
  else if (/defaultTo\(knex\.fn\.now\(\)\)/.test(rest)) col.default = 'now()';
  else {
    const lit = rest.match(/defaultTo\('([^']*)'\)/);
    const num = rest.match(/defaultTo\((-?\d+|true|false)\)/);
    if (lit) col.default = `'${lit[1]}'`;
    else if (num) col.default = num[1];
  }
  const ref = rest.match(/references\('([^']+)'\)[\s\S]*?inTable\('?([\w.]+)'?\)/);
  if (ref) col.fk.push({ table: ref[2].replace(/^portal\./, ''), cols: [ref[1]] });
  return col;
}

function parseTableLevel(stmt, tableDef) {
  const pk = stmt.match(/^t\.primary\(\[([^\]]*)\]\)/);
  if (pk) {
    for (const c of pk[1].split(',').map(s => s.trim().replace(/'/g, ''))) {
      const col = tableDef.columns.find(x => x.name === c);
      if (col) { col.primary = true; col.nullable = false; }
    }
    return;
  }
  const fkMulti = stmt.match(/^t\.foreign\(\[([^\]]*)\]\)[\s\S]*?references\(\[([^\]]*)\]\)[\s\S]*?inTable\('?([\w.]+)'?\)/);
  if (fkMulti) {
    const cols = fkMulti[1].split(',').map(s => s.trim().replace(/'/g, ''));
    const refTable = fkMulti[3].replace(/^portal\./, '');
    for (const c of cols) {
      const col = tableDef.columns.find(x => x.name === c);
      if (col) col.fk.push({ table: refTable, cols: fkMulti[2].split(',').map(s => s.trim().replace(/'/g, '')) });
    }
    return;
  }
  const fkSingle = stmt.match(/^t\.foreign\('([^']+)'\)[\s\S]*?references\('([^']+)'\)[\s\S]*?inTable\('?([\w.]+)'?\)/);
  if (fkSingle) {
    const col = tableDef.columns.find(x => x.name === fkSingle[1]);
    if (col) col.fk.push({ table: fkSingle[3].replace(/^portal\./, ''), cols: [fkSingle[2]] });
  }
}

function parseMigrations() {
  const files = readdirSync(MIG_DIR).filter(f => f.endsWith('.js')).sort();
  const tables = new Map();
  const enumChecks = new Map(); // "table.col" -> { codes, constraint, file }
  const ensure = name => { if (!tables.has(name)) tables.set(name, { name, columns: [], files: new Set() }); return tables.get(name); };

  for (const file of files) {
    const src = readFileSync(path.join(MIG_DIR, file), 'utf8');
    const body = upBody(src);
    const short = file.replace(/\.js$/, '');

    for (const { table, body: cb } of extractCallbackBodies(body, 'createTable')) {
      const def = ensure(table);
      def.files.add(short);
      for (const stmt of splitStatements(cb)) {
        const col = parseChainColumn(stmt, table, short);
        if (col) { def.columns.push(col); continue; }
        parseTableLevel(stmt, def);
      }
    }
    for (const { table, body: cb } of extractCallbackBodies(body, 'alterTable')) {
      const def = ensure(table);
      def.files.add(short);
      for (const stmt of splitStatements(cb)) {
        const col = parseChainColumn(stmt, table, short);
        if (col) def.columns.push(col);
      }
    }

    // knex.raw CHECK(enum) — DDL 본문에 ';'가 없으므로 전역 스캔
    // ALTER TABLE 절의 테이블명을 직접 사용(컬럼명 추측 시 동명 컬럼 테이블에 잘못 소속)
    for (const m of body.matchAll(/ALTER TABLE\s+(?:portal\.)?(\w+)\s+ADD CONSTRAINT\s+(\w+)\s+CHECK\s*\(\s*(\w+)\s+IN\s*\(([^)]*)\)\s*\)/g)) {
      const [, tableName, constraint, column, list] = m;
      const target = tables.get(tableName);
      if (!target || !target.columns.some(c => c.name === column)) {
        if (process.env.MDR_DEBUG) console.error(`[dbg] raw CHECK 탐색 실패: ${file} ${constraint} 테이블=${tableName} 컬럼=${column}`);
        continue;
      }
      const codes = [...list.matchAll(/'([^']*)'/g)].map(x => x[1]);
      enumChecks.set(`${target.name}.${column}`, { codes, constraint, file: short });
    }
    // checkIn('col', STATUSES.group) 형태(20260929000020_domains)
    // STATUSES 상수는 exports.up 바깥(파일 상단)에 정의되므로 전체 소스에서 파싱
    const statuses = {};
    for (const m of src.matchAll(/(\w+):\s*\[([^\]]*)\]/g)) {
      statuses[m[1]] = [...m[2].matchAll(/'([^']*)'/g)].map(x => x[1]);
    }
    for (const m of body.matchAll(/checkIn\(\s*'(\w+)'\s*,\s*STATUSES\.(\w+)\s*\)\s*,\s*\[\s*'portal\.(\w+)'/g)) {
      const [, column, group, table] = m;
      if (!statuses[group]) continue;
      enumChecks.set(`${table}.${column}`, {
        codes: statuses[group],
        constraint: `${table}_${column}_chk`,
        file: short,
      });
    }
    // raw FOREIGN KEY DDL — ALTER TABLE 절의 테이블명을 직접 사용
    for (const m of body.matchAll(/ALTER TABLE\s+(?:portal\.)?(\w+)\s+ADD CONSTRAINT\s+(\w+)\s+FOREIGN KEY\s*\(([^)]+)\)\s*REFERENCES\s+([\w.]+)\s*\(([^)]+)\)(?:\s+NOT VALID)?/g)) {
      const [, tableName, , cols, refTable, refCols] = m;
      const target = tables.get(tableName);
      if (!target) continue;
      const clean = refTable.replace(/^portal\./, '');
      cols.split(',').forEach(c => {
        const col = target.columns.find(x => x.name === c.trim());
        if (col) col.fk.push({ table: clean, cols: refCols.split(',').map(value => value.trim()) });
      });
    }
    // addFkNotValid(knex, table, constraint, cols, refTable, refCols)
    for (const m of body.matchAll(/addFkNotValid\(knex,\s*'(\w+)',\s*'(\w+)',\s*'(\w+)',\s*'(\w+)',\s*'(\w+)'\)/g)) {
      const [, table, , col, refTable, refCol] = m;
      const def = tables.get(table);
      const target = def?.columns.find(x => x.name === col);
      if (target) target.fk.push({ table: refTable, cols: [refCol] });
    }
  }
  return { tables, enumChecks };
}

// ── 한글 메타(임시) ──────────────────────────────────────────────────

const ENTITY_KO = {
  fc_tenants: '테넌트', fc_organizations: '조직', fc_users: '사용자', fc_external_identities: '외부신원',
  fc_tenant_memberships: '테넌트소속', fc_roles: '역할', fc_permissions: '권한', fc_role_permissions: '역할권한매핑',
  fc_role_assignments: '역할부여', fc_audit_events: '감사이벤트', fc_outbox_events: '아웃박스이벤트',
  fc_idempotency_keys: '멱등키', fc_groups: '그룹', fc_group_memberships: '그룹소속', fc_delegations: '위임',
  fc_membership_changes: '소속변경이력', fc_tenant_settings: '테넌트설정', fc_platform_access: '플랫폼접근정책',
  fc_portal_preferences: '포털개인설정', fc_projects: '프로젝트(업무신청)', fc_project_members: '프로젝트멤버(업무신청)',
  fc_work_requests: '업무신청', fc_request_events: '신청이벤트',
  fc_krmf_baseline: 'K-RMF기준선', fc_krmf_control: 'K-RMF통제', fc_krmf_evidence: 'K-RMF증적',
  fc_krmf_file: 'K-RMF파일', fc_krmf_action: 'K-RMF조치', fc_krmf_change: 'K-RMF변경',
  fc_krmf_trr_check: 'K-RMF시험준비항목', fc_krmf_eval_record: 'K-RMF평가기록', fc_krmf_control_link: 'K-RMF통제연결',
  fc_credit_product: '크레딧상품', fc_credit_account: '크레딧계정', fc_credit_transaction: '크레딧거래',
  fc_credit_request: '크레딧신청', fc_transfer_request: '반입반출신청', fc_transfer_file: '반입반출파일',
  fc_project: '프로젝트', fc_project_member: '프로젝트멤버', fc_project_invite: '프로젝트초대',
  fc_proposal: '제안', fc_proposal_sympathy: '제안공감', fc_proposal_review: '제안검토',
  fc_catalog_item: '카탈로그항목', fc_catalog_application: '카탈로그신청',
  fc_portal_setting: '포털공통설정', fc_portal_setting_history: '포털공통설정이력',
  fc_user_profiles: '사용자프로필',
  fc_metadata_releases: '메타데이터사전버전', fc_metadata_domains: '메타데이터표준도메인',
  fc_metadata_words: '메타데이터표준단어', fc_metadata_terms: '메타데이터표준용어',
  fc_metadata_codes: '메타데이터표준코드', fc_metadata_columns: '메타데이터컬럼매핑',
};

const COLUMN_KO = {
  id: '식별자', tenant_id: '테넌트식별자', code: '코드', name: '명칭', branch: '군구분', parent_id: '상위식별자',
  status: '상태', created_at: '생성일시', version: '버전', updated_at: '수정일시', created_by: '생성자식별자',
  updated_by: '수정자식별자', description: '설명', user_id: '사용자식별자', display_name: '표시명', email: '이메일',
  organization_id: '조직식별자', issuer: '발급기관', subject: '외부주체식별자', verified: '검증여부',
  membership_id: '소속식별자', valid_from: '유효시작일시', valid_until: '유효종료일시', approved_by: '승인자식별자',
  role_id: '역할식별자', policy_version: '정책버전', delegated_by: '위임자식별자', reason: '사유',
  event_id: '이벤트식별자', occurred_at: '발생일시', recorded_at: '기록일시', actor_id: '행위자식별자',
  actor_type: '행위자유형', action: '작업구분', resource_type: '자원유형', resource_id: '자원식별자',
  resource_version: '자원버전', result: '처리결과', reason_code: '사유코드', request_id: '요청식별자',
  trace_id: '추적식별자', operation_id: '작업식별자', changed_fields: '변경필드', integrity_digest: '무결성다이제스트',
  type: '유형', payload: '페이로드', attempts: '시도횟수', retry_at: '재시도일시', lease_until: '임대만료일시',
  claimed_by: '점유자식별자', actor: '행위자식별자', key: '키', payload_hash: '페이로드해시', expires_at: '만료일시',
  group_id: '그룹식별자', allow_nesting: '중첩허용여부', delegator_membership_id: '위임자소속식별자',
  delegatee_membership_id: '수임자소속식별자', change_type: '변경유형', before_scope: '변경전범위',
  after_scope: '변경후범위', branding: '브랜딩설정', menus: '메뉴구성', platforms: '플랫폼목록',
  user_grants: '사용자승인목록', preferences: '개인설정', project_id: '프로젝트식별자', title: '제목',
  requester_user_id: '신청자식별자', decided_by: '결정자식별자', decided_at: '결정일시', actor_user_id: '처리자식별자',
  note: '비고', baseline_id: '기준선식별자', control_code: '통제코드', applicability: '적용구분',
  alternative_reason: '대체사유', owner_id: '담당자식별자', due_date: '기한일시', sort_order: '정렬순서',
  control_id: '통제식별자', kind: '종류', file_id: '파일식별자', reference_uri: '참조URI', scope: '범위',
  submitted_by: '제출자식별자', submitted_at: '제출일시', review_status: '검토상태', reviewed_by: '검토자식별자',
  reviewed_at: '검토일시', review_comment: '검토의견', stored_name: '저장파일명', original_name: '원본파일명',
  mime: 'MIME유형', size_bytes: '크기바이트', sha256: 'SHA256해시', cause: '원인', impact: '영향도',
  resolution: '조치결과', reconfirmed_by: '재확인자식별자', reconfirmed_at: '재확인일시',
  affected_control_ids: '영향통제식별자목록', reassess_required: '재평가필요여부', reassess_reason: '재평가사유',
  item_code: '항목코드', test_criteria: '시험기준', test_data: '시험데이터', evidence_ready: '증적준비여부',
  body: '본문', residual_risk: '잔여위험', source: '출처구분', asked_by: '질의자식별자', asked_at: '질의일시',
  answered_by: '응답자식별자', answered_at: '응답일시', recorded_by: '기록자식별자', link_type: '연결유형',
  ref_id: '참조식별자', ref_title: '참조명', owner_user_id: '소유자식별자', member_role: '멤버역할',
  joined_at: '가입일시', purpose: '목적', start_at: '시작일시', end_at: '종료일시', visibility: '가시성',
  idempotency_key: '멱등키', invitee_id: '초대대상식별자', invited_by: '초대자식별자', invited_at: '초대일시',
  responded_at: '응답일시', necessity: '필요성', utilization_plan: '활용계획', author_id: '작성자식별자',
  attachment_uri: '첨부URI', view_count: '조회수', reviewer_id: '검토자식별자', decision: '결정구분',
  category: '분류', summary: '요약', provider: '제공자', access_type: '접근유형', link_url: '연결URL',
  permission_id: '권한식별자', evidence_id: '증적식별자', proposal_id: '제안식별자',
  active: '활성여부', item_id: '항목식별자', work_request_id: '업무신청식별자', execution_status: '실행상태',
  value: '설정값', value_type: '값유형', old_value: '이전값', new_value: '이후값', changed_by: '변경자식별자',
  changed_at: '변경일시', unit: '단위', unit_price: '단가', currency: '통화코드', valid_to: '유효종료일시',
  owner_type: '소유자유형', balance: '잔액', account_id: '계정식별자', amount: '금액',
  unit_price_snapshot: '단가스냅샷', quantity: '수량', ref_type: '참조유형', requested_by: '신청자식별자',
  requested_at: '신청일시', decision_reason: '결정사유', subject_type: '대상유형', security_grade: '보안등급',
  public_consent: '공개동의여부', public_scope: '공개범위', usage_permission: '사용허가내용',
  approved_file_version: '승인파일버전',
  profile: '프로필정보',
  release_id: '사전버전식별자', source_type: '원천유형', source_uri: '원천URI', source_hash: '원천해시',
  mapping_status: '매핑상태', institution_version: '기관표준버전', institution_source: '기관표준출처',
  table_count: '테이블수', column_count: '컬럼수', imported_at: '적재일시', domain_id: '도메인식별자',
  logical_name: '논리명', data_type: '자료형', precision: '길이정밀도', definition: '정의',
  institution_domain_id: '기관도메인식별자', word_id: '단어식별자', english_name: '영문명',
  abbreviation: '약어', institution_word_id: '기관단어식별자', term_id: '용어식별자',
  word_ids: '구성단어식별자목록', institution_term_id: '기관용어식별자', code_group: '코드그룹',
  code_value: '코드값', applies_to: '적용대상', institution_code_id: '기관코드식별자',
  schema_name: '스키마명', table_name: '테이블명', column_name: '컬럼명', is_nullable: 'NULL허용여부',
  is_primary_key: '기본키여부', default_expression: '기본값표현식', references: '참조관계',
  constraints: '제약조건', sensitivity: '보안개인정보분류', retention_policy: '보존정책',
  source_migration: '원천마이그레이션',
};
const COLUMN_KO_OVERRIDE = {
  'fc_krmf_baseline.version': '기준선버전(문서)',
  'fc_krmf_evidence.version': '증적버전',
  'fc_portal_setting.key': '설정키',
  'fc_idempotency_keys.key': '멱등키',
  'fc_idempotency_keys.result': '저장결과',
  'fc_idempotency_keys.actor': '행위자식별자',
  'fc_krmf_evidence.scope': '적용범위',
  'fc_project_member.role': '멤버역할',
  'fc_project_invite.role': '멤버역할',
  'fc_outbox_events.type': '이벤트유형',
  'fc_credit_transaction.type': '거래유형',
  'fc_credit_request.type': '신청유형',
  'fc_proposal.type': '제안유형',
  'fc_audit_events.result': '처리결과',
  'fc_audit_events.subject': '외부주체식별자',
  'fc_tenant_memberships.approved_by': '승인자식별자',
};

const SECURITY_PII = new Set(['email', 'display_name']);
const SECURITY_PII_TABLE_COL = new Set(['fc_external_identities.subject', 'fc_audit_events.subject', 'fc_audit_events.issuer', 'fc_user_profiles.profile']);
const SECURITY_SECRET = new Set(['sha256', 'integrity_digest', 'payload_hash']);

const RETENTION = {
  fc_audit_events: '감사원장: 무기한 보존(별도 보존지침 확정 전까지, 임시)',
  fc_outbox_events: '처리 완료 후 90일 보존(임시)',
  fc_idempotency_keys: '만료일시 경과 후 90일 보존(임시)',
  fc_request_events: '원 신청과 동일 수명(임시)',
  fc_membership_changes: '이력 무기한 보존(임시)',
  fc_portal_setting_history: '이력 무기한 보존(임시)',
  fc_krmf_file: '평가 인가 확정 후 5년 보존(임시)',
  fc_transfer_file: '반출 승인 완료 후 5년 보존(임시)',
};
const defaultRetention = '영구 보존(임시)';

// ── CSV 유틸 ─────────────────────────────────────────────────────────

const csvCell = v => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvWrite = (file, header, rows) => {
  const lines = [header, ...rows.map(r => r.map(csvCell).join(','))];
  writeFileSync(path.join(OUT_DIR, file), '﻿' + lines.join('\n') + '\n', 'utf8');
  console.log(`${file}: ${rows.length}행`);
};

// ── 메인 ─────────────────────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true });
const { tables, enumChecks } = parseMigrations();
const tableList = [...tables.values()];

// 1) DATA_DICTIONARY.csv
const ddHeader = ['엔티티한글명', '엔티티물리명', '컬럼한글명(임시)', '컬럼물리명', '정의(임시)',
  '표준용어ID', '표준단어ID', '도메인ID', '자료형', '길이·정밀도', 'NULL여부', '기본값', 'PK', 'FK',
  '코드셋(CHECK enum 값 목록)', '보안·개인정보구분', '소유자', '원천(migration 파일명)', '보존정책(임시)', '버전', '매핑상태'];
const ddRows = [];
let unresolvedKo = [];
for (const t of tableList) {
  const eko = ENTITY_KO[t.name] ?? '';
  if (!eko) unresolvedKo.push(`엔티티한글명 누락: ${t.name}`);
  for (const c of t.columns) {
    const ko = COLUMN_KO_OVERRIDE[`${t.name}.${c.name}`] ?? COLUMN_KO[c.name] ?? '';
    if (!ko) unresolvedKo.push(`${t.name}.${c.name}`);
    const check = enumChecks.get(`${t.name}.${c.name}`);
    const pkCols = t.columns.filter(x => x.primary);
    const pk = c.primary ? (pkCols.length > 1 ? 'Y(복합)' : 'Y') : '';
    const fk = c.fk.map(f => `${f.table}(${f.cols.join(',')})`).join(';');
    const sec = SECURITY_PII.has(c.name) || SECURITY_PII_TABLE_COL.has(`${t.name}.${c.name}`)
      ? '개인정보' : SECURITY_SECRET.has(c.name) ? '비밀관련' : '일반';
    ddRows.push([
      eko, t.name, ko, c.name, `${eko || t.name}의 ${ko || c.name}`,
      '', '', '', // 표준용어ID·표준단어ID·도메인ID — 기관 기준 미수령으로 공란
      c.type, c.length ?? (c.type === 'numeric' ? '' : '가변'),
      c.nullable ? 'NULL 허용' : 'NOT NULL',
      c.default ?? '', pk, fk, check ? check.codes.join('|') : '',
      sec, '포털', [...t.files].join(','), RETENTION[t.name] ?? defaultRetention, '1', '임시정의',
    ]);
  }
}
if (unresolvedKo.length) {
  console.error('한글명 미매핑 항목(수동 보완 필요):');
  for (const u of unresolvedKo) console.error('  - ' + u);
  process.exitCode = 1;
}
csvWrite('DATA_DICTIONARY.csv', ddHeader, ddRows);

// 2) STANDARD_WORDS.csv (프로젝트 임시 표준안)
const words = [
  ['신청', 'request', 'REQ', '업무 처리를 요청하는 행위'], ['승인', 'approve', 'APV', '신청 등을 허가하는 결정'],
  ['테넌트', 'tenant', 'TNT', '포털 내 독립된 운영 단위(군/기관 단위)'], ['증적', 'evidence', 'EVD', '통제 이행을 입증하는 자료'],
  ['통제', 'control', 'CTL', '보안 요구사항을 구현하는 관리 항목'], ['크레딧', 'credit', 'CRD', '플랫폼 자원 사용 단위의 화폐적 수량'],
  ['반출', 'export', 'XPT', '망/플랫폼 밖으로 자료를 반출하는 행위'], ['반입', 'import', 'IMP', '외부에서 망/플랫폼으로 자료를 반입하는 행위'],
  ['프로젝트', 'project', 'PRJ', '업무 수행을 위한 작업 단위'], ['사용자', 'user', 'USR', '포털을 사용하는 계정 주체'],
  ['소속', 'membership', 'MBR', '테넌트 내 사용자 소속 관계'], ['역할', 'role', 'ROL', '권한 묶음의 명칭'],
  ['권한', 'permission', 'PRM', '수행 가능한 작업의 허가 단위'], ['감사', 'audit', 'ADT', '행위를 기록하고 검증하는 활동'],
  ['기준선', 'baseline', 'BSL', '평가 대상의 기준이 되는 구성'], ['조치', 'action', 'ACT', '문제에 대한 시정 활동'],
  ['변경', 'change', 'CHG', '구성이나 정책의 수정'], ['평가', 'evaluation', 'EVL', '적합성을 판정하는 활동'],
  ['코드', 'code', 'COD', '분류를 위한 기호'], ['명칭', 'name', 'NME', '객체의 이름'],
  ['상태', 'status', 'STA', '처리 단계를 나타내는 값'], ['일시', 'datetime', 'DTT', '날짜와 시각(UTC)'],
  ['식별자', 'identifier', 'ID', '객체를 고유하게 식별하는 값'], ['버전', 'version', 'VER', '변경 이력 구분용 순번'],
  ['사유', 'reason', 'RSN', '결정의 근거 설명'], ['제목', 'title', 'TTL', '문서의 제목'],
  ['본문', 'body', 'BDY', '문서의 본문 내용'], ['파일', 'file', 'FIL', '저장된 전자문서'],
  ['계정', 'account', 'ACC', '크레딧 잔액의 주체 단위'], ['거래', 'transaction', 'TRX', '크레딧의 증감 기록'],
  ['상품', 'product', 'PDT', '크레딧 단가가 정해진 자원 단위'], ['인가', 'authorization', 'AUT', '기관의 사용 허가'],
  ['위임', 'delegation', 'DGT', '권한의 기간 한정 이양'], ['그룹', 'group', 'GRP', '사용자 묶음'],
  ['조직', 'organization', 'ORG', '소속의 조직 단위'], ['설정', 'setting', 'SET', '구성값의 집합'],
  ['제안', 'proposal', 'PPS', '개선 아이디어의 게시'], ['검토', 'review', 'RVW', '내용의 심사'],
  ['카탈로그', 'catalog', 'CAT', '서비스·도구의 목록'], ['공감', 'sympathy', 'SMP', '제안에 대한 동의 표시'],
  ['초대', 'invite', 'INV', '프로젝트 참여 권유'], ['연결', 'link', 'LNK', '객체 간의 참조 관계'],
  ['추적', 'trace', 'TRC', '요청 흐름의 추적'], ['이벤트', 'event', 'EVT', '발생한 사실의 기록'],
  ['이력', 'history', 'HST', '변경의 기록'], ['수량', 'quantity', 'QTY', '계량 가능한 양'],
  ['단가', 'unit price', 'UPR', '단위당 가격'], ['금액', 'amount', 'AMT', '화폐 가치의 양'],
  ['보안', 'security', 'SEC', '정보 보호 속성'], ['등급', 'grade', 'GRD', '수준 구분'],
  ['목적', 'purpose', 'PUR', '행위의 의도'], ['범위', 'scope', 'SCP', '적용 경계'],
  ['유형', 'type', 'TYP', '분류의 종류'], ['분류', 'category', 'CTG', '체계적 구분'],
  ['제공자', 'provider', 'PRV', '서비스를 제공하는 주체'], ['사용', 'use', 'USE', '이용 행위'],
  ['결과', 'result', 'RST', '처리의 결론'], ['시작', 'start', 'SRT', '개시'],
  ['종료', 'end', 'END', '종결'], ['만료', 'expiration', 'EXP', '유효기간의 끝'],
  ['유효', 'valid', 'VAL', '효력이 있는'], ['생성', 'creation', 'CRT', '최초 작성'],
  ['수정', 'modification', 'UPD', '내용 변경'], ['저장', 'storage', 'STO', '보존'],
  ['크기', 'size', 'SIZ', '용량의 양'], ['표시명', 'display name', 'DSP', '화면에 보이는 이름'],
  ['이메일', 'email', 'EML', '전자우편 주소'], ['발급기관', 'issuer', 'ISS', '신원을 발급한 기관'],
  ['주체', 'subject', 'SBJ', '신원의 대상 식별자'], ['검증', 'verification', 'VRF', '진위 확인'],
  ['해시', 'hash', 'HSH', '무결성 확인용 요약값'], ['다이제스트', 'digest', 'DGS', '요약 값'],
  ['조회', 'view', 'VW', '정보를 찾아보는 행위'], ['계획', 'plan', 'PLN', '수행 방안'],
  ['필요성', 'necessity', 'NCS', '필요한 이유'], ['요약', 'summary', 'SMY', '간략한 설명'],
  ['항목', 'item', 'ITM', '목록의 단위'], ['결정', 'decision', 'DCS', '판단의 결론'],
  ['처리', 'handling', 'HDL', '작업의 수행'], ['공개', 'disclosure', 'DSC', '대외 개방'],
  ['동의', 'consent', 'CNT', '허락'], ['접근', 'access', 'ACS', '사용자 도달'],
  ['실행', 'execution', 'EXE', '수행'], ['시험', 'test', 'TST', '기능 검증 활동'],
  ['여부', 'flag', 'FLG', '참/거짓 구분'], ['멤버', 'member', 'MEM', '구성원'],
  ['값', 'value', 'VLU', '데이터의 내용'], ['스냅샷', 'snapshot', 'SNP', '시점별 복사본'],
  ['원인', 'cause', 'CAU', '문제의 근원'], ['영향도', 'impact', 'IPD', '피해의 정도'],
  ['위험', 'risk', 'RSK', '불확실한 손해'], ['기준', 'criteria', 'CRI', '판정 기준'],
  ['참조', 'reference', 'REF', '다른 대상을 가리킴'], ['대상', 'target', 'TGT', '적용되는 개체'],
  ['가입', 'join', 'JON', '그룹·프로젝트 등에 참여'], ['응답', 'response', 'RSP', '요청에 대한 회신'],
];
const wordIds = {};
const wRows = words.map(([ko, en, ab, def], i) => {
  const id = `TMP-W-${String(i + 1).padStart(3, '0')}`;
  wordIds[ko] = id;
  return [id, ko, en, ab, def, '임시정의'];
});
csvWrite('STANDARD_WORDS.csv', ['단어ID(임시)', '한글명', '영문명', '약어', '정의(임시)', '매핑상태'], wRows);

// 3) STANDARD_TERMS.csv (구성 단어 조합, 전부 임시정의)
const termDefs = [
  ['반출신청', 'export request', ['반출', '신청'], '반출을 위한 신청'],
  ['반입신청', 'import request', ['반입', '신청'], '반입을 위한 신청'],
  ['크레딧계정', 'credit account', ['크레딧', '계정'], '크레딧 잔액 계정'],
  ['크레딧거래', 'credit transaction', ['크레딧', '거래'], '크레딧 증감 거래'],
  ['크레딧상품', 'credit product', ['크레딧', '상품'], '크레딧 단가 상품'],
  ['크레딧신청', 'credit request', ['크레딧', '신청'], '크레딧 부여·충전 신청'],
  ['크레딧잔액', 'credit balance', ['크레딧', '금액'], '계정별 크레딧 잔액'],
  ['통제코드', 'control code', ['통제', '코드'], '통제 항목의 코드'],
  ['증적파일', 'evidence file', ['증적', '파일'], '증적으로 제출된 파일'],
  ['반출파일', 'export file', ['반출', '파일'], '반출 대상 파일'],
  ['승인일시', 'approval datetime', ['승인', '일시'], '승인이 결정된 일시'],
  ['신청일시', 'request datetime', ['신청', '일시'], '신청이 접수된 일시'],
  ['생성일시', 'creation datetime', ['생성', '일시'], '레코드가 생성된 일시'],
  ['수정일시', 'modification datetime', ['수정', '일시'], '레코드가 수정된 일시'],
  ['만료일시', 'expiration datetime', ['만료', '일시'], '유효기간이 끝나는 일시'],
  ['유효시작일시', 'valid start datetime', ['유효', '시작', '일시'], '유효 기간의 시작 일시'],
  ['유효종료일시', 'valid end datetime', ['유효', '종료', '일시'], '유효 기간의 종료 일시'],
  ['테넌트식별자', 'tenant identifier', ['테넌트', '식별자'], '테넌트의 고유 식별자'],
  ['사용자식별자', 'user identifier', ['사용자', '식별자'], '사용자의 고유 식별자'],
  ['프로젝트식별자', 'project identifier', ['프로젝트', '식별자'], '프로젝트의 고유 식별자'],
  ['조직식별자', 'organization identifier', ['조직', '식별자'], '조직의 고유 식별자'],
  ['그룹식별자', 'group identifier', ['그룹', '식별자'], '그룹의 고유 식별자'],
  ['역할식별자', 'role identifier', ['역할', '식별자'], '역할의 고유 식별자'],
  ['권한식별자', 'permission identifier', ['권한', '식별자'], '권한의 고유 식별자'],
  ['파일식별자', 'file identifier', ['파일', '식별자'], '파일의 고유 식별자'],
  ['계정식별자', 'account identifier', ['계정', '식별자'], '계정의 고유 식별자'],
  ['신청자식별자', 'requester identifier', ['신청', '사용자', '식별자'], '신청을 수행한 사용자 식별자'],
  ['승인자식별자', 'approver identifier', ['승인', '사용자', '식별자'], '승인을 수행한 사용자 식별자'],
  ['결정사유', 'decision reason', ['결정', '사유'], '결정의 근거'],
  ['변경사유', 'change reason', ['변경', '사유'], '변경의 근거'],
  ['검토상태', 'review status', ['검토', '상태'], '검토 진행 상태'],
  ['감사이벤트', 'audit event', ['감사', '이벤트'], '감사 대상 행위의 기록'],
  ['시험항목', 'test item', ['시험', '항목'], '시험 준비 대상 항목'],
  ['보안등급', 'security grade', ['보안', '등급'], '자료의 보안 수준'],
  ['공개범위', 'disclosure scope', ['공개', '범위'], '공개 허용 범위'],
  ['공개동의여부', 'disclosure consent flag', ['공개', '동의', '여부'], '공개에 대한 동의 여부'],
  ['사용여부', 'use flag', ['사용', '여부'], '사용 가능 여부'],
  ['활성여부', 'active flag', ['상태', '여부'], '활성 상태 여부'],
  ['처리결과', 'handling result', ['처리', '결과'], '작업의 처리 결과'],
  ['멤버역할', 'member role', ['멤버', '역할'], '프로젝트 내 멤버 역할'],
  ['카탈로그항목', 'catalog item', ['카탈로그', '항목'], '카탈로그의 개별 항목'],
  ['제안유형', 'proposal type', ['제안', '유형'], '제안의 분류'],
  ['접근유형', 'access type', ['접근', '유형'], '접근 방식 분류'],
  ['실행상태', 'execution status', ['실행', '상태'], '실행 진행 상태'],
  ['설정분류', 'setting category', ['설정', '분류'], '설정의 분류'],
  ['설정값', 'setting value', ['설정', '값'], '설정의 값'],
  ['검증여부', 'verification flag', ['검증', '여부'], '검증 완료 여부'],
  ['조회수', 'view count', ['조회', '수량'], '조회한 횟수'],
  ['단가스냅샷', 'unit price snapshot', ['단가', '스냅샷'], '거래 시점의 단가 복사본'],
  ['영향도', 'impact level', ['영향도'], '피해 영향의 정도'],
  ['잔여위험', 'residual risk', ['위험'], '조치 후 남은 위험'],
  ['시험기준', 'test criteria', ['시험', '기준'], '시험 수행의 판정 기준'],
  ['연결유형', 'link type', ['연결', '유형'], '통제 연결의 유형'],
  ['참조식별자', 'reference identifier', ['참조', '식별자'], '참조 대상의 식별자'],
  ['멱등키', 'idempotency key', ['식별자'], '중복 처리 방지용 클라이언트 키'],
  ['초대일시', 'invite datetime', ['초대', '일시'], '초대를 발송한 일시'],
  ['응답일시', 'response datetime', ['응답', '일시'], '초대에 응답한 일시'],
  ['가입일시', 'join datetime', ['가입', '일시'], '멤버 가입 일시'],
];
const tRows = termDefs.map(([ko, en, parts, def], i) => [
  `TMP-T-${String(i + 1).padStart(3, '0')}`, ko, en,
  parts.map(p => wordIds[p]).join('+'), def, '임시정의',
]);
const missingParts = termDefs.filter(([, , parts]) => parts.some(p => !wordIds[p]));
if (missingParts.length) {
  console.error('구성단어 미존재 용어:', missingParts.map(t => t[0]).join(', '));
  process.exitCode = 1;
}
csvWrite('STANDARD_TERMS.csv', ['용어ID(임시)', '한글용어명', '영문명', '구성단어ID(임시)', '정의(임시)', '매핑상태'], tRows);

// 4) STANDARD_DOMAINS.csv (프로젝트 임시 도메인 표준안)
const domains = [
  ['식별자', 'uuid', null, '객체 고유 식별자(UUID)'], ['코드', 'text', null, '분류·상태 등 코드 값'],
  ['명칭', 'text', null, '객체의 명칭'], ['설명', 'text', null, '설명 문구'],
  ['금액수량', 'numeric', '20,4', '금액·수량(정수 오차 방지)'], ['일시', 'timestamptz', null, 'UTC 날짜시각'],
  ['상태코드', 'text', null, '상태 분류 코드(CHECK 제약)'], ['여부', 'boolean', null, '참/거짓'],
  ['URL', 'text', null, '통합자원표시자'], ['JSON문서', 'jsonb', null, '구조화 문서'],
  ['정수', 'integer', null, '일반 정수'], ['대용량정수', 'bigint', null, '큰 정수(바이트 수 등)'],
  ['해시값', 'text', '64', 'SHA-256 등 16진 해시 문자열'], ['이메일', 'text', null, '전자우편 주소'],
];
csvWrite('STANDARD_DOMAINS.csv',
  ['도메인ID(임시)', '도메인명', '자료형', '길이·정밀도', '설명(임시)', '매핑상태'],
  domains.map(([n, ty, len, def], i) => [`TMP-D-${String(i + 1).padStart(3, '0')}`, n, ty, len ?? '가변', def, '임시정의']));

// 5) STANDARD_CODES.csv (CHECK enum 코드셋)
const CODE_KO = {
  army: '육군', navy: '해군', airforce: '공군', joint: '합동', marines: '해병대',
  system: '시스템', tenant: '테넌트', project: '프로젝트',
  pending: '대기', active: '활성', suspended: '정지', closed: '종료', ended: '종료',
  user: '사용자', service: '서비스', success: '성공', denied: '거부', failed: '실패',
  leased: '임대', done: '완료', org_move: '조직이동', suspend: '정지', reactivate: '재활성',
  end: '종료', role_revoke: '역할회수', revoked: '취소', expired: '만료', draft: '작성중',
  archived: '보관', applied: '적용', excluded: '제외', alternative: '대체', not_started: '미착수',
  in_progress: '진행중', evidence_submitted: '증적제출', verified: '검증완료', file: '파일',
  reference: '참조', open: '진행', answered: '응답', high: '높음', medium: '보통', low: '낮음',
  recorded: '기록됨', under_review: '검토중', reassessed: '재평가완료', not_ready: '미준비',
  ready: '준비완료', na: '해당없음', submission: '제출', query: '질의', supplement: '보완',
  risk_acceptance: '위험수용', authority_confirmation: '기관확인', linked: '연결됨', unresolved: '미해결',
  requested: '신청됨', reviewing: '검토중', approved: '승인됨', rejected: '반려됨',
  workspace: '작업공간', export: '반출', credit: '크레딧', submitted: '제출됨', decided: '결정됨',
  commented: '코멘트', 'cpu-hour': 'CPU시간', 'gpu-hour': 'GPU시간', 'storage-gb-day': '저장용량일',
  grant: '부여', charge: '충전', deduct: '차감', adjust: '정정', initial_grant: '최초부여',
  adjustment: '정정', cancelled: '취소됨', import: '반입', server: '서버', artifact: '산출물',
  public: '공개', internal: '내부', confidential: '기밀', secret: '비밀', none: '없음', all: '전체',
  in_review: '검토중', supplement_requested: '보완요청', member: '멤버', manager: '관리자',
  viewer: '조회자', owner: '소유자', closing: '종료중', invited: '초대됨', accepted: '수락됨',  declined: '거절됨', feature: '기능개선', improvement: '개선', bug: '결함', operation: '운영',
  notice: '공지', tool: '도구', dataset: '데이터셋', model: '모델', analysis: '분석',
  development: '개발', data: '데이터', visualization: '시각화', labeling: '라벨링',
  portal: '포털', external: '외부', apply: '신청', direct_link: '직접연결',
  pending_platform: '플랫폼대기', provisioning: '제공중', common: '일반', security: '보안',
  resource: '자원', string: '문자열', number: '숫자', boolean: '논리값', json: 'JSON',
  project_draft: '프로젝트임시안', institution: '기관원본', provisional: '임시정의', confirmed: '기관확정',
};
const GROUP_KO = {
  'fc_tenants.branch': '군구분코드', 'fc_roles.scope': '역할범위코드', 'fc_users.status': '사용자상태코드',
  'fc_tenant_memberships.status': '소속상태코드', 'fc_delegations.status': '위임상태코드',
  'fc_membership_changes.change_type': '소속변경유형코드', 'fc_audit_events.actor_type': '행위자유형코드',
  'fc_audit_events.result': '감사처리결과코드', 'fc_outbox_events.status': '아웃박스상태코드',
  'fc_work_requests.status': '업무신청상태코드', 'fc_work_requests.type': '업무신청유형코드',
  'fc_request_events.action': '신청이벤트작업코드', 'fc_projects.status': '프로젝트상태코드',
  'fc_project_members.member_role': '프로젝트멤버역할코드', 'fc_krmf_baseline.status': '기준선상태코드',
  'fc_krmf_control.applicability': '통제적용구분코드', 'fc_krmf_control.status': '통제상태코드',
  'fc_krmf_evidence.kind': '증적종류코드', 'fc_krmf_evidence.review_status': '증적검토상태코드',
  'fc_krmf_action.status': '조치상태코드', 'fc_krmf_action.impact': '조치영향도코드',
  'fc_krmf_change.change_type': '변경유형코드', 'fc_krmf_change.status': '변경상태코드',
  'fc_krmf_trr_check.status': '시험준비상태코드', 'fc_krmf_eval_record.kind': '평가기록종류코드',
  'fc_krmf_eval_record.status': '평가기록상태코드', 'fc_krmf_control_link.link_type': '통제연결유형코드',
  'fc_krmf_control_link.status': '통제연결상태코드', 'fc_credit_product.unit': '크레딧상품단위코드',
  'fc_credit_account.owner_type': '크레딧계정소유자유형코드', 'fc_credit_transaction.type': '크레딧거래유형코드',
  'fc_credit_request.type': '크레딧신청유형코드', 'fc_credit_request.owner_type': '크레딧신청소유자유형코드',
  'fc_credit_request.status': '크레딧신청상태코드', 'fc_transfer_request.kind': '반입반출구분코드',
  'fc_transfer_request.subject_type': '반입반출대상유형코드', 'fc_transfer_request.security_grade': '반입반출보안등급코드',
  'fc_transfer_request.public_scope': '반입반출공개범위코드', 'fc_transfer_request.status': '반입반출신청상태코드',
  'fc_project.status': '프로젝트상태코드', 'fc_project.visibility': '프로젝트가시성코드',
  'fc_project_member.role': '프로젝트멤버역할코드', 'fc_project_invite.role': '프로젝트초대역할코드',
  'fc_project_invite.status': '프로젝트초대상태코드', 'fc_proposal.type': '제안유형코드',
  'fc_proposal.visibility': '제안가시성코드', 'fc_proposal.status': '제안상태코드',
  'fc_proposal_review.decision': '제안검토결정코드', 'fc_catalog_item.kind': '카탈로그종류코드',
  'fc_catalog_item.category': '카탈로그분류코드', 'fc_catalog_item.provider': '카탈로그제공자코드',
  'fc_catalog_item.access_type': '카탈로그접근유형코드', 'fc_catalog_application.status': '카탈로그신청상태코드',
  'fc_catalog_application.execution_status': '카탈로그실행상태코드', 'fc_portal_setting.category': '설정분류코드',
  'fc_portal_setting.value_type': '설정값유형코드',
  'fc_metadata_releases.source_type': '메타데이터원천유형코드',
  'fc_metadata_releases.mapping_status': '메타데이터매핑상태코드',
  'fc_metadata_columns.mapping_status': '메타데이터컬럼매핑상태코드',
};
const cRows = [];
let gi = 0;
for (const [tcol, check] of [...enumChecks.entries()].sort()) {
  const [table, column] = tcol.split('.');
  gi += 1;
  const gid = `TMP-C-${String(gi).padStart(3, '0')}`;
  const gko = GROUP_KO[tcol] ?? `${table}.${column} 코드`;
  for (const code of check.codes) {
    cRows.push([gid, gko, code, CODE_KO[code] ?? code, `${gko}의 값(${code})`, `${table}.${column}`, '임시정의']);
  }
}
csvWrite('STANDARD_CODES.csv',
  ['코드그룹ID(임시)', '코드그룹명', '코드', '코드한글명(임시)', '정의(임시)', '적용테이블.컬럼', '매핑상태'], cRows);

// 6) MDR_MAPPING.csv (기관 원본 미수령 — 전 항목 임시정의)
const mRows = [['전체', '기관 기준 미수령', '기관 기준 미수령', '기관 기준 미수령', '기관 기준 미수령', '전체',
  '*', '기관 표준사전(표준단어·용어·도메인·코드) 미수령', '임시정의',
  '기관 원본 식별자 없음 — 제공되지 않은 공식 ID를 임의 생성하지 않음', '기관 사전 수령 후 항목별 매핑 확정']];
for (const t of tableList) {
  for (const c of t.columns) {
    const ko = COLUMN_KO_OVERRIDE[`${t.name}.${c.name}`] ?? COLUMN_KO[c.name] ?? c.name;
    mRows.push(['컬럼', '기관 기준 미수령', '기관 기준 미수령', '기관 기준 미수령', '기관 기준 미수령',
      `${t.name}.${c.name}`, ko, `${ENTITY_KO[t.name] ?? t.name}의 ${ko}`, '임시정의',
      '기관 표준 용어·도메인 미수령', '기관 사전 수령 후 표준용어ID·도메인ID 매핑']);
  }
}
for (const [tcol, check] of [...enumChecks.entries()].sort()) {
  const gko = GROUP_KO[tcol] ?? `${tcol} 코드`;
  mRows.push(['코드', '기관 기준 미수령', '기관 기준 미수령', '기관 기준 미수령', '기관 기준 미수령',
    tcol, gko, `CHECK 코드셋: ${check.codes.join('|')}`, '임시정의',
    '기관 표준 코드 미수령', '기관 코드표 수령 후 코드·코드명 매핑']);
}
csvWrite('MDR_MAPPING.csv',
  ['매핑구분', '기관원본ID', '기관원본명', '기관버전', '기관출처', '현재ID', '현재명', '현재정의(임시)', '매핑상태', '불일치·예외', '해결방안'],
  mRows);

console.log(`\n테이블 ${tableList.length}개, 컬럼 ${ddRows.length}개, 코드그룹 ${gi}개 추출 완료`);
if (process.exitCode) console.error('한글명 미매핑이 있어 종료 코드 1 — 위 목록을 보완하세요.');
