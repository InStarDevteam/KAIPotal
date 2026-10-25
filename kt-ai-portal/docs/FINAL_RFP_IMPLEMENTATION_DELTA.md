# 최종공고 대비 구현 델타 (FINAL_RFP_IMPLEMENTATION_DELTA)

최종공고문 260723_v1 기준, 기존 구현과 개선 구현의 차이를 요구사항 단위로 정리한다.
배경·범위 검토는 `docs/FINAL_RFP_PORTAL_BOUNDARY_REVIEW.md`, 계획은 `docs/FINAL_RFP_PORTAL_UPDATE_PLAN.md`를 따른다.

## 1. 요구사항별 구현 델타

| 요구 ID | 최종공고 요구 | 기존 구현 | 개선 구현 | 화면/라우트 | 테스트 | 남은 연계 |
|---|---|---|---|---|---|---|
| SFR-007 | AI 작업 환경(컨테이너) 생성 요청 | 단일 폼 + 저장 불가 고지 | 7단계 Wizard(WorkEnvRequestWizard), 상태 흐름(신청→승인→생성중→사용중→만료예정→종료/실패·원복) | `/project-workspace` '작업 환경 생성 요청' 탭 | tsc 타입 검사 + 수동 확인 | 실제 AI 플랫폼 API 연계(PORTAL-AI-ENV-001) |
| SFR-008 | 데이터 작업 환경 생성 요청 | 단일 폼(AI형만) | 동일 Wizard의 데이터형 분기(분석 프레임워크/시각화/비식별화/영속보관) | `/project-workspace` '작업 환경 생성 요청' 탭 | tsc 타입 검사 + 수동 확인 | 데이터 플랫폼 API 연계(PORTAL-DATA-ENV-001) |
| SFR-015 | 통합검색 | 필터 4개, 유형 11개 | 유형 15종, 속성 필터(군/프로젝트/소유자/버전/라이선스), 유사 명칭 토글, 자동완성, 색인 상태 바, 비밀 자산 권한 선필터 | `/integrated-search` | `searchFiltering.test.ts` 6건 | OpenSearch 인덱스 스키마 확장 |
| SFR-018 | 워크스페이스 생애주기 | 목록/생성만 | WorkspaceLifecyclePanel(생애주기, 멤버·RBAC, 할당량, 접속 링크, 추가 자원, 만료, 종료, 원복, 실시간 사용량) | `/project-workspace` 상세 | tsc 타입 검사 + 수동 확인 | GPU/CPU 실시간 사용량 API(PORTAL-WORKSPACE-003) |
| SFR-019 | 마이페이지 | 11개 탭 | 실증 프로젝트·보안 과제 탭 추가, 알림 배너, 워크스페이스 접속·만료 배지, 요구사항 탭 권한 게이트 | `/my-page` | tsc 타입 검사 + 수동 확인 | 알림 실시간 연동 |
| TER-008 | 실증·데이터 준비 | 관련 필드 없음 | PilotProject 모델, '실증·데이터 준비' 탭(수요/보유 비교, 부족량 산출, 합성/시뮬레이터 요청, 계보·품질, 9단계 흐름), 육군종합정비창 3개 과제 | `/project-workspace` '실증·데이터 준비' 탭 | tsc 타입 검사 + 수동 확인 | 실증 플랫폼 연계(PORTAL-PILOT-001~006) |
| SER-002~008 | K-RMF 이행·증적 | 5개 탭 | 생애주기 Stepper(8단계), 이행계획/평가·인가 지원/운영전환·변경관리 탭, 모델 4종(Plan/Assessment/Transition/ChangeImpact), 변경영향 10종 이상, 역할별 버튼 게이트 | `/krmf-evidence` | `krmfData.test.ts` 6건 | 소요기관 평가 시스템 연계 |
| 권한체계(SFR-003/005/021 연계) | 역할 기반 접근통제 일원화 | 3개 메커니즘 분산, `/admin-console` 가드 없음 | authz 모듈 신설, 역할 7종·권한 22종 단일 정책(rolePolicies.ts), 라우트 가드 일원화, `/role-menu-preview` 비교 화면 | 전체 라우트 | `rolePolicies.test.ts`, `portalMenuDefinitions.test.ts` | Keycloak 역할 claim 연계 |

## 2. 검증 기준 메모

- '테스트' 열은 실제 실행된 검증만 기재한다. 자동 테스트가 없는 항목은 `tsc` 타입 검사와 수동 화면 확인으로 한정해 표기한다.
- SFR-015는 `searchFiltering.test.ts` 6건, SER-002~008은 `krmfData.test.ts` 6건, 권한체계는 `rolePolicies.test.ts`·`portalMenuDefinitions.test.ts`가 해당한다.
- '남은 연계' 열의 PORTAL-* 식별자는 플랫폼 연계 과제 ID이며, 상세는 `docs/PLATFORM_API_INTEGRATION_PLAN.md`를 따른다.

## 3. 관련 문서

| 문서 | 내용 |
|---|---|
| `docs/ROLE_PERMISSION_MATRIX.md` | 역할 7종·권한 22종·라우트 가드 정의 |
| `docs/KRMF_LIFECYCLE_AND_ROLE_DESIGN.md` | K-RMF 생애주기·데이터 모델·역할 설계 |
| `docs/FINAL_RFP_KRMF_MAPPING.md` | SER-002~008 요구 매핑 |
| `docs/FINAL_RFP_PILOT_PROJECT_MAPPING.md` | TER-008 실증 과제 매핑 |
| `docs/ROLE_MENU_CAPTURE_GUIDE.md` | 역할 전환·제안 캡처 절차 |
