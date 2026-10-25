# TODO

## 완료 단계

- [x] 1단계: Backstage 기본 포털 구축 완료
  - [x] 프로젝트 기본 구조 생성
  - [x] 초기 문서 작성 (WBS, ARCHITECTURE, CHANGE_SUMMARY, TODO)
  - [x] Backstage 앱 생성
  - [x] Backstage 로컬 실행 및 접속 확인
  - [x] README.md 실행 방법 작성

- [x] 2단계: Keycloak 인증/권한 연동 준비 완료
  - [x] `infra/keycloak/docker-compose.yml` 작성
  - [x] Keycloak Docker 실행
  - [x] `kt-ai` Realm, `backstage` Client 설계 및 생성
  - [x] 테스트 사용자/그룹/역할 정의 및 생성
  - [x] `docs/KEYCLOAK_SETUP.md` 작성

- [x] 3단계: Backstage와 Keycloak OIDC 연동 완료
  - [x] Backstage OIDC Provider 설정 (`app-config.yaml`)
  - [x] Keycloak Client Secret 환경변수 분리
  - [x] `AUTH_SESSION_SECRET` 설정
  - [x] Backstage 로그인 UI에서 Keycloak OIDC 선택 가능
  - [x] Keycloak 로그인 성공 후 Backstage로 복귀 확인
  - [x] Backstage identity에 Keycloak 사용자 정보 반영 확인
  - [x] `docs/KEYCLOAK_INTEGRATION.md` 작성

- [x] 4단계: OpenSearch 검색엔진 연동 완료
  - [x] `infra/opensearch/docker-compose.yml` 작성
  - [x] 개발용 단일 노드 OpenSearch 실행
  - [x] OpenSearch Dashboards 실행
  - [x] `portal-catalog` 인덱스 생성
  - [x] 샘플 메타데이터 8건 이상 적재
  - [x] 검색 테스트 스크립트 작성 및 실행
  - [x] `docs/SEARCH_DESIGN.md` 작성

- [x] 5단계: OpenMetadata 카탈로그 연동 완료
  - [x] `infra/openmetadata` 실행 방법 정리
  - [x] OpenMetadata 공식 Docker Compose 기반 실행
  - [x] UI/API 접근 검증
  - [x] 데이터셋/테이블/AI 모델/파이프라인 메타데이터 개념 문서화
  - [x] OpenMetadata API 연계 후보 정리
  - [x] `docs/OPENMETADATA_DESIGN.md` 작성

- [x] 6단계: 자체 플러그인 1차 - 프로젝트/워크스페이스 관리 완료
  - [x] `project-workspace` 기능 생성
  - [x] 메뉴 `Project Workspace` 추가
  - [x] 프로젝트 목록 화면 구현
  - [x] 프로젝트 상세 화면 구현
  - [x] 프로젝트 생성 신청 화면 구현
  - [x] 승인/반려 상태 UI 구현
  - [x] 참여자/역할 UI 구현
  - [x] 리소스 할당량 UI 구현
  - [x] mock data 기반 PoC 구현
  - [x] API/DB 연동 확장 구조 문서화
  - [x] `docs/PLUGIN_PROJECT_WORKSPACE.md` 작성

- [x] 7단계: 자체 플러그인 2차 - 반출/반입 관리 완료
  - [x] `export-approval` 기능 생성
  - [x] 반출/반입 신청 목록 화면 구현
  - [x] 반출/반입 신청 상세 화면 구현
  - [x] 반출/반입 신청 등록 화면 구현
  - [x] 반출 대상 유형 UI 구현
  - [x] 승인 상태 UI 구현
  - [x] 보안등급/공개여부/사용권한 UI 구현
  - [x] 다운로드 가능 여부 표시
  - [x] 감사로그 mock data 표시
  - [x] mock data 기반 PoC 구현
  - [x] API/DB/파일저장소 연동 확장 구조 문서화
  - [x] `docs/PLUGIN_EXPORT_APPROVAL.md` 작성

- [x] 8단계: 자체 플러그인 3차 - 크레딧 관리 완료
  - [x] `credit-manager` 기능 생성
  - [x] 프로젝트별 크레딧 현황 UI
  - [x] 총 부여/사용/잔여 크레딧 요약 카드
  - [x] 충전 이력 표시
  - [x] 사용 이력 표시
  - [x] 예상 사용 가능 기간 표시
  - [x] 자원별 단가 설정
  - [x] 크레딧 부족 시 자원 비활성화 상태 표시
  - [x] 알림/경고 패널 표시
  - [x] mock data 기반 PoC 구현
  - [x] API/DB/큐브 사용량 연동 확장 구조 문서화
  - [x] `docs/PLUGIN_CREDIT_MANAGER.md` 작성

- [x] 9단계: 자체 플러그인 4차 - K-RMF 증빙관리 완료
  - [x] `krmf-evidence` 기능 생성
  - [x] K-RMF 통제항목 목록 화면 구현
  - [x] 통제항목 적용 여부/담당자/점검 상태 UI
  - [x] 통제항목 상세 및 증빙/이력 UI
  - [x] 증빙자료 목록/상태 UI
  - [x] 보안 미흡사항 조치관리 UI
  - [x] 타 수행사 제출자료 관리 UI
  - [x] 통합진척률 대시보드
  - [x] mock data 기반 PoC 구현
  - [x] API/DB/파일저장소 연동 확장 구조 문서화
  - [x] `docs/PLUGIN_KRMF_EVIDENCE.md` 작성

- [x] 10단계: 통합검색 플러그인 또는 화면 개발
  - [x] `integrated-search` 기능 생성
  - [x] 메뉴 `Integrated Search` 추가
  - [x] OpenSearch `portal-catalog` 검색 연동
  - [x] 검색어 입력 UI 구현
  - [x] 검색 대상 유형 필터 UI 구현
  - [x] 보안등급 필터 UI 구현
  - [x] 소스 시스템 필터 UI 구현
  - [x] 태그 필터 UI 구현
  - [x] 검색 결과 목록 구현
  - [x] 검색 결과 상세 패널 구현
  - [x] OpenSearch 연결 실패 시 mock fallback 처리
  - [x] 임베딩 기반 유사도 검색 설계 문서화
  - [x] 권한 기반 검색 결과 필터링 설계 문서화
  - [x] `docs/SEARCH_IMPLEMENTATION.md` 작성

## 10.1단계: 검색/보안등급 정규화 안정화 완료

- [x] 보안등급 오타 `내부` → `내부` 정정
- [x] Integrated Search 보안등급 표시 정규화
  - `SearchFilterPanel` 보안등급 옵션: `전체`, `공개`, `내부`, `비밀`
  - `SearchApiClient` `securityLevelToKorean` 라벨: `internal` → `내부`
  - `normalizeSecurityLevel`: 문자열 기준 정규화 (`공개`/`public`, `내부`/`internal`, `비밀`/`secret`)
- [x] 문서 내 보안등급 기준 정리
  - `docs/SEARCH_IMPLEMENTATION.md`
  - `docs/CHANGE_SUMMARY.md`
  - `docs/OPENMETADATA_DESIGN.md`
- [x] OpenSearch `portal-catalog` 실제 데이터 확인 (`공개`, `내부`, `비밀`)
- [x] 검색/필터 및 기존 메뉴 회귀 확인

## 10.2단계: 보안등급 오타 최종 정정 완료

- [x] 보안등급 오타 `내부` → `내부` 최종 정정
- [x] Integrated Search 보안등급 표시값 `내부` 확인
  - `SearchFilterPanel` 보안등급 옵션: `전체`, `공개`, `내부`, `비밀`
  - `SearchApiClient` `securityLevelToKorean` 라벨: `internal` → `내부`
  - `normalizeSecurityLevel`: 문자열 기준 정규화 (`공개`/`public`, `내부`/`internal`, `비밀`/`secret`)
- [x] 문서/코드/샘플 데이터 보안등급 기준 통일
  - `docs/SEARCH_IMPLEMENTATION.md`
  - `docs/SEARCH_DESIGN.md`
  - `docs/PLUGIN_PROJECT_WORKSPACE.md`
  - `docs/OPENMETADATA_DESIGN.md`
  - `docs/CHANGE_SUMMARY.md`
  - `notes/DECISIONS.md`
- [x] OpenSearch `portal-catalog` 샘플 데이터 및 실제 데이터 `내부`로 업데이트 확인
- [x] 검색/필터 및 기존 메뉴 회귀 확인

## 11단계: 메인 포털 대시보드 및 홈 화면 재구성 완료

- [x] `portal-dashboard` 기능 생성
- [x] Home 화면을 메인 포털 대시보드로 교체
- [x] 로그인 사용자 정보 표시
- [x] 통합검색 바로가기 구현
- [x] 주요 현황 요약 카드 구현
- [x] 공지사항 패널 구현
- [x] 신규 데이터셋/AI 모델 패널 구현
- [x] 내 프로젝트 현황 패널 구현
- [x] 반출 승인 대기 패널 구현
- [x] 크레딧 현황 패널 구현
- [x] K-RMF 증빙 진행률 패널 구현
- [x] 시스템 상태 패널 구현
- [x] 주요 메뉴 바로가기 구현
- [x] `docs/PORTAL_DASHBOARD.md` 작성

## 11.1단계: Keycloak OIDC 런타임 환경변수 안정화 완료

- [x] Keycloak OIDC clientSecret 런타임 로딩 안정화
- [x] `scripts/start-dev.sh` 추가
- [x] `.env` 로딩 방식 문서화
- [x] `admin01` OIDC 로그인 검증
- [x] Portal Dashboard 사용자 정보 표시 검증
- [x] 기존 메뉴 회귀 확인

## 31.6단계: 실제 기능 전수검증 및 결함 보완 완료

- [x] Playwright 기반 전수검증 스크립트 작성 (`backstage-portal/scripts/full-audit-playwright.mjs`)
- [x] Smoke test 스크립트 작성 (`scripts/smoke-check-demo-routes.mjs`)
- [x] `/api/auth/guest/refresh` 브라우저 캐시 버스팅 적용
- [x] 통합검색 mock fallback 문구 중립화
- [x] 서비스 카탈로그, 프로젝트/반출 신청, 제안 게시판, 크레딧 관리, 관리자 콘솔, 마이페이지 등 mock/PoC/데모/제안 문구 최종 제거
- [x] 12개 일반 라우트 전수검증
- [x] 4개 관리자 직접 URL 차단 검증
- [x] 4개 관리자 권한 라우트 기능/CSV/링크 검증
- [x] Firebase Hosting 재배포
- [x] `docs/STAGE_31_6_FULL_AUDIT_REPORT.md`, `docs/STAGE_31_6_AUDIT_RESULTS.md` 작성
- [x] 문서 인덱스/변경이력/배포로그/기술부채/결정사항/README 갱신

## 32단계: 제안서/PPT용 화면 캡처 및 장표 패키징 완료

- [x] production URL 기준 화면 재캡처 스크립트 작성 (`scripts/capture-proposal-screenshots-prod.js`)
- [x] 21개 핵심 화면 캡처 (11개 일반 + 3개 관리자 콘솔 탭 + 3개 관리자 직접 URL + OpenMetadata/OpenSearch/Keycloak/Backstage)
- [x] 시연/샘플 데이터 안내 배너 자동 숨김 처리
- [x] python-pptx 기반 PPT 초안 생성 (`scripts/generate-proposal-ppt.py`)
- [x] 각 장표에 RFP ID, 요구사항명, 요구내용, 대응 화면, 구현 기능, 구현 수준, 후속 연동 범위 포함
- [x] `데모`/`PoC`/`프리뷰`/`mock`/`제안서 작업용` 문구 미노출 확인
- [x] `docs/PROPOSAL_SCREENSHOT_CATALOG.md`, `docs/SCREENSHOT_CAPTIONS.md`, `proposal-package/README.md` 갱신

## 32.1단계: Firebase Google 로그인 재배포 및 수동 검증 완료

- [x] Firebase SDK config 추출 로직 수정
- [x] Firebase Hosting 재배포
- [x] Google 로그인 팝업/계정 선택/비밀번호 화면까지 도달 확인
- [x] `/api/auth/guest/refresh` 404 원인 분석 (Firebase Hosting edge stale cache)
- [x] Smoke test cache-buster 적용 및 17/17 통과
- [x] 신규 가이드/설명자료 작성 (`docs/PORTAL_*_GUIDE.md`, `proposal-package/국방지능형플랫폼포털_기능흐름_사용설명자료.md`)
- [ ] kyubeom@gmail.com Google 로그인 완료 확인 (사용자 수동)
- [ ] Firebase Console Google Provider/Authorized domains 수동 확인

## 다음 단계

## 12단계: 최종 산출물 및 제안장표용 화면 정리 완료

- [x] 제안장표용 주요 화면 캡처
- [x] 데모 시나리오 작성
- [x] 최종 산출물 목록 정리
- [x] 현재 PoC 한계사항 정리
- [x] 운영 전환 시 고려사항 정리
- [x] TypeScript 기존 오류 정리 계획 수립
- [x] 정식 Backstage Plugin 전환 검토
- [x] `docs/FINAL_DELIVERABLES.md` 작성
- [x] `docs/DEMO_SCRIPT.md` 작성
- [x] `docs/TECH_DEBT.md` 작성

## 13단계: 국방지능화플랫폼 타이틀 변경 및 관리자 기능 화면 1차 보강

- [x] 포털 명칭 `국방지능화플랫폼`으로 변경
  - [x] `app-config.yaml` title / organization / mcpActions 반영
  - [x] Portal Dashboard Hero 영역 반영
  - [x] README.md 및 주요 문서 제목/개요 반영
- [x] Admin Console 메뉴 및 라우팅 추가 (`/admin-console`)
- [x] Admin Console 화면 구성
  - [x] 요약 카드 (등록 신청 대기, 승인 대기, 외부 사용자, 활성 사용자, 잠금 계정, 권한 그룹, 로그인 정책, 보안 이벤트)
  - [x] 사용자 등록 신청 패널
  - [x] 사용자 관리 패널
  - [x] 권한/역할 관리 패널
  - [x] 로그인 정책 관리 패널
  - [x] 비밀번호 정책 관리 패널
  - [x] 이력/감사 로그 패널
  - [x] 메뉴 관리 패널
  - [x] 요구사항 대응 현황 패널
- [x] Portal Dashboard Quick Links에 Admin Console 추가
- [x] `docs/REQUIREMENT_SCREEN_COVERAGE.md` 작성
- [x] WBS/ARCHITECTURE/CHANGE_SUMMARY/TODO/DECISIONS/README 갱신

## 14단계: 사용자 등록/승인 및 외부 사용자 관리 화면 상세화

- [x] 사용자 등록 신청 상세 화면
- [x] 본인확인 상태 표시
- [x] 사용자 승인/반려/보완요청/재신청 mock workflow
- [x] 외부 사용자 계정 조회/등록/수정 화면
- [x] 사용자 소속/역할/접속 가능 서비스 설정 화면
- [x] 사용자 상태 변경 이력 표시
- [x] Keycloak/DB 연동 설계 문서 작성 (`docs/USER_MANAGEMENT_DESIGN.md`)

## 15단계: 권한/역할/메뉴 관리 화면 상세화

- [x] 역할 상세 화면
- [x] 역할별 메뉴 접근 권한 설정
- [x] 역할별 데이터 등급 접근 설정
- [x] 프로젝트별 역할 매핑 화면
- [x] 사용자/그룹별 권한 매핑 화면
- [x] 메뉴 트리 관리 상세 화면
- [x] 신규 프로그램 등록 화면
- [x] 권한 변경 이력 표시
- [x] Keycloak role/group claim 연동 설계 문서 작성 (`docs/RBAC_MENU_MANAGEMENT_DESIGN.md`)

## 16단계: 로그인/비밀번호 정책 및 이력/감사로그 화면 상세화

- [x] 로그인 정책 상세 화면
- [x] 로그인 실패 차단 정책
- [x] 중복 로그인 정책
- [x] 자동 로그아웃 정책
- [x] 비밀번호 복잡도/만료/잠금 정책
- [x] 로그인 이력
- [x] 로그아웃 이력
- [x] 비밀번호 변경 이력
- [x] 사용자 접근 로그
- [x] 사용자 정보수정 로그
- [x] 관리자 조치 이력
- [x] 보안감사 대시보드
- [x] Keycloak event log 연동 설계 문서 작성 (`docs/SECURITY_POLICY_AUDIT_DESIGN.md`)

## 17단계: 서비스/도구 카탈로그 및 제안 게시판 화면 추가

- [x] 서비스/도구 카탈로그 메인 화면
- [x] 분석 프레임워크 선택 화면
- [x] 개발도구 선택 화면
- [x] 데이터 도구 선택 화면
- [x] 시각화 도구 선택 화면
- [x] 라벨링 도구 선택 화면
- [x] 직접 입력/카탈로그 선택 UI
- [x] 제안 게시판 목록
- [x] 제안 등록 화면
- [x] 제안 상세 화면
- [x] 공감/추천 UI
- [x] 관리자 승인/공지 UI
- [x] 서비스 카탈로그 및 제안 게시판 설계 문서 작성 (`docs/SERVICE_CATALOG_PROPOSAL_BOARD_DESIGN.md`)

## 18단계: 마이페이지 및 환경설정 화면 추가

- [x] 마이페이지 메인 화면
- [x] 프로필 조회/수정
- [x] 이메일 확인 상태
- [x] 비밀번호 변경
- [x] 활성 세션 조회
- [x] 세션 강제 종료 mock
- [x] 내 프로젝트/워크스페이스 현황
- [x] 자원 사용 이력
- [x] 크레딧 사용 내역
- [x] 알림 설정
- [x] 개인 API 키 관리
- [x] 내 활동 로그
- [x] 환경설정 메인 화면
- [x] 시스템 파라미터
- [x] 보안 정책
- [x] 자원할당 기준
- [x] 운영 설정
- [x] 마이페이지 및 환경설정 설계 문서 작성

## 19단계: 육해공군 관리자 권한 및 멀티테넌트 관리 화면 추가

- [x] Tenant Management 메인 화면
- [x] 군별 테넌트 개요
- [x] 위임관리 체계
- [x] 군별 리소스 풀
- [x] 군별 쿼터 관리(할당/변경/회수)
- [x] 사용량 대시보드
- [x] 군별 프로젝트 사용량
- [x] 테넌트 경계/분리 정책
- [x] 쿼터 변경 이력
- [x] 요구사항 대응 현황
- [x] Sidebar 메뉴 및 `/tenant-management` 라우팅 추가
- [x] Portal Dashboard Quick Links 및 요약 카드 추가
- [x] Tenant Management 설계 문서 작성

## 20단계: 최종 요구사항 추적표 및 제안서용 화면 정리

- [x] 견적용 기능목록 1~155 전체 요구사항 대응표 정리
- [x] 화면별 RFP 매핑표 작성
- [x] 화면 기준 충족도 최종 재평가
- [x] 미구현 내부 로직 목록 정리
- [x] 제안서용 화면 캡처 목록 정리
- [x] 데모 시나리오 최종 정리
- [x] 기술부채 최종 정리
- [x] README/FINAL_DELIVERABLES 최종 갱신
- [x] 제안서 작성용 요약 문구 작성

## PoC 이후 후속 작업

### 단기 안정화

- [x] `App.test.tsx` TypeScript 오류 수정 (24단계에서 `<App />` 직접 렌더링으로 수정)
- [ ] MUI v4 findDOMNode warning 정리
- [ ] Keycloak role/group claim 연동 및 권한 기반 메뉴 제어

### 실제 연동

- [ ] Project Workspace 실제 DB/API 연동
- [ ] Export Approval 실제 DB/API 및 승인 워크플로우 연동
- [ ] Credit Manager 실제 자원 사용량 연동
- [ ] K-RMF Evidence 실제 평가 시스템 연동
- [ ] OpenMetadata ↔ 포털 데이터 동기화
- [ ] OpenSearch 업무 데이터 색인 파이프라인 구축

### 운영 전환

- [ ] PostgreSQL 등 운영 DB 연동
- [ ] HTTPS/TLS 적용
- [ ] Secret 관리 체계 도입
- [ ] Kubernetes 배포 구조 설계
- [ ] CI/CD 파이프라인 구축
- [ ] 로그/감사/모니터링 체계 구축

### 제안/시연 자료화

- [ ] 제안장표용 PPT/문서 작성
- [ ] 주요 시나리오 E2E 테스트 자동화
- [ ] 시연 동영상 녹화


## 20.5단계: 포털 명칭, 메뉴 한글화, UI 색상 안정화

- [x] 한글 공식 사이트명 `국방지능형플랫폼포털`로 변경
- [x] 영문 보조명 `K-Defense Intelligence Platform` 유지
- [x] Sidebar 메뉴 한글화 (라우트는 유지)
- [x] Portal Dashboard Quick Links 한글화
- [x] 주요 화면 제목 한글화
- [x] Admin Console 내부 탭 라벨 정리
- [x] 색상/톤앤매너 보완 (Hero, Summary Card, Quick Link)
- [x] 문서 명칭/메뉴 반영
- [x] 21단계 TODO에 재촬영 항목 추가

## 21단계: 제안서 작성 자료 패키징 및 화면 캡처 보강

- [x] 20.5단계에서 변경된 사이트명/메뉴/색상 기준으로 화면 캡처 재촬영 (01~14)
- [x] 한글 메뉴/화면 제목 기준 제안서 캡션 작성
- [x] 국방지능형플랫폼포털 명칭 기준 제안서 문구 정리
- [x] 기능별 견적 산정 기준 정리
- [x] M/M 산정표 초안 작성
- [x] 제안 발표용 화면 순서 정리
- [x] 최종 산출물 압축 패키지 구성 (`proposal-package/`)

## 22단계: 제안서 초안 및 견적서 초안 작성

- [x] 제안서 목차 초안 작성
- [x] 제안서 본문 초안 작성
- [x] 발표자료 초안 작성
- [x] 견적서 초안 작성
- [x] RFP 매핑 근거 보강
- [x] 구현 로드맵 작성
- [x] 리스크 및 대응방안 작성
- [x] `proposal-package/`에 22단계 문서 반영 및 zip 갱신

## 22.1단계: 보안등급 표기 최종 Hotfix

- [x] 보안등급 오타 문자열 전면 검색
- [x] 제출용 문서(`docs/*`, `proposal-package/*`, `README.md`, `backstage-portal/README.md`)에서 오타 제거
- [x] 보안등급을 `공개` / `내부` / `비밀`로 최종 통일
- [x] `docs/CHANGE_SUMMARY.md`, `docs/WBS.md`, `notes/DECISIONS.md` 역사적 기록도 정리
- [x] `proposal-package` 문서 복사본 갱신 및 zip 재생성

## 22.2단계: 보안등급 표준값 최종 재검증 및 수정

- [x] 잘못된 보안등급 표기 전면 검색
- [x] 제출용 문서 및 `proposal-package`에서 잘못된 표기 제거
- [x] 보안등급 표준을 `공개` / `내부` / `비밀`로 최종 통일
- [x] `docs/CHANGE_SUMMARY.md`, `notes/DECISIONS.md`, `docs/WBS.md`, `docs/TODO.md`, `docs/FINAL_DELIVERABLES.md` 갱신
- [x] `proposal-package` 복사본 갱신 및 zip 재생성

## 23단계: 제안서/PPT/견적서 최종 산출물 작성

- [x] 제안서 본문을 Markdown 최종본으로 정리
- [x] 발표자료 PPTX 작성
- [x] 견적서 Excel 작성
- [x] 기능목록 1~155와 M/M 산정표 연결
- [x] 화면 캡처 삽입본 작성
- [x] 최종 제출 패키지 zip 구성
- [ ] GitHub push 인증 해결 후 원격 반영
- [ ] `App.test.tsx` 기존 오류 정리 여부 판단

## 23.5단계: 최종 산출물 요구사항 역검증

- [x] 기능목록 1~155가 제안서/견적서에 반영되었는지 확인
- [x] SFR-001~SFR-021 매핑 여부 확인
- [x] 제안서 본문/PPT/견적서의 기능명·화멸명 일치 확인
- [x] 화면 캡처 18개가 제안서/PPT 설명과 일치하는지 확인
- [x] 보안등급 표기가 `공개 / 내부 / 비밀`로만 사용되는지 확인
- [x] 미구현 항목을 PoC 한계 또는 후속 구축 범위로 명확히 표시
- [x] M/M 산정표의 기능구분이 1~155 기능목록과 연결되는지 확인
- [x] `docs/FINAL_REQUIREMENT_VALIDATION_REPORT.md` 작성

## 23.6단계: 최종 검증 보고서 Hotfix

- [x] 보안등급 표준을 `공개 / 내부 / 비밀`로 최종 고정
- [x] 보안등급 오타 문자열 최종 제거
- [x] `docs/FINAL_REQUIREMENT_VALIDATION_REPORT.md` SFR-001~SFR-021 매핑 결과를 `통과`로 수정
- [x] SFR-001~SFR-021 매핑표를 보고서 및 관련 문서에 추가
- [x] 제안서/PPT/견적서/proposal-package 복사본 갱신
- [x] proposal-package zip 재생성
- [x] `kimi_done.sh` 실행

## 24단계: Firebase + Cloud Run 데모 배포 준비 완료

- [x] 데모 배포 범위/제약 정의
- [x] `PreviewAuthGate` / `PreviewLoginPage` / `previewAuth.ts` 추가
- [x] `DemoModeBanner` 추가
- [x] `App.tsx`에 게이트 및 배너 적용
- [x] `app-config.demo.yaml` 작성
- [x] `firebase.json` / `.firebaserc.example` 작성
- [x] Docker 빌드용 `Dockerfile.demo` 작성
- [x] `scripts/build-demo.sh` / `deploy-demo-cloudrun.sh` / `deploy-demo-firebase.sh` 추가
- [x] `docs/FIREBASE_DEMO_DEPLOYMENT.md` 작성
- [x] `docs/FIREBASE_DEMO_CHECKLIST.md` 작성
- [x] 문서/목차/변경이력 갱신
- [ ] GCP/Firebase 프로젝트 생성 및 Cloud Run 배포
- [ ] 가비아 `<sub>.kbcosmos.com` DNS 연결 및 HTTPS 인증서 발급

## 25단계: GitHub 원격 반영 및 최종 품질 점검

- [ ] GitHub push 인증 해결
- [ ] `App.test.tsx` 기존 오류 정리 여부 최종 판단
- [ ] 제안서/PPT/견적서 사용자 피드백 반영 및 세부 다듬기


## 27단계: 사전규격 최신 요구사항 데이터 반영

- [x] 기존 155개 기능목록 분석
- [x] 최신 163개 기능목록 확정 (신규 8개, 변경 SFR 13개)
- [x] `requirement-progress/types.ts` 작성
- [x] `requirement-progress/mockRequirementProgressData.ts` 작성 (163개 기능, 21개 SFR 요약, 13개 변경이력, 7개 질의사항)
- [x] `requirement-progress/requirementProgressUtils.ts` 작성
- [x] `yarn tsc --noEmit` 통과
- [x] `yarn test` 통과
- [x] 관련 문서 14개 갱신
  - `docs/FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md`
  - `docs/FINAL_REQUIREMENT_VALIDATION_REPORT.md`
  - `docs/SCREEN_TO_RFP_MAPPING.md`
  - `docs/RFP_MAPPING_JUSTIFICATION.md`
  - `docs/ESTIMATION_TABLE.md`
  - `docs/IMPLEMENTATION_ROADMAP.md`
  - `docs/RISK_RESPONSE_PLAN.md`
  - `docs/TODO.md`
  - `docs/WBS.md`
  - `docs/CHANGE_SUMMARY.md`
  - `notes/DECISIONS.md`
  - `README.md`
  - `backstage-portal/README.md`
  - `docs/FIREBASE_DEMO_DEPLOYMENT.md`

## 28단계: 왼쪽 메뉴 RFP 순서 재정렬

- [x] 왼쪽 Sidebar 메뉴 순서를 RFP 기능군 순서(1~163)에 맞게 재정렬
- [x] 변경 메뉴 구조 문서화


## 29단계: 관리자 전용 요구사항 진도표 메뉴 추가

- [x] `requirement-progress` 컴포넌트를 페이지로 연결
- [x] `/requirement-progress` 라우트 추가
- [x] 왼쪽 메뉴 하단에 "요구사항 진도표" 추가 (관리자 전용)
- [x] 관리자/일반 사용자 메뉴 제어 기준 정의
- [x] `DemoAdminContext.tsx` 기반 관리자 판별
- [x] `AdminOnlyGuard.tsx` 기반 직접 URL 접근 차단
- [x] 요구사항 진도표 화면 4개 탭 구현 (SFR별 진도표, 기능목록 상세, 변경이력, 질의사항)
- [x] 163개 기능목록, 21개 SFR 요약, 13개 변경이력, 7개 질의사항 mock data 연동
- [x] `yarn tsc --noEmit` 통과
- [x] `yarn test` 통과
- [x] 로컬 화면 검증 (일반 사용자 메뉴 비노출, 관리자 프리뷰 메뉴 노출, 직접 URL 차단)
- [x] 관련 문서 갱신

## 29.1단계: Firebase 환경변수 주입 후 요구사항 진도표 데모 재배포

- [x] Firebase Web App 설정값 환경변수로 주입 (`FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`)
- [x] 데모 빌드 필수 환경변수 설정 (`APP_BASE_URL`, `BACKEND_BASE_URL`, `PREVIEW_ACCESS_CODE`, `DEMO_ADMIN_EMAILS`, `DEMO_ALLOWED_EMAILS`, `AUTH_SESSION_SECRET`)
- [x] `./scripts/build-demo.sh` 성공 (frontend/backend/Docker image)
- [x] `./scripts/deploy-demo-firebase.sh` 성공
- [x] 데모 사이트 접근 코드 `ictway`로 정상 진입 확인
- [x] 일반 사용자 상태에서 "요구사항 진도표" 메뉴 비노출 확인
- [x] `/requirement-progress` 직접 접근 시 "접근 권한이 없습니다" 화면 확인
- [x] 관리자 프리뷰 모드에서 "요구사항 진도표" 메뉴 표시 및 페이지 접근 확인
- [x] 요구사항 진도표 4개 탭 정상 표시 확인
  - SFR별 진도표: 21건
  - 기능목록 상세: 163건
  - 변경이력: 13건
  - 질의사항: 7건
- [x] 관련 문서 갱신
- [ ] GitHub push 인증 해결 후 원격 반영

## 29.2단계: Cloud Run backend 재배포 및 auth refresh 404 정리

- [x] Cloud Run backend 최신 Docker image로 재배포
- [x] Artifact Registry push 완료
- [x] Cloud Run revision `kt-ai-portal-demo-00009-v6d` 100% 트래픽 라우팅
- [x] `/api/auth/guest/refresh` 404 해소 확인
  - Cloud Run 직접 URL: 200
  - Firebase Hosting rewrite: 200
  - 브라우저 Network: 200
- [x] 데모 사이트 일반 사용자/관리자 프리뷰 재검증
- [x] 관련 문서 갱신
- [ ] GitHub push 인증 해결 후 원격 반영
- [ ] Firebase Auth Google 관리자 로그인 실검증

## 30단계: 관리자 전용 요구사항 대응현황 및 플랫폼 API 연계현황 고도화

- [x] 신규 메뉴/라우트 설계
  - `요구사항 대응현황` (`/requirement-coverage`)
  - `플랫폼 API 연계현황` (`/platform-api-integration`)
  - 기존 `/requirement-progress`를 `/requirement-coverage`와 동일 화면으로 별칭 처리
- [x] 관리자 전용 (`visibleTo: 'admin'`) + `AdminOnlyGuard` 적용
- [x] 메뉴/SFR/기능 단위 요구사항 대응현황 데이터 및 화면 패널 구성
  - `MenuRequirementCoverage`, `SfrCoverageDetail`, `FeatureCoverageDetail` 타입 정의
  - 14개 메뉴 대응 현황 mock data 작성
  - 메뉴 대응현황, SFR 대응현황, 기능 대응현황, 변경이력, 질의사항 탭 구현
- [x] 플랫폼 API 연계현황 mock data 및 화면 구성
  - `PlatformApiIntegration` 타입 정의
  - 20개 연계 후보 mock data 작성
  - 요약 카드 + 상세 테이블/아코디언 구현
- [x] CSV/Excel 다운로드 기능
  - `요구사항_메뉴_대응현황.csv`
  - `요구사항_기능_대응현황.csv`
  - `플랫폼_API_연계현황.csv`
- [x] `yarn tsc --noEmit` 통과
- [x] `yarn workspace app build` 통과
- [x] 신규 문서 작성
  - `docs/REQUIREMENT_COVERAGE_ADMIN_GUIDE.md`
  - `docs/PLATFORM_API_INTEGRATION_PLAN.md`
  - `docs/PORTAL_ROLE_AND_PLATFORM_BOUNDARY.md`
- [x] 문서 갱신
  - `docs/DOCUMENT_INDEX.md`, `docs/FINAL_REQUIREMENT_VALIDATION_REPORT.md`, `docs/FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md`
  - `docs/SCREEN_TO_RFP_MAPPING.md`, `docs/RFP_MAPPING_JUSTIFICATION.md`
  - `docs/FIREBASE_DEMO_DEPLOYMENT_LOG.md`, `docs/TODO.md`, `docs/WBS.md`, `docs/CHANGE_SUMMARY.md`, `docs/DECISIONS.md`
  - `README.md`, `backstage-portal/README.md`, `docs/TECH_DEBT.md`
- [x] Firebase Hosting 재배포(frontend 변경사항 반영)
- [ ] GitHub push 인증 해결 후 원격 반영


## 31단계: 화멸 업무흐름 설명 및 포털-플랫폼 연계 시나리오 고도화

- [x] 신규 메뉴/라우트 설계 (`업무흐름/연계 시나리오`, `/workflow-scenarios`)
- [x] 관리자 전용 (`visibleTo: 'admin'`) + `AdminOnlyGuard` 적용
- [x] 포털 역할 요약 패널 구현
- [x] 7개 사용자 여정 카드 구현
- [x] 7개 업무흐름 시나리오 및 상세 단계 구현
- [x] 요구사항 대응현황/API 연계현황 링크 연결
- [x] 통합 대시보드에 관리자 전용 업무흐름/연계 정보 패널 추가
- [x] TypeScript 빌드 및 테스트 통과
- [x] 신규 문서 작성 (`WORKFLOW_SCENARIO_GUIDE.md`, `USER_JOURNEY_AND_PLATFORM_FLOW.md`, `PROPOSAL_EXPLANATION_MESSAGES.md`)
- [x] 기존 문서 갱신 (README, backstage-portal/README, DOCUMENT_INDEX, REQUIREMENT_COVERAGE_ADMIN_GUIDE, PLATFORM_API_INTEGRATION_PLAN, PORTAL_ROLE_AND_PLATFORM_BOUNDARY, FINAL_REQUIREMENT_VALIDATION_REPORT, SCREEN_TO_RFP_MAPPING, RFP_MAPPING_JUSTIFICATION, TODO, WBS, CHANGE_SUMMARY, DECISIONS, TECH_DEBT)
- [x] Firebase Hosting 재배포
- [ ] GitHub push 인증 해결 후 원격 반영


## 32.2단계: 기능 흐름 설명자료 기반 PPT/사용자 설명 패키지 보완

- [x] 기존 32단계 PPT 백업
- [x] 기능흐름 RFP 대응 발표자료 생성
  - `proposal-package/국방지능형플랫폼포털_기능흐름_RFP대응_발표자료_32_2단계.pptx`
  - 33장, 14개 화면 캡처 포함
  - 표지, 전체 체계, 사용자 흐름, 메뉴 구조, RFP 대응 총괄
  - SFR별 기능 장표, 관리자 추적 기능 장표, 4개 대표 업무흐름
  - 포털-플랫폼 연계 역할, 구현 수준/후속 로드맵, 마무리
- [x] 발표자 스크립트 작성
  - `proposal-package/국방지능형플랫폼포털_발표자_스크립트_32_2단계.md`
- [x] 쉬운 기능 설명자료 작성
  - `proposal-package/국방지능형플랫폼포털_쉽게_이해하는_기능흐름.md`
- [x] PPT 생성 스크립트 작성
  - `scripts/generate-feature-flow-ppt.py`
  - 16:9 와이드, 좌측 설명/우측 캡처, RFP ID 강조, 한글 폰트 적용
- [x] 화멸별 캡션 보완
  - `docs/SCREENSHOT_CAPTIONS.md`에 RFP ID, 강조 포인트, 후속 연동 포인트 추가
  - `docs/PROPOSAL_SCREENSHOT_CATALOG.md`에 32.2단계 활용 반영
- [x] 문서 갱신
  - `docs/DOCUMENT_INDEX.md`, `docs/CHANGE_SUMMARY.md`, `docs/WBS.md`, `docs/TECH_DEBT.md`
  - `notes/DECISIONS.md`, `README.md`, `backstage-portal/README.md`, `proposal-package/README.md`
- [ ] GitHub push 인증 해결 후 원격 반영


## 33단계: 최종 제안 패키지 압축 및 공유본 생성

- [x] `proposal-package/final-share/` 디렉터리 생성 및 하위 구조 구성
- [x] PPT 파일 복사 및 정리
  - `01_PPT/국방지능형플랫폼포털_최종_기능흐름_RFP대응_발표자료.pptx`
  - `01_PPT/국방지능형플랫폼포털_화면중심_RFP대응_발표자료_초안.pptx`
- [x] 설명자료 복사 및 정리 (발표자 스크립트, 쉬운 설명, 기능흐름 설명, 사용자/관리자/플랫폼 가이드, 캡션/카탈로그)
- [x] 화면 캡처 21개 복사 및 카탈로그/캡션 포함
- [x] RFP 대응 자료 복사 (추적표, 매핑, API 연계 계획, 시나리오 등)
- [x] QA/검증 자료 복사 (전수검증 보고서, 배포 로그, 체크리스트, Google 로그인 트러블슈팅)
- [x] 자동화 스크립트 복사 및 `README_스크립트_설명.md` 작성
- [x] `00_README/README_최종공유본.md` 작성
- [x] `99_ARCHIVE_NOTE/ARCHIVE_NOTE.md` 작성
- [x] `proposal-package/FINAL_PACKAGE_INDEX.md` 작성
- [x] `proposal-package/최종공유_안낸문_33단계.md` 작성
- [x] `scripts/verify-final-package.py` 작성 및 실행
- [x] 민감정보/부적합 문구/금지 확장자 검사
- [x] 최종 ZIP 생성 및 무결성 확인
  - `proposal-package/국방지능형플랫폼포털_최종제안공유패키지_33단계.zip` (약 11MB, 65개 항목)
- [x] 문서 인덱스/변경이력/WBS/기술부채/결정사항/README 갱신
- [ ] GitHub push 인증 해결 후 원격 반영


## 33.1단계: 화면 캡처 부적합 문구 제거 및 운영자용 외부 도구 링크 권한 제한

- [x] 상단 `시연 환경입니다...` 배너 제거
- [x] `OpenMetadata`, `OpenSearch 대시보드`, `Keycloak 관리` 카드를 일반 사용자 대시보드에서 제거
- [x] 관리자 콘솔에 `플랫폼 운영도구` 탭 추가 및 3개 외부 도구 관리자 전용 노출
- [x] 대시보드 `관리자 콘솔` 바로가기도 관리자가 아닐 경우 미노출 처리
- [x] 서비스/도구 카탈로그의 `OpenMetadata` 항목 관리자 전용 필터링
- [x] 접근 코드 로그인 화면 부적합 문구 제거
- [x] 화면 노출 `샘플 데이터` 문구를 `예시 데이터`로 정정
- [x] `yarn tsc --noEmit` 통과
- [x] `yarn workspace app build` 성공
- [x] `yarn workspace app test --watchAll=false` 1 passed
- [x] `node scripts/smoke-check-demo-routes.mjs` 수행
- [x] Firebase Hosting 재배포
- [ ] GitHub push 인증 해결 후 원격 반영


## 34단계: 33.1단계 UI 반영 화면 재캡처, PPT 보정, 최종 ZIP 갱신

- [x] 33.1단계 UI 변경사항(시연 배너 제거, 외부 운영도구 관리자 전용 이동)을 반영하여 production URL 기준 화면 재촬영
- [x] 화면 캡처 목록 갱신: `09-admin-console-platform-ops-tools.png` 추가, `15-openmetadata-catalog.png`/`16-opensearch-catalog-index.png` 제외
- [x] 20개 화면 캡처 및 `docs/assets/final/`, `proposal-package/final-share/03_SCREENSHOTS/` 복사
- [x] `docs/SCREENSHOT_CAPTIONS.md`, `docs/PROPOSAL_SCREENSHOT_CATALOG.md` 갱신
- [x] `docs/PROPOSAL_BODY_IMAGE_GUIDE.md` 신규 작성 및 final-share 복사
- [x] 화면중심 PPT(`scripts/generate-proposal-ppt.py`) 이미지 교체/데이터 갱신
- [x] 기능흐름중심 PPT(`scripts/generate-feature-flow-ppt.py`) 이미지 교체/슬라이드 번호·푸터·제목 바 디자인 보정
- [x] `final-share/01_PPT/` PPT 갱신
- [x] `final-share/02_GUIDES/`, `03_SCREENSHOTS/`, `06_SCRIPTS/` 갱신
- [x] `proposal-package/FINAL_PACKAGE_INDEX.md`, `final-share/00_README/README_최종공유본.md`, `00_README/FINAL_PACKAGE_INDEX.md` 갱신
- [x] `scripts/verify-final-package.py` 실행 및 통과
- [x] 최종 ZIP 재생성 (`proposal-package/국방지능형플랫폼포털_최종제안공유패키지_33단계.zip`, 65개 항목, 1.5MB)
- [x] 문서 인덱스/변경이력/WBS/기술부채/결정사항/README 갱신
- [ ] GitHub push 인증 해결 후 원격 반영
- [ ] `kyubeom@gmail.com` Google 로그인 최종 확인 (사용자 수동)


## 34.1단계: 최종공고문 260723_v1 기준 포털 기능 최신화 문서 작성

> 34단계(33.1단계 UI 반영 화면 재캡처, PPT 보정, 최종 ZIP 갱신)의 후속 보완 단계로, 최종공고문 260723_v1 기준 변경사항을 포털 문서/매핑 관점에서 정리합니다.  
> 본 단계에서는 소스코드를 변경하지 않습니다.

- [x] `docs/FINAL_RFP_PORTAL_UPDATE_PLAN.md` 작성
- [x] `docs/FINAL_RFP_CHANGE_IMPACT_ANALYSIS.md` 작성
- [x] `docs/FINAL_RFP_PORTAL_BOUNDARY_REVIEW.md` 작성
- [x] `docs/FINAL_RFP_PILOT_PROJECT_MAPPING.md` 작성
- [x] `docs/FINAL_RFP_KRMF_MAPPING.md` 작성
- [x] `docs/TODO.md`에 34.1단계 완료 기록 추가
- [x] `docs/CHANGE_SUMMARY.md`에 34.1단계 변경 이력 추가
- [ ] GitHub push 인증 해결 후 원격 반영 (기존 34단계 대기 항목과 동일)


## 35단계: 권한체계 개선, K-RMF 고도화, 최종공고 실구현

- [x] 역할·권한 단일화 (`authz/` 모듈: 역할 7종, 권한 22종, `rolePolicies.ts` 단일 정책)
- [x] 메뉴 정의 확장 (`journeyStep`, `requiredAnyPermissions`, `visibleTo` 폐기)
- [x] 라우트 가드 일원화 (`PermissionGuard`, `/admin-console` 등 직접 URL 차단)
- [x] `AdminOnlyGuard`를 authz 기반 thin wrapper로 재구현
- [x] 포털 8단계 여정 `PortalJourneyBar` 추가
- [x] 권한별 메뉴 비교 화면 (`/role-menu-preview`, 역할 선택/비교 모드/요약)
- [x] 대시보드 K-RMF 패널 `krmf.view` 권한 게이트
- [x] K-RMF 이행·증적관리 개편 (명칭 변경, 소요기관 권한 안내, 8단계 생애주기 Stepper, 탭 8개: 이행계획/평가·인가 지원/운영전환·변경관리 추가, 데이터 모델 4종, 변경영향 11종, 역할별 버튼 게이트)
- [x] SFR-007/008 작업 환경 생성 요청 7단계 Wizard (`WorkEnvRequestWizard`)
- [x] SFR-018 워크스페이스 생애주기 패널 (`WorkspaceLifecyclePanel`)
- [x] TER-008 실증·데이터 준비 탭 (수요/보유 비교, 부족량, 합성/시뮬레이터 요청, 계보·품질, 육군종합정비창 3개 과제)
- [x] SFR-015 통합검색 보강 (유형 15종, 속성 필터, 자동완성, 색인 상태, 비밀 자산 권한 선필터)
- [x] SFR-019 마이페이지 보강 (실증 프로젝트/보안 과제 탭, 알림 배너, 워크스페이스 상태 배지)
- [x] 플랫폼 API 연계 38건 (PORTAL-PILOT-003~006, PORTAL-KRMF-003 등 신규 5건 + 14건 갱신)
- [x] 업무흐름 시나리오 보강 (SCN-010 데이터 부족 대응, SCN-011 변경영향, SCN-012 신규)
- [x] 금지 문구 제거 ("실제 저장되지 않습니다", "예시 데이터" 등)
- [x] 캡처 스크립트 재작성 (DOM 검증, 역할 전환, 품질 게이트 4종)
- [x] 캡처 모드 설정 (`app.proposalCapture`, 데모 환경만 활성)
- [x] 단위 테스트 27건 통과 (authz 14, search 6, krmf 6, 기존 1)
- [x] `yarn tsc --noEmit` 통과, `yarn lint:all` 신규 오류 0건 (기존 결함 19건 잔여)
- [x] `yarn workspace app build` 성공
- [x] Firebase Hosting 재배포, Cloud Run 재배포 (revision kt-ai-portal-demo-00016-9fm)
- [x] smoke test 17/17 통과
- [x] 신규 문서 4종 (`ROLE_PERMISSION_MATRIX`, `ROLE_MENU_CAPTURE_GUIDE`, `KRMF_LIFECYCLE_AND_ROLE_DESIGN`, `FINAL_RFP_IMPLEMENTATION_DELTA`)
- [x] 제안서 캡처 10종 + 레거시 18종 재생성 및 DOM 검증
- [ ] GitHub push 인증 해결 후 원격 반영
- [ ] Playwright E2E 시나리오 스펙 추가 (`yarn test:e2e`) — 후속 단계


## 35.1단계: 메뉴 순서·여정 매핑 보정 및 역할 간소화

- [x] 제안 게시판 여정 매핑 1단계 → 8단계 정정 (SFR-013은 8단계 소속)
- [x] 그룹 순서 변경 (관리/보안 맨 뒤) 및 메뉴 재배치 (통합검색 상향, 반입·반출 승인을 프로젝트 운영 그룹으로)
- [x] 역할 7 → 6개 간소화 (krmf-manager → security-manager 통합)
- [x] 캡처 스크립트/allowedRoles/테스트/문서 동기화
- [x] tsc/테스트 27건 통과, 빌드/배포 완료 (Cloud Run 00017-v42)
- [x] 캡처 28/28 재생성 및 메뉴 순서 육안 확인
- [ ] GitHub push 인증 해결 후 원격 반영

## 35.2단계: 낶부 추적 메뉴 비노출 및 전체 캡처 압축

- [x] 요구사항 대응현황/플랫폼 API 연계현황/업무흐름·연계 시나리오 메뉴 비노출 (라우트/가드는 유지, 직접 URL 접근 가능)
- [x] tsc/테스트 27건 통과, 빌드/Firebase 재배포
- [x] 캡처 28/28 재생성, 관리자 메뉴 13개 확인
- [x] 전체 화면 캡처 압축 (`국방지능형플랫폼포털_화면캡처_35.2단계.zip`, 30개 파일)
- [ ] GitHub push 인증 해결 후 원격 반영


## 33.2단계: 기능 변경 없는 UI/UX 디자인 시스템 정비

- [x] 기준선 확보 (before 캡처 18종: 6화면 × 3해상도)
- [x] 디자인 토큰 (`components/common/designTokens.ts`)
- [x] 공통 컴포넌트 7종 (PageHeader/SectionHeader/SectionCard/MetricCard/StatusChip/RoleBadge/EmptyState)
- [x] 사이드바 개선 (248px, 메뉴 잘림 해소, 현재 메뉴 indicator, 역할 영역 정돈)
- [x] 글로벌 여정바 개선 + K-RMF 화면 subdued 구분
- [x] 통합 대시보드 정보계층 재편 (히어로 축소, 검색 결합, 지표 4개 섹션)
- [x] K-RMF 화면 시각 개선 (PageHeader+RoleBadge, 진척률 주요 카드, 탭 sticky)
- [x] 역할 선택 UI 사이드바 하단 재배치
- [x] 반응형 검증 (1920/1440/1366)
- [x] tsc/테스트 27건/빌드 통과, smoke 17/17, 전수검증 통과
- [x] Firebase Hosting 배포 (REST API 경로, CLI 계정 이슈 우회)
- [x] after 캡처 18종, 문서 3종 작성
- [ ] GitHub push 인증 해결 후 원격 반영
- [ ] firebase CLI 계정 복구 (`firebase login --reauth` by kyubeom@gmail.com)
