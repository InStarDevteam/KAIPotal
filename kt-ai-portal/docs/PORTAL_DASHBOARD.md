# Portal Dashboard (메인 포털 대시보드)

## 개요

국방지능형플랫폼포털 (K-Defense Intelligence Platform)의 메인 화면이다. 사용자가 Backstage 포털에 로그인 후 처음 보는 화면으로, 데이터셋/AI 모델/프로젝트/반출승인/크레딧/K-RMF 증빙 등 전체 기능을 한눈에 파악할 수 있도록 구성한다.

- 위치: `packages/app/src/components/portal-dashboard/`
- 방식: PoC 컴포넌트 (mock data 기반)
- 라우트: `/`

## 목적

- 로그인 사용자에게 개인화된 요약 정보 제공
- 통합검색 및 주요 업무 메뉴로의 빠른 이동
- 데이터/모델/프로젝트/승인/크레딧/K-RMF 증빙 현황을 한 화면에서 모니터링
- 제안장표 및 데모 시나리오에서 활용할 수 있는 시각적 포털 홈 제공

## 화면 구성

### 1. Hero 영역

- 제목: `국방지능형플랫폼포털`
- 부제: `K-Defense Intelligence Platform`
- 설명: `국방 AI 데이터, 모델, 프로젝트를 하나의 포털에서 검색하고 관리하며, 크레딧, 반출/반입, K-RMF 증적까지 통합적으로 운영합니다.`
- 로그인 사용자 정보: 이름, 이메일, 역할
- 현재 날짜
- 상태 배지: `PoC Running`

### 2. 통합검색 바로가기

- 큰 검색 입력창과 검색 버튼
- placeholder: `데이터셋, AI 모델, Docker 이미지, PyPI 패키지, 문서를 검색하세요`
- Enter 또는 버튼 클릭 시 `/integrated-search?q=<검색어>`로 이동
- `IntegratedSearchPage`는 URL의 `q` 파라미터를 읽어 초기 검색어로 적용

### 3. 주요 현황 요약 카드

| 항목 | 값 (mock) | 설명 |
|------|-----------|------|
| 등록 데이터셋 | 128 | 포털에 등록된 데이터셋 수 |
| AI 모델 | 24 | 등록 AI 모델 수 |
| 진행 중 프로젝트 | 12 | 운영/승인된 프로젝트 수 |
| 반출/반입 대기 | 5 | 승인 대기 중인 반출/반입 건수 |
| 크레딧 부족 프로젝트 | 2 | 잔여 크레딧이 부족한 프로젝트 수 |
| K-RMF 진행률 | 68% | 전체 통제항목 대비 진척률 |
| OpenSearch 자산 | 10 | OpenSearch `portal-catalog` 색인 자산 수 |
| OpenMetadata 상태 | 정상 | 카탈로그 시스템 연결 상태 |

### 4. 공지사항

- 4~5건의 공지사항 목록
- 표시 항목: 제목, 유형(공지/보안/시스템/정책/이벤트), 중요도(info/warning/error), 작성일

### 5. 신규 데이터셋/AI 모델

- 최근 등록된 데이터셋/AI 모델 5건
- 표시 항목: 유형 칩, 이름, 설명, 태그, 소유자, 등록일
- 상세 이동은 현재 비활성, 향후 Integrated Search 또는 OpenMetadata 상세와 연동 예정

### 6. 내 프로젝트 현황

- 참여 중인 프로젝트 3~5건
- 표시 항목: 프로젝트명, 상태 칩, PM, 종료 예정일, 리소스 사용률(Progress Bar)
- `Project Workspace로 이동` 버튼 → `/project-workspace`

### 7. 반출 승인 대기 현황

- 승인 대기/검토 중인 반출/반입 신청 3~5건
- 표시 항목: 대상명, 유형, 신청자, 상태 칩, 신청일
- `Export Approval로 이동` 버튼 → `/export-approval`

### 8. 크레딧 현황

- 잔여 크레딧, 월 예상 사용량
- 크레딧 부족/GPU 제한 프로젝트 수
- 경고 메시지 2~3건
- `Credit Manager로 이동` 버튼 → `/credit-manager`

### 9. K-RMF 증빙 진행률

- 전체 통제항목 수, 제출 완료 수, 승인 완료 수, 취약점 수
- 전체 진척률 Progress Bar
- 고위험 이슈 목록
- `K-RMF Evidence로 이동` 버튼 → `/krmf-evidence`

### 10. 시스템 상태

- Backstage, Keycloak, OpenSearch, OpenMetadata, Integrated Search, Project Workspace, Export Approval, Credit Manager, K-RMF Evidence 상태 표시
- 상태값: 정상, 점검, 장애, 지연, 오프라인 (mock data)

### 11. 주요 메뉴 바로가기

| 메뉴 | 이동처 | 유형 |
|------|--------|------|
| Admin Console | `/admin-console` | 내부 |
| Integrated Search | `/integrated-search` | 내부 |
| Project Workspace | `/project-workspace` | 내부 |
| Export Approval | `/export-approval` | 내부 |
| Credit Manager | `/credit-manager` | 내부 |
| K-RMF Evidence | `/krmf-evidence` | 내부 |
| OpenMetadata | `http://localhost:8585` | 외부(새 탭) |
| OpenSearch Dashboards | `http://localhost:5601` | 외부(새 탭) |
| Keycloak Admin | `http://localhost:8080/admin` | 외부(새 탭) |

## 표시 데이터

모든 데이터는 `mockDashboardData.ts`에서 관리한다.

- `currentUser`: 이름, 이메일, 역할, 날짜, 상태
- `summaryMetrics`: 주요 현황 숫자
- `notices`: 공지사항
- `recentAssets`: 최신 자산
- `myProjects`: 내 프로젝트
- `exportPending`: 반출/반입 대기
- `creditSummary`: 크레딧 요약
- `krmfProgress`: K-RMF 증빙 진행
- `systemStatus`: 시스템 상태
- `quickLinks`: 바로가기

## 파일 구조

```text
packages/app/src/components/portal-dashboard/
├─ index.ts
├─ types.ts
├─ mockDashboardData.ts
├─ PortalDashboardPage.tsx
├─ DashboardHero.tsx
├─ DashboardSearchBox.tsx
├─ SummaryMetricCards.tsx
├─ RecentAssetsPanel.tsx
├─ MyProjectPanel.tsx
├─ ExportPendingPanel.tsx
├─ CreditSummaryPanel.tsx
├─ KrmfProgressPanel.tsx
├─ SystemStatusPanel.tsx
├─ QuickLinkCards.tsx
└─ NoticePanel.tsx
```

## 각 기능 연계 구조

```text
┌─────────────────────────────────────────┐
│         Portal Dashboard (/)
│  Hero / Search / Summary / Panels
└────────────┬────────────────────────────┘
             │
    ┌────────┼────────┬─────────┬──────────┐
    ↓        ↓        ↓         ↓          ↓
integrated  project  export   credit    krmf
-search   -workspace -approval -manager  -evidence
    │
    ↓
/api/proxy/search/portal-catalog/_search
    │
    ↓
OpenSearch (http://localhost:9200)
```

Portal Dashboard는 직접 데이터를 조회하지 않고, 각 기능 페이지로 이동하는 허브 역할을 한다. 향후 API 연동 시 Dashboard 자체에서도 요약 API를 호출할 수 있도록 확장 가능하다.

## mock data 설명

- 대시보드용 mock data는 실제 API가 없는 PoC 환경을 가정하여 작성되었다.
- 숫자, 날짜, 상태값은 제안장표 및 데모 시나리오에 적합하게 조정되었다.
- 사용자 정보는 Backstage `identityApiRef`를 통해 실제 로그인 정보를 우선적으로 표시하며, 불가능할 경우 mock 데이터를 fallback으로 사용한다.

## 후속 API 연동 방향

1. **Integrated Search 실제 검색어 전달**
   - `/integrated-search?q=...` 연동은 이미 완료
   - 향후 검색 결과 중 상위 N건을 Dashboard에 미리 보여줄 수 있음

2. **Project Workspace API 연동**
   - 내 프로젝트 목록, 리소스 사용률, 종료 예정일
   - 상태: `running`, `approved`, `pending_approval` 등

3. **Export Approval API 연동**
   - 승인 대기/검토 중인 반출/반입 신청 목록
   - 신청자, 대상 유형, 신청일

4. **Credit Manager API 연동**
   - 잔여 크레딧, 월 예상 사용량, 부족/제한 프로젝트 수
   - 경고 메시지

5. **K-RMF Evidence API 연동**
   - 통제항목 진척률, 제출/승인/취약점 수
   - 고위험 이슈 목록

6. **OpenMetadata 신규 데이터셋 연동**
   - 최근 등록된 데이터셋/AI 모델 Top 5
   - 소유자, 태그, 등록일

7. **OpenSearch 색인 통계 연동**
   - `portal-catalog` 인덱스 문서 수, 타입별 분포
   - 보안등급 분포

8. **Keycloak 사용자 역할 기반 대시보드 개인화**
   - 로그인 사용자의 역할/그룹에 따라 보이는 패널 제어
   - `portal-admin`, `project-manager`, `developer` 등 역할별 요약 정보 차등화
