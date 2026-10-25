#!/bin/bash
# Kimi stage completion marker
STAGE="${1:-unknown}"
echo "[$(date -Iseconds)] stage ${STAGE} done" >> "$(dirname "$0")/kimi_done.log"
echo "Stage ${STAGE} marked as done."
