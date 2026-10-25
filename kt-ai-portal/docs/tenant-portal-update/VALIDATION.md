# 검증 결과 — 2026-09-18

| 검사 | 결과 | 범위 |
| --- | --- | --- |
| TypeScript `yarn tsc --noEmit` | 통과 | 프런트엔드·백엔드 |
| 프런트엔드 테스트 | 10 suites / 58 tests 통과 | 군별 설정·저장 충돌·권한·이력 조회·내보내기 취소 및 기존 회귀 |
| 실제 PostgreSQL API/RLS 검증 | 41 checks 통과 | 일회성 DB, 제한된 런타임 역할, 교차 군 차단, 동시 저장, 감사 원장·롤백, 10,000/10,001건 내보내기 경계 |
| 브라우저 검증 | 15 scenarios 통과 | 로컬 데모 빌드, 저장·새로고침·군 변경·역할 분리·요구사항 문구 제거·숨김 경로·CSV·390/768/1440px 화면 |
| 프런트엔드 빌드 | 통과 | `app-config.yaml` + 로컬 검증용 명시적 demo/capture 설정 |
| 프런트엔드 lint | 오류 0 | 기존 React default import 경고 28개 유지 |
| 백엔드 lint | 통과 | 오류·경고 0 |
| `git diff --check` | 통과 | 공백 오류 없음 |

브라우저는 색상 변경의 실제 적용, 군별 설정 지속성, 동일 군 사용자 간 공유, 다른 군의 설정 격리, 직접 URL 숨김 메뉴 차단, 일반 사용자의 설정/이력 접근 차단을 확인했다. 입력칸 높이 회귀검사와 캡처 검토를 포함한다.

서버 검증은 실제 PostgreSQL에서 실행했으며 외부 인증 제공자 토큰 검증 부분은 시험용 인증 어댑터를 사용한다. 실제 Keycloak/Firebase 이벤트 수집 또는 운영 환경 배포 검증으로 해석하지 않는다. 업무 DB와 외부 배포는 변경하지 않았다.

근거:

- `evidence/runtime-tests.txt`
- `evidence/browser-report.json`
- `evidence/army-settings.png`
- `evidence/tenant-settings-mobile.png`
- `evidence/audit-history.png`
- `evidence/audit-history-mobile.png`

변경 범위와 운영 전제는 `IMPLEMENTATION.md`를 참고한다.
