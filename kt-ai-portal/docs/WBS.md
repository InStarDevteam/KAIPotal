# WBS - 국방지능형플랫폼포털

## 개요

본 문서는 국방지능형플랫폼포털 PoC 개발을 위한 단계별 작업 분해 구조(WBS)를 정의합니다.

## 단계별 일정

| 단계 | 작업명 | 상태 | 비고 |
|------|--------|------|------|
| 1 | Backstage 기본 포털 구축 | 완료 | 프로젝트 구조 생성 및 Backstage 앱 실행 |
| 2 | Keycloak 인증/권한 연동 준비 | 완료 | Docker 기반 Keycloak 실행 및 Realm/Client/User/Role 생성 |
| 3 | Backstage와 Keycloak OIDC 연동 | 완료 | Backstage 로그인 공급자로 Keycloak 연동 |
| 4 | OpenSearch 검색엔진 연동 | 완료 | 검색엔진 구축 및 샘플 인덱스/데이터 구성 |
| 5 | OpenMetadata 카탈로그 연동 | 완료 | 데이터/AI 카탈로그 연동 설계 및 준비 |
| 6 | 자체 플러그인 1차 - 프로젝트/워크스페이스 관리 | 완료 | `project-workspace` PoC 화면 개발 |
| 7 | 자체 플러그인 2차 - 반출/반입 관리 | 완료 | `export-approval` PoC 화면 개발 |
| 8 | 자체 플러그인 3차 - 크레딧 관리 | 완료 | `credit-manager` PoC 화면 개발 |
| 9 | 자체 플러그인 4차 - K-RMF 증빙관리 | 완료 | `krmf-evidence` PoC 화면 개발 |
| 10 | 통합검색/카탈로그 검색 고도화 | 완료 | `integrated-search` PoC 화면 개발 및 OpenSearch `portal-catalog` 연동 |
| 11 | 메인 포털 대시보드 및 홈 화면 재구성 | 완료 | `portal-dashboard` PoC 컴포넌트 개발, Home 화면 교체, 문서 정리 |
| 11.1 | Keycloak OIDC 런타임 환경변수 안정화 | 완료 | `.env` 로딩 스크립트, admin01 OIDC 로그인 검증 |
| 12 | 최종 산출물 및 제안장표용 화면 정리 | 완료 | 최종 산출물 문서, 데모 시나리오, 기술부채 문서, 화면 캡처 |
| 13 | 국방지능화플랫폼 타이틀 변경 및 관리자 기능 화면 1차 보강 | 완료 | 포털 명칭 변경, Admin Console mock UI 추가, 요구사항 화면 대응 문서 |
| 14 | 사용자 등록/승인 및 외부 사용자 관리 화면 상세화 | 완료 | 사용자 등록 상세, 승인 workflow, 외부 사용자 관리, 상태 이력, 사용자 관리 설계 문서 |
| 15 | 권한/RBAC 및 메뉴/프로그램 관리 화면 상세화 | 완료 | 역할/그룹/매트릭스/프로젝트/서비스/데이터/승인/인계/감사이력, 메뉴 트리/상세/권한/프로그램, RBAC 설계 문서 |
| 16 | 로그인/비밀번호 정책 및 이력/감사로그 화면 상세화 | 완료 | 로그인/비밀번호/세션 정책, 감사로그 대시보드/필터/이력/보안감사/관리자조치, 정책/감사 설계 문서 |
| 17 | 서비스/도구 카탈로그 및 제안 게시판 화면 추가 | 완료 | Service Catalog/Proposal Board, 도구 목록/상세/선택/직접입력, 제안 목록/상세/등록/공감/관리자검토, 설계 문서 |
| 18 | 마이페이지 및 환경설정 화면 추가 | 완료 | My Page(프로필/이메일/비밀번호/세션/프로젝트/자원/크레딧/알림/API Key/활동 로그), Environment Settings(시스템 파라미터/보안 정책/자원할당 기준/운영 설정/변경 이력/요구사항 대응), 설계 문서 |
| 19 | 육해공군 관리자 권한 및 멀티테넌트 관리 화면 추가 | 완료 | Tenant Management(군별 테넌트 개요/위임관리/리소스 풀/쿼터 관리/사용량 대시보드/프로젝트 사용량/경계정책/변경 이력/요구사항 대응), Portal Dashboard Quick Links/요약 카드, 설계 문서 |
| 24 | Firebase + Cloud Run 데모 배포 준비 | 완료 | Preview access code 게이트, Demo banner, Cloud Run/Firebase 설정, 배포 스크립트, 가이드/체크리스트 작성 |
| 25 | GitHub 원격 반영 및 최종 품질 점검 | 예정 | push 인증 해결, `App.test.tsx` 오류 판단, 제안서 세부 다듬기 |
| 27 | 사전규격 최신 요구사항 데이터 반영 (155→163) | 완료 | mock data/types/utils 생성 및 문서 14개 갱신 |
| 28 | 왼쪽 메뉴 RFP/SFR 순서 재정렬 | 완료 | Sidebar 메뉴를 RFP/SFR 흐름 및 그룹으로 재정렬, 기존 라우트 유지 |
| 29 | 관리자 전용 요구사항 진도표 메뉴 추가 | 완료 | `/requirement-progress` 라우트, 관리자 메뉴 제어, AdminOnlyGuard, 4개 탭 화면 |
| 29.1 | Firebase 환경변수 주입 후 요구사항 진도표 데모 재배포 | 완료 | Firebase Web App 설정값 환경변수 주입, Firebase Hosting 재배포, 데모 사이트 검증 (일반/관리자 프리뷰) |
| 29.2 | Cloud Run backend 재배포 및 auth refresh 404 정리 | 완료 | Cloud Run 최신 revision 배포, `/api/auth/guest/refresh` 404 해소, Firebase Hosting rewrite 확인, 데모 사이트 재검증 |
| 31.5 | UI 문구 정리 및 캡처 대상 중립화 | 완료 | 화면에 노출되는 mock/PoC/데모/제안 문구 제거, 제안서 캡처 적합성 1차 확보 |
| 31.6 | 실제 기능 전수검증 및 결함 보완 | 완료 | Playwright/Smoke test 스크립트 작성/실행, `/api/auth/guest/refresh` 캐시 버스팅, 통합검색 fallback 중립화, Firebase Hosting 재배포, QA 보고서 작성 |
| 32 | 제안서/PPT용 화면 캡처 및 장표 패키징 | 완료 | production URL 기준 21개 화면 재캡처, 관리자 전용 화면 캡처, python-pptx 기반 24장 발표자료 초안 생성, 캡처 카탈로그/캡션 갱신 |
| 32.1 | Firebase Google 로그인 재배포 및 수동 검증 | 완료 | Firebase SDK config 추출 수정, Firebase Hosting 재배포, Google 로그인 화면 도달 확인, `/api/auth/guest/refresh` 캐시 버스팅, smoke test 17/17 통과, 가이드/설명자료 작성 |
| 33 | 최종 제안 패키지 압축 및 공유본 생성 | 완료 | final-share 구성, PPT/설명자료/캡처/RFP매핑/QA보고서/스크립트 분류, verify 스크립트, 최종 ZIP 생성 |
| 33.1 | 화면 캡처 부적합 문구 제거 및 운영자용 외부 도구 링크 권한 제한 | 완료 | 시연 배너 제거, OpenMetadata/OpenSearch/Keycloak 일반 사용자 화면 제거, 관리자 콘솔 플랫폼 운영도구 탭 추가, Firebase Hosting 재배포 |
| 34 | 33.1단계 UI 반영 화면 재캡처, PPT 보정, 최종 ZIP 갱신 | 완료 | production URL 기준 20개 화면 재촬영, PPT 이미지 교체/디자인 보정, PROPOSAL_BODY_IMAGE_GUIDE.md 작성, final-share/ZIP 갱신 |
| 33.2 | 기능 변경 없는 UI/UX 디자인 시스템 정비 | 완료 | 디자인 토큰/공통 컴포넌트/사이드바/대시보드/K-RMF/역할 UI/반응형 |

## 11단계: 메인 포털 대시보드 및 홈 화면 재구성

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

## 12단계: 최종 산출물 및 제안장표용 화면 정리

- [x] 최종 산출물 목록 정리
- [x] 제안장표용 주요 화면 캡처 정리
- [x] 데모 시나리오 작성
- [x] 현재 PoC 한계사항 정리
- [x] 운영 전환 시 고려사항 정리
- [x] 후속 개발 과제 정리
- [x] 보안 주의사항 정리
- [x] TypeScript 기존 오류 정리 계획 수립
- [x] 정식 Backstage Plugin 전환 검토
- [x] `docs/FINAL_DELIVERABLES.md` 작성
- [x] `docs/DEMO_SCRIPT.md` 작성
- [x] `docs/TECH_DEBT.md` 작성

## 13단계: 국방지능화플랫폼 타이틀 변경 및 관리자 기능 화면 1차 보강

- [x] 포털 명칭 `국방지능화플랫폼`으로 변경
- [x] `Admin Console` 메뉴 및 `/admin-console` 라우팅 추가
- [x] Admin Console 요약 카드 및 8개 관리 패널 구현 (mock data)
- [x] Portal Dashboard Quick Links에 Admin Console 추가
- [x] `docs/REQUIREMENT_SCREEN_COVERAGE.md` 작성
- [x] WBS/ARCHITECTURE/CHANGE_SUMMARY/TODO/DECISIONS/README 갱신

## 14단계: 사용자 등록/승인 및 외부 사용자 관리 화면 상세화

- [x] 사용자 등록 신청 상세 화면 구현
- [x] 본인확인 상태 Chip 추가
- [x] 승인/반려/보완요청/재신청 mock workflow 구현
- [x] 외부 사용자 관리 패널 추가
- [x] 사용자 소속/역할/접속 가능 서비스 설정 UI 구현
- [x] 사용자 상태 변경 이력 패널 구현
- [x] `docs/USER_MANAGEMENT_DESIGN.md` 작성
- [x] Admin Console 탭에 외부 사용자 관리 추가
- [x] WBS/ARCHITECTURE/CHANGE_SUMMARY/TODO/DECISIONS/README 갱신

## 15단계: 권한/RBAC 및 메뉴/프로그램 관리 화면 상세화

- [x] 역할 목록/상세 화면 (`RoleDetailPanel`)
- [x] 역할별 권한 매트릭스 (`RolePermissionMatrix`)
- [x] 그룹 관리 화면 (`GroupManagementPanel`)
- [x] 사용자/그룹 권한 매핑 화면 (`UserGroupMappingPanel`)
- [x] 프로젝트별 역할 매핑 화면 (`ProjectRoleMappingPanel`)
- [x] 서비스별 권한 화면 (`ServicePermissionPanel`)
- [x] 데이터 접근 등급 화면 (`DataAccessLevelPanel`)
- [x] 승인 권한 관리 화면 (`ApprovalPermissionPanel`)
- [x] 조직 상태 변경 권한 회수/인계 화면 (`OrganizationTransferPanel`)
- [x] 권한 변경 감사이력 화면 (`PermissionChangeHistoryPanel`)
- [x] 메뉴 트리 화면 (`MenuTreePanel`)
- [x] 메뉴 상세/수정/이동/기능 연결 UI (`MenuDetailPanel`)
- [x] 메뉴 별 권한 연결 화면 (`MenuPermissionPanel`)
- [x] 프로그램 관리 화면 (`ProgramRegistryPanel`)
- [x] `docs/RBAC_MENU_MANAGEMENT_DESIGN.md` 작성
- [x] Admin Console 권한/역할 탭 및 메뉴 관리 탭 상세화
- [x] WBS/ARCHITECTURE/CHANGE_SUMMARY/TODO/DECISIONS/README 갱신

## 16단계: 로그인/비밀번호 정책 및 이력/감사로그 화면 상세화

- [x] 로그인 정책 목록/상세 화면 (`LoginPolicyPanel`, `LoginPolicyDetailPanel`)
- [x] 로그인 실패 차단 정책 화면 (`LoginFailurePolicyPanel`)
- [x] 중복 로그인 정책 화면 (`ConcurrentLoginPolicyPanel`)
- [x] 자동 로그아웃/세션 정책 화면 (`SessionTimeoutPolicyPanel`)
- [x] 비밀번호 정책 목록/상세 화면 (`PasswordPolicyPanel`, `PasswordPolicyDetailPanel`)
- [x] 비밀번호 복잡도 화면 (`PasswordComplexityPanel`)
- [x] 비밀번호 만료/계정 잠금 현황 화면 (`PasswordExpirationPanel`)
- [x] 계정 잠금 정책 화면 (`AccountLockPolicyPanel`)
- [x] 감사로그 대시보드 (`AuditLogDashboard`)
- [x] 통합 감사로그 목록/필터 (`AuditLogPanel`, `AuditLogFilterPanel`)
- [x] 로그인/로그아웃 이력 (`LoginHistoryPanel`, `LogoutHistoryPanel`)
- [x] 비밀번호 변경 이력 (`PasswordChangeHistoryPanel`)
- [x] 사용자 접근 로그 (`UserAccessLogPanel`)
- [x] 사용자 정보수정 로그 (`UserInfoChangeLogPanel`)
- [x] 보안 감사 화면 (`SecurityAuditPanel`)
- [x] 관리자 조치 이력 (`AdminActionHistoryPanel`)
- [x] `docs/SECURITY_POLICY_AUDIT_DESIGN.md` 작성
- [x] Admin Console 로그인 정책/비밀번호 정책/감사 로그 탭 상세화
- [x] WBS/ARCHITECTURE/CHANGE_SUMMARY/TODO/DECISIONS/README 갱신

## 17단계: 서비스/도구 카탈로그 및 제안 게시판 화면 추가

- [x] Service Catalog 메인 화면 (`ServiceCatalogPage`)
- [x] 도구 카테고리 탭 (`ToolCategoryTabs`)
- [x] 도구 목록/상세 (`ToolCatalogList`, `ToolCatalogDetail`)
- [x] 도구 선택 패널 (`ToolSelectionPanel`)
- [x] 직접 입력 요청 화면 (`DirectToolRequestForm`, `DirectRequestList`)
- [x] Proposal Board 메인 화면 (`ProposalBoardPage`)
- [x] 제안 목록/상세 (`ProposalList`, `ProposalDetail`)
- [x] 제안 등록 화면 (`ProposalForm`)
- [x] 공감/추천/관심/댓글 UI (`ProposalDetail`)
- [x] 관리자 검토 화면 (`ProposalAdminReviewPanel`)
- [x] Portal Dashboard Quick Links 및 요약 카드 추가
- [x] Sidebar 메뉴 `Service Catalog`, `Proposal Board` 추가
- [x] `docs/SERVICE_CATALOG_PROPOSAL_BOARD_DESIGN.md` 작성
- [x] WBS/ARCHITECTURE/CHANGE_SUMMARY/TODO/DECISIONS/README 갱신

## 1단계: Backstage 기본 포털 구축

- [x] 프로젝트 기본 폴터 구조 생성
- [x] WBS/ARCHITECTURE/CHANGE_SUMMARY/TODO 문서 초안 작성
- [x] Backstage 기본 앱 생성 (`backstage-portal`)
- [x] 로컬 실행 및 브라우저 접속 확인 (`http://localhost:3000`)
- [x] 좌측 메뉴 구조 확인
- [x] 자체 플러그인 추가 가능 구조 확인 (`backstage-portal/plugins/`)
- [x] `README.md` 실행 방법 작성

## 2단계: Keycloak 인증/권한 연동 준비

- [x] `infra/keycloak/docker-compose.yml` 작성
- [x] Keycloak 개발용 관리자 계정 설정 (admin/<password>)
- [x] `kt-ai` Realm 생성
- [x] `backstage` Client 생성
- [x] 테스트 사용자 생성 (admin01, pm01, developer01, analyst01, external01)
- [x] 그룹/역할 설계 및 생성 (portal-admin, project-manager, developer, analyst, external-user)
- [x] `docs/KEYCLOAK_SETUP.md` 작성

## 3단계: Backstage와 Keycloak OIDC 연동

- [x] Backstage `app-config.yaml`에 OIDC Provider 설정 추가
- [x] Keycloak `kt-ai` Realm OpenID Configuration URL 연결
- [x] Client Secret 환경변수 분리 및 `.env.example` 작성
- [x] `AUTH_SESSION_SECRET` 설정
- [x] Backstage 로그인 UI에서 Keycloak OIDC 선택 가능하도록 설정
- [x] Keycloak 로그인 성공 후 Backstage로 복귀 확인
- [x] 사용자 email, name Claim 확인
- [ ] 사용자 role, groups Claim 확인 (Keycloak client mapper 추가 후)
- [ ] 그룹/역할 기반 메뉴 제어 설계
- [x] `docs/KEYCLOAK_INTEGRATION.md` 작성

## 4단계: OpenSearch 검색엔진 연동

- [x] `infra/opensearch/docker-compose.yml` 작성
- [x] 개발용 단일 노드 OpenSearch 실행
- [x] OpenSearch Dashboards 실행
- [x] 테스트 인덱스 `portal-catalog` 생성
- [x] 검색 대상 메타데이터 구조 설계
- [x] 샘플 데이터 8건 이상 적재
- [x] 검색 테스트 스크립트 작성 및 실행
- [x] `docs/SEARCH_DESIGN.md` 작성

## 5단계: OpenMetadata 카탈로그 연동

- [x] `infra/openmetadata` 실행 방법 정리
- [x] 공식 Docker Compose 기반 실행
- [x] UI/API 접근 검증
- [x] 데이터셋/테이블/AI 모델/파이프라인 메타데이터 개념 문서화
- [x] Backstage 연동 설계
- [x] OpenMetadata API 연계 후보 정리
- [x] `docs/OPENMETADATA_DESIGN.md` 작성

## 6단계: 자체 플러그인 1차 - 프로젝트/워크스페이스 관리

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

## 7단계: 자체 플러그인 2차 - 반출/반입 관리

- [x] `export-approval` 기능 생성
- [x] 메뉴 `Export Approval` 추가
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

## 8단계: 자체 플러그인 3차 - 크레딧 관리

- [x] `credit-manager` 기능 생성
- [x] 메뉴 `Credit Manager` 추가
- [x] 프로젝트별 크레딧 현황 UI 구현
- [x] 총 부여/사용/잔여 크레딧 요약 카드 구현
- [x] 충전 이력 표시
- [x] 사용 이력 표시
- [x] 예상 사용 가능 기간 표시
- [x] 자원별 단가 설정 UI 구현
- [x] 크레딧 부족 시 자원 비활성화 상태 표시
- [x] 알림/경고 패널 표시
- [x] mock data 기반 PoC 구현
- [x] API/DB/큐브 사용량 연동 확장 구조 문서화
- [x] `docs/PLUGIN_CREDIT_MANAGER.md` 작성

## 9단계: 자체 플러그인 4차 - K-RMF 증빙관리

- [x] `krmf-evidence` 기능 생성
- [x] 메뉴 `K-RMF Evidence` 추가
- [x] K-RMF 통제항목 목록/적용여부/담당자 UI
- [x] 증빙자료 목록/점검상태 UI
- [x] 보안 미흡사항 조치관리 UI
- [x] 타 수행사 제출자료 관리 UI
- [x] 통합진척률 대시보드
- [x] `docs/PLUGIN_KRMF_EVIDENCE.md` 작성

## 10단계: 통합검색/카탈로그 검색 고도화

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

## 11단계: 통합검증 및 제안장표용 화면 정리

- [ ] 전체 구성요소 통합 실행
- [ ] 주요 시나리오 검증
- [ ] 제안장표용 화면 캡처/데모 스크립트 작성
- [ ] 최종 산출물 정리
- [ ] `docs/FINAL_DELIVERABLES.md` 작성 (선택)


## 20단계: 최종 요구사항 추적표 및 제안서용 화면 정리

- [x] 기존 14~19단계 산출물 충돌 확인
- [x] 작업 전 회귀 확인 (Backstage 접속 및 전체 메뉴)
- [x] `docs/FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md` 작성
- [x] `docs/SCREEN_TO_RFP_MAPPING.md` 작성
- [x] `docs/PROPOSAL_SCREENSHOT_CATALOG.md` 작성
- [x] `docs/INTERNAL_LOGIC_BACKLOG.md` 작성
- [x] `docs/PROPOSAL_SUMMARY_TEXT.md` 작성
- [x] `docs/DOCUMENT_INDEX.md` 작성
- [x] `docs/REQUIREMENT_SCREEN_COVERAGE.md` 최종 갱신
- [x] `docs/DEMO_SCRIPT.md` 최종 갱신
- [x] `docs/FINAL_DELIVERABLES.md` 최종 갱신
- [x] `docs/TECH_DEBT.md` 최종 갱신
- [x] `README.md` / `backstage-portal/README.md` 최종 갱신
- [x] `docs/ARCHITECTURE.md` 20단계 반영
- [x] `docs/CHANGE_SUMMARY.md` 20단계 추가
- [x] `docs/TODO.md` 20단계 완료 및 21단계 추가
- [x] `notes/DECISIONS.md` 20단계 결정사항 추가
- [x] `보안등급 오타` 보안등급 오타 잔여분 제거 (`tenant-management`)
- [x] 제안서용 화면 캡처 보강 (`docs/assets/final/`)
- [x] `yarn tsc` 검증

## 21단계: 제안서 작성 자료 패키징 및 화면 캡처 보강

- [x] 20.5단계 기준 화면 캡처 재촬영 (01~14)
- [x] 제안서 삽입용 캡션 작성
- [x] 기능별 견적 산정 기준 정리
- [x] M/M 산정표 초안 작성
- [x] 제안 발표용 화면 순서 정리
- [x] 최종 산출물 압축 패키지 구성

## 22단계: 제안서 초안 및 견적서 초안 작성

- [x] 제안서 목차 초안 작성
- [x] 제안서 본문 초안 작성
- [x] 발표자료 초안 작성
- [x] 견적서 초안 작성
- [x] RFP 매핑 근거 보강
- [x] 구현 로드맵 작성
- [x] 리스크 및 대응방안 작성
- [x] `proposal-package/` 갱신 및 zip 재생성

## 22.1단계: 보안등급 표기 최종 Hotfix

- [x] 보안등급 오타 문자열 전면 검색
- [x] 제출용 문서 및 `proposal-package`에서 오타 제거
- [x] 보안등급을 `공개` / `내부` / `비밀`로 통일
- [x] `docs/CHANGE_SUMMARY.md`, `notes/DECISIONS.md`, `docs/WBS.md` 역사적 기록 정리
- [x] `proposal-package` 복사본 갱신 및 zip 재생성

## 22.2단계: 보안등급 표준값 최종 재검증 및 수정

- [x] 잘못된 보안등급 표기 전면 검색
- [x] 제출용 문서 및 `proposal-package`에서 잘못된 표기 제거
- [x] 보안등급 표준을 `공개` / `내부` / `비밀`로 최종 통일
- [x] 역사적 기록에서도 잘못된 표기 문구 정리
- [x] `proposal-package` 복사본 갱신 및 zip 재생성

## 23단계: 제안서/PPT/견적서 최종 산출물 작성

- [x] 제안서 본문 최종본(`docs/FINAL_PROPOSAL.md`, `proposal-package/국방지능형플랫폼포털_제안서.md`) 작성
- [x] 발표자료 PPTX(`proposal-package/국방지능형플랫폼포털_제안발표자료.pptx`, 23장) 작성
- [x] 견적서 Excel(`proposal-package/국방지능형플랫폼포털_견적산정표.xlsx`, 5시트) 작성
- [x] 기능목록 1~155와 M/M 연결
- [x] 화면 캡처 18개 삽입 및 설명 일치 확인
- [x] 최종 제출 패키지 zip 재구성
- [ ] GitHub push 인증 해결

## 23.5단계: 최종 산출물 요구사항 역검증

- [x] 기능목록 1~155 및 SFR-001~SFR-021 매핑 검증
- [x] 제안서/PPT/견적서 기능명·화멸명 일치 검증
- [x] 화면 캡처 일치 및 보안등급 표기 표준 검증
- [x] 미구현 항목 표시 및 M/M 연결 검증
- [x] `docs/FINAL_REQUIREMENT_VALIDATION_REPORT.md` 작성

## 20.5단계: 포털 명칭, 메뉴 한글화, UI 색상 안정화

- [x] 한글 공식 사이트명 `국방지능형플랫폼포털`로 변경
- [x] 영문 보조명 `K-Defense Intelligence Platform` 유지
- [x] `app-config.yaml` title/organization.name/mcpActions.name 변경
- [x] `App.tsx` Sidebar 메뉴 한글화 (라우트는 그대로 유지)
- [x] Portal Dashboard Hero 사이트명 변경
- [x] Portal Dashboard Quick Links 한글화
- [x] 주요 화면 제목 한글화
- [x] Admin Console 내부 탭 라벨 정리 (`권한 / 역할` → `권한/역할`)
- [x] Admin Console 소제목 사이트명 변경
- [x] 메뉴 관리 mock 데이터 루트 메뉴 사이트명 변경
- [x] 색상/톤앤매너 보완 (Dashboard Hero 그라데이션, Summary Card 상단 accent, Quick Link border)
- [x] 문서 명칭/메뉴 반영
- [x] 21단계 TODO에 재촬영 항목 추가

## 23.6단계: 최종 검증 보고서 Hotfix

- [x] 보안등급 표준 `공개 / 내부 / 비밀` 최종 확정 및 오타 제거
- [x] `docs/FINAL_REQUIREMENT_VALIDATION_REPORT.md` SFR-001~SFR-021 매핑 결과 수정(통과)
- [x] SFR-001~SFR-021 매핑표를 RFP 매핑 문서/추적표/제안서/견적서에 추가
- [x] proposal-package 복사본 및 zip 재생성
- [x] `kimi_done.sh` 실행 및 검증 기록

## 24단계: Firebase + Cloud Run 데모 배포 준비

- [x] 데모 배포 범위/제약 정의(인터넷 데모 접속, 외부 시스템 연동 금지)
- [x] `PreviewAuthGate` / `PreviewLoginPage` / `previewAuth.ts` 추가(접근코드 기반 데모 보호)
- [x] `DemoModeBanner` 추가(데모/mock data 안내)
- [x] `packages/app/src/App.tsx`에 게이트 및 배너 적용
- [x] `app-config.demo.yaml` 작성(Cloud Run용 backend/frontend 설정, Guest 인증)
- [x] `firebase.json` / `.firebaserc.example` 작성
- [x] `Dockerfile.demo` 작성
- [x] `scripts/build-demo.sh` / `deploy-demo-cloudrun.sh` / `deploy-demo-firebase.sh` 추가
- [x] `docs/FIREBASE_DEMO_DEPLOYMENT.md` 작성
- [x] `docs/FIREBASE_DEMO_CHECKLIST.md` 작성
- [x] 문서 인덱스/변경이력/산출물목록 갱신
- [ ] GCP/Firebase 프로젝트 생성, Artifact Registry/Cloud Run 배포
- [ ] 가비아 `<sub>.kbcosmos.com` DNS 연결 및 HTTPS 인증서 발급

## 25단계: GitHub 원격 반영 및 최종 품질 점검

- [ ] GitHub push 인증 해결
- [ ] `App.test.tsx` 기존 오류 정리 여부 최종 판단
- [ ] 제안서/PPT/견적서 사용자 피드백 반영 및 세부 다듬기
- [ ] 최종 산출물 피드백 반영


## 27단계: 사전규격 최신 요구사항 데이터 반영

- [x] 155개 → 163개 기능목록 확장
- [x] 신규 기능 8개 (RFP-156~163) mock data 추가
- [x] 변경 SFR 13개 반영
- [x] `requirement-progress` types / mock data / utils 구현
- [x] 관련 문서 14개 갱신
- [x] `yarn tsc --noEmit`, `yarn test` 통과


## 28단계: 왼쪽 메뉴 RFP/SFR 순서 재정렬

- [x] `portalMenuDefinitions.ts` 메뉴 정의 상수 작성
- [x] `App.tsx` Sidebar를 RFP/SFR 흐름에 맞게 재정렬
- [x] 메뉴 그룹(포털 공통/관리·보안/플랫폼 연계/프로젝트 운영/사용자·조직/사용자 지원) 적용
- [x] Tooltip에 관련 SFR 표시
- [x] Dashboard Quick Links 순서를 메뉴 순서와 맞춤
- [x] `yarn tsc --noEmit`, `yarn test` 통과


## 29단계: 관리자 전용 요구사항 진도표 메뉴 추가

- [x] `requirement-progress` 컴포넌트를 페이지로 연결
- [x] `/requirement-progress` 라우트 추가
- [x] 왼쪽 메뉴에 "요구사항 진도표" 추가 (`group: 관리/보안`, `visibleTo: 'admin'`)
- [x] `DemoAdminContext.tsx` 기반 Firebase Auth 이메일 관리자 판별
- [x] `sessionStorage.__kt_ai_portal_admin_preview__` 기반 개발/검증용 관리자 프리뷰 모드
- [x] `AppLayout`에서 관리자 메뉴 필터링에 프리뷰 모드 반영
- [x] `AdminOnlyGuard.tsx` 기반 직접 URL 접근 차단
- [x] `RequirementProgressPage.tsx` 구현 (4개 탭)
- [x] SFR별 진도표 탭 (21개 SFR)
- [x] 기능목록 상세 탭 (163개 기능)
- [x] 변경이력 탭 (13개 변경이력)
- [x] 질의사항 탭 (7개 질의사항)
- [x] 요약 카드 (전체 SFR/기능/구현 현황)
- [x] `yarn tsc --noEmit`, `yarn test` 통과
- [x] 로컬 화면 검증 (일반 사용자 메뉴 비노출, 관리자 프리뷰 메뉴 노출, 직접 URL 차단)

## 30단계: 관리자 전용 요구사항 대응현황 및 플랫폼 API 연계현황 고도화

- [x] 메뉴/라우트 설계 (`/requirement-coverage`, `/platform-api-integration`)
- [x] `/requirement-progress` 별칭 처리 (`/requirement-coverage`와 동일 화면)
- [x] 관리자 전용 권한 제어 (`visibleTo: 'admin'`, `AdminOnlyGuard`)
- [x] 요구사항 대응현황 mock data 및 탭 구현 (메뉴/SFR/기능/변경이력/질의사항)
- [x] 플랫폼 API 연계현황 mock data 및 화면 구현 (20개 연계 후보)
- [x] CSV 다운로드 기능 (메뉴/기능/API 연계)
- [x] TypeScript 빌드 검증
- [x] 신규 문서 작성 (`REQUIREMENT_COVERAGE_ADMIN_GUIDE.md`, `PLATFORM_API_INTEGRATION_PLAN.md`, `PORTAL_ROLE_AND_PLATFORM_BOUNDARY.md`)
- [x] 기존 문서 갱신 (`README.md`, `backstage-portal/README.md`, `DOCUMENT_INDEX.md`, `FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md`, `FINAL_REQUIREMENT_VALIDATION_REPORT.md`, `SCREEN_TO_RFP_MAPPING.md`, `RFP_MAPPING_JUSTIFICATION.md`, `FIREBASE_DEMO_DEPLOYMENT_LOG.md`, `TODO.md`, `WBS.md`, `CHANGE_SUMMARY.md`, `DECISIONS.md`, `TECH_DEBT.md`)
- [x] Firebase Hosting 재배포
- [ ] GitHub push 인증 해결 후 원격 반영

## 31단계: 화멸 업무흐름 설명 및 포털-플랫폼 연계 시나리오 고도화

- [x] 메뉴/라우트 설계 (`/workflow-scenarios`)
- [x] 관리자 전용 권한 제어 (`visibleTo: 'admin'`, `AdminOnlyGuard`)
- [x] 포털 역할 요약 패널 구현
- [x] 7개 사용자 여정 카드 구현
- [x] 7개 업무흐름 시나리오 및 상세 단계 구현
- [x] 요구사항 대응현황/API 연계현황 링크 연결
- [x] 통합 대시보드에 관리자 전용 업무흐름/연계 정보 패널 추가
- [x] TypeScript 빌드 및 테스트 통과
- [x] 신규 문서 3개 작성
- [x] 기존 문서 갱신
- [x] Firebase Hosting 재배포
- [ ] GitHub push 인증 해결 후 원격 반영

## 32.1단계: Firebase Google 로그인 재배포 및 수동 검증

- [x] Firebase SDK config 추출 로직 수정 및 Firebase Hosting 재배포
- [x] Google 로그인 팝업/계정 선택/비밀번호 화면까지 도달 확인
- [x] `/api/auth/guest/refresh` 404 원인 분석 (Firebase Hosting edge stale cache)
- [x] Smoke test cache-buster 적용 (`?_=<timestamp>`) 및 17/17 통과
- [x] 신규 가이드/설명자료 작성
  - `docs/PORTAL_ADMIN_FEATURE_GUIDE.md`
  - `docs/PORTAL_FEATURE_USAGE_GUIDE.md`
  - `docs/PORTAL_PLATFORM_RELATIONSHIP_GUIDE.md`
  - `docs/PORTAL_USER_FLOW_GUIDE.md`
  - `docs/MENU_FUNCTION_RELATIONSHIP_GUIDE.md`
  - `proposal-package/국방지능형플랫폼포털_기능흐름_사용설명자료.md`
- [ ] kyubeom@gmail.com Google 로그인 완료 확인 (사용자 수동)
- [ ] Firebase Console Google Provider/Authorized domains 수동 확인


## 32.2단계: 기능 흐름 설명자료 기반 PPT/사용자 설명 패키지 보완

- 기존 32단계 PPT 백업
- 기능흐름 RFP 대응 PPT 신규 생성 (`proposal-package/국방지능형플랫폼포털_기능흐름_RFP대응_발표자료_32_2단계.pptx`)
- 발표자 스크립트 작성 (`proposal-package/국방지능형플랫폼포털_발표자_스크립트_32_2단계.md`)
- 쉬운 기능 설명자료 작성 (`proposal-package/국방지능형플랫폼포털_쉽게_이해하는_기능흐름.md`)
- PPT 생성 스크립트 작성 (`scripts/generate-feature-flow-ppt.py`)
- 화멸별 캡션/카탈로그 보완 (`docs/SCREENSHOT_CAPTIONS.md`, `docs/PROPOSAL_SCREENSHOT_CATALOG.md`)
- 문서 인덱스/변경이력/기술부채 갱신


## 33단계: 최종 제안 패키지 압축 및 공유본 생성

- `proposal-package/final-share/` 디렉터리 구성 (00_README, 01_PPT, 02_GUIDES, 03_SCREENSHOTS, 04_RFP_MAPPING, 05_QA_REPORTS, 06_SCRIPTS, 99_ARCHIVE_NOTE)
- PPT/설명자료/캡처/RFP매핑/QA보고서/스크립트 분류 복사
- `README_최종공유본.md`, `FINAL_PACKAGE_INDEX.md`, `최종공유_안낸문_33단계.md`, `ARCHIVE_NOTE.md` 작성
- `verify-final-package.py` 작성 및 실행 (구조, 파일 수량, 민감정보, 부적합 문구, 금지 확장자, ZIP 무결성 검사)
- 최종 ZIP 생성 (`국방지능형플랫폼포털_최종제안공유패키지_33단계.zip`)
- 문서 인덱스/변경이력/WBS/기술부채/결정사항/README 갱신


## 33.1단계: 화면 캡처 부적합 문구 제거 및 운영자용 외부 도구 링크 권한 제한

- 상단 `시연 환경입니다...` 안내 배너 제거 (`DemoModeBanner.tsx` 삭제 및 `App.tsx`에서 제거)
- `OpenMetadata`, `OpenSearch 대시보드`, `Keycloak 관리` 카드를 일반 포털 대시보드에서 제거
- 관리자 콘솔에 `플랫폼 운영도구` 탭 추가 및 3개 외부 도구 관리자 전용으로 배치
- 대시보드 바로가기 카드에 `adminOnly` 속성 추가, `관리자 콘솔`도 관리자 미접속 시 미노출
- 서비스/도구 카탈로그 `Tool` 타입에 `adminOnly` 속성 추가, `OpenMetadata` 관리자 전용 필터링
- 접근 코드 로그인 화면 `검증 환경...` 문구 제거
- 화면 노출 `샘플 데이터` 문구를 `예시 데이터`로 정정
- TypeScript/빌드/테스트/smoke test 및 Firebase Hosting 재배포
- 문서 인덱스/변경이력/WBS/기술부채/결정사항/README 갱신


## 33단계: 최종 제안 패키지 압축 및 공유본 생성

- `proposal-package/final-share/` 디렉터리 구성 (00_README, 01_PPT, 02_GUIDES, 03_SCREENSHOTS, 04_RFP_MAPPING, 05_QA_REPORTS, 06_SCRIPTS, 99_ARCHIVE_NOTE)
- PPT/설명자료/캡처/RFP매핑/QA보고서/스크립트 분류 복사
- `README_최종공유본.md`, `FINAL_PACKAGE_INDEX.md`, `최종공유_안낸문_33단계.md`, `ARCHIVE_NOTE.md` 작성
- `scripts/verify-final-package.py` 작성 및 실행
- 최종 ZIP 생성 (`국방지능형플랫폼포털_최종제안공유패키지_33단계.zip`)
- 문서 인덱스/변경이력/WBS/기술부채/결정사항/README 갱신

## 33.1단계: 화면 캡처 부적합 문구 제거 및 운영자용 외부 도구 링크 권한 제한

- 상단 `시연 환경입니다...` 배너 제거
- `OpenMetadata`, `OpenSearch 대시보드`, `Keycloak 관리` 카드를 일반 포털 대시보드에서 제거
- 관리자 콘솔에 `플랫폼 운영도구` 탭 추가 및 3개 외부 도구 관리자 전용으로 배치
- 대시보드 바로가기 카드에 `adminOnly` 속성 추가, `관리자 콘솔`도 관리자 미접속 시 미노출
- 서비스/도구 카탈로그 `Tool` 타입에 `adminOnly` 속성 추가, `OpenMetadata` 관리자 전용 필터링
- 접근 코드 로그인 화면 부적합 문구 제거
- 화면 노출 `샘플 데이터` 문구를 `예시 데이터`로 정정
- TypeScript/빌드/테스트/smoke test 및 Firebase Hosting 재배포

## 34단계: 33.1단계 UI 반영 화면 재캡처, PPT 보정, 최종 ZIP 갱신

- production URL 기준 20개 화면 재촬영 (33.1단계 UI 반영)
- 캡처 스크립트에서 `09-admin-console-platform-ops-tools.png` 추가, `15-openmetadata-catalog.png`/`16-opensearch-catalog-index.png` 제외
- `docs/SCREENSHOT_CAPTIONS.md`, `docs/PROPOSAL_SCREENSHOT_CATALOG.md` 갱신
- `docs/PROPOSAL_BODY_IMAGE_GUIDE.md` 신규 작성 (제안서 본문 삽입용 이미지/캡션 정리)
- 화면중심 PPT(`scripts/generate-proposal-ppt.py`) 이미지 교체/데이터 갱신
- 기능흐름중심 PPT(`scripts/generate-feature-flow-ppt.py`) 이미지 교체 및 슬라이드 번호/푸터/제목 바 디자인 보정
- `final-share/01_PPT/`, `02_GUIDES/`, `03_SCREENSHOTS/`, `06_SCRIPTS/` 갱신
- `proposal-package/FINAL_PACKAGE_INDEX.md`, `final-share/00_README/README_최종공유본.md`, `00_README/FINAL_PACKAGE_INDEX.md` 갱신
- `scripts/verify-final-package.py` 통과
- 최종 ZIP 재생성 (`국방지능형플랫폼포털_최종제안공유패키지_33단계.zip`, 65개 항목, 1.5MB)
