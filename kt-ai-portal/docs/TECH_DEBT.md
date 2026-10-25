# 기술 부채 정리

현재 PoC 단계에서 남아 있는 기술 부채와 후속 정리 계획을 정리합니다.

## 1. TypeScript 기존 오류

| 구분 | 이슈 | 영향 | 조치 계획 |
|------|------|------|-----------|
| Test | `packages/app/src/App.test.tsx`에서 `App.createRoot()` 타입 오류 | `yarn test` 실행 시 실패, 개발 서버에는 영향 없음 | `App` 컴포넌트를 `<App />`로 직접 렌더링하도록 수정 완료 (24단계) |

### 상세

```text
packages/app/src/App.test.tsx:22:33 - error TS2339:
  Property 'createRoot' does not exist on type 'ComponentType<{ children?: ReactNode; }>'.
```

`app.createRoot(...)`은 Backstage `createApp`의 결과로 `React.ComponentType`을 반환하지만, 테스트 코드에서 `App.createRoot()`처럼 정적 메서드로 호출하고 있다. 실제 컴포넌트를 렌더링하도록 테스트를 수정해야 한다.

## 2. UI Warning

| 구분 | 이슈 | 영향 | 조치 계획 |
|------|------|------|-----------|
| MUI v4 | `findDOMNode is deprecated` 경고 | 기능 동작에는 영향 없음, 콘솔 노이즈 발생 | MUI v5 또는 Backstage 권장 컴포넌트로 점진적 마이그레이션 |

## 3. 구조적 부채

| 구분 | 이슈 | 영향 | 조치 계획 |
|------|------|------|-----------|
| PoC 컴포넌트 | 모든 업무 기능이 `packages/app/src/components/`에 직접 구현됨 | 정식 Backstage Plugin 구조가 아니라 확장성과 유지보수성이 낮음 | 필요 시 `backstage-portal/plugins/` 아래 정식 플러그인으로 분리 |
| Mock Data | 업무 화면이 mock data 기반 | 실제 데이터 반영 불가 | 각 플러그인별 API 클라이언트 및 Backend API 구현 |
| Admin Console | 사용자 등록/승인/외부 사용자/권한/RBAC/로그인·비밀번호 정책/감사로그/메뉴/프로그램 관리가 mock data 기반 | 실제 Keycloak/DB 연동 전까지 관리 기능 미동작 | 운영 확장에서 Keycloak/DB 연동 |
| Service Catalog/Proposal Board | 도구 카탈로그/제안 게시판이 mock data 기반 | 실제 OpenMetadata/Docker/PyPI/DB 연동 전까지 등록/신청/검토 미동작 | 운영 확장에서 OpenMetadata/Docker/PyPI/Proposal DB 연동 |
| My Page/Environment Settings | 프로필/세션/API Key/알림/시스템 파라미터/보안 정책 등이 mock data 기반 | 실제 Keycloak/DB/Notification/API Key Vault/정책 엔진 연동 전까지 개인 설정/운영 설정 미반영 | 운영 확장에서 Keycloak/DB/Notification/운영 설정 연동 |
| Tenant Management | 군별 테넌트/리소스 풀/쿼터/사용량/프로젝트 사용량이 mock data 기반 | 실제 Kubernetes/OpenStack/CMP/Keycloak/DB 연동 전까지 군별 자원 분리 및 쿼터 관리 미동작 | 운영 확장에서 Kubernetes namespace/quota, OpenStack project/quota, CMP API, Keycloak group/role 연동 |

## 4. 인증/권한 부채

| 구분 | 이슈 | 영향 | 조치 계획 |
|------|------|------|-----------|
| Role/Group Claim | Keycloak에서 role/group claim이 Backstage로 전달되지 않음 | 권한 기반 메뉴 제어/검색 필터링 불가 | Keycloak Client Mapper 추가 및 Backstage 권한 프레임워크 연동 |
| 검색 권한 | OpenSearch 검색 결과에 보안등급/권한 필터 미적용 | 낮은 권한 사용자도 높은 보안등급 결과를 볼 수 있음 | Backend 검색 API에서 사용자 역할 기반 필터 추가 |
| Session Secret | `.env` 기반 session secret 관리 | 개발 환경에서는 적절, 운영 환경에서는 별도 secret 관리 체계 필요 | Vault/Kubernetes Secret 등 도입 |

## 5. 데이터 연동 부채

| 구분 | 이슈 | 영향 | 조치 계획 |
|------|------|------|-----------|
| OpenMetadata | 포털과 OpenMetadata 간 데이터 자동 동기화 미구현 | 최신 데이터셋/모델 수동 등록 필요 | OpenMetadata API 연동 및 Webhook/Scheduler 구현 |
| OpenSearch | `portal-catalog` 인덱스가 샘플 데이터 기반 | 실제 업무 데이터 검색 불가 | 업무 시스템 데이터를 OpenSearch에 색인하는 파이프라인 구축 |
| 파일 저장소 | 반출/반입 파일 업로드/다운로드 미구현 | 실제 반출 통제 불가 | 파일 저장소(S3/NFS/MinIO 등) 및 다운로드 권한 제어 구현 |
| 크레딧 | 실제 자원 사용량 수집 미연동 | 크레딧 차감 및 예측 불가 | AI/큐브/클우드 사용량 수집 API 연동 |

## 6. 테스트 부채

| 구분 | 이슈 | 영향 | 조치 계획 |
|------|------|------|-----------|
| Unit Test | PoC 컴포넌트에 대한 단위 테스트 부재 | 회귀 방지 어려움 | 주요 컴포넌트(Unit Test) 및 페이지(E2E) 테스트 추가 |
| E2E Test | Playwright 설정은 있으나 시나리오 테스트 미작성 | 데모 시나리오 자동화 불가 | 제안장표용 주요 시나리오 E2E 테스트 작성 |

## 7. 문서/운영 부채

| 구분 | 이슈 | 영향 | 조치 계획 |
|------|------|------|-----------|
| 로깅/모니터링 | 중앙 로그/메트릭 수집 미구축 | 장애 대응 및 운영 가시성 부족 | ELK/Prometheus-Grafana 등 도입 검토 |
| CI/CD | 자동 빌드/배포 파이프라인 없음 | 배포 수동화 및 품질 관리 어려움 | GitHub Actions/GitLab CI 등 구축 |
| 백업/복구 | DB/인덱스/파일 백업 정책 없음 | 데이터 유실 위험 | 백업/복구 정책 및 자동화 스크립트 수립 |

## 8. GitHub Push 인증 이슈

| 구분 | 이슈 | 영향 | 조치 계획 |
|------|------|------|-----------|
| Git Push | PAT 인증 문제로 `git push origin main` 실패 | 원격 저장소에 최신 커밋 반영 불가 | 사용자가 직접 `gh auth login` 또는 PAT 갱신 후 `git push origin main` 실행. token/password/secret은 문서에 기록하지 않음. |

## 9. 보안/운영 전 검토 필요사항

| 구분 | 이슈 | 영향 | 조치 계획 |
|------|------|------|-----------|
| 보안등급 | 화면상 `공개`/`내부`/`비밀` 사용 | UI는 정리되었으나 Backend enforcement 미구현 | 검색/데이터 접근 API에서 보안등급 필터 강제 적용 |
| 감사로그 | 로그 데이터 DB 저장 미구현 | 규제 대응 및 침해사고 추적 어려움 | 감사로그 DB 및 조회 API 구축 |
| 권한 회수/인계 | 조직 변경 시 권한 자동 회수/인계 미구현 | 퇴사/이동 시 권한 잔여 위험 | Keycloak group/role 변경 이벤트 기반 자동화 |
| 데이터 마스킹 | 반출/조회 시 민감 데이터 마스킹 미구현 | 개인정보/군사정보 유출 위험 | 마스킹 정책 및 DLP 검토 |
| 세션 관리 | 동시 세션 제한/강제 종료 미구현 | 계정 도용 시 대응 지연 | Keycloak session API 연동 |

## 10. 정리 우선순위 제안

1. **즉시**: `App.test.tsx` TypeScript 오류 수정
2. **단기**: Keycloak role/group claim 연동 및 권한 기반 메뉴 제어
3. **중기**: 실제 DB/API 연동 (Admin Console, Service Catalog, Proposal Board, Project Workspace, Export Approval, Credit Manager, K-RMF, My Page, Environment Settings, Tenant Management)
4. **중기**: OpenMetadata/OpenSearch 데이터 동기화
5. **중기**: 반입/반출 파일 저장소 및 승인 workflow 연동
6. **중기**: 크레딧/자원 사용량 수집 및 enforcement
7. **장기**: 정식 Backstage Plugin 전환
8. **장기**: 운영 인프라(Kubernetes, CI/CD, 모니터링, 백업) 구축

## 10. 데모 배포 부채

| 구분 | 이슈 | 영향 | 조치 계획 |
|------|------|------|-----------|
| Demo Access Code | `PreviewAuthGate`의 접근코드가 `app-config.demo.yaml`을 통해 노출될 수 있음 | 강력한 인증/인가 수단이 아님. URL 유출 시 무단 접근 가능 | 실제 운영 시 반드시 Keycloak OIDC 또는 별도 Backend 인증으로 교체. 데모용으로만 사용 |
| Guest Auth | 데모 config에서 Guest 인증만 사용 | 사용자 식별/권한 제어 없음 | 운영 전환 시 Keycloak OIDC 및 role/group claim 기반 권한 체계 연동 |
| 외부 연동 차단 | OpenSearch/OpenMetadata/Keycloak 운영 인스턴스를 데모에 연동하지 않음 | 통합검색은 mock fallback, 나머지 메뉴는 mock data | 실제 운영 환경 연결 시 별도 config 및 보안 검토 |
| HTTPS/도메인 | 가비아 DNS 연결 및 Firebase SSL 인증서 발급 미진행 | 아직 공개 URL로 접속 불가 | GCP/Firebase 프로젝트 생성 후 Cloud Run 배포, 가비아 `<sub>.kbcosmos.com` CNAME 설정 |
| CI/CD | 데모 배포 스크립트는 수동 실행 | 반복 배포 시 오류 발생 가능 | GitHub Actions 등으로 `build-demo.sh` → Cloud Run deploy → Firebase deploy 자동화 검토 |
| Console Warning | `findDOMNode is deprecated` 및 `WebSocket connection to ws://localhost:3000/ws failed` 경고 발생 | 기능 동작에는 영향 없음, 콘솔 노이즈 | MUI v5 마이그레이션 및 production 빌드 시 dev-server WebSocket 제거 검토 |
| Firebase Auth Google 로그인 | production에서 Firebase Auth Google 로그인 관리자 실검증 미완료 | 관리자 메뉴 노출이 Firebase Auth 이메일 기반으로 동작하는지 최종 확인 필요 | 별도 테스트 시점에 `kyubeom@gmail.com`으로 Google 로그인 후 관리자 메뉴 노출 여부 확인 |

## 11. 30단계 추가 기술부채

| 구분 | 이슈 | 영향 | 조치 계획 |
|------|------|------|-----------|
| 요구사항 대응현황 | mock 데이터 기반, 실제 RFP 확정 시 데이터 갱신 필요 | 현재 데이터는 PoC 기준 | RFP 확정 후 `requirement-progress` mock data 및 매핑 일괄 갱신 |
| 플랫폼 API 연계현황 | 실제 API 연동 없이 설계안/후보 목록만 표시 | 실제 플랫폼 연계 개발 필요 | 각 플랫폼 담당 팀과 API 명세 확정 후 실제 연동 개발 |
| CSV 다운로드 | 브라우저 Blob 기반 클라이언트 생성 | 대용량 데이터 제한, 보안 유출 우려 | 운영 시 서버사이드 생성 또는 권한 기반 다운로드 API로 전환 검토 |
| AdminOnlyGuard | Firebase Auth 이메일 기반 + sessionStorage 프리뷰 모드 | 운영 환경에서는 Keycloak role/group claim 기반으로 교체 필요 | Keycloak OIDC 연동 시 `AdminOnlyGuard`를 role 기반으로 리팩토링 |
| MUI v4 Box gap | `style={{ gap }}`로 우회 사용 | MUI v4 BoxProps에 `gap` 속성 없음 | MUI v5 마이그레이션 또는 `Grid`/`makeStyles`로 정리 |


## 12. 31단계 추가 기술부채

| 구분 | 이슈 | 영향 | 조치 계획 |
|------|------|------|-----------|
| 업무흐름 시나리오 | mock data 기반, 실제 플랫폼 API 미연동 | 실제 업무흐름과 다를 수 있음 | 플랫폼 담당 팀과 인터뷰/워크숍 후 시나리오 갱신 |
| MenuScenarioPanel | 통합 대시보드에만 적용, 나머지 메뉴에는 미적용 | 일관된 관리자 가이드 경험 부족 | 안정화 후 프로젝트/워크스페이스, 반입·반출 승인, 크레딧 관리 등에 확대 적용 |
| 시나리오 링크 | Chip/Link가 `/workflow-scenarios`로만 이동, 특정 시나리오로 직접 이동 불가 | 상세 시나리오 공유 불편 | URL query param(`?scenario=SCN-001`) 기반 선택 상태 추가 검토 |
| 사용자 여정 | 7개 역할로 단순화, 실제 조직/직무와 차이 가능 | 제안 설득력 저하 가능 | 실제 고객 조직도 기반으로 세분화 |

## 13. 31.6단계 추가 기술부채

| 구분 | 이슈 | 영향 | 조치 계획 |
|------|------|------|-----------|
| E2E Test | Playwright 전수검증 스크립트는 데모 사이트 접속/탐색 수준만 커버 | 복잡한 사용자 시나리오(승인 workflow, 제안 등록 등)는 자동화되지 않음 | 32단계 이후 제안서용 핵심 시나리오 E2E 추가 |
| `/api/auth/guest/refresh` 캐시 버스팅 | `?_=<timestamp>` 우회 적용 | 실제 운영에서는 CDN 캐시 정책 자체를 `/api/**`에 대해 no-cache로 설정하는 것이 근본 해결책 | Firebase Hosting `headers`에서 `/api/**`에 `Cache-Control: no-store` 추가 검토 |
| 통합검색 OpenSearch | 운영 OpenSearch 인스턴스 미연동 | 검색 결과는 샘플 데이터 기반 | 운영 OpenSearch 인덱스/프록시 연결 시 proxy 설정 및 보안 검토 |
| 화면 캡처 자동화 | 수동 캡처로 진행 중 | 반복 캡처 시 누락/불일치 가능 | Playwright 기반 캡처 스크립트를 32단계에서 활용 |
| GitHub Push | PAT 인증 문제로 push 실패 | 원격 저장소 동기화 불가 | 사용자가 직접 `gh auth login` 또는 PAT 갱신 |
| Firebase Auth Google 로그인 | production에서 관리자 실검증 미완료 | 관리자 메뉴 노출/차단이 Firebase Auth 이메일 기준으로 동작하는지 최종 확인 불가 | 별도 테스트 시 `kyubeom@gmail.com`으로 Google 로그인 후 확인 |

### 31.6단계에서 해결된 기존 부채

- `packages/app/src/App.test.tsx` 오류: 24~29단계에서 이미 해결
- `/api/auth/guest/refresh` 404: 브라우저 캐시 버스팅으로 31.6단계에서 해결
- UI 부적합 문구: 31.5/31.6단계에서 최종 정리
- 관리자 메뉴 노출/차단: 31.6단계 전수검증으로 정상 확인

## 14. 32단계 추가 기술부채

| 구분 | 이슈 | 영향 | 조치 계획 |
|------|------|------|-----------|
| OpenMetadata/OpenSearch 캡처 | 15~18번 캡처가 로컬 개발 환경 자료 | production 연동 인프라 미반영 | 필요 시 운영 인스턴스 구축 후 재촬영 |
| PPT 디자인 | python-pptx 기본 레이아웃 사용 | 시각적 완성도 제한 | 디자이너 템플릿 적용 또는 PowerPoint에서 추가 다듬기 |
| 캡처 자동화 | Playwright 기반 캡처 스크립트 작성 완료 | 특정 시나리오(승인 workflow 등)는 미커버 | 32단계 이후 핵심 시나리오 캡처 추가 검토 |

### 32단계에서 해결된 기존 부채

- 제안서용 화면 캡처: production URL 기준 21개 화면 재촬영 완료
- PPT 초안: 24장 발표자료 자동 생성 완료
- 캡처 적합성: `데모`/`PoC`/`프리뷰`/`mock`/`제안서 작업용` 문구 미노출 확인
- 캡처/캡션 문서: `PROPOSAL_SCREENSHOT_CATALOG.md`, `SCREENSHOT_CAPTIONS.md` 갱신

## 15. 32.1단계 추가 기술부채

| 구분 | 이슈 | 영향 | 조치 계획 |
|------|------|------|-----------|
| `/api/auth/guest/refresh` 캐시 | Firebase Hosting edge에서 `/api/auth/guest/refresh`가 stale cache로 404 반환 가능 | smoke test가 cache-buster(`?_=<timestamp>`)로 우회 중이나, 운영 환경에서는 예측 불가 | Firebase Hosting `headers` 규칙에서 `/api/**`에 `Cache-Control: no-store` 추가, 또는 backend 응답에 `Cache-Control: no-cache, no-store` 헤더 설정 |

### 32.1단계에서 해결된 기존 부채

- Firebase SDK config 추출: 환경변수 기반 config에서 값이 누락되지 않도록 추출 로직 수정
- Google 로그인 초기 흐름: 팝업/계정 선택/비밀번호 화면까지 도달 확인
- `/api/auth/guest/refresh` 404: smoke test에 cache-buster 적용하여 17/17 통과
- 가이드/설명자료: 관리자/사용자/플랫폼 관계/메뉴·SFR/기능 흐름 설명자료 작성


## 15.1. 32.2단계 추가 기술부채

| 구분 | 이슈 | 영향 | 조치 계획 |
|------|------|------|-----------|
| PPT 디자인 | python-pptx 기본 레이아웃 사용 | 시각적 완성도 제한 | PowerPoint에서 디자이너 템플릿 적용 또는 추가 다듬기 |
| 발표자 스크립트 | 슬라이드별 문구는 30초~1분 기준 | 실제 발표 시간과 차이 가능 | 발표 연습 후 분량 조정 |
| 사용자 설명자료 | 쉬운 설명을 위해 일부 기술 용어를 단순화 | 전문가 검토 시 용어 정확성 보완 필요 | 전문가 리뷰 후 용어 조정 |

### 32.2단계에서 해결된 기존 부채

- PPT 기능흐름 중심 재구성: 기존 32단계 PPT를 사용자 흐름·RFP 대응·플랫폼 연계 역할 중심으로 보완
- 발표자 스크립트 부재: 슬라이드별 발표 문구 추가
- 쉬운 사용자 설명자료 부재: 비유와 Q&A 형태의 요약본 추가
- 캡션 정보 부족: RFP ID, 강조 포인트, 후속 연동 포인트를 포함하여 확장


## 15.2. 33단계 추가 기술부채

| 구분 | 이슈 | 영향 | 조치 계획 |
|------|------|------|-----------|
| PPT 디자인 | python-pptx 기본 레이아웃 사용 | 시각적 완성도 제한 | PowerPoint에서 추가 보정 |
| ZIP 파일명 인코딩 | unzip 시 한글 파일명이 일부 터미널에서 깨질 수 있음 | Windows/Mac 환경에 따라 다름 | 필요 시 영문 파일명 추가 버전 검토 |
| `/api/auth/guest/refresh` | Firebase Hosting edge cache에 따라 간헐적 404 | smoke test가 가끔 실패 | 재시도 또는 브라우저 강력 새로고침으로 확인 |

### 33단계에서 해결된 기존 부채

- 최종 공유 패키지 부재: `final-share/` 기반 패키지 및 ZIP 생성
- 민감정보 포함 우려: ZIP 구성 시 secret 패턴 스캔 및 제외 규칙 적용
- 산출물 인덱스 부재: `FINAL_PACKAGE_INDEX.md` 및 공유 안낸문 작성


## 15.3. 33.1단계 추가 기술부채

| 구분 | 이슈 | 영향 | 조치 계획 |
|------|------|------|-----------|
| 플랫폼 운영도구 링크 | `OpenMetadata`, `OpenSearch 대시보드`, `Keycloak 관리` 링크가 `localhost` 주소로 고정됨 | 실제 환경 배포 시 URL 변경 필요 | 환경별 구성값(`app-config.*.yaml`)이나 관리자 설정에서 외부 도구 URL을 주입하도록 개선 |
| 시스템 상태/공지 문구 | `OpenSearch`, `OpenMetadata`, `Keycloak` 이름이 요약 지표·공지·시스템 상태에 여전히 노출됨 | 운영자 관점 정보가 일반 사용자 화면에 남아 있음 | 필요 시 시스템 상태 패널을 관리자 전용으로 이동하거나, 일반 사용자용 상태 표현을 단순화 |

### 33.1단계에서 해결된 기존 부채

- 화면 상단 `시연 환경` 배너 노출: 컴포넌트 삭제 및 `App.tsx`에서 렌더링 제거
- 외부 운영도구 카드 노출: 일반 사용자 대시보드 및 서비스/도구 카탈로그에서 제거하고 관리자 전용으로 제한
- `본 사이트는 검증 환경...` 문구 노출: 접근 코드 로그인 화면에서 제거
- 화면 노출 `샘플 데이터` 문구: `예시 데이터`로 정정


## 16. 34단계 추가 기술부채

| 구분 | 이슈 | 영향 | 조치 계획 |
|------|------|------|-----------|
| PPT 디자인 | python-pptx 기본 레이아웃 사용 | 시각적 완성도 제한 | PowerPoint에서 추가 보정 |
| `/api/auth/guest/refresh` | Firebase Hosting edge cache에 따라 간헐적 404 | smoke test 가끔 실패 | 재시도 또는 브라우저 강력 새로고침으로 확인 |
| Google 로그인 | `kyubeom@gmail.com` 관리자 실검증 미완료 | 관리자 메뉴 노출/차단이 Firebase Auth 이메일 기준으로 동작하는지 최종 확인 불가 | 별도 테스트 시 Google 로그인 후 관리자 메뉴 노출 여부 확인 |
| GitHub Push | PAT 인증 문제로 push 실패 | 원격 저장소 동기화 불가 | 사용자가 직접 `gh auth login` 또는 PAT 갱신 |

### 34단계에서 해결된 기존 부채

- OpenMetadata/OpenSearch 일반 사용자 화면 캡처: 33.1단계 UI 변경으로 일반 장표에서 제거하고 관리자 전용 `플랫폼 운영도구` 장표로 대체
- PPT 이미지/디자인 보정: 21개 화면중심 슬라이드, 34개 기능흐름중심 슬라이드로 이미지 교체 및 슬라이드 번호/푸터/제목 바 추가
- 최종 공유 패키지 갱신: `final-share/` 내 PPT/캡처/가이드/스크립트 갱신, ZIP 재생성, verify 통과
- 제안서 본문 삽입 가이드 부재: `PROPOSAL_BODY_IMAGE_GUIDE.md` 작성


## 17. 35단계 추가 기술부채

| 구분 | 이슈 | 영향 | 조치 계획 |
|------|------|------|-----------|
| 기존 lint 오류 19건 | admin-console, proposal-board, credit-manager, QuickLinkCards 등 기존 파일의 no-nested-ternary/no-alert/no-use-before-define 등 | `yarn lint:all` exit 1 유지 (이번 단계 신규 파일은 0건) | 후속 안정화 단계에서 파일별 정리 |
| 역할 판정 | 데모 환경은 Firebase 이메일 + sessionStorage override 기반 | 클라이언트 변조 가능, 보안 경계 아님 | 운영 전환 시 Keycloak role/group claim 어댑터로 교체 (authz의 역할 결정부만 교체하면 되도록 설계됨) |
| 캡처 모드 | `app.proposalCapture.enabled`가 데모 config에서 true | 운영 배포 시 역할 override가 동작하면 안 됨 | 운영 config에서는 반드시 false 유지, 배포 체크리스트에 포함 |
| 신청/승인 액션 | Wizard·실증·증적 제출 등이 로컬 state 기반 | 새로고침 시 초기화, 실제 저장 없음 | 각 플랫폼 API(PORTAL-* 연계 후보) 연동 시 mutation으로 교체 |
| 검색 권한 선필터 | 클라이언트 측 mock 필터링 | 실제 OpenSearch 연동 시 서버 측 필터 필요 | Backend 검색 프록시에 역할 기반 필터 추가 |
| E2E 테스트 | `yarn test:e2e` 스펙 미작성 | 시나리오 자동화 미비 | 후속 단계에서 playwright.config 기반 역할별 시나리오 스펙 추가 |
| 레거시 캡처 captureId | 레거시 18종의 data-capture-id는 라우트에서 유추 | 프론트엔드 실제 값과 다류 수 있음 | 첫 실행 결과 보고 후 LEGACY_CAPTURES 매핑 보정 |

### 35단계에서 해결된 기존 부채

- 권한 판정 3중 분산(Firebase 이메일/sessionStorage 2종): `authz/` 모듈로 단일화, `isPreviewAdmin` 4중 중복 제거
- `/admin-console` 직접 URL 접근 가능: `PermissionGuard` 라우트 가드로 차단
- K-RMF 메뉴/화면 일반 사용자 노출: `krmf.view` 권한 기반 메뉴/라우트/대시보드 카드 게이트
- `config.d.ts` `adminEmails` 스키마 누락: 추가 완료
- `docs/assets/final` 캡처 18개 로그인 화면 문제: 캡처 스크립트 DOM 검증/역할 전환으로 재생성
- 캡처 스크립트 절대경로 require/접근코드 하드코딩: createRequire + 환경변수 필수화로 제거
- "@material-ui/lab", "@backstage/core-app-api" 미선언 import: package.json 의존성 선언 추가
- "실제 저장되지 않습니다" 등 화면 고지 문구: 제거 완료


## 18. 33.2단계 추가 기술부채

| 구분 | 이슈 | 영향 | 조치 계획 |
|------|------|------|-----------|
| SidebarPage padding 우회 | core-components가 sidebarOptions의 폭을 본문 padding에 반영하지 못해 `SidebarWidthStyle`로 style 주입 우회 | Backstage 업그레이드 시 동작 재확인 필요 | 업그레이드 시 공식 지원 여부 확인 후 제거 |
| ~~firebase CLI 계정~~ | ~~CLI가 다른 계정으로 로그인되어 배포 불가~~ | **해결됨 (2026-07-30, 사용자가 kyubeom@gmail.com으로 재로그인 확인)** | - |
| 메뉴 라벨 2줄 wrap | 248px에서도 긴 메뉴염은 2줄로 표시됨 | 말줄임보다는 낫지만 높이가 늘어남 | 필요 시 폰트 12px 또는 폭 260px 조정 검토 |
