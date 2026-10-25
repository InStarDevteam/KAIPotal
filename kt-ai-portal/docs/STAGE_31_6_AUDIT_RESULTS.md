# 31.6단계 전수검증 결과

- 검증일: 2026-07-30T05:10:32.498Z
- 대상 사이트: https://kai-platform-d0ae0.web.app
- Access Code: ictway

## 1. 일반 사용자 라우트 검증
| Route | 화멪 | 진입 | 콘솔오류 | 네트워크오류 | 부적합문구 | 조치사항 |
| --- | --- | --- | --- | --- | --- | --- |
| / | 통합 대시보드 | 정상 | 없음 | 없음 | 없음 | - |
| /admin-console | 관리자 콘솔 | 정상 | 없음 | 없음 | 없음 | 사용자 등록 신청: tab not found<br>사용자 관리: tab not found<br>외부 사용자 관리: tab not found<br>권한/역할: tab not found<br>로그인 정책: tab not found<br>비밀번호 정책: tab not found<br>감사 로그: tab not found<br>메뉴 관리: tab not found<br>요구사항 현황: tab not found |
| /krmf-evidence | K-RMF 증빙관리 | 정상 | 없음 | 없음 | 없음 | - |
| /service-catalog | 서비스/도구 카탈로그 | 정상 | 없음 | 없음 | 없음 | - |
| /export-approval | 반입·반출 승인 | 정상 | 없음 | 없음 | 없음 | - |
| /integrated-search | 통합검색 | 정상 | 없음 | 없음 | 없음 | - |
| /project-workspace | 프로젝트/워크스페이스 | 정상 | 없음 | 없음 | 없음 | 프로젝트 생성 신청: tab not found |
| /credit-manager | 크레딧 관리 | 정상 | 없음 | 없음 | 없음 | - |
| /my-page | 마이페이지 | 정상 | 없음 | 없음 | 없음 | - |
| /environment-settings | 환경설정 | 정상 | 없음 | 없음 | 없음 | - |
| /tenant-management | 육해공군 관리 | 정상 | 없음 | 없음 | 없음 | - |
| /proposal-board | 제안 게시판 | 정상 | 없음 | 없음 | 없음 | - |

## 2. 관리자 전용 URL 직접 접근 (일반 사용자)
| Route | 화멪 | 결과 | 콘솔오류 | 네트워크오류 | 부적합문구 |
| --- | --- | --- | --- | --- | --- |
| /requirement-coverage | 요구사항 대응현황 | 기타 | 없음 | 없음 | 없음 |
| /requirement-progress | 요구사항 대응현황 별칭 | 기타 | 없음 | 없음 | 없음 |
| /platform-api-integration | 플랫폼 API 연계현황 | 기타 | 없음 | 없음 | 없음 |
| /workflow-scenarios | 업무흐름/연계 시나리오 | 기타 | 없음 | 없음 | 없음 |

## 3. 관리자 권한 라우트 검증
| Route | 화멪 | 진입 | 탭동작 | 버튼CSV | 콘솔오류 | 네트워크오류 | 부적합문구 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| /requirement-coverage | 요구사항 대응현황 | 정상 | 메뉴 대응현황(ok)<br>SFR 대응현황(ok)<br>기능 대응현황(ok)<br>변경이력(ok)<br>질의사항(ok) | 메뉴 현황 CSV(clicked (download started))<br>기능 현황 CSV(clicked (download started)) | 없음 | 없음 | 없음 |
| /requirement-progress | 요구사항 대응현황 별칭 | 정상 | 메뉴 대응현황(tab not found)<br>SFR 대응현황(tab not found)<br>기능 대응현황(tab not found)<br>변경이력(ok)<br>질의사항(ok) | 메뉴 현황 CSV(not found)<br>기능 현황 CSV(not found) | 없음 | 없음 | 없음 |
| /platform-api-integration | 플랫폼 API 연계현황 | 정상 |  | CSV 다운로드(clicked (download started)) | 없음 | 없음 | 없음 |
| /workflow-scenarios | 업무흐름/연계 시나리오 | 정상 | 포털 역할 요약(ok)<br>사용자 여정(ok)<br>업무흐름 시나리오(ok) | 요구사항 대응현황 보기(clicked)<br>API 연계현황 보기(not found) | 없음 | 없음 | 없음 |

## 4. 상세 로그
```json
{
  "guestResults": [
    {
      "mode": "guest",
      "route": "/",
      "name": "통합 대시보드",
      "title": "국방지능형플랫폼포털",
      "menuVisible": true,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [],
      "buttonResults": [],
      "snippet": "통합 대시보드 통합검색 서비스/도구 카탈로그 프로젝트/워크스페이스 크레딧 관리 반입·반출 승인 마이페이지 제안 게시판 현재 역할 일반 사용자 역할 미리보기 (현재: 일반 사용자) 일반 사용자 ​ 플랫폼 이용 단계 1 체계접속 2 인증·권한 3 자산탐색 4 프로젝트개설 5 작업환경생성 6 자원사용관리 7 성과반출 8 운영·보안감사 국방지능형플랫폼포털 K-De"
    },
    {
      "mode": "guest",
      "route": "/admin-console",
      "name": "관리자 콘솔",
      "title": "국방지능형플랫폼포털",
      "menuVisible": false,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [
        {
          "tab": "사용자 등록 신청",
          "status": "tab not found"
        },
        {
          "tab": "사용자 관리",
          "status": "tab not found"
        },
        {
          "tab": "외부 사용자 관리",
          "status": "tab not found"
        },
        {
          "tab": "권한/역할",
          "status": "tab not found"
        },
        {
          "tab": "로그인 정책",
          "status": "tab not found"
        },
        {
          "tab": "비밀번호 정책",
          "status": "tab not found"
        },
        {
          "tab": "감사 로그",
          "status": "tab not found"
        },
        {
          "tab": "메뉴 관리",
          "status": "tab not found"
        },
        {
          "tab": "요구사항 현황",
          "status": "tab not found"
        }
      ],
      "buttonResults": [],
      "snippet": "통합 대시보드 통합검색 서비스/도구 카탈로그 프로젝트/워크스페이스 크레딧 관리 반입·반출 승인 마이페이지 제안 게시판 현재 역할 일반 사용자 역할 미리보기 (현재: 일반 사용자) 일반 사용자 ​ 플랫폼 이용 단계 1 체계접속 2 인증·권한 3 자산탐색 4 프로젝트개설 5 작업환경생성 6 자원사용관리 7 성과반출 8 운영·보안감사 접근 권한이 필요합니다 현재"
    },
    {
      "mode": "guest",
      "route": "/krmf-evidence",
      "name": "K-RMF 증빙관리",
      "title": "국방지능형플랫폼포털",
      "menuVisible": false,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [],
      "buttonResults": [],
      "snippet": "통합 대시보드 통합검색 서비스/도구 카탈로그 프로젝트/워크스페이스 크레딧 관리 반입·반출 승인 마이페이지 제안 게시판 현재 역할 일반 사용자 역할 미리보기 (현재: 일반 사용자) 일반 사용자 ​ 플랫폼 이용 단계 1 체계접속 2 인증·권한 3 자산탐색 4 프로젝트개설 5 작업환경생성 6 자원사용관리 7 성과반출 8 운영·보안감사 접근 권한이 필요합니다 현재"
    },
    {
      "mode": "guest",
      "route": "/service-catalog",
      "name": "서비스/도구 카탈로그",
      "title": "국방지능형플랫폼포털",
      "menuVisible": true,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [],
      "buttonResults": [],
      "snippet": "통합 대시보드 통합검색 서비스/도구 카탈로그 프로젝트/워크스페이스 크레딧 관리 반입·반출 승인 마이페이지 제안 게시판 현재 역할 일반 사용자 역할 미리보기 (현재: 일반 사용자) 일반 사용자 ​ 플랫폼 이용 단계 1 체계접속 2 인증·권한 3 자산탐색 4 프로젝트개설 5 작업환경생성 6 자원사용관리 7 성과반출 8 운영·보안감사 서비스/도구 카탈로그 분석/"
    },
    {
      "mode": "guest",
      "route": "/export-approval",
      "name": "반입·반출 승인",
      "title": "국방지능형플랫폼포털",
      "menuVisible": true,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [
        {
          "tab": "신청 목록",
          "status": "ok"
        },
        {
          "tab": "신청 등록",
          "status": "ok"
        }
      ],
      "buttonResults": [],
      "snippet": "통합 대시보드 통합검색 서비스/도구 카탈로그 프로젝트/워크스페이스 크레딧 관리 반입·반출 승인 마이페이지 제안 게시판 현재 역할 일반 사용자 역할 미리보기 (현재: 일반 사용자) 일반 사용자 ​ 플랫폼 이용 단계 1 체계접속 2 인증·권한 3 자산탐색 4 프로젝트개설 5 작업환경생성 6 자원사용관리 7 성과반출 8 운영·보안감사 반입·반출 승인 반입·반출 "
    },
    {
      "mode": "guest",
      "route": "/integrated-search",
      "name": "통합검색",
      "title": "국방지능형플랫폼포털",
      "menuVisible": true,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [],
      "buttonResults": [],
      "snippet": "통합 대시보드 통합검색 서비스/도구 카탈로그 프로젝트/워크스페이스 크레딧 관리 반입·반출 승인 마이페이지 제안 게시판 현재 역할 일반 사용자 역할 미리보기 (현재: 일반 사용자) 일반 사용자 ​ 플랫폼 이용 단계 1 체계접속 2 인증·권한 3 자산탐색 4 프로젝트개설 5 작업환경생성 6 자원사용관리 7 성과반출 8 운영·보안감사 통합검색 통합검색은 각 플랫"
    },
    {
      "mode": "guest",
      "route": "/project-workspace",
      "name": "프로젝트/워크스페이스",
      "title": "국방지능형플랫폼포털",
      "menuVisible": true,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [
        {
          "tab": "프로젝트 목록",
          "status": "ok"
        },
        {
          "tab": "프로젝트 생성 신청",
          "status": "tab not found"
        }
      ],
      "buttonResults": [],
      "snippet": "통합 대시보드 통합검색 서비스/도구 카탈로그 프로젝트/워크스페이스 크레딧 관리 반입·반출 승인 마이페이지 제안 게시판 현재 역할 일반 사용자 역할 미리보기 (현재: 일반 사용자) 일반 사용자 ​ 플랫폼 이용 단계 1 체계접속 2 인증·권한 3 자산탐색 4 프로젝트개설 5 작업환경생성 6 자원사용관리 7 성과반출 8 운영·보안감사 프로젝트/워크스페이스 프로젝"
    },
    {
      "mode": "guest",
      "route": "/credit-manager",
      "name": "크레딧 관리",
      "title": "국방지능형플랫폼포털",
      "menuVisible": true,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [],
      "buttonResults": [],
      "snippet": "통합 대시보드 통합검색 서비스/도구 카탈로그 프로젝트/워크스페이스 크레딧 관리 반입·반출 승인 마이페이지 제안 게시판 현재 역할 일반 사용자 역할 미리보기 (현재: 일반 사용자) 일반 사용자 ​ 플랫폼 이용 단계 1 체계접속 2 인증·권한 3 자산탐색 4 프로젝트개설 5 작업환경생성 6 자원사용관리 7 성과반출 8 운영·보안감사 크레딧 관리 프로젝트별 크레"
    },
    {
      "mode": "guest",
      "route": "/my-page",
      "name": "마이페이지",
      "title": "국방지능형플랫폼포털",
      "menuVisible": true,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [],
      "buttonResults": [],
      "snippet": "통합 대시보드 통합검색 서비스/도구 카탈로그 프로젝트/워크스페이스 크레딧 관리 반입·반출 승인 마이페이지 제안 게시판 현재 역할 일반 사용자 역할 미리보기 (현재: 일반 사용자) 일반 사용자 ​ 마이페이지 계정 정보, 이메일, 비밀번호, 활성 세션, 내 프로젝트/워크스페이스, 실증 프로젝트, 보안 과제, 자원 사용 이력, 크레딧 사용 내역, 알림, 개인 A"
    },
    {
      "mode": "guest",
      "route": "/environment-settings",
      "name": "환경설정",
      "title": "국방지능형플랫폼포털",
      "menuVisible": true,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [],
      "buttonResults": [],
      "snippet": "통합 대시보드 통합검색 서비스/도구 카탈로그 프로젝트/워크스페이스 크레딧 관리 반입·반출 승인 마이페이지 제안 게시판 현재 역할 일반 사용자 역할 미리보기 (현재: 일반 사용자) 일반 사용자 ​ 플랫폼 이용 단계 1 체계접속 2 인증·권한 3 자산탐색 4 프로젝트개설 5 작업환경생성 6 자원사용관리 7 성과반출 8 운영·보안감사 접근 권한이 필요합니다 현재"
    },
    {
      "mode": "guest",
      "route": "/tenant-management",
      "name": "육해공군 관리",
      "title": "국방지능형플랫폼포털",
      "menuVisible": false,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [],
      "buttonResults": [],
      "snippet": "통합 대시보드 통합검색 서비스/도구 카탈로그 프로젝트/워크스페이스 크레딧 관리 반입·반출 승인 마이페이지 제안 게시판 현재 역할 일반 사용자 역할 미리보기 (현재: 일반 사용자) 일반 사용자 ​ 플랫폼 이용 단계 1 체계접속 2 인증·권한 3 자산탐색 4 프로젝트개설 5 작업환경생성 6 자원사용관리 7 성과반출 8 운영·보안감사 접근 권한이 필요합니다 현재"
    },
    {
      "mode": "guest",
      "route": "/proposal-board",
      "name": "제안 게시판",
      "title": "국방지능형플랫폼포털",
      "menuVisible": true,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [
        {
          "tab": "전체 제안",
          "status": "ok"
        },
        {
          "tab": "AI 모델 개발",
          "status": "ok"
        },
        {
          "tab": "빅데이터 분석",
          "status": "ok"
        },
        {
          "tab": "데이터셋 구축",
          "status": "ok"
        },
        {
          "tab": "내 제안",
          "status": "ok"
        },
        {
          "tab": "관리자 검토",
          "status": "ok"
        },
        {
          "tab": "요구사항 대응 현황",
          "status": "ok"
        }
      ],
      "buttonResults": [],
      "snippet": "통합 대시보드 통합검색 서비스/도구 카탈로그 프로젝트/워크스페이스 크레딧 관리 반입·반출 승인 마이페이지 제안 게시판 현재 역할 일반 사용자 역할 미리보기 (현재: 일반 사용자) 일반 사용자 ​ 플랫폼 이용 단계 1 체계접속 2 인증·권한 3 자산탐색 4 프로젝트개설 5 작업환경생성 6 자원사용관리 7 성과반출 8 운영·보안감사 제안 게시판 AI 모델 개발"
    }
  ],
  "adminDirectAsGuest": [
    {
      "mode": "guest-direct-admin",
      "route": "/requirement-coverage",
      "name": "요구사항 대응현황",
      "title": "국방지능형플랫폼포털",
      "menuVisible": false,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [],
      "buttonResults": [],
      "snippet": "통합 대시보드 통합검색 서비스/도구 카탈로그 프로젝트/워크스페이스 크레딧 관리 반입·반출 승인 마이페이지 제안 게시판 현재 역할 일반 사용자 역할 미리보기 (현재: 일반 사용자) 일반 사용자 ​ 플랫폼 이용 단계 1 체계접속 2 인증·권한 3 자산탐색 4 프로젝트개설 5 작업환경생성 6 자원사용관리 7 성과반출 8 운영·보안감사 접근 권한이 필요합니다 현재"
    },
    {
      "mode": "guest-direct-admin",
      "route": "/requirement-progress",
      "name": "요구사항 대응현황 별칭",
      "title": "국방지능형플랫폼포털",
      "menuVisible": false,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [],
      "buttonResults": [],
      "snippet": "통합 대시보드 통합검색 서비스/도구 카탈로그 프로젝트/워크스페이스 크레딧 관리 반입·반출 승인 마이페이지 제안 게시판 현재 역할 일반 사용자 역할 미리보기 (현재: 일반 사용자) 일반 사용자 ​ 접근 권한이 필요합니다 현재 역할: 일반 사용자 필요 권한: 요구사항 현황 조회 필요한 권한은 관리자에게 문의하세요. 통합 대시보드로 이동"
    },
    {
      "mode": "guest-direct-admin",
      "route": "/platform-api-integration",
      "name": "플랫폼 API 연계현황",
      "title": "국방지능형플랫폼포털",
      "menuVisible": false,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [],
      "buttonResults": [],
      "snippet": "통합 대시보드 통합검색 서비스/도구 카탈로그 프로젝트/워크스페이스 크레딧 관리 반입·반출 승인 마이페이지 제안 게시판 현재 역할 일반 사용자 역할 미리보기 (현재: 일반 사용자) 일반 사용자 ​ 플랫폼 이용 단계 1 체계접속 2 인증·권한 3 자산탐색 4 프로젝트개설 5 작업환경생성 6 자원사용관리 7 성과반출 8 운영·보안감사 접근 권한이 필요합니다 현재"
    },
    {
      "mode": "guest-direct-admin",
      "route": "/workflow-scenarios",
      "name": "업무흐름/연계 시나리오",
      "title": "국방지능형플랫폼포털",
      "menuVisible": false,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [],
      "buttonResults": [],
      "snippet": "통합 대시보드 통합검색 서비스/도구 카탈로그 프로젝트/워크스페이스 크레딧 관리 반입·반출 승인 마이페이지 제안 게시판 현재 역할 일반 사용자 역할 미리보기 (현재: 일반 사용자) 일반 사용자 ​ 플랫폼 이용 단계 1 체계접속 2 인증·권한 3 자산탐색 4 프로젝트개설 5 작업환경생성 6 자원사용관리 7 성과반출 8 운영·보안감사 접근 권한이 필요합니다 현재"
    }
  ],
  "adminResults": [
    {
      "mode": "admin",
      "route": "/requirement-coverage",
      "name": "요구사항 대응현황",
      "title": "국방지능형플랫폼포털",
      "menuVisible": true,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [
        {
          "tab": "메뉴 대응현황",
          "status": "ok"
        },
        {
          "tab": "SFR 대응현황",
          "status": "ok"
        },
        {
          "tab": "기능 대응현황",
          "status": "ok"
        },
        {
          "tab": "변경이력",
          "status": "ok"
        },
        {
          "tab": "질의사항",
          "status": "ok"
        }
      ],
      "buttonResults": [
        {
          "button": "메뉴 현황 CSV",
          "status": "clicked (download started)"
        },
        {
          "button": "기능 현황 CSV",
          "status": "clicked (download started)"
        }
      ],
      "snippet": "통합 대시보드 통합검색 서비스/도구 카탈로그 프로젝트/워크스페이스 크레딧 관리 반입·반출 승인 마이페이지 환경설정 육해공군 관리 제안 게시판 관리자 콘솔 권한별 메뉴 미리보기 K-RMF 이행·증적관리 현재 역할 포털 관리자 역할 미리보기 (현재: 포털 관리자) 포털 관리자 ​ 플랫폼 이용 단계 1 체계접속 2 인증·권한 3 자산탐색 4 프로젝트개설 5 작업"
    },
    {
      "mode": "admin",
      "route": "/requirement-progress",
      "name": "요구사항 대응현황 별칭",
      "title": "국방지능형플랫폼포털",
      "menuVisible": false,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [
        {
          "tab": "메뉴 대응현황",
          "status": "tab not found"
        },
        {
          "tab": "SFR 대응현황",
          "status": "tab not found"
        },
        {
          "tab": "기능 대응현황",
          "status": "tab not found"
        },
        {
          "tab": "변경이력",
          "status": "ok"
        },
        {
          "tab": "질의사항",
          "status": "ok"
        }
      ],
      "buttonResults": [
        {
          "button": "메뉴 현황 CSV",
          "status": "not found"
        },
        {
          "button": "기능 현황 CSV",
          "status": "not found"
        }
      ],
      "snippet": "통합 대시보드 통합검색 서비스/도구 카탈로그 프로젝트/워크스페이스 크레딧 관리 반입·반출 승인 마이페이지 환경설정 육해공군 관리 제안 게시판 관리자 콘솔 권한별 메뉴 미리보기 K-RMF 이행·증적관리 현재 역할 포털 관리자 역할 미리보기 (현재: 포털 관리자) 포털 관리자 ​ 요구사항 진도표 기준 문서: 최종공고문 260723_v1 / 전체 요구사항 166"
    },
    {
      "mode": "admin",
      "route": "/platform-api-integration",
      "name": "플랫폼 API 연계현황",
      "title": "국방지능형플랫폼포털",
      "menuVisible": true,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [],
      "buttonResults": [
        {
          "button": "CSV 다운로드",
          "status": "clicked (download started)"
        }
      ],
      "snippet": "통합 대시보드 통합검색 서비스/도구 카탈로그 프로젝트/워크스페이스 크레딧 관리 반입·반출 승인 마이페이지 환경설정 육해공군 관리 제안 게시판 관리자 콘솔 권한별 메뉴 미리보기 K-RMF 이행·증적관리 현재 역할 포털 관리자 역할 미리보기 (현재: 포털 관리자) 포털 관리자 ​ 플랫폼 이용 단계 1 체계접속 2 인증·권한 3 자산탐색 4 프로젝트개설 5 작업"
    },
    {
      "mode": "admin",
      "route": "/workflow-scenarios",
      "name": "업무흐름/연계 시나리오",
      "title": "국방지능형플랫폼포털",
      "menuVisible": true,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [
        {
          "tab": "포털 역할 요약",
          "status": "ok"
        },
        {
          "tab": "사용자 여정",
          "status": "ok"
        },
        {
          "tab": "업무흐름 시나리오",
          "status": "ok"
        }
      ],
      "buttonResults": [
        {
          "button": "요구사항 대응현황 보기",
          "status": "clicked"
        },
        {
          "button": "API 연계현황 보기",
          "status": "not found"
        }
      ],
      "snippet": "통합 대시보드 통합검색 서비스/도구 카탈로그 프로젝트/워크스페이스 크레딧 관리 반입·반출 승인 마이페이지 환경설정 육해공군 관리 제안 게시판 관리자 콘솔 권한별 메뉴 미리보기 K-RMF 이행·증적관리 현재 역할 포털 관리자 역할 미리보기 (현재: 포털 관리자) 포털 관리자 ​ 플랫폼 이용 단계 1 체계접속 2 인증·권한 3 자산탐색 4 프로젝트개설 5 작업"
    }
  ]
}
```