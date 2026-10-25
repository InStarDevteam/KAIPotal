# 포털 디자인 및 업무 진입 개선

2026-09-24. 배포 사이트 `https://kai-platform-d0ae0.web.app/`의 로그인과 메인 4종을 브라우저로 확인한 뒤 로컬 소스에 개선했습니다. 이 문서는 해당 URL에 새 버전 배포가 완료되었다는 보고가 아닙니다.

## 디자인 검토

기존 메인은 4개 플랫폼 접근이라는 목적에는 맞지만, 작은 아이콘과 반복되는 카드, 약한 타이포그래피 때문에 시안별 인상이 비슷했습니다. ‘포털 업무’까지 팝업에서 다시 선택하는 동선도 잦은 업무에 불필요한 단계를 만들었습니다.

[삼성SDS FabriX 공식 페이지](https://www.samsungsds.com/kr/ai-fabrix/fabrix.html)의 대형 제목, 입체 그래픽, 명확한 주요 행동을 시각적 기준으로 검토했습니다. 공개 소개 페이지를 참고한 것이며 로그인 내부 제품 화면을 확인하거나 복제한 것은 아닙니다. 객관적 우열보다 고객이 비교할 수 있는 실제 시안을 제공합니다.

| 시안 | 방향 | 구성 | 검토 이미지 |
|---|---|---|---|
| 01 Aurora | 추천 기본안 · 밝고 정제된 AI 포털 | 큰 제목, 유려한 리본 그래픽, 4개 수평 플랫폼 카드 | [데스크톱](evidence/after-aurora.png) · [모바일](evidence/mobile-aurora.png) |
| 02 Focus | 업무 집중형 | 세이지 색조, 문자 그래픽, 오른쪽 4개 플랫폼 목록 | [데스크톱](evidence/after-focus.png) · [모바일](evidence/mobile-focus.png) |
| 03 Orbit | 기술 이미지 강조 | 미드나이트 배경, 연결 구체, 높은 명암 대비 | [데스크톱](evidence/after-orbit.png) · [모바일](evidence/mobile-orbit.png) |
| 04 Canvas | 편안한 협업형 | 따뜻한 바탕, 입체 레이어, 2×2 플랫폼 타일 | [데스크톱](evidence/after-canvas.png) · [모바일](evidence/mobile-canvas.png) |

[한 페이지 디자인 갤러리](design-review.html). 변경 전 화면 및 공식 참고 화면도 `evidence/before-*.png`, `evidence/fabrix-reference.png`로 보관했습니다.

그래픽은 로컬 SVG로 직접 구현했습니다. 외부 이미지 다운로드, CDN, 폰트 API에 의존하지 않습니다. 플랫폼 진입과 업무 시작을 중심으로 구성하고 메인에 통계나 공지 위젯을 추가하지 않았습니다. 로그인 4개 진입 버튼, 개발 단계 시안 선택, 계정별 즐겨찾기·순서, 테넌트 브랜딩 및 메뉴 정책을 유지합니다.

## 실제 동작 변경

- 홈의 ‘포털 업무 시작하기’와 상단 ‘포털 업무’는 `/portal-work`에 직접 진입합니다. [사용자층별 첫 화면 표](ROLE_LANDING_MATRIX.md)의 6가지 구성을 현재 유효 권한으로 선택합니다.
- 구글 형태의 ‘모든 앱’ 팝업은 그대로 유지합니다. 4개 플랫폼과 접근 가능한 포털 메뉴에 즉시 접근할 수 있습니다.
- 프로젝트 검색, 업무 유형 필터, 저장 내역 새로고침, 통합 자산 검색, 기존 기능 바로가기가 작동합니다.
- 프로젝트 카드가 선택한 프로젝트를 열고, 작업환경 버튼은 신청 탭을 엽니다. 자원 현황은 자원 풀 탭으로, 반입·반출 검토는 선택 요청으로 연결합니다. URL에 선택 상태를 담아 뒤로가기·새로고침에서도 유지합니다.
- 모바일에서 디자인을 바꾸면 페이지 위로 이동해 새 시안을 바로 확인합니다. 키보드 포커스, 접근 제한 표시, 빈 목록·검색 결과 없음, 연동 대기 상태를 제공합니다.
- 예시 자원과 브라우저 활동에는 데이터 출처를 표시합니다. 실제 API 미연동 상태를 실시간 정상 상태로 표현하지 않습니다.

## 기능 범위 보존

`docs/FINAL_RFP_PORTAL_BOUNDARY_REVIEW.md` 및 기존 `docs/portal-experience/IMPLEMENTATION.md`를 기준으로 공통 포털과 개별 플랫폼의 경계를 유지했습니다. 기존 프로젝트/작업환경, 카탈로그, 크레딧, 반입·반출, 관리자, 테넌트, 감사, 연계 개발 콘솔 기능을 제거하지 않았습니다. 이미 보류된 K-RMF 전용 메뉴를 임의로 복원하지 않았습니다. RFP ID는 사용자 화면에 표시하지 않으며 내부 요구사항 추적 자료는 보존합니다.

환경설정 두 컴포넌트의 중첩 조건식 lint 오류도 같은 표시값을 반환하는 함수로 정리했습니다. 기능 변화는 없습니다.

## 확인 방법

```sh
cd backstage-portal
node .yarn/releases/yarn-4.13.0.cjs workspace app build --config ../../app-config.yaml --config ../../app-config.design-review.yaml
cd ..
node scripts/serve-design-review.mjs
```

`http://localhost:3000` → 접근코드 `demo1234` → 시안 선택. 개발 검토용 `?captureRole=general-user|project-manager|branch-admin|portal-admin|security-manager|security-auditor`로 역할을 비교할 수 있습니다. 이 옵션은 데모/캡처 설정에서만 사용하며 운영 인증을 대신하지 않습니다.

## 검증 기록

최종 실행 결과는 [VALIDATION.md](VALIDATION.md)를 참고하세요. 주요 캡처는 실제 로컬 빌드를 Playwright로 열어 생성했습니다. 외부 플랫폼 API와 기관 인증 실연동 검증은 포함하지 않습니다.
