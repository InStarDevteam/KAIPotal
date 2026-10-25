# 플랫폼 연계 개발 콘솔

`/developer-console`과 기존 `/platform-api-integration`에서 같은 화면을 사용한다. 기존 38개 연계 항목(인증, 워크스페이스, 카탈로그, 크레딧, 실증, 반출, K-RMF 등)을 유지하고 VDI 데스크톱·세션 조회 협의안 2개를 추가했다. 기존 문서의 계약 후보이며 실제 플랫폼 API 명세로 확정된 목록이 아니다. 화면과 내보내기에 요구사항 식별자를 노출하지 않는다.

## 동작

- 플랫폼별 관계와 책임 경계, 검색/필터, API 상세(요청·응답·인증·보안·오류·감사·협의사항)를 제공한다.
- 샘플 계약 검증은 브라우저에서 요청 JSON 필수 필드/타입과 샘플 응답을 검증한다. 정상, 필수 필드 누락, 401, 타임아웃 예시를 제공한다. 샘플 결과에는 외부 접속을 실행하지 않았음을 명시한다.
- 요청·응답 JSON Schema는 기존 필드 목록에 기반한 **초안**이다. 필수 여부, 타입, 배열 항목, 중첩 구조, 상태 코드는 플랫폼 담당자와 합의해야 한다.
- 실연동 테스트는 서버 등록 목적지만 GET으로 호출한다. 실제 응답을 수신한 사실과 초안 스키마 적합 여부를 나누어 처리한다. 응답 원문을 브라우저에 전달하지 않고 값이 제거된 구조를 전달한다.
- 접속 테스트는 등록된 healthPath의 실제 HTTPS 응답을 확인한다. 플랫폼 기능 전체나 SSO 완성을 의미하지 않는다.
- 테스트 요약 이력은 사용자·테넌트별 브라우저 저장소에 최근 40건만 보관한다. 요청/응답 원문은 보관하지 않는다. 실연동 시도와 결과는 서버 감사 원장에도 기록한다.
- 전체/단일 JSON 계약과 테스트 이력 CSV를 내보낼 수 있다.

## 권한과 API

| 경로 | 권한 | 기능 |
| --- | --- | --- |
| `GET /api/portal/v1/integrations/targets` | `integration.view` | 현재 테넌트의 연결 등록 현황 |
| `POST /api/portal/v1/integrations/test` | `settings.manage` | 등록 대상 실제 GET/접속 테스트 |

두 API는 기존 서버 신원 검증, 유효한 테넌트 소속, 권한 검증을 사용한다. 클라이언트가 임의 URL이나 HTTP method, 인증정보를 지정할 수 없다. 현재 테넌트는 서버가 쿼리와 헤더에 주입한다. 실제 테스트는 사용자/테넌트당 동시에 1건만 허용한다(서버 프로세스 단위).

## 실연동 등록

배포 담당자가 서버 환경 변수 `PORTAL_INTEGRATION_TARGETS`에 JSON을 등록한다. 최상위 키는 실제 포털 테넌트 UUID다. 플랫폼 ID는 `ai`, `data`, `cloud`, `vdi`, `identity`, `security`, `portal`, `external`이다. 아래 주소는 설명용이며 실행 중인 시스템 주소가 아니다.

```json
{
  "00000000-0000-4000-8000-000000000001": {
    "ai": {
      "baseUrl": "https://ai.staging.example.invalid",
      "healthPath": "/health",
      "readPaths": ["/api/ai/workspaces", "/api/ai/models", "/api/projects/{projectId}/resource-usage"],
      "tokenEnv": "PORTAL_CONNECTOR_AI_TOKEN"
    }
  }
}
```

`tokenEnv`는 `PORTAL_CONNECTOR_<이름>_TOKEN` 패턴의 서버 환경 변수 이름만 허용한다. 해당 변수 실제 값은 Secret Manager 등 배포 비밀 저장소로 공급한다. 토큰을 JSON에 직접 넣거나 브라우저에 입력하지 않는다. 토큰 미등록 시 요청은 실행되지 않는다. 토큰이 필요 없는 테스트 경로는 `tokenEnv`를 생략할 수 있으나 실제 네트워크/플랫폼 정책을 확인해야 한다.

주소는 HTTPS, 자격증명·query·fragment 없는 고정 URL만 허용한다. 서버의 신뢰 저장소에서 검증되는 TLS 인증서를 사용한다. 리다이렉트 추적을 금지하고 URL 경로는 서버 allowlist와 정확히 일치해야 한다. `{projectId}` 같은 경로 변수는 영문/숫자/밑줄/하이픈만 허용한다. 테넌트 경로 변수는 서버의 현재 테넌트에 고정하며, `tenant_id` 등 별칭 쿼리는 거부한다. 제한 시간 8초, 응답 최대 64KB다. 운영망 egress 정책도 등록 목적지로 제한한다.

실제 API 테스트 입력 예시:

```json
{"platform":"ai","kind":"contract","path":"/api/ai/workspaces","query":"userId=approved-test-user"}
```

접속 테스트 입력 예시:

```json
{"platform":"ai","kind":"connection"}
```

현재 저장소에 실제 외부 플랫폼 주소/자격증명이 제공되지 않았으므로 실플랫폼 연결 성공을 주장하지 않는다. 테스트용 프로필에서는 실제 테스트 버튼을 비활성화하며, 샘플 검증은 동작한다. 승인된 주소와 토큰을 등록한 뒤 운영 인증 환경에서 재검증해야 한다.

## 후속 범위

- 플랫폼 담당자의 OpenAPI/인증 위임/오류/페이지네이션/테넌트 격리 명세를 확보하고 초안 스키마를 확정한다.
- 실플랫폼 staging에서 접속, 응답 구조, 권한 거부, timeout, 파일·이벤트 계약을 검증한다.
- 상세 테스트 이력의 서버 영속 저장과 관리자 조회/보존 정책을 필요에 따라 추가한다. 현재 서버에는 감사 요약만 남는다.
- 쓰기 API 실행은 테스트 환경, 승인, idempotency, rollback 계약이 마련된 후 별도 범위로 추가한다. 현재 기능을 실환경 POST/PUT/DELETE 실행으로 확장하지 않는다.
