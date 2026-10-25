#!/usr/bin/env bash
set -euo pipefail

# Build the Backstage demo image for Firebase Hosting + Cloud Run.
# Run this from the project root (kt-ai-portal/).

: "${IMAGE_NAME:=kt-ai-portal-demo}"
: "${IMAGE_TAG:=latest}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Make demo config substitutions available to Backstage config resolution.
export APP_BASE_URL="${APP_BASE_URL:-}"
export BACKEND_BASE_URL="${BACKEND_BASE_URL:-}"
export PREVIEW_ACCESS_CODE="${PREVIEW_ACCESS_CODE:-}"
export FIREBASE_API_KEY="${FIREBASE_API_KEY:-}"
export FIREBASE_AUTH_DOMAIN="${FIREBASE_AUTH_DOMAIN:-}"
export FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID:-}"
export FIREBASE_APP_ID="${FIREBASE_APP_ID:-}"
export DEMO_ALLOWED_EMAILS="${DEMO_ALLOWED_EMAILS:-}"
export DEMO_ALLOWED_DOMAINS="${DEMO_ALLOWED_DOMAINS:-}"
export DEMO_ADMIN_EMAILS="${DEMO_ADMIN_EMAILS:-}"

echo "==> Installing dependencies"
cd "${PROJECT_ROOT}/backstage-portal"
yarn install --immutable

echo "==> Running TypeScript check"
yarn tsc

echo "==> Building frontend and backend with app-config.demo.yaml"
CONFIG_PATH="$(pwd)/app-config.demo.yaml"
yarn workspace app build --config "${CONFIG_PATH}"
yarn build:backend --config "${CONFIG_PATH}"

cd "${PROJECT_ROOT}"

echo "==> Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG}"
# Use backstage-portal/ as the build context because the Backstage app root lives there.
docker build --platform linux/amd64 \
  --build-arg APP_BASE_URL="${APP_BASE_URL}" \
  --build-arg BACKEND_BASE_URL="${BACKEND_BASE_URL}" \
  --build-arg PREVIEW_ACCESS_CODE="${PREVIEW_ACCESS_CODE}" \
  --build-arg FIREBASE_API_KEY="${FIREBASE_API_KEY}" \
  --build-arg FIREBASE_AUTH_DOMAIN="${FIREBASE_AUTH_DOMAIN}" \
  --build-arg FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID}" \
  --build-arg FIREBASE_APP_ID="${FIREBASE_APP_ID}" \
  --build-arg DEMO_ALLOWED_EMAILS="${DEMO_ALLOWED_EMAILS}" \
  --build-arg DEMO_ALLOWED_DOMAINS="${DEMO_ALLOWED_DOMAINS}" \
  --build-arg DEMO_ADMIN_EMAILS="${DEMO_ADMIN_EMAILS}" \
  -f Dockerfile.demo -t "${IMAGE_NAME}:${IMAGE_TAG}" backstage-portal

echo "==> Demo image built successfully"
echo "    Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "    Next: push to Artifact Registry and deploy to Cloud Run via deploy-demo-cloudrun.sh"
