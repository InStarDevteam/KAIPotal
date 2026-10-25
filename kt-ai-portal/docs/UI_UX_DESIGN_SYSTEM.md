# UI/UX 디자인 시스템 (33.2단계)

> 기능 변경 없이 포털의 시각적 일관성을 확보하기 위한 디자인 토큰과 공통 컴포넌트 정의.
> 구현 위치: `backstage-portal/packages/app/src/components/common/`

## 1. 목표 디자인 방향

**"운영형 국방 통합업무 포털"**

- 화려함보다 명확성
- 카드 나엠보다 업무 흐름
- 기술지표와 업무지표 분리
- 일반 사용자와 관리자 정보의 시각적 구분
- 1366 / 1440 / 1920 해상도에서 안정적인 화면

## 2. 디자인 토큰 (`designTokens.ts`)

### 색상 (colors)

| 토큰 | 값 | 용도 |
|---|---|---|
| primaryNavy | `#173B5E` | 히어로, 주요 강조, 현재 단계 |
| primaryBlue | `#245FA6` | 링크, 진행률, 선택 상태 |
| background | `#F4F6F8` | 페이지 배경 |
| surface | `#FFFFFF` | 카드/패널 표면 |
| textPrimary | `#1F2937` | 본문 제목/값 |
| textSecondary | `#667085` | 설명/캡션 |
| border | `#D9E2EC` | 카드/구분선 |

### 상태색 (bg/text 쌍, 텍스트 대비 AA 4.5:1 이상)

| 상태 | 용도 |
|---|---|
| success | 완료/정상/승인 |
| warning | 검토/주의/만료 임박 |
| error | 미흡/반려/장애/고위험 |
| info | 일반 안내/진행 중 |
| neutral | 기본/비활성 |

### 간격 (spacingTokens)

- base: 8px
- cardGap: 16px
- sectionGap: 24px

### 레이아웃 (layoutTokens)

- sidebarWidth: 248px (확장) / 72px (축소)
- pageMaxWidth: 1680px
- cardRadius: 8px
- card border: 1px solid `#D9E2EC`
- shadow: 최소 수준

### 타이포그래피 (typographyTokens)

| 토큰 | 크기/굵기 | 용도 |
|---|---|---|
| pageTitle | 24px / 700 | 페이지 제목 |
| sectionTitle | 16px / 600 | 섹션 제목 |
| body | 14px / 400 | 본문 |
| caption | 12px / 400 | 보조 설명 |

## 3. 공통 컴포넌트 (`components/common/`)

| 컴포넌트 | 용도 | 주요 props |
|---|---|---|
| PageHeader | 페이지 제목+설명+우측 액션 | title, description, actions |
| SectionHeader | 섹션 제목+보조 설명 | title, description |
| SectionCard | 표면 카드(border/radius/최소 shadow) | title, compact |
| MetricCard | 지표 카드(Primary/Secondary 크기) | label, value, subtext, tone, size |
| StatusChip | 상태 칩(상태색 토큰) | tone, label |
| RoleBadge | 역할 표시(navy 칩) | label 또는 role |
| EmptyState | 빈 상태 | icon, message, description |

기존 기능 컴포넌트는 삭제하지 않고 이 래퍼들로 감싸는 방식으로 적용했다.

## 4. 사이드바

- 확장 폭 248px: `Sidebar sidebarOptions={{ drawerWidthOpen: 248 }}` (Backstage 공식 prop)
- 본문 padding 보정: `SidebarWidthStyle` (core-components SidebarPage context 버그 우회)
- 메뉴 텍스트 말줄임 제거: `.BackstageSidebarItem-label` 오버라이드 (whiteSpace normal, 2줄 wrap)
- 현재 메뉴: 왼쪽 3px primaryBlue indicator + 선택 스타일
- 아이콘 20px 통일, 아이템 간 4px 수직 간격
- 사이드바 하단: 역할 Chip + 역할 전환 컨트롤(캡처 모드 전용) 정적 배치

## 5. 글로벌 여정바 / K-RMF 이행 단계

- 전역 8단계(`PortalJourneyBar`): '플랫폼 이용 단계' 캡션, 현재=navy/완료=옅은 blue/예정=회색, 연결선 정렬, 가로 스크롤, aria-label, hover/focus
- `subdued` prop: K-RMF 화면에서는 대비를 낮춘 보조 흐름으로 표시
- K-RMF 낶부 8단계(`KrmfLifecycleStepper`): 'K-RMF 이행 단계' 캡션 + navy 액센트 바로 주 stepper 강조

## 6. 통합 대시보드 정보 계층

- 히어로: 높이 30% 축소, primaryNavy 단색, 좌(제목/설명)·우(사용자 정보/역할 RoleBadge/상태 칩) 분리
- 검색: 입력창+버튼 결합형
- 지표 4개 섹션: [업무 현황] [자원 및 크레딧] [플랫폼 현황] [보안 및 거버넌스]
  - Primary KPI와 Secondary KPI 크기 차별 (MetricCard size)
  - 보안 섹션은 `krmf.view` 권한자만 노출(기존 게이트 유지)
- 12-column 그리드: 1920 KPI 4열·상세 8:4, 1440 KPI 3~4열, 1366 줄바꿈·가로 스크롤 없음
- 하단 패널(공지/최근 자산/프로젝트/반출 대기)은 동일한 SectionCard 스타일

## 7. 역할 표시 및 권한 UX

- 현재 역할: 사이드바 하단 Chip + K-RMF 헤더 우측 RoleBadge
- 역할 전환: 콘텐츠 위 플로팅 제거 → 사이드바 하단 정적 배치, "권한에 따라 이용 가능한 메뉴가 표시됩니다" Tooltip
- 역할 판정/캡처 모드 로직은 변경 없음

## 8. 접근성

- 상태색 텍스트 대비 AA(4.5:1) 이상으로 정의(토큰 주석에 근거 기재)
- 여정 단계 aria-label, 키보드 tabIndex, focus-visible 스타일
- 탭 높이 48px, active 인디케이터 3px, sticky 탭 바(K-RMF)
- 최소 1024px까지 화면 파손 없음
