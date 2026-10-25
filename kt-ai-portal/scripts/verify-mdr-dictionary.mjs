#!/usr/bin/env node
// MDR 산출물(DATA_DICTIONARY·STANDARD_* CSV)을 실제 DB 스키마와 대조 검증한다.
// 접속 관례는 scripts/test-portal-runtime.mjs 상단과 동일(로컬 일회성 DB 전용).
// 로컬 DB에 연결할 수 없거나 portal 스키마를 만들 수 없으면 SKIP으로 종료(실패로 위장하지 않음).
// MDR_OUTPUT_DIR / MDR_RESULT_PATH로 입출력 경로를 분리한다.
// 출시 검증에서는 MDR_REQUIRE_DB=true로 SKIP을 성공으로 간주하지 않는다.
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.resolve(ROOT, process.env.MDR_OUTPUT_DIR ?? 'docs/final-completion/data');
const RESULT_PATH = process.env.MDR_RESULT_PATH
  ? path.resolve(ROOT, process.env.MDR_RESULT_PATH)
  : path.join(DATA_DIR, 'mdr-verification-result.json');
const require = createRequire(new URL('../backstage-portal/packages/backend/package.json', import.meta.url));
const knexFactory = require('knex');

const HOST = process.env.POSTGRES_HOST ?? '127.0.0.1';
const PORT = Number(process.env.POSTGRES_PORT ?? 5432);
if (!['localhost', '127.0.0.1'].includes(HOST)) {
  console.error('로컬 일회성 DB만 허용됩니다(POSTGRES_HOST=' + HOST + ')');
  process.exit(1);
}
const adminConn = { host: HOST, port: PORT, user: 'portal_admin', password: 'local-dev-only', database: 'postgres' };

// ── CSV 파싱 (UTF-8 BOM·인용부호 대응) ───────────────────────────────
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quote = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; continue; }
      if (ch === '"') { quote = false; continue; }
      cell += ch; continue;
    }
    if (ch === '"') { quote = true; continue; }
    if (ch === ',') { row.push(cell); cell = ''; continue; }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = []; continue;
    }
    cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift();
  return rows.map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

async function writeResult(result) {
  await mkdir(path.dirname(RESULT_PATH), { recursive: true });
  await writeFile(RESULT_PATH, JSON.stringify(result, null, 2) + '\n', 'utf8');
}

async function skip(reason) {
  const result = {
    generatedAt: new Date().toISOString(),
    status: 'SKIPPED',
    reason,
    summary: { passed: 0, failed: 0, skipped: 1 },
    checks: {},
  };
  await writeResult(result);
  console.log(`SKIP: ${reason}`);
  console.log(`결과 파일: ${RESULT_PATH}`);
  process.exit(process.env.MDR_REQUIRE_DB === 'true' ? 1 : 0);
}

// ── CSV 로딩 ─────────────────────────────────────────────────────────
let dictionary, terms, words, domains, codes;
try {
  const readCsv = async name => parseCsv(await readFile(path.join(DATA_DIR, name), 'utf8'));
  [dictionary, terms, words, domains, codes] = await Promise.all([
    readCsv('DATA_DICTIONARY.csv'), readCsv('STANDARD_TERMS.csv'),
    readCsv('STANDARD_WORDS.csv'), readCsv('STANDARD_DOMAINS.csv'), readCsv('STANDARD_CODES.csv'),
  ]);
} catch (e) {
  console.error('산출물 CSV 읽기 실패:', e.message);
  process.exit(1);
}

const dictByTable = new Map();
for (const d of dictionary) {
  if (!dictByTable.has(d['엔티티물리명'])) dictByTable.set(d['엔티티물리명'], []);
  dictByTable.get(d['엔티티물리명']).push(d);
}

// ── DB 준비: 연결 확인 → 일회성 DB에 현재 migration 전체 적용 ─────────
let admin;
try {
  const silent = { warn: () => {}, error: () => {}, deprecate: () => {}, debug: () => {} };
  admin = knexFactory({ client: 'pg', connection: adminConn, log: silent });
  await admin.raw('SELECT 1');
} catch {
  await skip('로컬 PostgreSQL(127.0.0.1:5432, kai-portal-pg-local)에 연결할 수 없습니다. ' +
    'docker 컨테이너 kai-portal-pg-local이 실행 중인지 확인하세요.');
}
const dbName = `portal_mdr_verify_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
let owner;
let appliedMigrations = [];
try {
  await admin.raw(`CREATE DATABASE ${dbName}`);
  owner = knexFactory({ client: 'pg', connection: { ...adminConn, database: dbName }, searchPath: ['portal'] });
  await owner.raw('CREATE SCHEMA portal');
  [, appliedMigrations] = await owner.migrate.latest({
    directory: path.join(ROOT, 'backstage-portal/packages/backend/migrations/portal'),
    schemaName: 'portal',
    tableName: 'fc_knex_migrations',
  });
} catch (e) {
  try { await admin?.raw(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`); } catch { /* 정리 실패 무시 */ }
  await skip(`portal 스키마를 준비하지 못했습니다(일회성 DB ${dbName} 생성·migration 실패): ${e.message}`);
}

const cleanup = async () => {
  await owner?.destroy();
  await admin?.raw(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`).catch(() => {});
  await admin?.destroy();
};

try {
  // ── 실제 스키마 조회 ───────────────────────────────────────────────
  const colRows = await owner('information_schema.columns')
    .where({ table_schema: 'portal' })
    .select('table_name', 'column_name', 'data_type', 'numeric_precision', 'numeric_scale',
      'character_maximum_length', 'is_nullable', 'column_default');
  const actualByTable = new Map();
  for (const r of colRows) {
    if (!actualByTable.has(r.table_name)) actualByTable.set(r.table_name, new Map());
    actualByTable.get(r.table_name).set(r.column_name, r);
  }

  const constraintRows = await owner.raw(
    `SELECT conname, conrelid::regclass::text AS table_name, pg_get_constraintdef(oid) AS def
     FROM pg_constraint WHERE connamespace = 'portal'::regnamespace AND contype = 'c'`,
  );

  const checks = {};
  let passed = 0, failed = 0;
  const tally = list => { for (const it of list) { it.ok ? passed++ : failed++; } };

  // a) 데이터 사전(테이블,컬럼) vs information_schema.columns
  const aIssues = [];
  for (const [table, cols] of dictByTable) {
    const actual = actualByTable.get(table);
    if (!actual) {
      aIssues.push({ ok: false, table, column: '*', issue: '사전 테이블이 DB에 없음' });
      continue;
    }
    for (const c of cols) {
      if (!actual.has(c['컬럼물리명'])) {
        aIssues.push({ ok: false, table, column: c['컬럼물리명'], issue: '사전 컬럼이 DB에 없음(사전 누락)' });
      }
    }
    for (const [colName] of actual) {
      if (!cols.some(c => c['컬럼물리명'] === colName)) {
        aIssues.push({ ok: false, table, column: colName, issue: 'DB에만 존재하는 컬럼(사전 미기재)' });
      }
    }
  }
  for (const table of actualByTable.keys()) {
    if (/^fc_knex_migrations/.test(table)) continue;
    if (!dictByTable.has(table)) {
      aIssues.push({ ok: false, table, column: '*', issue: 'DB 테이블이 사전에 없음' });
    }
  }
  for (const table of dictByTable.keys()) {
    const actual = actualByTable.get(table);
    if (actual && !aIssues.some(issue => issue.table === table)) {
      aIssues.push({ ok: true, table, column: '*', issue: `사전 컬럼 ${dictByTable.get(table).length}개 확인` });
    }
  }
  tally(aIssues);
  checks.a_dictionaryCoverage = {
    description: 'DATA_DICTIONARY.csv (테이블,컬럼) ↔ information_schema.columns 일치',
    total: dictionary.length,
    issues: aIssues.filter(i => !i.ok),
  };

  // b) 표준용어의 구성 단어가 STANDARD_WORDS에 존재
  const wordIds = new Set(words.map(w => w['단어ID(임시)']));
  const bIssues = terms.map(t => {
    const parts = (t['구성단어ID(임시)'] || '').split('+').filter(Boolean);
    const missing = parts.filter(p => !wordIds.has(p));
    return { ok: parts.length > 0 && missing.length === 0, term: t['한글용어명'], missing,
      ...(parts.length ? {} : { issue: '구성단어가 비어 있음' }) };
  });
  tally(bIssues);
  checks.b_termWords = {
    description: 'STANDARD_TERMS 구성단어ID 존재 여부',
    total: terms.length,
    issues: bIssues.filter(i => !i.ok),
  };

  // c) STANDARD_CODES 코드셋 ↔ 실제 DB CHECK 제약(pg_constraint)
  const expected = new Map();
  for (const c of codes) {
    const key = c['적용테이블.컬럼'];
    if (!expected.has(key)) expected.set(key, new Set());
    expected.get(key).add(c['코드']);
  }
  // CHECK 제약 정의에서 단일 컬럼 enum("컬럼 = ANY(ARRAY[...])" 또는 "컬럼 IN (...)")만 파싱
  // — 복합 조건(부호 규칙·본문 검증 등)은 코드셋 대상이 아니므로 제외
  const actualChecks = new Map(); // "table.column" -> Set(codes)
  for (const r of constraintRows.rows) {
    let inner = r.def.replace(/^CHECK\s*\(/s, '').replace(/\)\s*$/s, '');
    if (inner.startsWith('(') && inner.endsWith(')')) inner = inner.slice(1, -1);
    const m = inner.match(/^\s*(\w+)\s*=\s*ANY\s*\(ARRAY\[(.*)\]\s*\)\s*$/s)
      || inner.match(/^\s*(\w+)\s+IN\s*\((.*)\)\s*$/s);
    if (!m) continue;
    const literals = [...m[2].matchAll(/'((?:[^'\\]|\\.)*)'::/g)].map(x => x[1]);
    if (!literals.length) continue;
    actualChecks.set(`${r.table_name}.${m[1]}`, new Set(literals));
  }
  const cIssues = [];
  for (const [key, exp] of expected) {
    const act = actualChecks.get(key);
    if (!act) { cIssues.push({ ok: false, key, issue: 'DB에 해당 CHECK 제약 없음' }); continue; }
    const missing = [...exp].filter(x => !act.has(x));
    const extra = [...act].filter(x => !exp.has(x));
    cIssues.push({ ok: !missing.length && !extra.length, key, missing, extra });
  }
  for (const key of actualChecks.keys()) {
    if (!expected.has(key)) cIssues.push({ ok: false, key, issue: 'DB 코드 CHECK가 사전에 없음' });
  }
  tally(cIssues);
  checks.c_codeSets = {
    description: 'STANDARD_CODES 코드셋 ↔ pg_constraint CHECK 일치',
    total: expected.size,
    issues: cIssues.filter(i => !i.ok),
  };

  // d) 자료형/길이 일치
  const TYPE_MAP = {
    uuid: 'uuid', text: 'text', integer: 'integer', bigint: 'bigint',
    boolean: 'boolean', jsonb: 'jsonb', timestamptz: 'timestamp with time zone',
    timestamp: 'timestamp without time zone', varchar: 'character varying', date: 'date',
  };
  const dIssues = [];
  for (const [table, cols] of dictByTable) {
    const actual = actualByTable.get(table);
    if (!actual) continue;
    for (const c of cols) {
      const col = actual.get(c['컬럼물리명']);
      if (!col) continue;
      let ok = false, detail = '지원하지 않는 사전 자료형';
      const dictType = c['자료형'];
      if (dictType === 'numeric') {
        const [p, s] = (c['길이·정밀도'] || '').split(',');
        ok = col.data_type === 'numeric'
          && Number(col.numeric_precision) === Number(p) && Number(col.numeric_scale) === Number(s);
        detail = `사전 numeric(${p},${s}) vs DB ${col.data_type}(${col.numeric_precision},${col.numeric_scale})`;
      } else if (TYPE_MAP[dictType]) {
        ok = col.data_type === TYPE_MAP[dictType];
        detail = `사전 ${dictType} vs DB ${col.data_type}`;
        if (dictType === 'varchar') {
          ok = ok && Number(col.character_maximum_length) === Number(c['길이·정밀도']);
          detail += ` (${c['길이·정밀도']} vs ${col.character_maximum_length})`;
        }
      }
      dIssues.push({ ok, table, column: c['컬럼물리명'], detail });
    }
  }
  tally(dIssues);
  checks.d_dataTypes = {
    description: '자료형/길이·정밀도 일치',
    total: dIssues.length,
    issues: dIssues.filter(i => !i.ok),
  };

  // e-1) 중복 용어/단어
  const dupCheck = (list, key) => {
    const seen = new Map();
    for (const item of list) {
      const k = item[key];
      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
    return [...seen.entries()].filter(([, n]) => n > 1).map(([k, n]) => ({ ok: false, key: k, count: n }));
  };
  const dupTerms = dupCheck(terms, '한글용어명');
  const dupWords = dupCheck(words, '한글명');
  const duplicateTermIds = dupCheck(terms, '용어ID(임시)');
  const duplicateWordIds = dupCheck(words, '단어ID(임시)');
  const dupDomains = dupCheck(domains, '도메인ID(임시)');
  // 컬럼 이름은 테이블별 유일하므로 복합 키로 별도 점검한다.
  const columnKeys = dictionary.map(row => ({ key: `${row['엔티티물리명']}.${row['컬럼물리명']}` }));
  const duplicateColumns = dupCheck(columnKeys, 'key');
  tally(dupTerms); tally(dupWords); tally(duplicateTermIds); tally(duplicateWordIds); tally(dupDomains); tally(duplicateColumns);

  // e-2) 고아 FK 참조: FK가 가리키는 테이블·컬럼이 사전에 존재하는지
  const orphanFks = [];
  for (const [table, cols] of dictByTable) {
    for (const c of cols) {
      const fkField = c['FK'] || '';
      if (!fkField) continue;
      for (const ref of fkField.split(';')) {
        const m = ref.trim().match(/^(\w+)\(([^)]+)\)$/);
        if (!m) { orphanFks.push({ ok: false, table, column: c['컬럼물리명'], issue: `FK 형식 비정상: ${ref}` }); continue; }
        const [, refTable, refCols] = m;
        const refDict = dictByTable.get(refTable);
        if (!refDict) { orphanFks.push({ ok: false, table, column: c['컬럼물리명'], issue: `FK 대상 테이블 없음: ${refTable}` }); continue; }
        for (const rc of refCols.split(',')) {
          if (!refDict.some(d => d['컬럼물리명'] === rc.trim())) {
            orphanFks.push({ ok: false, table, column: c['컬럼물리명'], issue: `FK 대상 컬럼 없음: ${refTable}.${rc.trim()}` });
          }
        }
      }
    }
  }
  tally(orphanFks);

  // e-3) tenant_id 누락: fc_ 업무 테이블 중 tenant 범위가 아닌 예외만 제외
  const TENANT_EXEMPT = new Set(['fc_users', 'fc_external_identities', 'fc_roles', 'fc_permissions', 'fc_role_permissions', 'fc_tenants',
    'fc_metadata_releases', 'fc_metadata_domains', 'fc_metadata_words', 'fc_metadata_terms', 'fc_metadata_codes', 'fc_metadata_columns']);
  const tenantMissing = [...dictByTable.keys()]
    .filter(t => !TENANT_EXEMPT.has(t) && !dictByTable.get(t).some(d => d['컬럼물리명'] === 'tenant_id'))
    .map(t => ({ ok: false, table: t, issue: 'tenant_id 컬럼 없음' }));
  tally(tenantMissing);

  checks.e_integrity = {
    description: '중복 용어·고아 FK·tenant_id 누락',
    duplicateTerms: dupTerms, duplicateWords: dupWords,
    duplicateTermIds, duplicateWordIds,
    duplicateDomains: dupDomains, duplicateColumns,
    orphanFkCount: orphanFks.length,
    tenantMissing,
  };

  // f) 사전 PK/NULL/FK를 실제 PostgreSQL 제약과 대조한다.
  // FK 대상 이름만 존재한다고 실제 FK가 설치·검증되어 있다고 볼 수 없다.
  const relationalConstraints = await owner.raw(`
    SELECT c.conname, c.contype, c.convalidated, r.relname AS table_name,
      ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, position)
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum ORDER BY k.position) AS columns,
      rr.relname AS referenced_table,
      ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY AS k(attnum, position)
        JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.attnum ORDER BY k.position) AS referenced_columns
    FROM pg_constraint c JOIN pg_class r ON r.oid = c.conrelid
      LEFT JOIN pg_class rr ON rr.oid = c.confrelid
    WHERE c.connamespace = 'portal'::regnamespace AND c.contype IN ('p','f')`);
  const fIssues = [];
  const normalizeDefault = (value, type) => {
    let normalized = String(value ?? '')
      .replace(/::(?:text|jsonb|boolean|integer|bigint|numeric|uuid|character varying)(?:\[\])?/g, '')
      .trim().replace(/^CURRENT_TIMESTAMP$/i, 'now()');
    if (['numeric', 'integer', 'bigint'].includes(type)) normalized = normalized.replace(/^'(-?\d+(?:\.\d+)?)'$/, '$1');
    return normalized;
  };
  for (const row of dictionary) {
    const table = row['엔티티물리명'], column = row['컬럼물리명'];
    const actual = actualByTable.get(table)?.get(column);
    if (!actual) continue;
    const primary = relationalConstraints.rows.some(c => c.contype === 'p' && c.table_name === table && c.columns.includes(column));
    fIssues.push({ ok: Boolean(row.PK) === primary, table, column, check: 'PK', expected: Boolean(row.PK), actual: primary });
    const required = row.NULL여부 === 'NOT NULL';
    fIssues.push({ ok: required === (actual.is_nullable === 'NO'), table, column, check: 'NULL', expected: row.NULL여부, actual: actual.is_nullable });
    fIssues.push({ ok: normalizeDefault(row.기본값, row.자료형) === normalizeDefault(actual.column_default, row.자료형),
      table, column, check: 'DEFAULT', expected: row.기본값, actual: actual.column_default });
    const expectedFks = new Set((row.FK || '').split(';').map(value => value.trim()).filter(Boolean));
    const actualFks = new Set(relationalConstraints.rows
      .filter(c => c.contype === 'f' && c.table_name === table && c.columns.includes(column))
      .map(c => `${c.referenced_table}(${c.referenced_columns.join(',')})`));
    fIssues.push({ ok: expectedFks.size === actualFks.size && [...expectedFks].every(value => actualFks.has(value)),
      table, column, check: 'FK', expected: [...expectedFks], actual: [...actualFks] });
  }
  for (const c of relationalConstraints.rows.filter(c => c.contype === 'f')) {
    fIssues.push({ ok: c.convalidated, table: c.table_name, constraint: c.conname, check: 'FK validated' });
  }
  tally(fIssues);
  checks.f_relationalConstraints = {
    description: 'PK·NULL·기본값·FK 정의 및 FK 검증 상태 ↔ 실제 PostgreSQL 제약',
    total: fIssues.length, issues: fIssues.filter(issue => !issue.ok),
  };

  // g) 도메인의 기술 형식 및 기관 매핑 상태를 확인한다. 기관 승인 검증은 아니다.
  const gIssues = domains.map(domain => ({
    ok: Boolean(domain['도메인ID(임시)']) && Boolean(domain.도메인명)
      && Boolean(TYPE_MAP[domain.자료형] || domain.자료형 === 'numeric')
      && (domain.자료형 !== 'numeric' || /^\d+,\d+$/.test(domain['길이·정밀도'])),
    domain: domain['도메인ID(임시)'], check: 'domain format',
  }));
  for (const [source, rows] of [['dictionary', dictionary], ['terms', terms], ['words', words], ['domains', domains], ['codes', codes]]) {
    gIssues.push({ ok: rows.length > 0 && rows.every(row => row.매핑상태 === '임시정의'),
      source, check: 'provisional status', issue: '기관 표준사전 미수령 상태를 유지해야 함' });
  }
  tally(gIssues);
  checks.g_domainsAndProvenance = {
    description: '임시 도메인 기술 형식·기관 매핑 미수령 상태(기관 승인 검증 제외)',
    total: gIssues.length, issues: gIssues.filter(issue => !issue.ok),
  };

  const result = {
    generatedAt: new Date().toISOString(),
    status: failed === 0 ? 'PASSED' : 'FAILED',
    database: `일회성 로컬 DB ${dbName}(${appliedMigrations.length}개 migration 전체 적용, 검증 후 삭제)`,
    appliedMigrations,
    institutionStandardReceived: false,
    dictionaryRows: dictionary.length,
    tableCount: dictByTable.size,
    checks,
    summary: { passed, failed, skipped: 0 },
  };
  await writeResult(result);

  console.log('─ MDR 산출물 검증 요약 ───────────────────────');
  console.log(`데이터 사전: ${dictionary.length}행 / ${dictByTable.size}테이블`);
  for (const [k, v] of Object.entries(checks)) {
    const bad = v.issues ? v.issues.length : (v.duplicateTerms.length + v.duplicateWords.length + v.duplicateTermIds.length + v.duplicateWordIds.length + v.duplicateDomains.length + v.duplicateColumns.length + v.orphanFkCount + v.tenantMissing.length);
    console.log(`${k}: ${bad === 0 ? 'OK' : `문제 ${bad}건`}`);
  }
  console.log(`통과 ${passed} / 실패 ${failed}`);
  console.log(`결과 파일: ${RESULT_PATH}`);
  await cleanup();
  process.exit(failed === 0 ? 0 : 1);
} catch (e) {
  await cleanup();
  console.error('검증 중 오류:', e.message);
  process.exit(1);
}
