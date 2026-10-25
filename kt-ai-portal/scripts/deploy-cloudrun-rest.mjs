#!/usr/bin/env node
/**
 * Cloud Run 서비스 배포 (gcloud 없이 Admin API v2 사용).
 *
 * 안전 경로:
 *   1) 새 revision을 tag=review, 트래픽 0%로 배포
 *   2) 태그 URL로 검증(호출자가 수행)
 *   3) 별도 실행(--promote)으로 트래픽 100% 전환
 *
 * 기존 Secret Manager 참조·SQL 연결·인스턴스 설정은 보존한다. 값을 출력하지 않는다.
 *
 * 사용:
 *   DEPLOY_IMAGE=... DEPLOY_REVISION=... node scripts/deploy-cloudrun-rest.mjs
 *   DEPLOY_REVISION=... node scripts/deploy-cloudrun-rest.mjs --promote
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { candidatePlan, promotePlan } from './lib/cloudrun-release-plan.mjs';

const PROJECT = 'kai-platform-d0ae0';
const REGION = 'asia-northeast3';
const SERVICE = 'kt-ai-portal-demo';
const IMAGE = process.env.DEPLOY_IMAGE;
const REVISION = process.env.DEPLOY_REVISION;
const TAG = 'review';
const PROMOTE = process.argv.includes('--promote');
if (!REVISION || !REVISION.startsWith(`${SERVICE}-`) || (!PROMOTE && !IMAGE)) {
  throw new Error('Explicit DEPLOY_REVISION and (for candidate deployment) DEPLOY_IMAGE are required');
}

const cfgPath = path.join(os.homedir(), '.config/configstore/firebase-tools.json');
const tokens = JSON.parse(fs.readFileSync(cfgPath, 'utf8')).tokens || {};

async function getToken() {
  if (tokens.expires_at && tokens.expires_at > Date.now() + 60000) return tokens.access_token;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('token refresh failed');
  return data.access_token;
}

const token = await getToken();
const base = `https://run.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/services/${SERVICE}`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

const cur = await fetch(base, { headers });
if (!cur.ok) {
  console.error('GET service failed:', cur.status, (await cur.text()).slice(0, 300));
  process.exit(1);
}
const svc = await cur.json();

const patchService = async (body, mask) => {
  const r = await fetch(`${base}?updateMask=${mask}`, {
    method: 'PATCH', headers, body: JSON.stringify(body),
  });
  if (!r.ok) {
    console.error('PATCH failed:', r.status, (await r.text()).slice(0, 500));
    process.exit(1);
  }
  return r.json();
};

const waitOp = async op => {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 8000));
    const o = await fetch(`https://run.googleapis.com/v2/${op.name}`, { headers });
    const s = await o.json();
    if (s.done) {
      if (s.error) {
        console.error('operation failed:', JSON.stringify(s.error).slice(0, 400));
        process.exit(1);
      }
      return;
    }
    process.stdout.write('.');
  }
  console.error('operation timeout');
  process.exit(1);
};

if (PROMOTE) {
  // Pin the verified revision; never promote an unrelated latest deployment.
  const response = await fetch(`${base}/revisions/${REVISION}`, { headers });
  if (!response.ok) throw new Error(`Candidate revision lookup failed: ${response.status}`);
  const plan = promotePlan(svc, REVISION, await response.json(), TAG);
  const op = await patchService(plan, 'traffic');
  await waitOp(op);
  console.log(`\ntraffic 100% -> ${REVISION}`);
  process.exit(0);
}

// Preserve existing SQL mounts, Secret Manager versions and scaling settings.
const plan = candidatePlan(svc, { image: IMAGE, revision: REVISION, tag: TAG });
const op = await patchService(plan, 'template,traffic');
console.log('deploy operation started:', op.name);
await waitOp(op);
console.log(`\nreview revision deployed: ${REVISION} (tag=${TAG}, traffic 0%).`);
console.log('Authenticate and validate the candidate before an explicit --promote run.');
