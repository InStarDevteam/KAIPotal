#!/usr/bin/env python3
"""승인된 staging의 공개 앱 설정으로 빌드. 비밀은 이미지/프런트 빌드에 주입하지 않는다."""
import json
import os
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1]
gcloud = os.environ.get('GCLOUD_BIN', 'gcloud')
result = subprocess.run([gcloud, 'run', 'services', 'describe', 'kt-ai-portal-demo',
    '--project=kai-platform-d0ae0', '--region=asia-northeast3', '--format=json'],
    check=True, capture_output=True, text=True)
config = json.loads(result.stdout)
values = {v['name']: v['value'] for v in config['spec']['template']['spec']['containers'][0].get('env', []) if 'value' in v}
public_keys = ['PREVIEW_ACCESS_CODE', 'FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID',
    'FIREBASE_APP_ID', 'DEMO_ALLOWED_EMAILS', 'DEMO_ALLOWED_DOMAINS', 'DEMO_ADMIN_EMAILS']
env = os.environ.copy()
for key in public_keys:
    env[key] = os.environ.get(key, values.get(key, ''))
env.update(APP_BASE_URL='https://kai-platform-d0ae0.web.app', BACKEND_BASE_URL='https://kai-platform-d0ae0.web.app',
    PORTAL_DB_HOST='127.0.0.1', PORTAL_DB_USER='build-only', PORTAL_DB_PASSWORD='build-only', AUTH_SESSION_SECRET='build-only')
yarn = ['node', '.yarn/releases/yarn-4.13.0.cjs']
subprocess.run(yarn + ['workspace', 'app', 'build', '--config', str(root / 'backstage-portal/app-config.demo.yaml'),
    '--config', str(root / 'backstage-portal/app-config.customer-showcase.yaml')],
    cwd=root / 'backstage-portal', env=env, check=True)
subprocess.run(yarn + ['workspace', 'backend', 'build', '--skip-build-dependencies'],
    cwd=root / 'backstage-portal', env=env, check=True)
