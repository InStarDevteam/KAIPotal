#!/usr/bin/env bash
set -euo pipefail
# 빌드된 bundle만 전송하므로 .env·원본 문서·로컬 자격증명이 업로드되지 않는다.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${IMAGE_URI:?고유 버전 또는 commit 기반 IMAGE_URI가 필요합니다}"
GCLOUD_BIN="${GCLOUD_BIN:-gcloud}"
BUILD_CONTEXT="$(mktemp -d)"
trap 'rm -rf "$BUILD_CONTEXT"' EXIT
cp "$ROOT_DIR/Dockerfile.staging" "$BUILD_CONTEXT/Dockerfile"
cp "$ROOT_DIR/backstage-portal/"{package.json,yarn.lock,backstage.json,.yarnrc.yml,app-config.demo.yaml,app-config.customer-showcase.yaml} "$BUILD_CONTEXT/"
mkdir -p "$BUILD_CONTEXT/.yarn/releases"
cp "$ROOT_DIR/backstage-portal/.yarn/releases/"*.cjs "$BUILD_CONTEXT/.yarn/releases/"
cp "$ROOT_DIR/backstage-portal/packages/backend/dist/"{skeleton.tar.gz,bundle.tar.gz} "$BUILD_CONTEXT/"
"$GCLOUD_BIN" builds submit "$BUILD_CONTEXT" --project kai-platform-d0ae0 --tag "$IMAGE_URI" --timeout=1800s
