#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"

cd "${PROJECT_ROOT}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "[start-dev] Error: ${ENV_FILE} not found."
  echo "[start-dev] Please copy .env.example to .env and fill in the secrets."
  exit 1
fi

# Load .env into the current shell, ignoring comments and blank lines
# Using eval for compatibility with older bash versions (e.g. macOS default bash 3.2)
# shellcheck disable=SC2046
export $(grep -v '^#' "${ENV_FILE}" | grep -v '^$' | xargs)

if [ -z "${AUTH_OIDC_CLIENT_SECRET:-}" ]; then
  echo "[start-dev] Error: AUTH_OIDC_CLIENT_SECRET is not set."
  exit 1
fi

if [ -z "${AUTH_SESSION_SECRET:-}" ]; then
  echo "[start-dev] Error: AUTH_SESSION_SECRET is not set."
  exit 1
fi

echo "[start-dev] Environment variables loaded from ${ENV_FILE}"
echo "[start-dev] Starting Backstage dev server..."

exec yarn start
