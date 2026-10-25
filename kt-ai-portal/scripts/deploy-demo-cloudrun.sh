#!/usr/bin/env bash
set -euo pipefail

# Deploy the Backstage demo backend to Google Cloud Run.
# Prerequisites:
#   - gcloud CLI authenticated and configured
#   - Docker image pushed to Artifact Registry (or use gcloud builds submit)
#   - Firebase Hosting is deployed separately via deploy-demo-firebase.sh

: "${GCP_PROJECT_ID:?GCP_PROJECT_ID is required}"
: "${REGION:=asia-northeast3}"
: "${CLOUD_RUN_SERVICE:=kt-ai-portal-demo}"
: "${DEMO_DOMAIN:?DEMO_DOMAIN is required, e.g. demo.kbcosmos.com}"
: "${PREVIEW_ACCESS_CODE:?PREVIEW_ACCESS_CODE is required}"
: "${AUTH_SESSION_SECRET:?AUTH_SESSION_SECRET is required}"

: "${FIREBASE_API_KEY:=}"
: "${FIREBASE_AUTH_DOMAIN:=}"
: "${FIREBASE_PROJECT_ID:=}"
: "${FIREBASE_APP_ID:=}"
: "${DEMO_ALLOWED_EMAILS:=}"
: "${DEMO_ALLOWED_DOMAINS:=}"

: "${IMAGE_NAME:=kt-ai-portal-demo}"
: "${IMAGE_TAG:=latest}"
: "${ARTIFACT_REGISTRY:=${REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/kt-ai-portal/${IMAGE_NAME}}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

echo "==> Tagging and pushing image to Artifact Registry"
docker tag "${IMAGE_NAME}:${IMAGE_TAG}" "${ARTIFACT_REGISTRY}:${IMAGE_TAG}"
docker push "${ARTIFACT_REGISTRY}:${IMAGE_TAG}"

echo "==> Deploying to Cloud Run"
gcloud run deploy "${CLOUD_RUN_SERVICE}" \
  --project "${GCP_PROJECT_ID}" \
  --region "${REGION}" \
  --image "${ARTIFACT_REGISTRY}:${IMAGE_TAG}" \
  --platform managed \
  --allow-unauthenticated \
  --port 7007 \
  --set-env-vars "APP_BASE_URL=https://${DEMO_DOMAIN}" \
  --set-env-vars "BACKEND_BASE_URL=https://${DEMO_DOMAIN}" \
  --set-env-vars "PREVIEW_ACCESS_CODE=${PREVIEW_ACCESS_CODE}" \
  --set-env-vars "AUTH_SESSION_SECRET=${AUTH_SESSION_SECRET}" \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "FIREBASE_API_KEY=${FIREBASE_API_KEY}" \
  --set-env-vars "FIREBASE_AUTH_DOMAIN=${FIREBASE_AUTH_DOMAIN}" \
  --set-env-vars "FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}" \
  --set-env-vars "FIREBASE_APP_ID=${FIREBASE_APP_ID}" \
  --set-env-vars "DEMO_ALLOWED_EMAILS=${DEMO_ALLOWED_EMAILS}" \
  --set-env-vars "DEMO_ALLOWED_DOMAINS=${DEMO_ALLOWED_DOMAINS}"

echo "==> Cloud Run service deployed"
gcloud run services describe "${CLOUD_RUN_SERVICE}" \
  --project "${GCP_PROJECT_ID}" \
  --region "${REGION}" \
  --format 'value(status.url)'

echo ""
echo "Next step: run ./scripts/deploy-demo-firebase.sh to deploy Firebase Hosting"
