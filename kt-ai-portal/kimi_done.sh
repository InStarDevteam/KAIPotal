#!/usr/bin/env bash
# kim_done.sh - 22.2단계 완료 보고 스크립트
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG="$ROOT/kimi_done.log"

exec > >(tee -a "$LOG") 2>&1

echo "=========================================="
echo "kimi_done.sh executed: $(date -Iseconds)"
echo "Working directory: $ROOT"
echo "Current branch: $(git -C "$ROOT" branch --show-current)"
echo "Latest commit: $(git -C "$ROOT" log -1 --oneline)"
echo ""

echo "--- Git status ---"
git -C "$ROOT" status --short || true

echo ""
echo "--- Security level typo verification (docs/proposal-package/src excluding node_modules/.git) ---"
python3 - <<'PY'
import os, re
BAD = ['\uB0AD','남부','낫부','낮부']
GOOD = re.compile(r'공개\s*[`\s]*[/,]\s*[`\s]*\uB0B4\uBD80\s*[`\s]*[/,]\s*[`\s]*비밀')
search_roots = ['docs','proposal-package','backstage-portal/packages','README.md','notes']
bad_paths=[]
good_paths=[]
for r in search_roots:
    if os.path.isfile(r):
        all_paths=[r]
    else:
        all_paths=[]
        for root, dirs, files in os.walk(r):
            if 'node_modules' in root or '.git' in root:
                continue
            for f in files:
                if f.endswith(('.zip','.png','.jpg','.jpeg','.gif','.pdf','.mp4','.mov','.avi','.ttf','.woff','.woff2','.eot')):
                    continue
                all_paths.append(os.path.join(root,f))
    for path in all_paths:
        try:
            with open(path,'rb') as fh:
                txt=fh.read().decode('utf-8','surrogateescape')
                for b in BAD:
                    if b in txt:
                        bad_paths.append((path,b))
                        break
                if GOOD.search(txt):
                    good_paths.append(path)
        except Exception:
            pass
if bad_paths:
    print('BAD patterns found:')
    for p,b in sorted(set(bad_paths)):
        print(f'  {p} -> {repr(b)}')
else:
    print('No bad security-level typos found.')
if good_paths:
    print('Files with correct standard pattern (공개/내부/비밀):')
    for p in sorted(set(good_paths)):
        print(f'  {p}')
else:
    print('No files with the standard slash-separated pattern (other forms may exist).')
PY

echo ""
echo "--- Push attempt ---"
if git -C "$ROOT" push origin main; then
    echo "Push succeeded."
else
    echo "Push failed (PAT/auth issue). Local commit is ready."
fi

echo ""
echo "=========================================="
echo "kimi_done.sh finished: $(date -Iseconds)"
