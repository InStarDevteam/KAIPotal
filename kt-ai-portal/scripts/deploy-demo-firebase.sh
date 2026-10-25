#!/usr/bin/env bash
set -euo pipefail

# Deploy Firebase Hosting for the demo custom domain.
# Prerequisites:
#   - firebase CLI installed and logged in
#   - .firebaserc configured (or use FIREBASE_PROJECT_ID)
#   - firebase.json already points all traffic to the Cloud Run service

: "${FIREBASE_PROJECT_ID:?FIREBASE_PROJECT_ID is required}"
: "${DEMO_DOMAIN:?DEMO_DOMAIN is required, e.g. demo.kbcosmos.com}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

echo "==> Ensuring firebase.json service ID is set"
if ! grep -q '"serviceId": "kt-ai-portal-demo"' firebase.json; then
  echo "WARNING: firebase.json serviceId does not match kt-ai-portal-demo"
fi

echo "==> Deploying Firebase Hosting"
firebase deploy --only hosting --project "${FIREBASE_PROJECT_ID}"

echo "==> Configuring custom domain in Firebase Hosting"
echo "   Run the following command and complete the DNS verification:"
echo "   firebase hosting:channel:open demo --project ${FIREBASE_PROJECT_ID}"
echo ""
echo "   For the production site, add the custom domain via Firebase Console:"
echo "   https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/hosting/sites"
echo ""
echo "==> Gavia DNS configuration example"
echo "   Record type: CNAME"
echo "   Host       : ${DEMO_DOMAIN%.kbcosmos.com}"
echo "   Value      : <Firebase-provided target>"
echo ""
echo "After DNS propagation and SSL provisioning, the demo will be available at:"
echo "   https://${DEMO_DOMAIN}"
