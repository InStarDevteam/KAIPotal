#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

"${SCRIPT_DIR}/01-create-index.sh"
"${SCRIPT_DIR}/02-seed-sample-data.sh"
"${SCRIPT_DIR}/03-search-test.sh"

echo ""
echo "All OpenSearch setup steps completed."
