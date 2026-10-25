import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const digest = value => createHash('sha256').update(value).digest('hex');
export const dictionaryId = value => {
  const h = digest(value); return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
};
export function parseCsv(text) {
  const rows=[]; let row=[],cell='',quoted=false;
  const source=text.replace(/^\uFEFF/,'');
  for(let i=0;i<source.length;i++) {
    const c=source[i];
    if(quoted) { if(c==='"' && source[i+1]==='"'){cell+='"';i++;} else if(c==='"') quoted=false; else cell+=c; }
    else if(c==='"') quoted=true;
    else if(c===','){row.push(cell);cell='';}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&source[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(quoted)throw new Error('Unterminated dictionary CSV field');
  if(cell||row.length){row.push(cell);rows.push(row);}
  const header=rows.shift();
  if(!header)throw new Error('Empty dictionary CSV');
  return rows.map(cells=>Object.fromEntries(header.map((key,index)=>[key,cells[index]??''])));
}
export async function dictionarySnapshot(db, directory) {
  const files=['DATA_DICTIONARY.csv','STANDARD_DOMAINS.csv','STANDARD_WORDS.csv','STANDARD_TERMS.csv','STANDARD_CODES.csv'];
  const contents=await Promise.all(files.map(name=>readFile(`${directory}/${name}`,'utf8')));
  const [definitions,sourceDomains,sourceWords,sourceTerms,sourceCodes]=contents.map(parseCsv);
  const fields=(await db.raw(`SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default,character_maximum_length,numeric_precision,numeric_scale
    FROM information_schema.columns WHERE table_schema='portal' AND table_name LIKE 'fc_%' AND table_name NOT LIKE 'fc_knex_%'
    ORDER BY table_name,ordinal_position`)).rows;
  const constraints=(await db.raw(`SELECT c.relname AS table_name,con.conname,con.contype,pg_get_constraintdef(con.oid) AS definition,
    ARRAY(SELECT a.attname::text FROM unnest(con.conkey) WITH ORDINALITY AS key(attnum,position) JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=key.attnum ORDER BY key.position) AS columns
    FROM pg_constraint con JOIN pg_class c ON con.conrelid=c.oid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='portal' AND c.relname LIKE 'fc_%' AND c.relname NOT LIKE 'fc_knex_%' ORDER BY c.relname,con.conname`)).rows;
  if(!fields.length)throw new Error('No portal business schema found');
  const definitionsByKey=new Map(definitions.map(row=>[`${row['엔티티물리명']}.${row['컬럼물리명']}`,row]));
  if(definitionsByKey.size!==definitions.length)throw new Error('Duplicate dictionary columns');
  for(const [kind,rows,key] of [['domain',sourceDomains,'도메인ID(임시)'],['word',sourceWords,'단어ID(임시)'],['term',sourceTerms,'용어ID(임시)']]) {
    const ids=rows.map(r=>r[key]);if(ids.some(id=>!id)||new Set(ids).size!==ids.length)throw new Error(`Invalid or duplicate dictionary ${kind} IDs`);
  }
  const actualKeys=new Set(fields.map(f=>`${f.table_name}.${f.column_name}`));
  const missing=fields.filter(f=>!definitionsByKey.has(`${f.table_name}.${f.column_name}`));
  const extra=definitions.filter(d=>!actualKeys.has(`${d['엔티티물리명']}.${d['컬럼물리명']}`));
  if(missing.length||extra.length)throw new Error(`Dictionary/schema mismatch: missing=${missing.length}, extra=${extra.length}; regenerate and verify MDR files first`);
  const domains=new Map(sourceDomains.map(d=>[d['도메인ID(임시)'],{domain_id:d['도메인ID(임시)'],logical_name:d['도메인명'],data_type:d['자료형'],precision:d['길이·정밀도'],definition:d['설명(임시)']} ]));
  const words=sourceWords.map(w=>({word_id:w['단어ID(임시)'],logical_name:w['한글명'],english_name:w['영문명'],abbreviation:w['약어'],definition:w['정의(임시)']}));
  const wordIds=new Set(words.map(w=>w.word_id));
  const terms=sourceTerms.map(t=>({term_id:t['용어ID(임시)'],logical_name:t['한글용어명'],english_name:t['영문명'],word_ids:t['구성단어ID(임시)']?t['구성단어ID(임시)'].split('+'):[],definition:t['정의(임시)']}));
  for(const term of terms)if(!term.word_ids.length||term.word_ids.some(id=>!wordIds.has(id)))throw new Error(`Unknown dictionary word in ${term.term_id}`);
  const normalizeDefault=(value,type)=>{
    let v=String(value??'').replace(/::(?:text|jsonb|boolean|integer|bigint|numeric|uuid|character varying)(?:\[\])?/g,'').trim().replace(/^CURRENT_TIMESTAMP$/i,'now()');
    if(['numeric','integer','bigint'].includes(type))v=v.replace(/^'(-?\d+(?:\.\d+)?)'$/,'$1');return v;
  };
  const typeNames={uuid:'uuid',text:'text',integer:'integer',bigint:'bigint',boolean:'boolean',jsonb:'jsonb',numeric:'numeric',timestamptz:'timestamp with time zone'};
  const columns=fields.map(f=>{
    const d=definitionsByKey.get(`${f.table_name}.${f.column_name}`);
    const cs=constraints.filter(c=>c.table_name===f.table_name&&c.columns.includes(f.column_name));
    if(typeNames[d['자료형']]!==f.data_type || (d['NULL여부']==='NOT NULL')!==(f.is_nullable==='NO') || Boolean(d.PK)!==cs.some(c=>c.contype==='p') || Boolean(d.FK)!==cs.some(c=>c.contype==='f') || normalizeDefault(d['기본값'],d['자료형'])!==normalizeDefault(f.column_default,d['자료형']))throw new Error(`Dictionary technical attributes do not match actual schema: ${f.table_name}.${f.column_name}`);
    if(f.data_type==='numeric'&&d['길이·정밀도']!==`${f.numeric_precision},${f.numeric_scale}`)throw new Error(`Dictionary precision does not match schema: ${f.table_name}.${f.column_name}`);
    const precision=f.data_type==='numeric'?`${f.numeric_precision},${f.numeric_scale}`:f.character_maximum_length===null?null:String(f.character_maximum_length);
    const domainId=`TMP-PG-${f.udt_name}${precision?'-'+precision.replaceAll(',','-'):''}`;
    domains.set(domainId,{domain_id:domainId,logical_name:`${f.data_type}${precision?'('+precision+')':''}`,data_type:f.data_type,precision,definition:'실제 PostgreSQL 자료형으로 추출한 프로젝트 기술 도메인. 기관 승인 도메인 아님.'});
    const termId=`TMP-COL-${f.table_name}.${f.column_name}`;
    terms.push({term_id:termId,logical_name:d['컬럼한글명(임시)'],english_name:f.column_name,word_ids:[],definition:d['정의(임시)']});
    return {schema_name:'portal',table_name:f.table_name,column_name:f.column_name,logical_name:d['컬럼한글명(임시)'],definition:d['정의(임시)'],term_id:termId,domain_id:domainId,data_type:f.data_type,is_nullable:f.is_nullable==='YES',is_primary_key:cs.some(c=>c.contype==='p'),default_expression:f.column_default,references:cs.filter(c=>c.contype==='f').map(c=>({name:c.conname,definition:c.definition})),constraints:cs.filter(c=>c.contype==='c'||c.contype==='u').map(c=>({name:c.conname,definition:c.definition})),sensitivity:d['보안·개인정보구분'],retention_policy:d['보존정책(임시)'],source_migration:d['원천(migration 파일명)'],mapping_status:'provisional'};
  });
  const codes=sourceCodes.map(c=>({code_group:c['코드그룹ID(임시)'],code_value:c['코드'],logical_name:c['코드한글명(임시)'],definition:c['정의(임시)'],applies_to:c['적용테이블.컬럼']}));
  const actualEnums=new Map();
  for(const c of constraints.filter(c=>c.contype==='c')) {
    for(const match of c.definition.matchAll(/\b([a-z_][a-z0-9_]*)\s*=\s*ANY\s*\(\s*ARRAY\[([^\]]+)\]/gi)) {
      const values=[...match[2].matchAll(/'((?:[^']|'')*)'/g)].map(m=>m[1].replaceAll("''","'"));
      if(values.length)actualEnums.set(`${c.table_name}.${match[1]}`,new Set(values));
    }
  }
  const codeKeys=new Set();const byColumn=new Map();
  for(const code of codes){
    if(!actualKeys.has(code.applies_to))throw new Error(`Code has no schema column: ${code.applies_to}`);
    const key=`${code.code_group}:${code.code_value}`;
    if(codeKeys.has(key))throw new Error('Duplicate dictionary code');codeKeys.add(key);
    if(!actualEnums.get(code.applies_to)?.has(code.code_value))throw new Error(`Code does not match actual CHECK: ${code.applies_to}`);
    if(!byColumn.has(code.applies_to))byColumn.set(code.applies_to,new Set());byColumn.get(code.applies_to).add(code.code_value);
  }
  for(const [column,values] of actualEnums)if(values.size!==(byColumn.get(column)?.size??0))throw new Error(`Missing CHECK code values: ${column}`);
  const sourceHash=digest(JSON.stringify({files:contents.map(digest),fields,constraints}));
  return {sourceHash,tableCount:new Set(fields.map(f=>f.table_name)).size,columns,domains:[...domains.values()],words,terms,codes};
}
export async function importDictionary(db, snapshot, version) {
  const releaseId=dictionaryId(`portal-metadata:${version}`);
  return db.transaction(async trx=>{
    await trx.raw("SELECT pg_advisory_xact_lock(hashtext('portal-metadata-import'))");
    const existing=await trx('portal.fc_metadata_releases').where({version}).first();
    if(existing){if(existing.source_hash!==snapshot.sourceHash)throw new Error('Dictionary version already exists with different source; use a new version');return {releaseId:existing.release_id,inserted:false};}
    await trx('portal.fc_metadata_releases').insert({release_id:releaseId,version,source_type:'project_draft',source_uri:'repo:docs/data-readiness-20261004/data',source_hash:snapshot.sourceHash,mapping_status:'provisional',table_count:snapshot.tableCount,column_count:snapshot.columns.length});
    for(const [table,rows] of [['domains',snapshot.domains],['words',snapshot.words],['terms',snapshot.terms],['codes',snapshot.codes],['columns',snapshot.columns]]) {
      for(let i=0;i<rows.length;i+=80)await trx(`portal.fc_metadata_${table}`).insert(rows.slice(i,i+80).map(row=>({release_id:releaseId,...row,...(row.word_ids?{word_ids:JSON.stringify(row.word_ids)}:{}),...(row.references?{references:JSON.stringify(row.references),constraints:JSON.stringify(row.constraints)}:{})})));
    }
    return {releaseId,inserted:true};
  });
}
