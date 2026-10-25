# 검증 결과 — 2026-09-24

로컬 개발 결과이며 실제 플랫폼 운영 환경에 배포하지 않았다. 아래 수치는 이번 변경 이후 실제 실행한 결과다.

| 검증 | 결과 | 확인 범위 |
| --- | --- | --- |
| 전체 TypeScript | 통과 | `yarn tsc --noEmit`, 앱·서버 전체 |
| 프런트엔드 테스트 | **16 suites / 84 tests 통과** | 기존 권한·검색·감사·설정 회귀, 플랫폼 정책·개인화·늦은 응답 차단, API 계약, 제안 저장·수정·댓글·삭제, 7단계 작업환경 신청·승인·복원 |
| 백엔드 테스트 | **2 suites / 20 tests 통과** | 플랫폼 정책 9건, 실제 진단 서비스 11건(HTTP 어댑터 모의), 테넌트 경로·쿼리 검증·타임아웃·리다이렉트·응답 제한 |
| 실제 PostgreSQL API/RLS | **48 checks 통과** | 일회성 DB·제한된 런타임 계정, 소속/권한·테넌트 격리·감사 롤백·설정 동시성, 플랫폼 접근 회수·개인 설정 분리·관리자 지정 |
| 포털 경험 브라우저 | **16 scenarios 통과** | 잘못된 로그인 거부, 4개 시안 입장/복원, 사이드바 숨김, 앱 런처·내부 메뉴, 개인 순서/즐겨찾기, 무권한 직접 URL 차단, API 계약·내보내기, 관리자 지정, 해병대·플랫폼 중지 격리, 주요 13개 기존 화면의 탭·요구사항 ID 제거, 로그아웃 |
| 군별 설정·감사 브라우저 | **15 scenarios 통과** | 테마 저장·복원·테넌트 격리·동시성 안내·메뉴 숨김 직접 경로 차단·CSV·역할 분리·반응형 |
| 개발 콘솔 브라우저 | **8 checks 통과** | API 40개 보존, 샘플 정상·문법 오류·응답 필드 누락, 이력 복원/CSV, 명세 JSON, VDI 2개, 390px 가로 넘침 없음 |
| 앱 프로덕션 번들 빌드 | 통과 | `app-config.yaml` + 명시적 `app-config.design-review.yaml` |
| 앱 lint | **오류 0**, 경고 24 | 기존 스타일의 React default import 경고가 남음 |
| 백엔드 lint | **오류 0 / 경고 0** | 전체 backend 패키지 |
| `git diff --check` | 통과 | 공백 오류 없음 |

홈 4종과 개발 콘솔을 390/768/1440px에서 검사했다. 로그인·홈·앱 런처의 실제 브라우저 화면을 캡처해 시각 검토했다. 각 브라우저 검증에서 JavaScript 런타임 예외가 없었다.

## 재현 명령

저장소 루트에서 브라우저 검증은 로컬 설계검토 서버를 실행한 뒤 수행한다.

```sh
node scripts/test-portal-experience.mjs
node scripts/test-tenant-portal-ui.mjs
node scripts/test-developer-console-ui.mjs
node scripts/capture-portal-designs.mjs
```

`test-tenant-portal-ui.mjs`는 자체 임시 정적 서버를 띄운다. 다른 스크립트는 http://localhost:3000의 검토 빌드를 사용한다.

앱 디렉터리 `backstage-portal`에서:

```sh
node .yarn/releases/yarn-4.13.0.cjs tsc --noEmit
CI=1 node .yarn/releases/yarn-4.13.0.cjs workspace app test --watch=false --runInBand
CI=1 node .yarn/releases/yarn-4.13.0.cjs workspace backend test --watch=false --runInBand
node .yarn/releases/yarn-4.13.0.cjs workspace app lint
node .yarn/releases/yarn-4.13.0.cjs workspace backend lint
```

PostgreSQL 통합 검증은 저장소 루트의 `node scripts/test-portal-runtime.mjs`다. 로컬 127.0.0.1:5432 전용 시험 계정·서버가 필요하며 스크립트가 임시 DB와 제한 역할을 만들고 정리한다. 운영/공유 업무 DB를 대상으로 실행하지 않는다. 이번 실행에서 48건 통과와 exit code 0을 확인했으며 별도의 raw 출력 파일은 저장하지 않았다. 이전 폴더의 41건 로그를 이번 근거로 재사용하지 않는다.

## 증적

- [프런트 테스트 출력](evidence/frontend-tests.txt), [백엔드 테스트 출력](evidence/backend-tests.txt)
- [포털 브라우저 검사](evidence/experience-report.json), [개발 콘솔 검사](evidence/developer-console-checks.json), [군별 설정 브라우저 출력](evidence/tenant-browser.txt)
- [프런트 lint](evidence/frontend-lint.txt), [백엔드 lint](evidence/backend-lint.txt)
- [디자인 갤러리](DESIGN_REVIEW.html), [개발 관리자 테스트 화면](evidence/developer-console-test.png)

## 실환경에서 추가 검증할 항목

1. 기관 OIDC/MFA, 단말 보안/접속망 정책, 인증 만료/철회·재인증, 플랫폼 SSO. 접근코드 테스트는 실제 제로트러스트 검증이 아니다.
2. 각 플랫폼의 실제 API URL·토큰·확정된 계약. 서버 진단은 테스트 어댑터로 검증했고 외부 실플랫폼 응답을 검증한 것은 아니다.
3. 운영 DB 신규 마이그레이션, 실제 사용자의 소속·역할 데이터, 네트워크 egress/TLS 정책.
4. 기존 예시/메모리 업무의 서버 영속화·다중 사용자 공유. 개선한 제안·작업환경 신청도 현재는 명시적인 데모 모드의 브라우저 저장이며 실제 플랫폼 자원 생성이 아니다.

남은 작업은 [Kimi Code 프롬프트](KIMI_FOLLOWUP_PROMPT.md)에 완료 조건과 함께 정리했다.
