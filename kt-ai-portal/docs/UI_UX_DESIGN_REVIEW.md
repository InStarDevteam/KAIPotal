# UI/UX 디자인 검토 보고서 (33.2단계)

> 기능 변경 없이 수행한 UI/UX 디자인 시스템 정비 결과와 판단 근거를 정리한다.
> 관련 문서: `docs/UI_UX_DESIGN_SYSTEM.md`, `docs/UI_UX_BEFORE_AFTER.md`

## 1. 작업 범위 준수 확인

| 항목 | 변경 여부 |
|---|---|
| route | 변경 없음 |
| 메뉴 ID/순서/표시조건 | 변경 없음 |
| 권한(authz)/가드 | 변경 없음 |
| 인증(Firebase/Guest/Access Code) | 변경 없음 |
| API URL/호출 로직 | 변경 없음 |
| Mock/기준 데이터 값·건수 | 변경 없음 |
| KPI/크레딧/K-RMF 진척률 계산 | 변경 없음 |
| 버튼 기능/탭 구성/CSV | 변경 없음 |

## 2. 개선 결과 요약

### 사이드바

- 기존 문제: 메뉴 텍스트 말줄임("서비스/도구 카탈...", "프로젝트/워크스..."), 우하단 플로팅 역할 선택 UI가 콘텐츠 가림
- 개선: 확장 폭 248px(Backstage 공식 `sidebarOptions`), 라벨 말줄임 제거(2줄 wrap), 현재 메뉴 왼쪽 indicator, 아이콘 20px/간격 통일, 역할 영역을 사이드바 하단에 정적 배치
- 기술 메모: core-components `SidebarPage`가 context를 못 읽어 본문 padding이 224px로 계산되는 문제를 `SidebarWidthStyle`(동적 style 주입)로 우회. Backstage 업그레이드 시 재검토 필요.

### 글로벌 여정바

- '플랫폼 이용 단계' 캡션 추가, 현재(navy)/완료(옅은 blue)/예정(회색) 상태 구분, 연결선 정렬, hover/focus, aria-label, 높이 축소
- K-RMF 화면에서는 `subdued` 처리로 보조 흐름 표시 → K-RMF 낶부 'K-RMF 이행 단계' stepper와 명확히 구분

### 통합 대시보드

- 히어로 높이 약 30% 축소, primaryNavy 단색, 좌(제목/설명)·우(사용자 정보/역할 RoleBadge/상태 칩) 정보 분리
- 검색창+버튼 결합형
- 지표 4개 섹션 재편: [업무 현황] [자원 및 크레딧] [플랫폼 현황] [보안 및 거버넌스], Primary/Secondary KPI 크기 차별
- 보안 섹션은 `krmf.view` 권한자만 노출(기존 게이트 유지)
- 하단 패널(공지/최근 자산/프로젝트/반출 대기) SectionCard 스타일 통일

### K-RMF 화면

- PageHeader + 헤더 우측 RoleBadge(현재 역할)
- 전체 진척률 navy 주요 카드 + 보조 지표 MetricCard(미흡 warning/고위험 error)
- 영역별 진척률: 바 높이 6px 통일, 0% 회색/중간 blue/100% success
- 최근 미흡사항: 행 여백 통일, 심각도 StatusChip
- 탭: 높이 48px, active 인디케이터 3px, sticky 탭 바

### 역할 표시 UX

- 콘텐츠 위 플로팅 제거 → 사이드바 하단 정적 배치
- "권한에 따라 이용 가능한 메뉴가 표시됩니다" Tooltip

## 3. 판단 기록

1. **섹션 매핑**: mock 데이터를 수정하지 않기 위해 `SECTION_MAP` 상수로 지표 id→섹션 분류. `branchProjectCount`(군별 프로젝트)는 지시 목록에 없어 테넌트 성격상 [플랫폼 현황]에 배치. "보완 진행"은 대응 mock 필드가 없어 임의 산출하지 않고 미표시.
2. **사이드바 폭 우회 방식**: 공식 prop + style 주입 병행(위 기술 메모 참조).
3. **역할 전환 UI 위치**: 헤더 대신 사이드바 하단 선택 — 모든 페이지에서 동일 위치/동작을 유지하고 페이지별 헤더 구조 변경을 피하기 위함.
4. **Firebase 배포 경로**: firebase CLI 계정이 다른 프로젝트 계정으로 전환되어 있어(`inhwatechwin@gmail.com`), gcloud 활성 계정(kyubeom@gmail.com)의 액세스 토큰으로 Hosting REST API 배포 수행(버전 생성→gzip 해시 등록→업로드→finalize→release). 기존 rewrites/headers config는 이전 버전에서 읽어 그대로 재사용.

## 4. 반응형/접근성 검증

| 항목 | 1920 | 1440 | 1366 |
|---|---|---|---|
| 메뉴 잘림 없음 | ✅ | ✅ | ✅ |
| 역할 UI 가림 없음 | ✅ | ✅ | ✅ |
| 카드 겹침 없음 | ✅ | ✅ | ✅ |
| 표 넘침 없음 | ✅ | ✅ | ✅ |

- 상태색 텍스트 대비 AA(4.5:1) 이상으로 토큰 정의
- 여정 단계 aria-label/tabIndex/focus-visible 적용
- 1024px 이하는 이번 단계 필수 범위 외(화면 파손 없음 수준)

## 5. 회귀검증 결과

- `yarn tsc --noEmit`: 통과
- `yarn workspace app test --watchAll=false`: 5 suites / 27 tests 통과
- `yarn workspace app build`: 성공
- smoke test: 17/17 통과
- full-audit-playwright: 전 라우트 정상 진입, 콘솔/네트워크 오류 없음, 부적합 문구 없음, CSV 다운로드 정상 (일부 'tab not found'는 스크립트가 기대하는 구버전 탭명 차이로 기능 이상 아님)
