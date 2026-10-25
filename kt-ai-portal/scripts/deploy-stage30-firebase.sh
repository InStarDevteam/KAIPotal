#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

# Source local .env for AUTH_SESSION_SECRET (do not print).
if [ -f "${PROJECT_ROOT}/backstage-portal/.env" ]; then
  set +x
  # shellcheck source=/dev/null
  source "${PROJECT_ROOT}/backstage-portal/.env"
  set -x
fi

# Fetch Firebase Web SDK config and export (output suppressed).
set +x
firebase_json="$(firebase apps:sdkconfig WEB --project kai-platform-d0ae0 --json 2>/dev/null)"
export FIREBASE_API_KEY="$(echo "${firebase_json}" | jq -r '.result.sdkConfig.apiKey')"
export FIREBASE_AUTH_DOMAIN="$(echo "${firebase_json}" | jq -r '.result.sdkConfig.authDomain')"
export FIREBASE_PROJECT_ID="$(echo "${firebase_json}" | jq -r '.result.sdkConfig.projectId')"
export FIREBASE_APP_ID="$(echo "${firebase_json}" | jq -r '.result.sdkConfig.appId')"

# Validate that required values were extracted.
if [ -z "${FIREBASE_API_KEY}" ] || [ "${FIREBASE_API_KEY}" = "null" ]; then
  echo "ERROR: Failed to extract Firebase API key. Check firebase apps:sdkconfig output." >&2
  exit 1
fi
set -x

export APP_BASE_URL="https://kai-platform-d0ae0.web.app"
export BACKEND_BASE_URL="https://kai-platform-d0ae0.web.app"
# 접근코드는 환경변수로 주입해야 한다 (소스에 평문 기록 금지)
if [ -z "${PREVIEW_ACCESS_CODE}" ]; then
  echo "ERROR: PREVIEW_ACCESS_CODE 환경변수가 필요합니다. 예) PREVIEW_ACCESS_CODE=<접근코드> $0" >&2
  exit 1
fi
export PREVIEW_ACCESS_CODE
export DEMO_ADMIN_EMAILS="kyubeom@gmail.com"
export DEMO_ALLOWED_EMAILS="kyubeom@gmail.com"
export DEMO_ALLOWED_DOMAINS="gmail.com"

cd "${PROJECT_ROOT}/backstage-portal"

echo "==> Installing dependencies"
yarn install --immutable

echo "==> Running TypeScript check"
yarn tsc

echo "==> Building frontend"
yarn workspace app build --config "$(pwd)/app-config.demo.yaml"

cd "${PROJECT_ROOT}"

echo "==> Deploying Firebase Hosting"
firebase deploy --only hosting --project kai-platform-d0ae0

echo "==> Deployed to https://kai-platform-d0ae0.web.app"
