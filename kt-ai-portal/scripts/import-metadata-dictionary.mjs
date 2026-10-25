#!/usr/bin/env node
import {createRequire} from 'node:module';
import {dictionarySnapshot,importDictionary} from './lib/metadata-dictionary.mjs';
const require=createRequire(new URL('../backstage-portal/packages/backend/package.json',import.meta.url));
const knex=require('knex');
const apply=process.argv.includes('--apply');
const version=process.env.METADATA_VERSION||'portal-draft-20261004';
if(!/^[a-zA-Z0-9._-]{1,80}$/.test(version))throw new Error('Invalid metadata version');
if(!process.env.POSTGRES_USER||!process.env.POSTGRES_PASSWORD)throw new Error('Database credentials required');
const db=knex({client:'pg',connection:{host:process.env.POSTGRES_HOST||'127.0.0.1',port:Number(process.env.POSTGRES_PORT||5432),database:process.env.POSTGRES_DB||'portal_business',user:process.env.POSTGRES_USER,password:process.env.POSTGRES_PASSWORD},pool:{min:0,max:2}});
try {
  const snapshot=await dictionarySnapshot(db,process.env.MDR_DATA_DIR||'docs/data-readiness-20261004/data');
  const counts=Object.fromEntries(['columns','domains','words','terms','codes'].map(k=>[k,snapshot[k].length]));
  console.log(JSON.stringify({apply,version,tableCount:snapshot.tableCount,...counts,mappingStatus:'provisional',institutionDictionaryReceived:false,...(apply?await importDictionary(db,snapshot,version):{})}));
}finally{await db.destroy();}
