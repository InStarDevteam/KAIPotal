#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""국방지능형플랫폼 포털 FP요구사항 개발결과 산출물 생성 스크립트.

실행: kt-ai-portal/.venv/bin/python scripts/build-final-excel.py
입력: prompt/final-completion-20260929/FP_요구사항_원문기준.csv (원문 기준선 531행)
      prompt/final-completion-20260929/FP_추출검증.json (K-RMF 26 ID)
      docs/final-completion/evidence/domain-api-tests.json (도메인 HTTP 시험 46건)
      docs/final-completion/data/mdr-verification-result.json (MDR 검증 637건)
출력: docs/final-completion/국방지능형플랫폼_포털_FP요구사항_개발결과.xlsx (10시트)
      docs/final-completion/requirement-status.json (엑셀과 동일 원천의 판정 데이터)

판정 데이터는 이 파일 아래 RULES에 영역·업무 단위로 구조화되어 있으며,
판정 근거는 2026-09-29~30에 재실행한 시험 증적과 실제 코드(main HEAD 01a0908 +
미커밋 변경)다. 그룹 완료를 소속 행에 기계 복제하지 않고, 행 단위 수용기준 문장을
단위프로세스명과 FP 유형별 동작으로 생성한다.
"""
import csv
import json
import sys
from collections import Counter, OrderedDict
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.formatting.rule import CellIsRule
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parent.parent
PROMPT_DIR = ROOT.parent / 'prompt' / 'final-completion-20260929'
CSV_PATH = PROMPT_DIR / 'FP_요구사항_원문기준.csv'
EXTRACT_JSON = PROMPT_DIR / 'FP_추출검증.json'
DOMAIN_JSON = ROOT / 'docs' / 'final-completion' / 'evidence' / 'domain-api-tests.json'
MDR_JSON = ROOT / 'docs' / 'final-completion' / 'data' / 'mdr-verification-result.json'
OUT_XLSX = ROOT / 'docs' / 'final-completion' / '국방지능형플랫폼_포털_FP요구사항_개발결과.xlsx'
OUT_JSON = ROOT / 'docs' / 'final-completion' / 'requirement-status.json'

JUDGE_META = '2026-09-30 / Node 24·Yarn 4.13·PostgreSQL 16(docker) / main@01a0908+미커밋 변경'
JUDGE_DATE = '2026-09-30'
EV_DOMAIN = 'docs/final-completion/evidence/domain-api-tests.json'
EV_MDR = 'docs/final-completion/data/mdr-verification-result.json'
EV_RUNTIME = 'scripts/test-portal-runtime.mjs 실행 로그(2026-09-29 로컬 재실행, 48건 PASS)'
EV_WORK = 'scripts/test-portal-work-api.mjs 실행 로그(2026-09-29 로컬 재실행, 14건 PASS)'
EV_UNIT_BE = 'backstage-portal yarn workspace backend test 실행 로그(2026-09-29, 159건 PASS)'
EV_UNIT_FE = 'backstage-portal yarn workspace app test 실행 로그(2026-09-29, 227건 PASS)'
EV_TSC = 'yarn tsc:full 실행 로그(2026-09-30, 오류 0)'
EV_BUILD = 'yarn build:all 실행 로그(2026-09-29, 성공)'

V_DONE, V_PART, V_NONE, V_UNVER = '완료', '부분완료', '미구현', '미검증'
E_NA, E_READY, E_NOTREADY = '해당없음', '연동준비 완료·실연동 대기', '준비 미비'
F_FULL, F_PART, F_NONE = '충족', '일부충족', '미충족'

# ---------------------------------------------------------------------------
# 판정 규칙: key = "어플리케이션|세부업무|단위프로세스 접두부"
# ---------------------------------------------------------------------------
FE_APP = 'backstage-portal/packages/app/src/components'
BE_MOD = 'backstage-portal/packages/backend/src/modules/portal'
BE_MIG = 'backstage-portal/packages/backend/migrations/portal'


def R(verdict, criteria, scope_p, scope_e='해당없음(포털 내부 처리로 완결)', ext=E_NA,
      test='PASS', screen='', api='', db='', files='', test_ids='', evidence='',
      gap='해당없음', blocker='해당없음', prio='-', follow='해당없음', fulfill=None,
      verdict_by_type=None):
    return dict(verdict=verdict, criteria=criteria, scope_p=scope_p, scope_e=scope_e,
                ext=ext, test=test, screen=screen, api=api, db=db, files=files,
                test_ids=test_ids, evidence=evidence, gap=gap, blocker=blocker,
                prio=prio, follow=follow, fulfill=fulfill,
                verdict_by_type=verdict_by_type or {})


RULES = {}


def add(app, sub, unit, rule):
    RULES[f'{app}|{sub}|{unit}'] = rule


# --- 메인 포털 (22) -------------------------------------------------------
_rt = dict(test_ids='TEST-INT-RUNTIME-001~048', evidence=EV_RUNTIME)
add('메인 포털', '로그인 전 화면', '미로그인 사용자 로그인 유도', R(
    V_DONE, '미로그인 접근 시 로그인 화면으로 유도되고 안내가 표시된다',
    '미로그인 라우팅 차단·로그인 유도 화면·안내 메시지',
    screen='포털 로그인 유도 화면', api='Backstage 인증 라우팅(세션 확인)',
    db='해당없음(세션 상태 기반)', files=f'{FE_APP}/portal-runtime, portal-shell', **_rt))
add('메인 포털', '로그인 후 메인화면', '인증 후 메인 포털 실행', R(
    V_DONE, '인증 성공 후 역할·테넌트에 맞는 메인 포털이 실행된다',
    '인증 후 메인 화면 렌더링·역할별 메뉴 구성',
    screen='포털 메인(/)', api='portal-runtime 세션/프로필 조회',
    db='portal DB 세션·사용자', files=f'{FE_APP}/portal-home, portal-shell', **_rt))
add('메인 포털', '포털 대시보드', '공지·신규자산·상태 현황 표시', R(
    V_DONE, '대시보드에 공지·신규 자산·상태 현황이 실제 데이터로 표시된다',
    '대시보드 카드·공지·자산 현황 조회',
    screen='포털 대시보드', api='portal-runtime overview 집계',
    db='portal DB 공지·자산·상태 테이블', files=f'{FE_APP}/portal-dashboard', **_rt))
add('메인 포털', '사용자 정보', '로그인 사용자 정보 표시', R(
    V_DONE, '로그인 사용자의 이름·소속·역할이 화면에 표시된다',
    '사용자 프로필 표시·역할 배지',
    screen='포털 상단 사용자 정보', api='portal-runtime 프로필 조회',
    db='portal DB 사용자·역할', files=f'{FE_APP}/portal-shell, authz', **_rt))
add('메인 포털', '통합검색창', '메인 화면 통합검색', R(
    V_PART, '메인 화면 검색창에서 포털 자체 원천(메뉴·프로젝트·조직·사용자)을 검색한다',
    '포털 DB 검색·결과 목록·상세 이동',
    scope_e='외부 원천 5종(데이터셋·AI모델·Docker·PyPI·플랫폼 간) 실검색', ext=E_READY,
    screen='통합검색(/integrated-search)', api='GET /v1/search, /v1/search/sources/suggest',
    db='portal DB 메뉴·프로젝트·조직·사용자', files=f'{FE_APP}/integrated-search, {BE_MOD}/routes/portalSearch.ts',
    test_ids='TEST-API-DOMAIN-S15-1~4', evidence=EV_DOMAIN,
    gap='외부 원천 실검색은 integration_pending 상태로 대기',
    blocker='외부 검색 원천 endpoint·인증·규격', prio='P2',
    follow='원천 계약 체결 후 소스 어댑터 연결·재시험'))
add('메인 포털', '플랫폼 바로가기', '연계 플랫폼 링크', R(
    V_DONE, '연계 플랫폼 바로가기 링크가 화면에 표시되고 이동한다',
    '바로가기 링크 표시·이동',
    screen='메인 화면 바로가기 영역', api='해당없음(정적 링크 구성)',
    db='해당없음(구성값)', files=f'{FE_APP}/portal-home', **_rt))
add('메인 포털', '사용자 지원', '서비스 안내/사용자 지원', R(
    V_DONE, '서비스 안내·사용자 지원 정보가 표시된다',
    '안내 화면·지원 정보 표시',
    screen='서비스 안내 화면', api='해당없음(안내 콘텐츠)',
    db='해당없음(구성값)', files=f'{FE_APP}/portal-home', **_rt))
add('메인 포털', '이용 현황 조회', '이용·자원 현황 조회', R(
    V_PART, '이용·자원 현황을 조건 조회하고 출력한다',
    '이용 현황 조회 화면·목록 출력',
    scope_e='자원 실측 사용량 수집(클라우드/CMP)', ext=E_READY,
    screen='이용 현황 화면', api='portal-runtime overview·usage 조회',
    db='portal DB 이용 집계', files=f'{FE_APP}/portal-dashboard',
    gap='집계 원천·기준시각 표시 미비, 실측 사용량 미연동(추이 measured=false)',
    blocker='CMP 사용량 수집 endpoint', prio='P2',
    follow='집계 기준시각 표시 추가, 실측 연동 후 재판정', **_rt))

# --- 로그인/인증 (36) ------------------------------------------------------
add('로그인/인증', '로그인', '멀티 로그인 방식', R(
    V_PART, 'ID/PW 외 인증 수단을 선택해 로그인한다',
    '로컬 ID/PW 로그인(Backstage 인증) 실동작',
    scope_e='기관 SSO 적용(IdP 실연동)', ext=E_READY,
    screen='로그인 방식 선택 화면', api='Backstage auth + SSO 어댑터 자리',
    db='portal DB 사용자·계정상태', files=f'{FE_APP}/portal-runtime, preview-auth',
    gap='SSO 실적용 미구현(어댑터 자리만)', blocker='기관 IdP 메타데이터·연동 승인',
    prio='P1', follow='IdP 연동 후 멀티 로그인 재시험', **_rt))
add('로그인/인증', '로그인', 'ID/PW 로그인', R(
    V_DONE, 'ID/PW 로그인이 실제 계정으로 성공·실패 처리된다',
    'ID/PW 인증·계정상태·소속 검증·실패 처리',
    screen='로그인 화면', api='Backstage 로컬 인증',
    db='portal DB 사용자·로그인 이력', files=f'{FE_APP}/portal-runtime', **_rt))
add('로그인/인증', '로그인', 'MPKI/인증서 로그인', R(
    V_NONE, 'MPKI/인증서로 로그인한다',
    '해당없음(포털 측 실기능 없음)',
    scope_e='MPKI 인증서 검증 전체', ext=E_NOTREADY, test='NOT_RUN',
    screen='해당없음(미구현)', api='해당없음(미구현)', db='해당없음(미구현)',
    files='해당없음(미구현)', test_ids='해당없음(미구현으로 미실행)', evidence='해당없음(미구현)',
    gap='MPKI 로그인 미구현', blocker='MPKI 게이트웨이·인증서 규격·구축 승인',
    prio='P1', follow='MPKI 연계 규격 수령 후 구현'))
add('로그인/인증', '로그인', '본인 확인', R(
    V_NONE, '로그인 전 본인 확인을 수행한다',
    '해당없음(포털 측 실기능 없음)',
    scope_e='본인확인 기관 연계 전체', ext=E_NOTREADY, test='NOT_RUN',
    screen='해당없음(미구현)', api='해당없음(미구현)', db='해당없음(미구현)',
    files='해당없음(미구현)', test_ids='해당없음(미구현으로 미실행)', evidence='해당없음(미구현)',
    gap='본인확인 연동 미구현', blocker='본인확인 기관 연계 규격·계약',
    prio='P1', follow='본인확인 수단 확정 후 구현'))
add('로그인/인증', '로그인', '아이디/비밀번호 찾기', R(
    V_NONE, '아이디/비밀번호 찾기가 안내·발송까지 완결된다',
    '해당없음(포털 측 실기능 없음)',
    scope_e='확인 메일 발송(메일 relay 연동)', ext=E_NOTREADY, test='NOT_RUN',
    screen='해당없음(미구현)', api='해당없음(미구현)', db='해당없음(미구현)',
    files='해당없음(미구현)', test_ids='해당없음(미구현으로 미실행)', evidence='해당없음(미구현)',
    gap='찾기 결과 통보 수단(메일) 백엔드 없음', blocker='메일 relay·발송 규격',
    prio='P2', follow='메일 연동 후 찾기 플로우 구현'))
for _u in ['로그인 실패 차단', '로그인 제한 해제', '중복 로그인 관리', '최근 로그인 정보']:
    add('로그인/인증', '로그인', _u, R(
        V_DONE, f'{_u}이(가) 정책대로 동작하고 이력이 남는다',
        f'{_u} 처리·상태 조회·이력 기록',
        screen='로그인 정책 반영 + 관리 화면', api='portal-runtime 인증 정책 검증',
        db='portal DB 로그인 이력·계정상태', files=f'{FE_APP}/portal-runtime, admin-console', **_rt))
for _u in ['수동 로그아웃', '브라우저 종료 처리', '자동 로그아웃']:
    add('로그인/인증', '로그아웃', _u, R(
        V_DONE, f'{_u} 시 세션이 종료되고 이력이 기록된다',
        f'{_u} 처리·세션 정리·이력 기록',
        screen='로그아웃 동작', api='portal-runtime 세션 종료',
        db='portal DB 세션·로그아웃 이력', files=f'{FE_APP}/portal-runtime', **_rt))

# --- 사용자 관리 (45) ------------------------------------------------------
_admin = dict(screen='관리 콘솔(/admin-console)', api=f'{BE_MOD}/routes/admin.ts',
              db='portal DB 사용자·소속·역할', files=f'{FE_APP}/admin-console, {BE_MOD}/routes/admin.ts',
              test_ids='TEST-INT-RUNTIME-001~048', evidence=EV_RUNTIME)
for _u in ['사용자 등록 신청', '사용자 등록 승인', '승인/반려 처리']:
    add('사용자 관리', '사용자 등록', _u, R(
        V_PART, f'{_u} 플로우가 신청→검토→처리까지 완결된다',
        '관리자 사용자 관리(소속·역할·상태) 실기능',
        scope_e='해당없음(포털 내부 처리)', test='PASS',
        screen='사용자 등록 신청·검토 화면(데모 모드)', api='관리 콘솔 사용자 API(실서버)',
        db='portal DB 사용자', files=f'{FE_APP}/admin-console',
        gap='등록 신청·검토·반려·보완 플로우는 데모 모드 잔존(서버 모드 미연결)',
        blocker='해당없음(내부 보완 작업)', prio='P1',
        follow='등록 신청 서버 모드 연결·승인/반려/보완 전이 시험',
        test_ids='TEST-INT-RUNTIME-001~048', evidence=EV_RUNTIME))
add('사용자 관리', '사용자 등록', '신청자 본인확인', R(
    V_NONE, '등록 신청자의 본인 확인을 수행한다',
    '해당없음(포털 측 실기능 없음)',
    scope_e='본인확인 기관 연계 전체', ext=E_NOTREADY, test='NOT_RUN',
    screen='해당없음(미구현)', api='해당없음(미구현)', db='해당없음(미구현)',
    files='해당없음(미구현)', test_ids='해당없음(미구현으로 미실행)', evidence='해당없음(미구현)',
    gap='신청 본인확인 연동 미구현', blocker='본인확인 기관 연계 규격·계약',
    prio='P1', follow='본인확인 수단 확정 후 등록 플로우에 결합'))
for _u in ['사용자 목록 조회', '사용자 정보 수정', '사용자 분류', '접속 여부 설정', '계정 상태 관리']:
    add('사용자 관리', '사용자 관리', _u, R(
        V_DONE, f'{_u}이(가) 실제 사용자 데이터로 동작한다',
        f'{_u} 처리·조회·이력', **_admin))
add('사용자 관리', '사용자 관리', '정보 공개 설정', R(
    V_PART, '사용자 정보 공개 범위를 설정하고 반영한다',
    '프로필 조회·수정 실기능',
    screen='정보 공개 설정 UI(일부 데모)', api='사용자 프로필 API',
    db='portal DB 사용자 프로필', files=f'{FE_APP}/admin-console, my-page',
    gap='공개 범위 세부 설정 UI 일부 데모 잔존', blocker='해당없음(내부 보완 작업)',
    prio='P3', follow='공개 설정 서버 저장·반영 시험',
    test_ids='TEST-INT-RUNTIME-001~048', evidence=EV_RUNTIME))
add('사용자 관리', '외부 사용자', '외부 사용자 조회', R(
    V_DONE, '외부 사용자 목록·상세를 조회하고보낸다',
    '외부 사용자 조회·필터·보내기', **_admin))
for _u in ['외부 사용자 등록', '외부 사용자 수정']:
    add('사용자 관리', '외부 사용자', _u, R(
        V_PART, f'{_u} 및 수명주기(등록~만료)를 관리한다',
        '외부 사용자 조회·접속기간·권한 부여 실기능',
        screen='외부 사용자 관리 화면(수명주기 일부 데모)',
        api='관리 콘솔 사용자 API', db='portal DB 사용자·접속기간',
        files=f'{FE_APP}/admin-console',
        gap='외부 사용자 수명주기(자동 만료 통보 등) 일부 데모 잔존',
        blocker='해당없음(내부 보완 작업)', prio='P2',
        follow='수명주기 전이 서버 모드 완결·시험',
        test_ids='TEST-INT-RUNTIME-001~048', evidence=EV_RUNTIME))
add('사용자 관리', '외부 사용자', '외부 사용자 권한 부여', R(
    V_DONE, '외부 사용자에게 역할을 부여·회수하고 만료를 검증한다',
    '역할 부여·회수·만료 검증(마지막 관리자 보호 포함)',
    screen='관리 콘솔 역할 부여', api='GET /v1/role-assignments, POST /v1/role-assignments/:id/revoke',
    db='portal DB 역할 부여', files=f'{FE_APP}/admin-console, {BE_MOD}/routes/admin.ts', **_rt))
add('사용자 관리', '외부 사용자', '사용자 접속 가능 기간 관리', R(
    V_DONE, '접속 가능 기간을 설정하고 만료를 강제한다',
    '접속기간 설정·만료 검증', **_admin))

# --- 권한/RBAC 관리 (27) ---------------------------------------------------
_rbac = dict(screen='관리 콘솔 권한 관리', api=f'{BE_MOD}/routes/admin.ts, plugins/permission.ts',
             db='portal DB 역할·권한·위임', files=f'{FE_APP}/authz, admin-console',
             test_ids='TEST-INT-RUNTIME-001~048', evidence=EV_RUNTIME)
for _u in ['역할 관리', '그룹 관리', '데이터 접근 권한', '프로젝트별 권한', '승인 권한 관리',
           '조직상태 연동', '권한 변경 감사이력']:
    add('권한/RBAC 관리', 'RBAC', _u, R(
        V_DONE, f'{_u}이(가) 부여·회수·자기상승 금지·위임 상한·만료 규칙대로 동작한다',
        f'{_u} 처리·검증·감사이력', **_rbac))
for _u, _g in [('서비스별 권한', '서비스 세부 매핑 일부 미완'), ('메뉴 접근 권한', '메뉴 세부 매핑 일부 미완')]:
    add('권한/RBAC 관리', 'RBAC', _u, R(
        V_PART, f'{_u}이(가) 메뉴·서비스 단위로 세부 매핑된다',
        '역할·권한 부여·회수·만료 실기능',
        gap=f'{_g}(기본 매핑만 검증)', blocker='해당없음(내부 보완 작업)', prio='P2',
        follow='세부 매핑 테이블 보완·권한 미리보기 시험', **_rbac))

# --- 정책 관리 (33) --------------------------------------------------------
_pol = dict(screen='환경설정(/environment-settings) 정책 분류',
            api='GET/PUT /v1/portal-settings', db='fc_portal_setting/history',
            files=f'{FE_APP}/environment-settings, {BE_MOD}/routes/portalSettings.ts')
for _u in ['로그인 정책 조회', '로그인 정책 등록', '로그인 정책 수정/삭제', '로그인 가능 기간',
           '로그인 실패 관리', '비밀번호 정책 조회']:
    add('정책 관리', '로그인 정책' if _u.startswith('로그인') else '비밀번호 정책', _u, R(
        V_DONE, f'{_u}이(가) 저장·버전 잠금·이력 기록과 함께 동작한다',
        f'{_u} 저장·버전 관리·이력 기록',
        test_ids='TEST-INT-RUNTIME-001~048', evidence=EV_RUNTIME, **_pol))
add('정책 관리', '세션 정책', '자동 로그아웃 정책', R(
    V_DONE, '자동 로그아웃 정책이 저장되고 세션에 반영된다',
    '세션 타임아웃 정책 저장·반영·이력',
    test_ids='TEST-INT-RUNTIME-001~048', evidence=EV_RUNTIME, **_pol))
for _sub, _u in [('로그인 정책', '중복 로그인 정책'), ('비밀번호 정책', '비밀번호 복잡도'),
                 ('비밀번호 정책', '비밀번호 만료')]:
    add('정책 관리', _sub, _u, R(
        V_PART, f'{_u}이(가) 실제 인증 체계에 적용된다',
        '정책 저장·버전·이력 기록 실기능',
        scope_e='IdP 실적용(인증 연동 어댑터)', ext=E_READY,
        gap='IdP 적용 어댑터 없음 — 저장된 정책의 인증 실적용은 연동 대기',
        blocker='기관 IdP 연동 승인·정책 적용 규격', prio='P1',
        follow='IdP 어댑터 연결 후 정책 적용 시험',
        test_ids='TEST-INT-RUNTIME-001~048', evidence=EV_RUNTIME, **_pol))
add('정책 관리', '비밀번호 정책', '만료 시 잠금', R(
    V_NONE, '비밀번호 만료 시 계정이 잠긴다',
    '해당없음(포털 측 실기능 없음)',
    scope_e='IdP 실적용(만료 잠금 강제)', ext=E_NOTREADY, test='NOT_RUN',
    screen='해당없음(미구현)', api='해당없음(미구현)', db='해당없음(미구현)',
    files='해당없음(미구현)', test_ids='해당없음(미구현으로 미실행)', evidence='해당없음(미구현)',
    gap='만료 잠금 강제 로직 미구현(IdP 의존)', blocker='IdP 연동 규격',
    prio='P2', follow='IdP 연동 후 잠금 강제 구현'))

# --- 메뉴/프로그램 관리 (21) -----------------------------------------------
_menu = dict(screen='테넌트 설정 메뉴 관리', api=f'{BE_MOD}/services/tenantSettings.ts',
             db='portal DB 테넌트 메뉴·브랜드', files=f'{FE_APP}/tenant-settings, tenant-management',
             test_ids='TEST-INT-RUNTIME-001~048', evidence=EV_RUNTIME)
for _u in ['메뉴 트리 조회', '메뉴 생성', '메뉴 이동', '메뉴 기능 연결', '메뉴별 권한 연결']:
    add('메뉴/프로그램 관리', '메뉴 관리', _u, R(
        V_DONE, f'{_u}이(가) 테넌트 메뉴·브랜드·순서와 함께 검증된다',
        f'{_u} 처리·순서·권한 연결', **_menu))
add('메뉴/프로그램 관리', '프로그램 관리', '기본 프로그램 관리', R(
    V_DONE, '기본 프로그램이 메뉴에 연결되고 조회된다',
    '기본 프로그램 정의·메뉴 연결', **_menu))
add('메뉴/프로그램 관리', '프로그램 관리', '신규 프로그램 등록', R(
    V_PART, '신규 프로그램을 등록하고 메뉴에 연결한다',
    '프로그램 조회·연결 실기능',
    gap='프로그램 등록 기능 일부(등록 마법사 미완)', blocker='해당없음(내부 보완 작업)',
    prio='P3', follow='프로그램 등록 UI 완결·시험', **_menu))

# --- 통합 카탈로그/검색 (30) -----------------------------------------------
_search = dict(screen='통합검색(/integrated-search)', api='GET /v1/search, /v1/search/sources/suggest',
               db='portal DB 메뉴·프로젝트·조직·사용자',
               files=f'{FE_APP}/integrated-search, {BE_MOD}/routes/portalSearch.ts')
add('통합 카탈로그/검색', '카탈로그 조회', '통합 카탈로그 메인', R(
    V_DONE, '통합 카탈로그 메인에서 항목을 조회·탐색한다',
    '카탈로그 조회·목록·상세',
    api='GET /v1/catalog/items', db='fc_catalog_item/application',
    files=f'{FE_APP}/service-catalog, {BE_MOD}/routes/catalog.ts',
    test_ids='TEST-API-DOMAIN-S14-1~2', evidence=EV_DOMAIN,
    screen=_search['screen']))
add('통합 카탈로그/검색', '카탈로그 조회', '라이브러리 탐색', R(
    V_PART, '외부 라이브러리 원천을 탐색한다',
    '포털 카탈로그 구조·검색 파이프라인 실기능',
    scope_e='외부 라이브러리 원천(Docker·PyPI) 실검색', ext=E_READY,
    gap='외부 원천 실검색 integration_pending', blocker='원천 endpoint·인증 규격',
    prio='P2', follow='원천 계약 후 어댑터 연결·재시험',
    test_ids='TEST-API-DOMAIN-S15-3', evidence=EV_DOMAIN, **_search))
for _u, _src in [('데이터셋 검색', '데이터 플랫폼 카탈로그'), ('AI 모델 검색', 'AI 플랫폼 모델 레지스트리'),
                 ('Docker 이미지 검색', '이미지 레지스트리'), ('PyPI 패키지 검색', '패키지 저장소'),
                 ('플랫폼 간 검색', '연계 플랫폼 검색 API')]:
    add('통합 카탈로그/검색', '통합검색', _u, R(
        V_PART, f'{_u}이(가) 외부 원천 실데이터로 동작한다',
        '포털 자체 검색(메뉴·프로젝트·조직·사용자) 실기능(46건 PASS)',
        scope_e=f'{_src} 실검색 연동', ext=E_READY,
        gap='외부 원천 integration_pending — 포털 측 검색만 검증',
        blocker='원천 endpoint·인증·응답 규격', prio='P2',
        follow='원천 어댑터 연결 후 실검색 시험',
        test_ids='TEST-API-DOMAIN-S15-1~4', evidence=EV_DOMAIN, **_search))
add('통합 카탈로그/검색', '통합검색', '유사도 검색', R(
    V_NONE, '의미 기반 유사도 검색이 동작한다',
    '해당없음(포털 측 실기능 없음)',
    scope_e='의미검색 엔진(벡터 인덱스) 전체', ext=E_NOTREADY, test='NOT_RUN',
    screen='해당없음(미구현)', api='해당없음(의미검색 not_available 응답만 존재)',
    db='해당없음(미구현)', files=f'{BE_MOD}/routes/portalSearch.ts(not_available 처리)',
    test_ids='TEST-API-DOMAIN-S15-3(not_available 확인)', evidence=EV_DOMAIN,
    gap='의미 기반 검색 미구현', blocker='벡터 검색 엔진·임베딩 파이프라인 규격',
    prio='P2', follow='검색 엔진 선정·연동 후 구현'))
add('통합 카탈로그/검색', '통합검색', '검색 결과 상세', R(
    V_DONE, '검색 결과의 상세 정보를 확인한다',
    '검색 결과 상세·권한별 결과 제한(user.manage 검증)',
    test_ids='TEST-API-DOMAIN-S15-1~4', evidence=EV_DOMAIN, **_search))
add('통합 카탈로그/검색', '통합검색', '검색 결과 기능 연계', R(
    V_PART, '검색 결과에서 후속 기능(신청 등)으로 연계한다',
    '결과→카탈로그 신청 화면 이동 실기능',
    scope_e='외부 원천 결과의 실연계(원천 상세)', ext=E_READY,
    gap='외부 원천 결과 연계는 원천 연동 후 가능', blocker='원천 연동 규격',
    prio='P3', follow='원천 연동 후 연계 동선 시험',
    test_ids='TEST-API-DOMAIN-S15-1~4', evidence=EV_DOMAIN, **_search))

# --- 서비스/도구 카탈로그 (21) ----------------------------------------------
_cat = dict(screen='서비스 카탈로그(/service-catalog)', api='GET /v1/catalog/items, POST /v1/catalog/applications',
            db='fc_catalog_item/application', files=f'{FE_APP}/service-catalog, {BE_MOD}/routes/catalog.ts')
for _u in ['분석 프레임워크 선택', '개발도구 선택', '데이터 도구 선택', '시각화 도구 선택',
           '라벨링 도구 선택', '직접 입력']:
    add('서비스/도구 카탈로그', '도구 카탈로그', _u, R(
        V_DONE, f'{_u}을(를) 통해 도구를 탐색·선택한다',
        f'{_u} 탐색·선택·신청 입력',
        test_ids='TEST-API-DOMAIN-S14-1~2', evidence=EV_DOMAIN, **_cat))
add('서비스/도구 카탈로그', '도구 카탈로그', '카탈로그 선택', R(
    V_PART, '카탈로그 선택→신청→승인→실행환경 생성까지 완결된다',
    '신청·승인 실기능(승인 후 execution_status=pending_platform 유지 검증)',
    scope_e='실행환경 생성(플랫폼 프로비저닝)', ext=E_READY,
    gap='승인 후 실행환경 생성은 플랫폼 연동 대기',
    blocker='프로비저닝 endpoint·인증', prio='P1',
    follow='프로비저닝 연동 후 종단 시험',
    test_ids='TEST-API-DOMAIN-S14-1~2', evidence=EV_DOMAIN, **_cat))

# --- 프로젝트 관리 (41) ----------------------------------------------------
_prj = dict(screen='프로젝트 워크스페이스(/project-workspace)',
            api=f'{BE_MOD}/routes/projects.ts', db='fc_project/member/invite',
            files=f'{FE_APP}/project-workspace, {BE_MOD}/routes/projects.ts',
            test_ids='TEST-API-DOMAIN-S12-1~4', evidence=EV_DOMAIN)
for _u, _c in [('프로젝트 생성 신청', '멱등 생성(replay 동일 id) 검증'),
               ('프로젝트 승인', '승인 처리·상태 전이 검증'),
               ('프로젝트 수정/종료', '낙관적 잠금·종료 시 미처리 업무 409+blockers 검증'),
               ('프로젝트 생애주기', '생애주기 상태 전이 검증'),
               ('프로젝트 활동 로그', '활동 로그 기록·조회 검증')]:
    add('프로젝트 관리', '프로젝트', _u, R(
        V_DONE, f'{_u}이(가) {_c}로 확인된다',
        f'{_u} 처리·상태·이력', **_prj))
add('프로젝트 관리', '프로젝트', '프로젝트 생애주기 알림', R(
    V_PART, '생애주기 이벤트 알림이 발송된다',
    '생애주기 상태·이벤트 기록 실기능',
    scope_e='알림 발송(메일·메시지 채널)', ext=E_READY,
    gap='알림 발송 채널 연동 대기(기록만 검증)', blocker='메일·알림 채널 규격',
    prio='P2', follow='알림 채널 연동 후 발송 시험', **_prj))
for _u in ['참여 조직 관리', '참여 인원 이력']:
    add('프로젝트 관리', '참여조직', _u, R(
        V_DONE, f'{_u}이(가) 실제 프로젝트 데이터로 동작한다',
        f'{_u} 처리·이력', **_prj))
add('프로젝트 관리', '멤버/권한', '참여자 초대', R(
    V_DONE, '참여자 초대·수락이 멱등으로 동작한다',
    '초대 생성·수락·중복 409 검증', **_prj))
add('프로젝트 관리', '멤버/권한', '역할 부여', R(
    V_DONE, '프로젝트 역할 부여가 중복 방지·권한 검증과 함께 동작한다',
    '멤버 추가·중복 추가 409 검증', **_prj))
add('프로젝트 관리', '워크스페이스', '워크스페이스 접속 링크 제공', R(
    V_PART, '프로젝트에서 실행환경 접속 링크를 제공한다',
    '워크스페이스 신청·승인 원장 실기능',
    scope_e='실행환경 생성·접속 주소 발급(플랫폼)', ext=E_READY,
    gap='실행환경 미생성 상태에서는 링크 제공 불가', blocker='프로비저닝 endpoint',
    prio='P1', follow='프로비저닝 연동 후 링크 발급 시험',
    test_ids='TEST-INT-WORK-001~014', evidence=EV_WORK,
    screen='프로젝트 워크스페이스', api=f'{BE_MOD}/routes/workOverview.ts',
    db='work_requests', files=f'{FE_APP}/portal-work'))
add('프로젝트 관리', '프로젝트 종료', '종료 시 산출물 저장/반출 절차', R(
    V_DONE, '종료 시 산출물 보존(preserveOutputs)과 미처리 업무 차단이 동작한다',
    '종료 차단 409+blockers·preserveOutputs=true 종료 성공 검증', **_prj))
add('프로젝트 관리', '추가 자원 요청', '프로젝트 단위 추가 자원 요청/승인', R(
    V_PART, '추가 자원 요청·승인이 실제 자원 증설로 완결된다',
    '요청·승인 원장 실기능(work_requests)',
    scope_e='자원 증설(클라우드/CMP)', ext=E_READY,
    gap='승인 후 실제 증설 연동 대기', blocker='CMP 프로비저닝 규격',
    prio='P1', follow='증설 연동 후 종단 시험',
    test_ids='TEST-INT-WORK-001~014', evidence=EV_WORK,
    screen='프로젝트 워크스페이스 자원 요청', api=f'{BE_MOD}/routes/workOverview.ts',
    db='work_requests', files=f'{FE_APP}/portal-work, project-workspace'))
add('프로젝트 관리', '작업 할당', '학습/라벨링 작업 할당', R(
    V_PART, '학습/라벨링 작업을 배정하고 진행을 추적한다',
    '작업 요청 원장 실기능',
    scope_e='작업 실행 환경 연동·알림', ext=E_READY,
    gap='작업 배정·알림 일부 부분(실행 연동 대기)', blocker='실행환경·알림 채널 규격',
    prio='P2', follow='작업 실행 연동 후 재시험',
    test_ids='TEST-INT-WORK-001~014', evidence=EV_WORK,
    screen='프로젝트 워크스페이스 작업', api=f'{BE_MOD}/routes/workOverview.ts',
    db='work_requests', files=f'{FE_APP}/portal-work'))

# --- 워크스페이스/리소스 관리 (21) ------------------------------------------
_ws = dict(screen='워크스페이스(/portal-work)', api=f'{BE_MOD}/routes/workOverview.ts',
           db='work_requests(FK·CHECK·트리거 보완 적용)', files=f'{FE_APP}/portal-work',
           test_ids='TEST-INT-WORK-001~014', evidence=EV_WORK)
for _u in ['워크스페이스 신청', '워크스페이스 승인', '유효기간 관리', '추가 리소스 요청']:
    _sub = '워크스페이스' if '워크스페이스' in _u or '유효기간' in _u else '리소스'
    add('워크스페이스/ 리소스 관리', _sub, _u, R(
        V_DONE, f'{_u}이(가) 신청·승인 원장 기준으로 검증된다(work-api 14건)',
        f'{_u} 신청·승인·상태 원장', **_ws))
for _u, _sub, _g in [('환경 격리', '워크스페이스', '실제 실행환경 격리는 플랫폼 수행(연동 대기)'),
                     ('기본 리소스 할당', '리소스', '실제 자원 할당은 플랫폼 수행(연동 대기)'),
                     ('자원 사용량 모니터링', '리소스', '실측 사용량 수집 미연동')]:
    add('워크스페이스/ 리소스 관리', _sub, _u, R(
        V_PART, f'{_u}이(가) 실제 자원과 함께 동작한다',
        '신청·승인·상태 원장 실기능',
        scope_e='실행환경 생성·중지·회수·사용량 관측(클라우드/CMP)', ext=E_READY,
        gap=_g, blocker='CMP 프로비저닝·메트릭 endpoint', prio='P1',
        follow='플랫폼 연동 후 실측 검증', **_ws))

# --- 반입/반출 관리 (36) ----------------------------------------------------
_tr = dict(screen='반출 승인(/export-approval)', api=f'{BE_MOD}/routes/transfers.ts',
           db='fc_transfer_request/file', files=f'{FE_APP}/export-approval, {BE_MOD}/routes/transfers.ts',
           test_ids='TEST-API-DOMAIN-S11-1~4', evidence=EV_DOMAIN)
for _u in ['반입 신청', '반입 승인']:
    add('반입/반출 관리', '반입 관리', _u, R(
        V_DONE, f'{_u}이(가) 실제 파일 업로드(multipart)와 승인으로 동작한다',
        f'{_u} 파일 등록·승인·이력', **_tr))
add('반입/반출 관리', '반출 관리', '반출 신청', R(
    V_DONE, '반출 신청이 파일·공개동의·보안등급·멱등키와 함께 접수된다',
    '반출 신청(multipart+공개동의+보안등급, idempotency) 검증', **_tr))
add('반입/반출 관리', '반출 관리', '반출 승인', R(
    V_DONE, '승인 버전 고정·staleApproval·보완→재검토 전이가 동작한다',
    '승인(approved_file_version 고정)·재업로드 시 staleApproval·보완 후 in_review 전이 검증',
    scope_e='승인 파일의 외부 실제 반출 수행', ext=E_READY, fulfill=F_PART,
    gap='승인 후 외부 반출 수행 연동 대기', blocker='반출 수행 채널(망연계 등) 규격',
    prio='P1', follow='반출 수행 연동 후 종단 시험', **_tr))
add('반입/반출 관리', '반출 관리', '반출입 목록 조회', R(
    V_DONE, '반출입 신청 목록·상세를 조회한다',
    '목록 조회·상태 필터·상세', **_tr))
add('반입/반출 관리', '반출 관리', '프로젝트 반출 서버 현황', R(
    V_PART, '프로젝트 반출 서버 현황을 조회한다',
    '반출 신청·승인 원장 기반 현황 조회 실기능',
    scope_e='외부 반출 서버 실제 현황(파일 위치·수행 상태)', ext=E_READY,
    gap='외부 반출 서버 현황 연동 대기', blocker='반출 서버 모니터링 endpoint',
    prio='P2', follow='반출 서버 연동 후 현황 시험', **_tr))
add('반입/반출 관리', 'AI 성과', 'AI 성과 반출', R(
    V_DONE, 'AI 성과물의 반출 신청·승인이 파일 버전과 함께 동작한다',
    '성과 반출 신청·승인 버전 고정 검증',
    scope_e='승인 성과물의 외부 실제 반출 수행', ext=E_READY, fulfill=F_PART,
    gap='외부 반출 수행 연동 대기', blocker='반출 수행 채널 규격', prio='P1',
    follow='반출 수행 연동 후 종단 시험', **_tr))
add('반입/반출 관리', 'AI 성과', '다운로드 기능', R(
    V_DONE, '승인된 버전만 다운로드되고 최신 버전 직접 다운로드는 차단된다',
    '승인 파일 다운로드 200·최신 버전 다운로드 409 차단 검증', **_tr))
for _u in ['성과 공개 동의', '공개/비공개 설정', '비밀 등급 설정', '사용 권한 설정']:
    add('반입/반출 관리', 'AI 성과', _u, R(
        V_DONE, f'{_u}이(가) 신청 단계에서 필수 검증과 함께 기록된다',
        f'{_u} 입력·검증·이력', **_tr))

# --- 크레딧/사용량 관리 (33) -------------------------------------------------
_cr = dict(screen='크레딧 관리(/credit-manager)', api=f'{BE_MOD}/routes/credits.ts',
           db='fc_credit_product/account/transaction/request(BigInt decimal scale4)',
           files=f'{FE_APP}/credit-manager, {BE_MOD}/routes/credits.ts')
add('크레딧/사용량 관리', '자원 사용량', '자원 사용량 조회', R(
    V_PART, '자원 사용량을 실측 기반으로 조회한다',
    '사용량 조회 API 실기능(추이 measured=false 명시)',
    scope_e='트랜잭션 실측 사용량 수집(CMP·플랫폼 메트릭)', ext=E_READY,
    gap='실측 수집 미연동 — 가짜 수치 없이 measured=false 표기', blocker='메트릭 수집 endpoint',
    prio='P1', follow='실측 연동 후 수치 검증',
    test_ids='TEST-API-DOMAIN-S10-2', evidence=EV_DOMAIN, **_cr))
add('크레딧/사용량 관리', '자원 사용량', '크레딧 환산', R(
    V_PART, '자원 사용량이 단가로 크레딧 환산된다',
    '단가 테이블·환산 로직 실기능',
    scope_e='실측 사용량 입력(자동 환산 트리거)', ext=E_READY,
    gap='실측 사용량 미연동으로 자동 환산 미동작', blocker='메트릭 수집 endpoint',
    prio='P1', follow='실측 연동 후 환산 시험',
    test_ids='TEST-API-DOMAIN-S9-1', evidence=EV_DOMAIN, **_cr))
add('크레딧/사용량 관리', '자원 사용량', '크레딧 차감', R(
    V_PART, '사용량에 따라 크레딧이 자동 차감된다',
    '차감 API·멱등 차감·잔액 부족 409 실기능',
    scope_e='실측 기반 자동 차감 트리거', ext=E_READY,
    gap='자동 차감 트리거(실측 연동) 대기 — 수동/API 차감만 검증',
    blocker='메트릭 수집·차감 이벤트 연동', prio='P1',
    follow='실측 연동 후 자동 차감 시험',
    test_ids='TEST-API-DOMAIN-S10-1', evidence=EV_DOMAIN, **_cr))
for _u, _t in [('기본 크레딧 관리', 'TEST-API-DOMAIN-S9-1~3'), ('충전 관리', 'TEST-API-DOMAIN-S9-2~3'),
               ('사용이력 관리', 'TEST-API-DOMAIN-S9-3'), ('잔액 관리', 'TEST-API-DOMAIN-S9-3, S10-1'),
               ('부족 시 제한', 'TEST-API-DOMAIN-S10-1'), ('자원별 단가 설정', 'TEST-API-DOMAIN-S9-1')]:
    _sub = '단가 관리' if '단가' in _u else '크레딧 관리'
    add('크레딧/사용량 관리', _sub, _u, R(
        V_DONE, f'{_u}이(가) 원장·승인·멱등 규칙으로 검증된다',
        f'{_u} 처리·원장 합산 대조·멱등',
        test_ids=_t, evidence=EV_DOMAIN, **_cr))
add('크레딧/사용량 관리', '크레딧 관리', '사용기간 예측', R(
    V_PART, '잔액과 사용 추이로 사용 가능 기간을 예측한다',
    '잔액 조회 실기능',
    scope_e='실측 사용 추이(예측 입력)', ext=E_READY,
    gap='실측 추이 없어 예측 정확도 제한(measured=false)', blocker='메트릭 수집 endpoint',
    prio='P3', follow='실측 연동 후 예측 모델 검증',
    test_ids='TEST-API-DOMAIN-S10-2', evidence=EV_DOMAIN, **_cr))
add('크레딧/사용량 관리', '크레딧 대시보드', '크레딧 잔액·추이 대시보드', R(
    V_PART, '크레딧 잔액·사용 추이를 대시보드로 표시한다',
    '잔액 카드·원장 기반 내역 실기능',
    scope_e='실측 사용 추이 데이터', ext=E_READY,
    gap='추이 그래프는 실측 연동 전 measured=false로 표기', blocker='메트릭 수집 endpoint',
    prio='P2', follow='실측 연동 후 추이 검증',
    test_ids='TEST-API-DOMAIN-S9-3, S10-2', evidence=EV_DOMAIN, **_cr))

# --- 마이페이지 (34) --------------------------------------------------------
_mp = dict(screen='마이페이지(/my-page)', api='portal-runtime 프로필·활동 조회',
           db='portal DB 사용자·활동이력', files=f'{FE_APP}/my-page',
           test_ids='TEST-INT-RUNTIME-001~048, TEST-UNIT-FE(my-page)', evidence=EV_RUNTIME)
for _u in ['프로필 조회', '프로필 수정']:
    add('마이페이지', '계정정보', _u, R(
        V_DONE, f'{_u}이(가) 서버 모드로 실제 데이터와 함께 동작한다',
        f'{_u} 서버 모드 연결', **_mp))
add('마이페이지', '계정정보', '이메일 확인', R(
    V_PART, '이메일 변경 시 확인 메일로 검증한다',
    '프로필 이메일 표시·수정 실기능',
    scope_e='확인 메일 발송(메일 relay)', ext=E_READY,
    gap='확인 메일 발송 백엔드 없음', blocker='메일 relay 규격', prio='P2',
    follow='메일 연동 후 확인 플로우 구현', **_mp))
add('마이페이지', '계정정보', '비밀번호 변경', R(
    V_NONE, '사용자가 비밀번호를 변경한다',
    '해당없음(포털 측 실기능 없음)',
    scope_e='인증 체계 비밀번호 변경(IdP)', ext=E_NOTREADY, test='NOT_RUN',
    screen='해당없음(미구현)', api='해당없음(백엔드 없음)', db='해당없음(미구현)',
    files='해당없음(미구현)', test_ids='해당없음(미구현으로 미실행)', evidence='해당없음(미구현)',
    gap='비밀번호 변경 백엔드 없음', blocker='IdP 비밀번호 변경 연동 규격',
    prio='P1', follow='IdP 연동 후 변경 플로우 구현'))
add('마이페이지', '세션', '활성 세션 조회', R(
    V_PART, '본인의 활성 세션을 조회한다',
    '세션 정보 표시 실기능',
    gap='세션 회수(강제 종료) 백엔드 없음 — 조회만 부분 구현',
    blocker='세션 저장소 구조 확정', prio='P2',
    follow='세션 회수 API 구현 후 시험', **_mp))
add('마이페이지', '세션', '세션 강제 종료', R(
    V_NONE, '본인의 활성 세션을 강제 종료한다',
    '해당없음(포털 측 실기능 없음)',
    scope_e='해당없음(포털 내부 구현 과제)', test='NOT_RUN',
    screen='해당없음(미구현)', api='해당없음(백엔드 없음)', db='해당없음(미구현)',
    files='해당없음(미구현)', test_ids='해당없음(미구현으로 미실행)', evidence='해당없음(미구현)',
    gap='세션 회수 백엔드 없음', blocker='세션 저장소 구조 확정', prio='P2',
    follow='회수 API 구현 후 시험'))
add('마이페이지', '프로젝트', '내 프로젝트 현황', R(
    V_DONE, '본인이 속한 프로젝트 현황을 조회한다',
    '내 프로젝트 목록·상태 표시(서버 모드)', **_mp))
add('마이페이지', '사용이력', '자원 사용 이력', R(
    V_PART, '본인의 자원 사용 이력을 조회한다',
    '크레딧 원장 기반 이력 조회 실기능',
    scope_e='실측 사용량 수집', ext=E_READY,
    gap='실측 사용량 미연동', blocker='메트릭 수집 endpoint', prio='P2',
    follow='실측 연동 후 이력 검증', **_mp))
add('마이페이지', '크레딧', '크레딧 사용 내역', R(
    V_DONE, '본인의 크레딧 사용 내역을 조회한다',
    '크레딧 원장 조회(fc_credit_transaction)',
    api='GET /v1/credits/transactions', db='fc_credit_transaction',
    test_ids='TEST-API-DOMAIN-S9-3', evidence=EV_DOMAIN,
    screen='마이페이지 크레딧 내역', files=f'{FE_APP}/my-page, credit-manager'))
add('마이페이지', '알림', '알림 설정', R(
    V_NONE, '알림 수신 항목·채널을 설정한다',
    '해당없음(포털 측 실기능 없음)',
    scope_e='알림 발송 채널(메일 등)', ext=E_NOTREADY, test='NOT_RUN',
    screen='해당없음(미구현)', api='해당없음(미구현)', db='해당없음(미구현)',
    files='해당없음(미구현)', test_ids='해당없음(미구현으로 미실행)', evidence='해당없음(미구현)',
    gap='알림 설정 미구현', blocker='알림 채널 규격', prio='P3',
    follow='알림 채널 확정 후 설정·발송 구현'))
add('마이페이지', 'API 키', '개인 API 키 관리', R(
    V_NONE, '개인 API 키를 발급·폐기한다',
    '해당없음(포털 측 실기능 없음)',
    scope_e='해당없음(포털 내부 구현 과제)', test='NOT_RUN',
    screen='해당없음(미구현)', api='해당없음(백엔드 없음)', db='해당없음(미구현)',
    files='해당없음(미구현)', test_ids='해당없음(미구현으로 미실행)', evidence='해당없음(미구현)',
    gap='개인 API 키 백엔드 없음', blocker='API 키 인증 설계 확정', prio='P3',
    follow='키 발급·폐기 API 구현 후 시험'))
add('마이페이지', '활동로그', '내 활동 로그', R(
    V_DONE, '본인의 활동 로그를 조회한다',
    '내 활동 로그 조회(서버 모드)', **_mp))

# --- 환경설정 (12) ----------------------------------------------------------
_st = dict(screen='환경설정(/environment-settings) 4분류', api='GET/PUT /v1/portal-settings',
           db='fc_portal_setting/history', files=f'{FE_APP}/environment-settings, {BE_MOD}/routes/portalSettings.ts',
           test_ids='TEST-INT-RUNTIME-001~048', evidence=EV_RUNTIME)
for _sub, _u in [('시스템 설정', '시스템 파라미터'), ('보안 설정', '보안 정책 설정'),
                 ('자원 설정', '자원할당 기준'), ('운영 설정', '포털 운영 설정')]:
    add('환경설정', _sub, _u, R(
        V_DONE, f'{_u}이(가) 저장·버전 잠금과 함께 동작하고 이력이 기록된다',
        f'{_u} 저장·버전 잠금·이력 기록',
        gap='해당없음', verdict_by_type={'EO': V_PART}, **_st))

# --- 이력/감사로그 (24) ------------------------------------------------------
_au = dict(screen='감사 이력(/audit-history)', api='portal-runtime 감사 조회(필터·페이지·보내기·스냅샷)',
           db='portal DB 감사 이벤트(RLS·원자 기록)', files=f'{FE_APP}/audit-history',
           test_ids='TEST-INT-RUNTIME-001~048', evidence=EV_RUNTIME)
for _sub, _u in [('로그인 이력', '로그인 기록'), ('로그아웃 이력', '로그아웃 기록'),
                 ('비밀번호 이력', 'PW 변경 이력'), ('상태 이력', '개인 상태 이력'),
                 ('접근 로그', '사용자 접근 로그'), ('정보수정 로그', '정보수정 로그'),
                 ('보안 감사', '보안 감사 조회'), ('관리자 조치', '관리자 조치 이력')]:
    add('이력/감사로그', _sub, _u, R(
        V_DONE, f'{_u}이(가) 필터·페이지·보내기·스냅샷과 함께 검증된다(48건)',
        f'{_u} 기록·조회·보내기', **_au))

# --- 제안 게시판 (21) -------------------------------------------------------
_pp = dict(screen='제안 게시판(/proposal-board)', api=f'{BE_MOD}/routes/proposals.ts',
           db='fc_proposal/sympathy/review', files=f'{FE_APP}/proposal-board, {BE_MOD}/routes/proposals.ts')
for _u in ['제안 등록', '기본정보 입력', '제안 구분', '필요성 입력', '활용 가능성 입력']:
    add('제안 게시판', '제안 관리', _u, R(
        V_DONE, f'{_u}이(가) 멱등 등록·검증과 함께 동작한다',
        f'{_u} 등록·검증·조회',
        test_ids='TEST-API-DOMAIN-S13-1', evidence=EV_DOMAIN, **_pp))
add('제안 게시판', '공감', '공감 등록', R(
    V_DONE, '공감 등록·중복 방지(토글 취소)가 동작한다',
    '공감 토글·중복 공감 방지·수치 반환 검증',
    test_ids='TEST-API-DOMAIN-S13-2', evidence=EV_DOMAIN, **_pp))
add('제안 게시판', '관리자 관리', '제안 검토/답변/공지', R(
    V_PART, '관리자가 제안을 검토·답변하고 답변 후 수정이 잠긴다',
    '검토·답변·답변 후 잠금(reviewed_locked 409) 실기능',
    gap='댓글 기능 데모 모드 잔존', blocker='해당없음(내부 보완 작업)', prio='P3',
    follow='댓글 서버 모드 연결·시험',
    test_ids='TEST-API-DOMAIN-S13-3', evidence=EV_DOMAIN, **_pp))

# --- 육해공군 관리자 권한 관리 (18) ------------------------------------------
_tn = dict(screen='테넌트 관리(/tenant-management)', api=f'{BE_MOD}/routes/tenantOperations.ts',
           db='portal DB 테넌트 설정·쿼터', files=f'{FE_APP}/tenant-management, tenant-settings',
           test_ids='TEST-INT-RUNTIME-001~048', evidence=EV_RUNTIME)
for _u in ['군별 자원 분리', '위임관리 체계']:
    add('육해공군 관리자 권한 관리', '군별 관리자 권한', _u, R(
        V_DONE, f'{_u}이(가) 타 테넌트 차단 검증과 함께 동작한다',
        f'{_u} 설정·타 테넌트 접근 차단 검증', **_tn))
for _u, _sub in [('리소스 풀 관리', '군별 리소스 관리'), ('쿼터 할당/변경/회수', '군별 쿼터 관리'),
                 ('사용량 통합조회', '군별 모니터링'), ('군별 프로젝트 사용량', '군별 프로젝트 현황')]:
    add('육해공군 관리자 권한 관리', _sub, _u, R(
        V_PART, f'{_u}이(가) 실제 자원풀·실측 사용량과 함께 동작한다',
        '테넌트 설정·브랜드·메뉴 실기능',
        scope_e='자원풀 실연동·실측 사용량(클라우드/CMP)', ext=E_READY,
        gap='자원풀·쿼터 실연동 및 실측 사용량 대기', blocker='CMP 자원풀·메트릭 endpoint',
        prio='P2', follow='자원풀 연동 후 쿼터 강제 시험', **_tn))

# --- 플랫폼 연동 (9) ---------------------------------------------------------
_pi = dict(screen='플랫폼 연동(/platform-api-integration)',
           api=f'{BE_MOD}/routes/integrations.ts, platformAccess.ts',
           db='portal DB 플랫폼 접근 정책·프로브 결과',
           files=f'{FE_APP}/platform-api-integration, developer-console',
           test_ids='TEST-INT-RUNTIME-001~048', evidence=EV_RUNTIME)
for _sub, _u, _ext in [('공통 연동', '플랫폼 API 연동 기준 관리', '각 플랫폼 실연동'),
                       ('데이터 플랫폼 연동', '데이터셋/메타데이터 연계', '데이터 플랫폼 실연동'),
                       ('AI 플랫폼 연동', 'AI 모델/분석모델 메타데이터 연계', 'AI 플랫폼 실연동')]:
    add('플랫폼 연동', _sub, _u, R(
        V_DONE, f'{_u}이(가) 프로브·정책 기준으로 포털 범위에서 동작한다',
        '연동 기준·정책·프로브 실기능',
        scope_e=f'{_ext}(낮부 제안 계약 기준)', ext=E_READY, fulfill=F_PART,
        gap='실연동 대기 — 포털 측 프로브·정책만 검증',
        blocker='플랫폼 endpoint·인증서·연동 승인', prio='P1',
        follow='플랫폼 계약 확정 후 실연동 시험', **_pi))

# --- K-RMF 관리지원 (24) -----------------------------------------------------
_kr = dict(screen='K-RMF 현황(/krmf-monitor, 3탭: 현황/통제·증적/조치·변경)',
           api=f'{BE_MOD}/routes/krmf.ts (/v1/krmf 26개 엔드포인트)',
           db='fc_krmf_baseline/control/evidence/file/action/change/trr_check/eval_record/control_link',
           files=f'{FE_APP}/krmf-monitor, {BE_MOD}/routes/krmf.ts')
_kr_done = dict(gap='해당없음', blocker='해당없음', prio='-', follow='해당없음')
add('K-RMF 관리지원', '통제 기준선', '보안통제 기준선 관리', R(
    V_DONE, '기준선 생성·통제 등록·제외 사유 필수·집계 일치가 검증된다',
    '기준선 생성·통제 등록·제외 사유 검증·overview 집계',
    scope_e='공식 기관 기준판 수령·import(구조만 준비)', ext=E_READY, fulfill=F_PART,
    gap='공식 기준판 미수령 — 임의 생성 금지 원칙으로 import 구조만 확보',
    blocker='기관 공식 K-RMF 기준판(버전 명시)', prio='P1',
    follow='기준판 수령 후 import·전면 재검증',
    test_ids='TEST-API-DOMAIN-S1-1~3, S2-1', evidence=EV_DOMAIN, **_kr))
add('K-RMF 관리지원', '요구·통제 추적', '요구사항·보안통제 추적관리', R(
    V_DONE, '요구사항↔통제 연결 등록·미연결 조회가 검증된다',
    '추적 연결 링크 등록·미연결 조회·CSV 출력',
    test_ids='TEST-API-DOMAIN-S7-3, S8-2', evidence=EV_DOMAIN, **_kr_done, **_kr))
add('K-RMF 관리지원', '증적자료 관리', '증적자료 등록·연결·형상관리', R(
    V_DONE, '증적 multipart 업로드·sha256·멱등·승인 버전 고정·권한 차단이 검증된다',
    '증적 업로드(idempotency replay)·검토 승인(버전 고정·409)·타 테넌트 차단·다운로드 원본 일치',
    test_ids='TEST-API-DOMAIN-S3-1~4, S4-1~3, S8-3', evidence=EV_DOMAIN, **_kr_done, **_kr))
add('K-RMF 관리지원', '미흡사항·보완조치', '미흡사항 및 보완조치 관리', R(
    V_DONE, '조치 등록·기한 경과 필터·상태 전이 순서 강제가 검증된다',
    '조치 등록(원인 필수)·overdue 필터·open→in_progress→resolved→reconfirmed 전이',
    test_ids='TEST-API-DOMAIN-S5-1~3', evidence=EV_DOMAIN, **_kr_done, **_kr))
add('K-RMF 관리지원', '시험준비상태검토', '시험준비상태검토(TRR) 관리', R(
    V_DONE, 'TRR 항목 upsert·증적 준비 상태 갱신이 검증된다',
    'TRR upsert·evidence_ready/status 반영',
    test_ids='TEST-API-DOMAIN-S7-1~2', evidence=EV_DOMAIN, **_kr_done, **_kr))
add('K-RMF 관리지원', '평가·인가 지원', '평가·인가 지원자료 관리', R(
    V_DONE, '평가·인가 지원자료의 등록·조회·출력이 동작한다',
    '평가기록(eval_record) 등록·조회·CSV 출력',
    scope_e='외부 평가체계 연동(평가기관)', ext=E_READY, fulfill=F_PART,
    gap='외부 평가체계 연동 대기 — 포털 내 자료 관리만 검증',
    blocker='평가기관 연동 규격', prio='P2',
    follow='평가체계 연동 후 자료 교환 시험',
    test_ids='TEST-API-DOMAIN-S8-1~3', evidence=EV_DOMAIN, **_kr))
add('K-RMF 관리지원', '운영변경·재평가', '운영변경 영향 및 재평가 대상 관리', R(
    V_DONE, '운영변경 등록·재검토 요청·영향 통제 next_due 반영이 검증된다',
    '변경 등록(유형·설명 필수)·under_review 전이·영향 통제 overview 반영',
    test_ids='TEST-API-DOMAIN-S6-1~2', evidence=EV_DOMAIN, **_kr_done, **_kr))
add('K-RMF 관리지원', '현황 대시보드', 'K-RMF 이행현황 대시보드', R(
    V_DONE, '이행현황 집계(통제 수·적용·제외·이행률)가 실데이터로 일치한다',
    'overview 집계 일치·이행률 갱신·요약 카드 5개·CSV export 3종(BOM)',
    test_ids='TEST-API-DOMAIN-S1-3, S3-4, S8-1~3', evidence=EV_DOMAIN, **_kr_done, **_kr))

# --- 데이터 관리 (23) --------------------------------------------------------
_ilf_db = {
    '사용자 계정/프로필': 'portal DB 사용자·프로필 테이블',
    '외부사용자/접속기간': 'portal DB 사용자·접속기간 컬럼',
    '역할/RBAC/권한 정책': 'portal DB 역할·권한·위임 테이블',
    '메뉴/프로그램 정의': 'portal DB 테넌트 메뉴·프로그램 정의',
    '로그인/보안 정책': 'fc_portal_setting/history',
    '감사로그/활동이력': 'portal DB 감사 이벤트(원자 기록·RLS)',
    '프로젝트': 'fc_project/member/invite',
    '워크스페이스 신청/상태': 'work_requests(FK·CHECK·트리거)',
    '반입·반출 신청': 'fc_transfer_request/file',
    '성과물 메타데이터': 'fc_transfer_request/file(공개동의·등급 메타)',
    '크레딧/사용량 이력': 'fc_credit_product/account/transaction/request',
    '제안게시판': 'fc_proposal/sympathy/review',
    '환경설정/시스템 파라미터': 'fc_portal_setting/history',
    '군별 테넌트/쿼터': 'portal DB 테넌트·쿼터 설정',
    '플랫폼 API 연계항목': 'portal DB 플랫폼 접근 정책',
    'K-RMF 통제·증적자료 관리': 'fc_krmf_baseline/control/evidence/file/control_link',
    'K-RMF 운영변경·재평가 관리': 'fc_krmf_change/trr_check/eval_record/action',
}
_eif_src = {
    '데이터 플랫폼 카탈로그': '데이터 플랫폼 카탈로그 API',
    'AI 플랫폼 모델/성과 메타데이터': 'AI 플랫폼 모델 레지스트리 API',
    '클라우드/CMP 자원·사용량': 'CMP 자원·메트릭 API',
    'SSO/IAM 인증정보': '기관 IdP/SSO',
    '검색 인덱스': '검색 엔진(OpenSearch 등) 인덱스',
    '메타데이터': 'MDR 기관 표준사전',
}
for _sub, _db in _ilf_db.items():
    add('데이터 관리', _sub, '논리파일/외부연계파일', R(
        V_DONE, f'{_sub} 논리파일이 실제 테이블 구조·관계·검증 근거와 함께 존재한다',
        'fc_*/portal 테이블 구조·관계·제약·갱신·이력(MDR 사전 485컬럼 매핑)',
        screen='해당없음(데이터 기능 — UI 판정 아님)',
        api='해당없음(데이터 기능 — 상위 거래 기능 API로 접근 검증)',
        db=_db, files=f'{BE_MIG}(migration 9종), docs/final-completion/data/DATA_DICTIONARY.csv',
        test_ids='TEST-MDR-001~005, TEST-API-DOMAIN-S0-1', evidence=f'{EV_MDR}; {EV_DOMAIN}'))
for _sub, _src in _eif_src.items():
    add('데이터 관리', _sub, '논리파일/외부연계파일', R(
        V_PART, f'{_sub} 외부연계파일이 실제 원천과 연계된다',
        '연계 항목·스키마 정의(포털 측)',
        scope_e=f'{_src} 실연계', ext=E_READY,
        screen='해당없음(데이터 기능 — UI 판정 아님)',
        api='해당없음(연계 어댑터 대기)', db='연계 항목 정의(portal DB)',
        files='docs/final-completion/data/DATA_DICTIONARY.csv',
        gap=f'외부 원천({_src}) 실연계 대기', blocker='원천 endpoint·인증·규격',
        prio='P2', follow='원천 연동 후 연계 검증',
        test_ids='TEST-MDR-001~005', evidence=EV_MDR))

# ---------------------------------------------------------------------------
# 기능그룹ID 부여
# ---------------------------------------------------------------------------
APP_CODE = {
    '메인 포털': 'MAIN', '로그인/인증': 'AUTH', '사용자 관리': 'USER',
    '권한/RBAC 관리': 'RBAC', '정책 관리': 'POLICY', '메뉴/프로그램 관리': 'MENU',
    '통합 카탈로그/검색': 'SEARCH', '서비스/도구 카탈로그': 'TOOL',
    '프로젝트 관리': 'PROJ', '워크스페이스/ 리소스 관리': 'WS',
    '반입/반출 관리': 'TRX', '크레딧/사용량 관리': 'CRD', '마이페이지': 'MY',
    '환경설정': 'CONF', '이력/감사로그': 'AUDIT', '제안 게시판': 'PROP',
    '육해공군 관리자 권한 관리': 'TENANT', '플랫폼 연동': 'PLAT',
    'K-RMF 관리지원': 'KRMF', '데이터 관리': 'DATA',
}

TYPE_ACTION = {
    'EI': '등록·저장·검증·상태 전이가 실제 데이터로 동작',
    'EQ': '조회·조건검색·상세 확인이 실제 데이터로 동작',
    'EO': '결과 출력·이력·보내기가 실제 데이터로 동작',
    'ILF': '논리파일 구조·관계·갱신·이력이 실제 스키마와 검증으로 확인',
    'EIF': '외부 연계파일의 원천·연계 항목 정의가 확인',
}


def load_rows():
    with open(CSV_PATH, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def build_judgements(rows):
    group_ids = {}
    group_seq = Counter()
    out = OrderedDict()
    missing = []
    for r in rows:
        app, sub = r['어플리케이션_정리'], r['세부업무_정리']
        unit = r['단위프로세스_정리']
        prefix = unit.split(' - ')[0]
        key = f'{app}|{sub}|{prefix}'
        rule = RULES.get(key)
        if rule is None:
            missing.append((r['FP_ID'], key))
            continue
        gkey = f'{app}|{sub}'
        if gkey not in group_ids:
            group_seq[app] += 1
            group_ids[gkey] = f'FG-{APP_CODE[app]}-{group_seq[app]:02d}'
        fpt = r['FP유형']
        verdict = rule['verdict_by_type'].get(fpt, rule['verdict'])
        fulfill = rule['fulfill']
        if fulfill is None:
            if verdict == V_NONE:
                fulfill = F_NONE
            elif verdict == V_PART or rule['ext'] in (E_READY, E_NOTREADY, '미검증'):
                fulfill = F_PART
            else:
                fulfill = F_FULL
        criteria = f"{rule['criteria']} — {unit}: {TYPE_ACTION[fpt]}"
        if fpt in ('ILF', 'EIF'):
            screen = rule['screen'] or '해당없음(데이터 기능 — UI 판정 아님)'
            api = rule['api'] or '해당없음(데이터 기능)'
        else:
            screen = rule['screen']
            api = rule['api']
        if verdict == V_NONE:
            test_status = rule['test']
        else:
            test_status = rule['test']
        out[r['FP_ID']] = dict(
            fp_id=r['FP_ID'], 영역=app, 세부업무=sub, 단위프로세스=unit, fp유형=fpt,
            기능그룹ID=group_ids[gkey], 포털수용기준=criteria,
            포털처리범위=rule['scope_p'], 외부수행범위=rule['scope_e'],
            화면동작=screen, API서비스=api, DB원천=rule['db'], 구현파일=rule['files'],
            포털개발판정=verdict, 외부연동상태=rule['ext'], 시험상태=test_status,
            요구전체충족=fulfill, 시험ID=rule['test_ids'], 증적경로=rule['evidence'],
            남은미비사항=rule['gap'] if verdict != V_DONE or rule['gap'] != '해당없음' else '해당없음',
            차단사유필요자료=rule['blocker'], 우선순위=rule['prio'], 후속조치=rule['follow'],
            판정메타=JUDGE_META,
        )
        if verdict == V_PART and rule['gap'] == '해당없음' and fpt == 'EO' and app == '환경설정':
            out[r['FP_ID']]['남은미비사항'] = '설정 이력 조회 API 없음(이력은 기록되나 조회 화면 미비)'
            out[r['FP_ID']]['후속조치'] = '이력 조회 API·화면 추가 후 시험'
            out[r['FP_ID']]['우선순위'] = 'P3'
    if missing:
        for m in missing:
            print('RULE MISSING:', m, file=sys.stderr)
        raise SystemExit(f'판정 규칙 누락 {len(missing)}건 — RULES를 보완하라')
    return out


# ---------------------------------------------------------------------------
# 미비사항 / 연동대기 / 시험결과 / MDR / KRMF / 변경·확인사항 데이터
# ---------------------------------------------------------------------------
ISSUES = [
    ('ISSUE-001', '외부 실연동 전체(AI/데이터/클라우드·CMP/VDI)', '플랫폼 연동·워크스페이스·리소스·카탈로그 실행',
     'FP-P13-019~027, FP-P08-014~034, FP-P07-017~019', '플랫폼 계약·endpoint 미확정(낮부 제안 계약)',
     '실행환경 생성·자원 증설·실측 사용량 불가', 'P1', '플랫폼별 어댑터 연결·종단 시험', '플랫폼 endpoint·인증서·API 규격 / 플랫폼 담당'),
    ('ISSUE-002', 'outbox worker 미구현(스키마만)', '비동기 이벤트 발행', '해당없음(내부 구현 과제)',
     'worker 구현 미착수', '감사·연동 이벤트의 비동기 발행 불가', 'P2', 'worker 구현·재처리 시험', '없음 / 백엔드'),
    ('ISSUE-003', '역할 회수 UI 없음(백엔드 API만)', '권한/RBAC 관리', 'FP-P03-032~P04-021',
     '프론트 미연결', '관리자가 UI에서 회수 불가(API 직접 호출만)', 'P2', 'admin-console에 회수 UI 추가', '없음 / 프론트'),
    ('ISSUE-004', '설정 이력 조회 API 없음', '환경설정', 'FP-P11-023~034 EO행',
     '이력 테이블만 기록', '설정 변경 이력을 화면에서 조회 불가', 'P3', '이력 조회 API·화면 추가', '없음 / 백엔드·프론트'),
    ('ISSUE-005', '마이페이지 비밀번호 변경 백엔드 없음', '마이페이지', 'FP-P10-035~037',
     'IdP 의존 기능 미착수', '사용자 비밀번호 변경 불가', 'P1', 'IdP 연동 후 구현', 'IdP 비밀번호 변경 규격 / 인증 담당'),
    ('ISSUE-006', '활성 세션 회수 백엔드 없음', '마이페이지', 'FP-P11-003~005',
     '세션 저장소 구조 미확정', '사용자가 본인 세션 강제 종료 불가', 'P2', '회수 API 구현', '세션 저장소 설계 / 백엔드'),
    ('ISSUE-007', '개인 API 키 백엔드 없음', '마이페이지', 'FP-P11-017~019',
     'API 키 인증 설계 미확정', '개인 API 키 발급·폐기 불가', 'P3', '키 발급·폐기 API 구현', 'API 키 인증 설계 / 백엔드'),
    ('ISSUE-008', '사용자 등록 신청·검토·반려·보완 플로우 데모 모드', '사용자 관리', 'FP-P02-024~035',
     '서버 모드 미연결', '실사용 등록 플로우 불가(데모 데이터)', 'P1', '서버 모드 연결·전이 시험', '없음 / 백엔드·프론트'),
    ('ISSUE-009', '의미 기반 검색 미구현', '통합 카탈로그/검색', 'FP-P06-025~027',
     '검색 엔진 미선정', '유사도 검색 불가(not_available 응답)', 'P2', '엔진 선정·연동 후 구현', '벡터 검색 엔진·임베딩 규격 / 플랫폼'),
    ('ISSUE-010', 'K-RMF 공식 기관 기준판 미수령', 'K-RMF 관리지원', 'FP-P14-016~018',
     '기관 기준판 미배포', '공식 통제 기준선 적재 불가(import 구조만)', 'P1', '기준판 수령 후 import·재검증', '기관 공식 K-RMF 기준판(버전 명시) / 사업 관리'),
    ('ISSUE-011', 'MDR 기관 표준사전 미수령(임시 정의 485컬럼)', '데이터 관리', 'FP-P15-005~027',
     '기관 표준사전 미배포', '표준 준수 여부를 기관 기준으로 확정 불가', 'P1', '표준사전 수령 후 사전 재매핑·검증', '기관 MDR 표준사전·코드집·등록양식 / 사업 관리'),
    ('ISSUE-012', '카탈로그 신청의 work request 유형 정합(workspace로 기록)', '서비스/도구 카탈로그', 'FP-P07-017~019',
     '유형 코드 미정합', '신청 이력이 workspace 유형으로 기록됨', 'P3', '유형 코드 정합 수정', '없음 / 백엔드'),
    ('ISSUE-013', '트랜잭션 실측 사용량 수집 미연동', '크레딧/사용량 관리', 'FP-P09-034~P10-005, FP-P14-010~012',
     '메트릭 수집 endpoint 미확정', '자동 환산·차감·추이 불가(measured=false 유지)', 'P1', '실측 수집 연동 후 자동화', 'CMP·플랫폼 메트릭 API / 플랫폼'),
    ('ISSUE-014', '기관 SSO·MPKI·본인확인·메일 연동 대기', '로그인/인증·정책 관리', 'FP-P01-023~025, 029~035, FP-P04-028~P05-016 일부',
     'IdP·MPKI·본인확인·메일 규격 미확정', '멀티 인증 실적용·정책 강제 불가', 'P1', '연동 규격 수령 후 어댑터 구현', 'IdP 메타데이터·MPKI 규격·본인확인 계약·메일 relay / 인증 담당'),
    ('ISSUE-015', '데모 모드 잔존(정보 공개 설정·제안 댓글 등)', '사용자 관리·제안 게시판', 'FP-P03-008~010, FP-P12-036~038',
     '서버 모드 미연결 화면 잔존', '해당 화면 데모 데이터 표시', 'P3', '서버 모드 전환·데모 격리 확인', '없음 / 프론트'),
]

INTEGRATIONS = [
    ('AI 플랫폼', 'FP-P13-025~027, FP-P06-013~015',
     '연계 항목 정의·프로브·검색 파이프라인', '모델 레지스트리 실연동·실행',
     '낮부 제안 계약(버전 미확정)', '모델 레지스트리 endpoint·인증서·응답 규격', '포털 측 시험 완료, 실연동 미실행'),
    ('데이터 플랫폼', 'FP-P13-022~024, FP-P06-010~012',
     '연계 항목 정의·프로브·검색 파이프라인', '카탈로그·메타데이터 실연동',
     '낮부 제안 계약(버전 미확정)', '카탈로그 API endpoint·인증·규격', '포털 측 시험 완료, 실연동 미실행'),
    ('클라우드/CMP', 'FP-P08-014~034, FP-P09-034~P10-005, FP-P13-007~018',
     '신청·승인 원장·쿼터 설정·단가·원장', '자원 생성·중지·회수·실측 사용량',
     '낮부 제안 계약(버전 미확정)', '프로비저닝·메트릭 endpoint·인증', '원장 시험 완료, 실자원 미실행'),
    ('VDI', 'FP-P08-014~025 관련', '워크스페이스 신청·승인 원장', 'VDI 생성·접속 주소 발급',
     '낮부 제안 계약(버전 미확정)', 'VDI 프로비저닝 endpoint·인증', '미실행'),
    ('기관 SSO', 'FP-P01-023~025, FP-P04-028~P05-016 일부', 'SSO 어댑터 자리·정책 저장',
     'IdP 실인증·정책 적용', '연동 합의 대기', 'IdP 메타데이터·연동 승인', '미실행'),
    ('MPKI', 'FP-P01-029~031', '해당없음(미구현)', '인증서 검증 전체',
     '연동 합의 대기', 'MPKI 게이트웨이·인증서 규격', '미실행'),
    ('본인확인', 'FP-P01-032~034, FP-P02-027~029', '해당없음(미구현)', '본인확인 기관 연계',
     '연동 합의 대기', '본인확인 기관 연계 규격·계약', '미실행'),
    ('메일', 'FP-P01-035~P02-002, FP-P10-033~034, 알림 전반', '발송 지점 식별',
     '메일 발송(relay)', '연동 합의 대기', '메일 relay·발송 규격', '미실행'),
    ('의미검색(OpenSearch 등)', 'FP-P06-025~027', 'not_available 응답 처리', '벡터 인덱스·유사도 검색',
     '연동 합의 대기', '검색 엔진·임베딩 파이프라인 규격', '미실행'),
    ('외부 검색 원천 5종', 'FP-P06-007~024', '포털 자체 검색·원천 상태 표시(integration_pending)',
     '데이터셋·AI모델·Docker·PyPI·플랫폼 간 실검색', '낮부 제안 계약(버전 미확정)',
     '원천별 endpoint·인증·응답 규격', '포털 검색 시험 완료(S15-1~4), 원천 실검색 미실행'),
]

CHANGES = [
    ('CHG-001', '추출 확인', 'FP-P15-005', '비고 원문이 `SFR-002, SFR-003, SFR-`로 잘림',
     '보이는 원문만 유지, 마지막 SFR 번호 미확정', '사용자 확인 필요 — 원본 편집파일/RFP 확보 시 갱신'),
    ('CHG-002', '추출 확인', 'FP-P15-013', '비고 원문이 `SFR-009, SFR-010, SFR-`로 잘림',
     '보이는 원문만 유지, 마지막 SFR 번호 미확정', '사용자 확인 필요'),
    ('CHG-003', '추출 확인', 'FP-P15-024', '비고 원문이 `SFR-016, SFR-017, SFR-`로 잘림',
     '보이는 원문만 유지, 마지막 SFR 번호 미확정', '사용자 확인 필요'),
    ('CHG-004', '추출 확인', 'FP-P15-006', '`외부사용자/접속기간` 마지막 글자가 다음 셀로 넘어감',
     '추출값 보존, 정리명에만 전체 업무명 복원', '원본 배치 문제 — 판정 영향 없음'),
    ('CHG-005', '추출 확인', 'FP-P15-007', '앞 행의 `간`이 추출값에 혼입',
     '추출값 보존, 정리명에서 혼입 글자 분리', '판정 영향 없음'),
    ('CHG-006', '기존 결정 갱신', 'K-RMF 메뉴', "기존 'K-RMF 메뉴가 없어야 함' 테스트는 신규 메뉴 추가로 갱신",
     '메뉴 K-RMF 현황(/krmf-monitor) 허용으로 테스트 수정', '기존 mock krmf-evidence는 보존·비연결'),
    ('CHG-007', '임시 규칙', '카탈로그 신청', '카탈로그 신청이 work request에 workspace 유형으로 기록됨',
     'ISSUE-012로 추적, 유형 정합 수정 예정', '이력 해석 시 유의'),
    ('CHG-008', '범위 예외', '데모 모드', '일부 화면은 명시적 isDemo 모드만 데모 데이터 사용',
     'ISSUE-008/015로 추적', '서버 모드 전환 후 데모 격리 재확인'),
    ('CHG-009', '기관 표준 대기', 'MDR·K-RMF', '기관 MDR 표준사전·K-RMF 기준판 미수령',
     'ISSUE-010/011로 추적, 임시 정의·import 구조만 확보', '공식 출처·버전 수령 후 전면 재검증'),
    ('CHG-010', '집계 기준', '가중치', '가중치 숫자 단순합 2,403.5는 원문 참고값',
     '완성도 지표로 사용하지 않음', 'FP 산정 타당성 재검증 아님'),
]


def krmf_sheet_rows(judge, krmf_ids, rows_by_id):
    tab = {'통제 기준선': '통제·증적 탭', '요구·통제 추적': '통제·증적 탭', '증적자료 관리': '통제·증적 탭',
           '미흡사항·보완조치': '조치·변경 탭', '시험준비상태검토': '조치·변경 탭',
           '평가·인가 지원': '조치·변경 탭', '운영변경·재평가': '조치·변경 탭', '현황 대시보드': '현황 탭'}
    out = []
    for fid in krmf_ids:
        j = judge[fid]
        r = rows_by_id[fid]
        if j['fp유형'] in ('ILF', 'EIF'):
            screen = '해당없음(데이터 기능) — 관련 화면 /krmf-monitor'
        else:
            screen = f"/krmf-monitor {tab.get(r['세부업무_정리'], '현황 탭')}"
        out.append([fid, r['세부업무_정리'], r['단위프로세스_정리'], j['fp유형'], screen,
                    j['DB원천'], 'krmf.view/manage/evidence.submit/review' if j['fp유형'] not in ('ILF', 'EIF') else '해당없음(상위 API 권한)',
                    j['API서비스'], j['시험ID'], j['포털개발판정'], j['요구전체충족'],
                    j['남은미비사항'], 'CSV export 3종(BOM) 지원' if j['fp유형'] != 'ILF' else '해당없음'])
    return out


# ---------------------------------------------------------------------------
# 엑셀 작성 유틸
# ---------------------------------------------------------------------------
HDR_FILL = PatternFill('solid', fgColor='1F4E79')
HDR_FONT = Font(color='FFFFFF', bold=True, size=10)
FILL_OK = PatternFill('solid', fgColor='C6EFCE')
FILL_PART = PatternFill('solid', fgColor='FFEB9C')
FILL_BAD = PatternFill('solid', fgColor='FFC7CE')
FILL_GRAY = PatternFill('solid', fgColor='D9D9D9')
WRAP = Alignment(wrap_text=True, vertical='top')


def set_cell(ws, r, c, v):
    cell = ws.cell(row=r, column=c)
    if v is None:
        return cell
    if isinstance(v, str) and v[:1] in ('=', '+', '-', '@'):
        cell.value = v
        cell.data_type = 's'
        cell.quotePrefix = True
    else:
        cell.value = v
    return cell


def write_sheet(wb, name, headers, rows, widths, dv_specs=(), cf_specs=(), freeze='A2'):
    ws = wb.create_sheet(name)
    for ci, h in enumerate(headers, 1):
        cell = set_cell(ws, 1, ci, h)
        cell.fill = HDR_FILL
        cell.font = HDR_FONT
        cell.alignment = Alignment(wrap_text=True, vertical='center')
    for ri, row in enumerate(rows, 2):
        for ci, v in enumerate(row, 1):
            cell = set_cell(ws, ri, ci, v)
            cell.alignment = WRAP
    for ci, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(ci)].width = w
    ws.freeze_panes = freeze
    last = get_column_letter(len(headers))
    ws.auto_filter.ref = f'A1:{last}{len(rows) + 1}'
    for col_idx, options in dv_specs:
        letter = get_column_letter(col_idx)
        dv = DataValidation(type='list', formula1='"' + ','.join(options) + '"', allow_blank=True)
        ws.add_data_validation(dv)
        dv.add(f'{letter}2:{letter}{len(rows) + 1}')
    for col_idx, rules in cf_specs:
        letter = get_column_letter(col_idx)
        rng = f'{letter}2:{letter}{len(rows) + 1}'
        for value, fill in rules:
            ws.conditional_formatting.add(rng, CellIsRule(operator='equal', formula=[f'"{value}"'], fill=fill))
    return ws


CF_VERDICT = [(V_DONE, FILL_OK), (V_PART, FILL_PART), (V_NONE, FILL_BAD), (V_UNVER, FILL_GRAY)]
CF_EXT = [('실연동 검증완료', FILL_OK), (E_READY, FILL_PART), (E_NOTREADY, FILL_BAD),
          ('미검증', FILL_GRAY), (E_NA, FILL_GRAY)]
CF_TEST = [('PASS', FILL_OK), ('FAIL', FILL_BAD), ('BLOCKED', FILL_BAD),
           ('NOT_RUN', FILL_GRAY), ('SKIPPED', FILL_GRAY)]
CF_FULL = [(F_FULL, FILL_OK), (F_PART, FILL_PART), (F_NONE, FILL_BAD), ('확인필요', FILL_GRAY)]


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------
def main():
    rows = load_rows()
    assert len(rows) == 531, f'원문 행 수 {len(rows)} != 531'
    ids = [r['FP_ID'] for r in rows]
    assert len(set(ids)) == 531, 'FP_ID 중복 존재'
    rows_by_id = {r['FP_ID']: r for r in rows}

    extract = json.loads(EXTRACT_JSON.read_text(encoding='utf-8'))
    krmf_ids = extract['krmf_ids']
    assert len(krmf_ids) == 26 and all(i in rows_by_id for i in krmf_ids), 'K-RMF 26행 불일치'

    domain = json.loads(DOMAIN_JSON.read_text(encoding='utf-8'))
    assert domain['summary']['passed'] == 46 and domain['summary']['failed'] == 0
    mdr = json.loads(MDR_JSON.read_text(encoding='utf-8'))
    assert mdr['summary'] == {'passed': 637, 'failed': 0, 'skipped': 0}

    judge = build_judgements(rows)
    assert len(judge) == 531

    # 집계
    c_verdict = Counter(j['포털개발판정'] for j in judge.values())
    c_full = Counter(j['요구전체충족'] for j in judge.values())
    c_ext = Counter(j['외부연동상태'] for j in judge.values())
    c_type = Counter(r['FP유형'] for r in rows)
    area_stats = {}
    for r in rows:
        j = judge[r['FP_ID']]
        st = area_stats.setdefault(r['어플리케이션_정리'], Counter())
        st['rows'] += 1
        st[j['포털개발판정']] += 1
        st[j['요구전체충족']] += 1
    krmf_stats = Counter(judge[i]['포털개발판정'] for i in krmf_ids)
    krmf_full = Counter(judge[i]['요구전체충족'] for i in krmf_ids)
    n_ext_wait = sum(1 for j in judge.values() if j['외부연동상태'] == E_READY)
    n_gap = sum(1 for j in judge.values() if j['남은미비사항'] != '해당없음')
    weight_sum = round(sum(float(r['가중치_숫자']) for r in rows), 1)

    # 충돌 검증: 완료 행에는 시험 증거, 미비 행에는 사유·후속조치
    for fid, j in judge.items():
        if j['포털개발판정'] == V_DONE:
            assert j['시험상태'] == 'PASS' and j['시험ID'] and j['증적경로'], f'{fid} 완료인데 증거 없음'
        if j['포털개발판정'] in (V_PART, V_NONE):
            assert j['남은미비사항'] != '해당없음' and j['후속조치'] != '해당없음', f'{fid} 미비인데 사유 없음'
        if j['외부연동상태'] in (E_READY, E_NOTREADY):
            assert j['요구전체충족'] == F_PART or j['포털개발판정'] == V_NONE, f'{fid} 외부 잔여인데 충족'
        if j['포털개발판정'] == V_NONE:
            assert j['시험상태'] == 'NOT_RUN', f'{fid} 미구현인데 시험상태 오류'

    wb = Workbook()
    wb.remove(wb.active)

    # --- 요약 ---------------------------------------------------------------
    ws = wb.create_sheet('요약')
    done, part, none_, unver = c_verdict[V_DONE], c_verdict[V_PART], c_verdict[V_NONE], c_verdict[V_UNVER]
    full, pf, nf, cf_ = c_full[F_FULL], c_full[F_PART], c_full[F_NONE], c_full['확인필요']
    done_rate = f'{done / 531 * 100:.1f}%'
    full_rate = f'{full / 531 * 100:.1f}%'

    def sec(title):
        r = ws.max_row + 2 if ws.max_row > 1 else 1
        cell = set_cell(ws, r, 1, title)
        cell.font = Font(bold=True, size=12, color='1F4E79')
        return r + 1

    r = sec('1. 기준 정보')
    for k, v in [('기준일(판정·산출)', JUDGE_DATE + ' (시험 재실행 2026-09-29~30)'),
                 ('코드 기준', '브랜치 main HEAD 01a0908 + 미커밋 변경 다수(당일 신규 포함)'),
                 ('환경', 'Node 24, Yarn 4.13, 로컬 PostgreSQL 16(docker), openpyxl 3.1.5'),
                 ('원문 기준선', 'FP_요구사항_원문기준.csv 531행 (EI 115 / EQ 200 / EO 193 / ILF 17 / EIF 6)'),
                 ('가중치 합계(참고)', f'{weight_sum:,.1f} — 원문 단순합 참고값, 완성도 지표 아님')]:
        set_cell(ws, r, 1, k).font = Font(bold=True)
        set_cell(ws, r, 2, v).alignment = WRAP
        r += 1

    r = sec('2. 유형별 행 수 (분모 531)')
    for t in ['EI', 'EQ', 'EO', 'ILF', 'EIF']:
        set_cell(ws, r, 1, t)
        set_cell(ws, r, 2, c_type[t])
        set_cell(ws, r, 3, f'=COUNTIF(개발점검표!$H$2:$H$532,"{t}")')
        r += 1

    r = sec('3. 포털개발판정 집계 (사전 계산 + COUNTIFS 검증)')
    set_cell(ws, r, 1, '판정').font = HDR_FONT
    set_cell(ws, r, 2, '건수(사전 계산)').font = HDR_FONT
    set_cell(ws, r, 3, '건수(COUNTIFS)').font = HDR_FONT
    r += 1
    for v in [V_DONE, V_PART, V_NONE, V_UNVER]:
        set_cell(ws, r, 1, v)
        set_cell(ws, r, 2, c_verdict[v])
        set_cell(ws, r, 3, f'=COUNTIF(개발점검표!$S$2:$S$532,"{v}")')
        r += 1
    set_cell(ws, r, 1, '포털 완료율(완료/531)').font = Font(bold=True)
    set_cell(ws, r, 2, done_rate)
    set_cell(ws, r, 3, '=COUNTIF(개발점검표!$S$2:$S$532,"완료")/531')
    r += 1

    r = sec('4. 요구전체충족 집계 (포털 완료율과 별개 — 외부 수행 잔여 시 충족 금지)')
    for v in [F_FULL, F_PART, F_NONE, '확인필요']:
        set_cell(ws, r, 1, v)
        set_cell(ws, r, 2, c_full[v])
        set_cell(ws, r, 3, f'=COUNTIF(개발점검표!$V$2:$V$532,"{v}")')
        r += 1
    set_cell(ws, r, 1, '요구 전체충족률(충족/531)').font = Font(bold=True)
    set_cell(ws, r, 2, full_rate)
    set_cell(ws, r, 3, '=COUNTIF(개발점검표!$V$2:$V$532,"충족")/531')
    r += 1

    r = sec('5. 영역별 판정 집계 (사전 계산)')
    heads = ['영역', '행수', V_DONE, V_PART, V_NONE, V_UNVER, F_FULL, F_PART, F_NONE]
    for ci, h in enumerate(heads, 1):
        set_cell(ws, r, ci, h).font = HDR_FONT
    r += 1
    for app, st in area_stats.items():
        vals = [app, st['rows'], st[V_DONE], st[V_PART], st[V_NONE], st[V_UNVER],
                st[F_FULL], st[F_PART], st[F_NONE]]
        for ci, v in enumerate(vals, 1):
            set_cell(ws, r, ci, v)
        r += 1
    set_cell(ws, r, 1, '합계').font = Font(bold=True)
    for ci, key in enumerate(['rows', V_DONE, V_PART, V_NONE, V_UNVER, F_FULL, F_PART, F_NONE], 2):
        set_cell(ws, r, ci, sum(st[key] for st in area_stats.values())).font = Font(bold=True)
    r += 1

    r = sec('6. K-RMF 26행 현황 (P14-016~035 20행 + P15-001~004 4행 + P15-020~021 2행)')
    for k, v in [('포털개발판정', f"완료 {krmf_stats[V_DONE]} / 부분완료 {krmf_stats[V_PART]} / 미구현 {krmf_stats[V_NONE]}"),
                 ('요구전체충족', f"충족 {krmf_full[F_FULL]} / 일부충족 {krmf_full[F_PART]}"),
                 ('일부충족 사유', '공식 기관 기준판 미수령(통제 기준선 3행)·외부 평가체계 연동 대기(평가·인가 지원 3행)'),
                 ('화면·출력', '/krmf-monitor 3탭(현황/통제·증적/조치·변경), 요약 카드 5개, CSV export 3종(BOM)')]:
        set_cell(ws, r, 1, k).font = Font(bold=True)
        set_cell(ws, r, 2, v).alignment = WRAP
        r += 1

    r = sec('7. 미비·연동 대기')
    for k, v in [('미비사항 이슈', f'{len(ISSUES)}건 (미비사항 시트 ISSUE-001~{len(ISSUES):03d})'),
                 ('미비 판정 행 수', f'{n_gap}행 (부분완료·미구현 행)'),
                 ('외부 연동 대기 행 수', f'{n_ext_wait}행 (외부연동상태 = 연동준비 완료·실연동 대기)'),
                 ('연동 대기 체계', f'{len(INTEGRATIONS)}종 (연동대기 시트)')]:
        set_cell(ws, r, 1, k).font = Font(bold=True)
        set_cell(ws, r, 2, v).alignment = WRAP
        r += 1

    r = sec('8. 자체시험 요약 (전부 2026-09-29~30 재실행분)')
    test_rows = test_result_rows(domain, mdr)
    for tr in test_rows[:8]:
        set_cell(ws, r, 1, tr[0])
        set_cell(ws, r, 2, tr[1]).alignment = WRAP
        set_cell(ws, r, 3, tr[5])
        r += 1

    r = sec('9. 집계식·분모 명시')
    for t in ['분모: 원문 FP_ID 531개 전수(제외·임의 제외 없음). 다대다 매핑은 구현매핑 시트에만 표현하고 집계는 FP_ID 기준.',
              '포털 완료율 = 포털개발판정 "완료" / 531. 요구 전체충족률 = 요구전체충족 "충족" / 531. 두 지표는 분리.',
              '판정 규칙: 외부 수행·공식 표준 검증이 남은 행은 포털 완료여도 요구전체충족 "충족" 금지 → "일부충족".',
              'COUNTIFS 공식은 뷰어에 따라 값이 공란일 수 있어 사전 계산 값을 병기함.']:
        set_cell(ws, r, 1, t).alignment = WRAP
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=6)
        r += 1
    ws.column_dimensions['A'].width = 34
    ws.column_dimensions['B'].width = 60
    ws.column_dimensions['C'].width = 44
    for ci in range(4, 10):
        ws.column_dimensions[get_column_letter(ci)].width = 14
    ws.freeze_panes = 'A2'

    # --- 요구사항원문 ---------------------------------------------------------
    src_headers = list(rows[0].keys())
    src_rows = [[r[h] for h in src_headers] for r in rows]
    write_sheet(wb, '요구사항원문', src_headers, src_rows,
                [12, 9, 9, 16, 20, 34, 50, 8, 12, 10, 30, 16, 20, 34, 24, 30], freeze='B2')

    # --- 개발점검표 -----------------------------------------------------------
    chk_headers = ['FP_ID', 'PDF페이지', '페이지내행', '원문 어플리케이션', '세부업무', '단위프로세스',
                   '설명', 'FP유형', '원문가중치', '원문비고', '기능그룹ID', '포털수용기준', '포털처리범위',
                   '외부수행범위', '화면·동작', 'API·서비스', 'DB·원천', '구현파일', '포털개발판정',
                   '외부연동상태', '시험상태', '요구전체충족', '시험ID', '증적경로', '남은미비사항',
                   '차단사유·필요자료', '우선순위', '후속조치', '판정일·환경·코드기준']
    chk_rows = []
    for r_ in rows:
        j = judge[r_['FP_ID']]
        chk_rows.append([r_['FP_ID'], int(r_['PDF페이지']), int(r_['페이지내행']), r_['어플리케이션_원문추출'],
                         r_['세부업무_원문추출'], r_['단위프로세스_원문추출'], r_['설명_원문추출'], r_['FP유형'],
                         r_['가중치_원문추출'], r_['비고_원문추출'], j['기능그룹ID'], j['포털수용기준'],
                         j['포털처리범위'], j['외부수행범위'], j['화면동작'], j['API서비스'], j['DB원천'],
                         j['구현파일'], j['포털개발판정'], j['외부연동상태'], j['시험상태'], j['요구전체충족'],
                         j['시험ID'], j['증적경로'], j['남은미비사항'], j['차단사유필요자료'], j['우선순위'],
                         j['후속조치'], j['판정메타']])
    write_sheet(wb, '개발점검표', chk_headers, chk_rows,
                [12, 8, 8, 14, 16, 30, 44, 8, 10, 22, 13, 44, 34, 30, 26, 34, 30, 40, 12, 20, 10, 12,
                 22, 34, 34, 28, 9, 30, 30],
                dv_specs=[(19, [V_DONE, V_PART, V_NONE, V_UNVER]),
                          (20, ['실연동 검증완료', E_READY, E_NOTREADY, '미검증', E_NA]),
                          (21, ['PASS', 'FAIL', 'BLOCKED', 'NOT_RUN', 'SKIPPED']),
                          (22, [F_FULL, F_PART, F_NONE, '확인필요'])],
                cf_specs=[(19, CF_VERDICT), (20, CF_EXT), (21, CF_TEST), (22, CF_FULL)],
                freeze='B2')

    # --- 구현매핑 -------------------------------------------------------------
    map_headers = ['FP_ID', '기능그룹ID', '구현ID', '영역', '화면·동작', 'API·서비스', 'DB·원천',
                   '구현파일', '시험ID', '연결유형']
    map_rows = []
    group_fp_count = Counter(j['기능그룹ID'] for j in judge.values())
    for r_ in rows:
        j = judge[r_['FP_ID']]
        link = '공통구현 공유' if group_fp_count[j['기능그룹ID']] > 1 else '직접'
        map_rows.append([r_['FP_ID'], j['기능그룹ID'], j['기능그룹ID'], j['영역'], j['화면동작'],
                         j['API서비스'], j['DB원천'], j['구현파일'], j['시험ID'], link])
    write_sheet(wb, '구현매핑', map_headers, map_rows,
                [12, 13, 13, 20, 30, 36, 32, 44, 24, 14], freeze='B2')

    # --- 미비사항 -------------------------------------------------------------
    iss_headers = ['이슈ID', '미비 내용', '관련 영역', '관련 FP_ID', '원인', '영향', '우선순위',
                   '후속조치', '필요한 자료/담당 역할', '재검증 기준']
    iss_rows = [list(i) + ['해당 기능의 종단 시험 PASS 및 개발점검표 재판정'] for i in ISSUES]
    write_sheet(wb, '미비사항', iss_headers, iss_rows,
                [10, 40, 24, 30, 28, 34, 9, 30, 34, 30], freeze='B2')

    # --- 연동대기 -------------------------------------------------------------
    int_headers = ['체계/provider', '관련 FP_ID', '포털 구현범위', '외부 수행범위', '계약 버전/합의 상태',
                   '필요한 endpoint·인증·규격', '시험 가능/미실행 범위']
    write_sheet(wb, '연동대기', int_headers, [list(i) for i in INTEGRATIONS],
                [22, 34, 36, 34, 24, 36, 30], freeze='B2')

    # --- 시험결과 -------------------------------------------------------------
    tst_headers = ['case ID', '시험 명칭', '관련 FP_ID(영역)', '환경/데이터', '기대 결과', '결과',
                   '실제 결과', '명령', '일시', '증적 경로', '이슈']
    write_sheet(wb, '시험결과', tst_headers, test_rows,
                [22, 44, 30, 26, 34, 8, 34, 44, 12, 44, 12], freeze='B2',
                cf_specs=[(6, CF_TEST)])

    # --- MDR점검 --------------------------------------------------------------
    mdr_headers = ['점검ID', '점검 항목', '대상', '결과', '예외', '보완사항', '증적 경로']
    mdr_rows = [
        ['MDR-CHK-01', '사전 커버리지: DATA_DICTIONARY.csv(테이블,컬럼) ↔ information_schema.columns 일치',
         '485컬럼 / 테이블 48개', 'PASS (485/485, 이슈 0)', '없음', '없음', EV_MDR],
        ['MDR-CHK-02', 'STANDARD_TERMS 구성단어ID 존재 여부', '표준용어 58건', 'PASS (58/58, 이슈 0)', '없음', '없음', EV_MDR],
        ['MDR-CHK-03', 'STANDARD_CODES 코드셋 ↔ pg_constraint CHECK 일치', '코드셋 46건', 'PASS (46/46, 이슈 0)', '없음', '없음', EV_MDR],
        ['MDR-CHK-04', '자료형/길이·정밀도 일치', '485컬럼', 'PASS (485/485, 이슈 0)', '없음', '없음', EV_MDR],
        ['MDR-CHK-05', '중복 용어·고아 FK·tenant_id 누락', '전체 스키마', 'PASS (중복 0·고아 FK 0·누락 0)', '없음', '없음', EV_MDR],
        ['MDR-CHK-06', '검증 환경', '일회성 로컬 DB(9개 migration 전체 적용 후 삭제)',
         mdr.get('database', ''), '없음', '없음', EV_MDR],
        ['MDR-ISS-01', '기관 표준사전 수령 여부', 'MDR 표준사전·코드집·등록양식',
         '미수령 — 사전 485컬럼은 임시 정의', '기관 기준 미확정',
         '개인정보 분류 재확정 포함, 기관 기준 수령 후 전면 재매핑·재검증(ISSUE-011)', EV_MDR],
        ['MDR-ISS-02', '보완사항', '표준 코드·분류', '해당없음', '해당없음',
         '개인정보 해당 컬럼 분류 재확정, 기관 코드집 반영, 용어 승인 절차 확정', EV_MDR],
    ]
    write_sheet(wb, 'MDR점검', mdr_headers, mdr_rows, [12, 50, 34, 34, 20, 50, 40], freeze='B2',
                cf_specs=[(4, CF_TEST + [('미수령 — 사전 485컬럼은 임시 정의', FILL_PART)])])

    # --- KRMF점검 -------------------------------------------------------------
    krmf_headers = ['FP_ID', '세부업무', '단위프로세스', 'FP유형', '화면 위치', '데이터 테이블', '권한',
                    'API', '시험ID', '포털개발판정', '요구전체충족', '미비사항', '출력 지원']
    krmf_rows = krmf_sheet_rows(judge, krmf_ids, rows_by_id)
    write_sheet(wb, 'KRMF점검', krmf_headers, krmf_rows,
                [12, 18, 40, 8, 30, 44, 26, 36, 24, 12, 12, 36, 20], freeze='B2',
                cf_specs=[(10, CF_VERDICT), (11, CF_FULL)])

    # --- 변경·확인사항 ---------------------------------------------------------
    chg_headers = ['ID', '구분', '대상', '내용', '처리·결정', '확인 필요사항']
    write_sheet(wb, '변경·확인사항', chg_headers, [list(c) for c in CHANGES],
                [10, 14, 18, 50, 44, 40], freeze='B2')

    OUT_XLSX.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUT_XLSX)

    # --- JSON -----------------------------------------------------------------
    status = {
        'generatedAt': JUDGE_DATE,
        '기준일': JUDGE_DATE,
        '코드기준': 'main HEAD 01a0908 + 미커밋 변경',
        '환경': 'Node 24, Yarn 4.13, PostgreSQL 16(docker)',
        '분모': 531,
        '집계': {
            '유형별': dict(c_type),
            '포털개발판정': {k: c_verdict[k] for k in [V_DONE, V_PART, V_NONE, V_UNVER]},
            '요구전체충족': {k: c_full[k] for k in [F_FULL, F_PART, F_NONE, '확인필요']},
            '외부연동상태': dict(c_ext),
            '포털완료율': done_rate,
            '요구전체충족률': full_rate,
            '영역별': {app: dict(st) for app, st in area_stats.items()},
            'KRMF26': {'포털개발판정': dict(krmf_stats), '요구전체충족': dict(krmf_full)},
            '미비이슈수': len(ISSUES),
            '연동대기행수': n_ext_wait,
            '가중치합계참고': weight_sum,
        },
        'rows': [{
            'FP_ID': j['fp_id'], '영역': j['영역'], '세부업무': j['세부업무'], '단위프로세스': j['단위프로세스'],
            'FP유형': j['fp유형'], '기능그룹ID': j['기능그룹ID'], '포털개발판정': j['포털개발판정'],
            '외부연동상태': j['외부연동상태'], '시험상태': j['시험상태'], '요구전체충족': j['요구전체충족'],
            '미비사유': j['남은미비사항'], '증적경로': j['증적경로'], '시험ID': j['시험ID'],
        } for j in judge.values()],
    }
    OUT_JSON.write_text(json.dumps(status, ensure_ascii=False, indent=1), encoding='utf-8')

    # --- 재검증 ----------------------------------------------------------------
    wb2 = load_workbook(OUT_XLSX)
    names = wb2.sheetnames
    assert names == ['요약', '요구사항원문', '개발점검표', '구현매핑', '미비사항', '연동대기',
                     '시험결과', 'MDR점검', 'KRMF점검', '변경·확인사항'], f'시트 구성 오류: {names}'
    ws_src = wb2['요구사항원문']
    ws_chk = wb2['개발점검표']
    assert ws_src.max_row - 1 == 531, f'요구사항원문 {ws_src.max_row - 1}행'
    assert ws_chk.max_row - 1 == 531, f'개발점검표 {ws_chk.max_row - 1}행'
    src_ids = [ws_src.cell(row=i, column=1).value for i in range(2, 533)]
    chk_ids = [ws_chk.cell(row=i, column=1).value for i in range(2, 533)]
    assert len(set(src_ids)) == 531 and len(set(chk_ids)) == 531, 'FP_ID 중복'
    assert set(src_ids) == set(chk_ids) == set(ids), 'FP_ID 집합 불일치'
    krmf_in_sheet = [i for i in chk_ids if i in set(krmf_ids)]
    assert len(krmf_in_sheet) == 26, 'K-RMF 26행 불일치'
    sample = ws_src.cell(row=2, column=4).value
    assert isinstance(sample, str) and '포털' in sample, f'한글 샘플 셀 오류: {sample!r}'
    desc_cell = ws_chk.cell(row=2, column=7).value
    assert isinstance(desc_cell, str) and len(desc_cell) > 0, '설명 셀 누락'
    # 긴 설명 미절단 확인(원문 최대 길이 대비)
    max_len_src = max(len(str(r_['설명_원문추출'])) for r_ in rows)
    found = False
    for i in range(2, 533):
        v = ws_chk.cell(row=i, column=7).value
        if v and len(str(v)) == max_len_src:
            found = True
            break
    assert found, '가장 긴 설명 행이 절단됨'
    # 요약 COUNTIFS 공식 존재 확인
    ws_sum = wb2['요약']
    formulas = [c.value for row_ in ws_sum.iter_rows() for c in row_
                if isinstance(c.value, str) and c.value.startswith('=COUNTIF')]
    assert len(formulas) >= 10, '요약 집계 공식 부족'

    print('=== 생성·검증 완료 ===')
    print(f'엑셀: {OUT_XLSX}')
    print(f'JSON: {OUT_JSON}')
    print(f'시트 10개: {names}')
    print(f'원문 531 / 점검표 531 / 고유 FP_ID 531 / 중복 0 / K-RMF 26 일치')
    print(f'포털개발판정: 완료 {done} / 부분완료 {part} / 미구현 {none_} / 미검증 {unver}')
    print(f'요구전체충족: 충족 {full} / 일부충족 {pf} / 미충족 {nf} / 확인필요 {cf_}')
    print(f'포털 완료율 {done_rate} / 요구 전체충족률 {full_rate}')
    print(f'연동 대기 행 {n_ext_wait} / 미비 이슈 {len(ISSUES)}건 / 가중치 합계(참고) {weight_sum:,.1f}')
    print(f'한글 샘플 셀: {sample}')
    print(f'요약 COUNTIFS 공식 {len(formulas)}개 확인')


def test_result_rows(domain, mdr):
    env = 'Node 24·Yarn 4.13·PostgreSQL 16(docker) 로컬, 일회성 DB'
    rows = [
        ['TEST-TSC-001', 'TypeScript 전체 타입 검사(tsc:full)', '전 영역', env, '타입 오류 0', 'PASS',
         '오류 0', 'yarn tsc:full', '2026-09-30', EV_TSC, '없음'],
        ['TEST-BUILD-001', '전체 빌드(build:all)', '전 영역', env, '빌드 성공', 'PASS',
         '성공', 'yarn build:all', '2026-09-29', EV_BUILD, '없음'],
        ['TEST-UNIT-BE-001', '백엔드 단위시험 159건(krmfDomain·krmfStorage·credits·transfers·projects·proposals·catalog·portalSettings·portalSearch 등 services *.test.ts)',
         '신규 도메인 전반', env, '159/159 PASS', 'PASS', '159/159 PASS',
         'yarn workspace backend test', '2026-09-29', EV_UNIT_BE, '없음'],
        ['TEST-UNIT-FE-001', '프론트 단위시험 227건(app 컴포넌트 *.test.ts(x) 40파일+)',
         '프론트 전 영역', env, '227/227 PASS', 'PASS', '227/227 PASS',
         'yarn workspace app test', '2026-09-29', EV_UNIT_FE, '없음'],
        ['TEST-INT-RUNTIME-001', 'portal-runtime 통합시험 48건(인증·정책·메뉴·감사·테넌트 차단 등)',
         '메인·인증·사용자·RBAC·정책·메뉴·감사·테넌트·환경설정', env, '48/48 PASS', 'PASS', '48/48 PASS',
         'node scripts/test-portal-runtime.mjs', '2026-09-29', EV_RUNTIME, '없음'],
        ['TEST-INT-WORK-001', 'work-api 통합시험 14건(워크스페이스·자원 신청·승인 원장)',
         '워크스페이스/리소스·프로젝트 일부', env, '14/14 PASS', 'PASS', '14/14 PASS',
         'node scripts/test-portal-work-api.mjs', '2026-09-29', EV_WORK, '없음'],
        ['TEST-MDR-001~005', 'MDR 검증 637건(사전 커버리지 485·용어 58·코드 46·자료형 485·무결성)',
         '데이터 관리(ILF/EIF) 전반', '일회성 로컬 DB(migration 9종 적용 후 삭제)', '637/637 PASS', 'PASS',
         '637/637 PASS, 예외 0', 'node scripts/verify-mdr-dictionary.mjs', '2026-09-29', EV_MDR, '없음'],
        ['TEST-API-DOMAIN-000', '신규 도메인 HTTP 시나리오 46건(아래 S0-1~S16-1 전개)',
         'K-RMF·크레딧·반출·프로젝트·제안·카탈로그·검색·감사', env, '46/46 PASS', 'PASS',
         '46/46 PASS', '도메인 시험 스크립트(결과 JSON 저장)', '2026-09-30', EV_DOMAIN, '없음'],
    ]
    area_map = {'S1': 'K-RMF 기준선', 'S2': 'K-RMF 기준선', 'S3': 'K-RMF 증적', 'S4': 'K-RMF 권한',
                'S5': 'K-RMF 조치', 'S6': 'K-RMF 운영변경', 'S7': 'K-RMF TRR·추적', 'S8': 'K-RMF 출력',
                'S9': '크레딧 충전', 'S10': '크레딧 차감·사용량', 'S11': '반출', 'S12': '프로젝트',
                'S13': '제안', 'S14': '카탈로그', 'S15': '통합검색', 'S16': '감사', 'S0': 'migration'}
    for c in domain['checks']:
        sid = c['id']
        area = area_map.get(sid.split('-')[0], '도메인')
        rows.append([f'TEST-API-DOMAIN-{sid}', c['scenario'], area, env, '시나리오 기대 결과 충족',
                     c['result'], c.get('detail', ''), '도메인 시험 스크립트', '2026-09-30', EV_DOMAIN, '없음'])
    return rows


if __name__ == '__main__':
    main()
