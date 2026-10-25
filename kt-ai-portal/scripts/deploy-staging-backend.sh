#!/usr/bin/env bash
set -euo pipefail
# Deploy a review candidate only. Promote the explicit verified revision separately.
GCLOUD_BIN="${GCLOUD_BIN:-gcloud}"
PROJECT_ID=kai-platform-d0ae0
REGION=asia-northeast3
SERVICE=kt-ai-portal-demo
: "${DEPLOY_REVISION:?명시적인 새 revision 이름 필요}"
case "$DEPLOY_REVISION" in "$SERVICE"-*) ;; *) echo 'Unexpected revision service prefix' >&2; exit 1 ;; esac

if [ "${1:-}" = '--promote' ]; then
  CANDIDATE_JSON="$(mktemp)"
  SERVICE_JSON="$(mktemp)"
  trap 'rm -f "$CANDIDATE_JSON" "$SERVICE_JSON"' EXIT
  "$GCLOUD_BIN" run revisions describe "$DEPLOY_REVISION" --project "$PROJECT_ID" --region "$REGION" --format=json > "$CANDIDATE_JSON"
  "$GCLOUD_BIN" run services describe "$SERVICE" --project "$PROJECT_ID" --region "$REGION" --format='json(status.traffic)' > "$SERVICE_JSON"
  python3 - "$CANDIDATE_JSON" "$SERVICE_JSON" "$DEPLOY_REVISION" <<'PY'
import json,sys
revision=json.load(open(sys.argv[1]))
assert any(c.get('type')=='Ready' and c.get('status')=='True' for c in revision.get('status',{}).get('conditions',[])), 'Candidate is not Ready'
traffic=json.load(open(sys.argv[2]))['status']['traffic']
assert any(row.get('revisionName')==sys.argv[3] and row.get('tag')=='portal-review' for row in traffic), 'Candidate is not the portal-review revision'
PY
  "$GCLOUD_BIN" run services update-traffic "$SERVICE" --project "$PROJECT_ID" --region "$REGION" --to-revisions "$DEPLOY_REVISION=100" --quiet
  printf 'Promoted exact revision: %s\n' "$DEPLOY_REVISION"
  exit 0
fi

: "${IMAGE_URI:?고유 버전 IMAGE_URI 필요}"
# Only the image/revision/tag changes; existing DB secrets, SQL mount and min/max are kept.
"$GCLOUD_BIN" run deploy "$SERVICE" --project "$PROJECT_ID" --region "$REGION" \
  --image "$IMAGE_URI" --revision-suffix "${DEPLOY_REVISION#"$SERVICE"-}" \
  --no-traffic --tag portal-review --quiet
SERVICE_JSON="$(mktemp)"
trap 'rm -f "$SERVICE_JSON"' EXIT
"$GCLOUD_BIN" run services describe "$SERVICE" --project "$PROJECT_ID" --region "$REGION" --format='json(status.traffic)' > "$SERVICE_JSON"
CANDIDATE_URL="$(python3 - "$SERVICE_JSON" "$DEPLOY_REVISION" <<'PY'
import json,sys
rows=json.load(open(sys.argv[1]))['status']['traffic']
row=next(row for row in rows if row.get('tag')=='portal-review')
assert row.get('revisionName')==sys.argv[2], 'Review tag does not match candidate'
assert row.get('percent',0)==0, 'Candidate unexpectedly has production traffic'
assert sum(row.get('percent',0) for row in rows if row.get('revisionName')!=sys.argv[2])==100, 'Serving traffic changed'
print(row['url'])
PY
)"
python3 - "$CANDIDATE_URL" <<'PY'
import json,sys,time,urllib.request,urllib.error
url=sys.argv[1]
# Ready can precede propagation of the tagged URL. Retry only transient transport
# failures, sharing one 45-second deadline across both read-only checks.
deadline=time.monotonic()+45
def verify(path, identity=False):
    while True:
        remaining=deadline-time.monotonic()
        if remaining<=0:
            raise RuntimeError('Candidate tag verification timed out after 45 seconds')
        try:
            with urllib.request.urlopen(url+path,timeout=min(5,remaining)) as r:
                if identity:
                    raise RuntimeError('Unauthenticated identity request was accepted')
                assert r.status==200, 'Unexpected candidate health status'
                assert r.headers.get_content_type()=='application/json'
                assert json.load(r)['data']['status']=='ok'
                return
        except urllib.error.HTTPError as e:
            if identity and e.code==401:
                return
            if e.code not in (404,503):
                raise RuntimeError(f'Candidate verification returned HTTP {e.code}') from None
        except (urllib.error.URLError,TimeoutError,ConnectionError):
            pass
        remaining=deadline-time.monotonic()
        if remaining>0:
            time.sleep(min(2,remaining))
verify('/api/portal/v1/health')
verify('/api/portal/v1/me',identity=True)
print('Candidate health and unauthenticated rejection verified')
PY
printf 'Review candidate: %s\nReview URL: %s\n' "$DEPLOY_REVISION" "$CANDIDATE_URL"
printf 'Authenticate and verify business API/DB flows before running this script with --promote.\n'
