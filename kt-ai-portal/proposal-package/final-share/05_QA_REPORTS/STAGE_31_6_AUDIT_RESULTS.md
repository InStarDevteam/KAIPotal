# 31.6단계 전수검증 결과

- 검증일: 2026-07-12T10:38:44.445Z
- 대상 사이트: https://kai-platform-d0ae0.web.app
- Access Code: ictway

## 1. 일반 사용자 라우트 검증
| Route | 화멪 | 진입 | 콘솔오류 | 네트워크오류 | 부적합문구 | 조치사항 |
| --- | --- | --- | --- | --- | --- | --- |
| / | 통합 대시보드 | 정상 | 없음 | 없음 | 없음 | - |
| /admin-console | 관리자 콘솔 | 정상 | 없음 | 없음 | 없음 | - |
| /krmf-evidence | K-RMF 증빙관리 | 정상 | 없음 | 없음 | 없음 | - |
| /service-catalog | 서비스/도구 카탈로그 | 정상 | 없음 | 없음 | 없음 | - |
| /export-approval | 반입·반출 승인 | 정상 | 없음 | 없음 | 없음 | - |
| /integrated-search | 통합검색 | 정상 | 없음 | 없음 | 없음 | - |
| /project-workspace | 프로젝트/워크스페이스 | 정상 | 없음 | 없음 | 없음 | - |
| /credit-manager | 크레딧 관리 | 정상 | 없음 | 없음 | 없음 | - |
| /my-page | 마이페이지 | 정상 | 없음 | 없음 | 없음 | - |
| /environment-settings | 환경설정 | 정상 | 없음 | 없음 | 없음 | - |
| /tenant-management | 육해공군 관리 | 정상 | 없음 | 없음 | 없음 | - |
| /proposal-board | 제안 게시판 | 정상 | 없음 | 없음 | 없음 | - |

## 2. 관리자 전용 URL 직접 접근 (일반 사용자)
| Route | 화멪 | 결과 | 콘솔오류 | 네트워크오류 | 부적합문구 |
| --- | --- | --- | --- | --- | --- |
| /requirement-coverage | 요구사항 대응현황 | 차단 정상 | 없음 | 없음 | 없음 |
| /requirement-progress | 요구사항 대응현황 별칭 | 차단 정상 | 없음 | 없음 | 없음 |
| /platform-api-integration | 플랫폼 API 연계현황 | 차단 정상 | 없음 | 없음 | 없음 |
| /workflow-scenarios | 업무흐름/연계 시나리오 | 차단 정상 | 없음 | 없음 | 없음 |

## 3. 관리자 권한 라우트 검증
| Route | 화멪 | 진입 | 탭동작 | 버튼CSV | 콘솔오류 | 네트워크오류 | 부적합문구 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| /requirement-coverage | 요구사항 대응현황 | 정상 | 메뉴 대응현황(ok)<br>SFR 대응현황(ok)<br>기능 대응현황(ok)<br>변경이력(ok)<br>질의사항(ok) | 메뉴 현황 CSV(clicked (download started))<br>기능 현황 CSV(clicked (download started)) | 없음 | 없음 | 없음 |
| /requirement-progress | 요구사항 대응현황 별칭 | 정상 | 메뉴 대응현황(ok)<br>SFR 대응현황(ok)<br>기능 대응현황(ok)<br>변경이력(ok)<br>질의사항(ok) | 메뉴 현황 CSV(clicked (download started))<br>기능 현황 CSV(clicked (download started)) | 없음 | 없음 | 없음 |
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
      "snippet": "통합 대시보드 K-RMF 증빙관리 서비스/도구 카탈로그 반입·반출 승인 통합검색 프로젝트/워크스페이스 크레딧 관리 마이페이지 환경설정 육해공군 관리 제안 게시판 시연 환경입니다. 현재 데이터는 샘플 데이터이며 실제 운영 시스템과 다를 수 있습니다. 로그아웃 국방지능형플랫폼포털 K-Defense Intelligence Platform 국방 AI 데이터, 모델"
    },
    {
      "mode": "guest",
      "route": "/admin-console",
      "name": "관리자 콘솔",
      "title": "국방지능형플랫폼포털",
      "menuVisible": true,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [
        {
          "tab": "사용자 등록 신청",
          "status": "ok"
        },
        {
          "tab": "사용자 관리",
          "status": "ok"
        },
        {
          "tab": "외부 사용자 관리",
          "status": "ok"
        },
        {
          "tab": "권한/역할",
          "status": "ok"
        },
        {
          "tab": "로그인 정책",
          "status": "ok"
        },
        {
          "tab": "비밀번호 정책",
          "status": "ok"
        },
        {
          "tab": "감사 로그",
          "status": "ok"
        },
        {
          "tab": "메뉴 관리",
          "status": "ok"
        },
        {
          "tab": "요구사항 현황",
          "status": "ok"
        }
      ],
      "buttonResults": [],
      "snippet": "통합 대시보드 K-RMF 증빙관리 서비스/도구 카탈로그 반입·반출 승인 통합검색 프로젝트/워크스페이스 크레딧 관리 마이페이지 환경설정 육해공군 관리 제안 게시판 시연 환경입니다. 현재 데이터는 샘플 데이터이며 실제 운영 시스템과 다를 수 있습니다. 로그아웃 관리자 콘솔 국방지능형플랫폼포털 관리자 허브 — 사용자, 권한, 정책, 메뉴, 감사로그를 관리합니다."
    },
    {
      "mode": "guest",
      "route": "/krmf-evidence",
      "name": "K-RMF 증빙관리",
      "title": "국방지능형플랫폼포털",
      "menuVisible": true,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [],
      "buttonResults": [],
      "snippet": "통합 대시보드 K-RMF 증빙관리 서비스/도구 카탈로그 반입·반출 승인 통합검색 프로젝트/워크스페이스 크레딧 관리 마이페이지 환경설정 육해공군 관리 제안 게시판 시연 환경입니다. 현재 데이터는 샘플 데이터이며 실제 운영 시스템과 다를 수 있습니다. 로그아웃 K-RMF 증빙관리 대시보드 통제항목 증빙자료 미흡사항 타 수행사 자료 전체 통제항목 11 적용 대상"
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
      "snippet": "통합 대시보드 K-RMF 증빙관리 서비스/도구 카탈로그 반입·반출 승인 통합검색 프로젝트/워크스페이스 크레딧 관리 마이페이지 환경설정 육해공군 관리 제안 게시판 시연 환경입니다. 현재 데이터는 샘플 데이터이며 실제 운영 시스템과 다를 수 있습니다. 로그아웃 서비스/도구 카탈로그 분석/개발/데이터/시각화/라벨링 도구를 선택하고 워크스페이스에 적용할 수 있습니"
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
      "snippet": "통합 대시보드 K-RMF 증빙관리 서비스/도구 카탈로그 반입·반출 승인 통합검색 프로젝트/워크스페이스 크레딧 관리 마이페이지 환경설정 육해공군 관리 제안 게시판 시연 환경입니다. 현재 데이터는 샘플 데이터이며 실제 운영 시스템과 다를 수 있습니다. 로그아웃 반입·반출 승인 반입·반출 승인 관리 신청 목록 신청 등록 ID 구분 대상 유형 대상명 신청자 소속 "
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
      "snippet": "통합 대시보드 K-RMF 증빙관리 서비스/도구 카탈로그 반입·반출 승인 통합검색 프로젝트/워크스페이스 크레딧 관리 마이페이지 환경설정 육해공군 관리 제안 게시판 시연 환경입니다. 현재 데이터는 샘플 데이터이며 실제 운영 시스템과 다를 수 있습니다. 로그아웃 통합검색 검색 대상 유형 전체 보안등급 전체 소스 시스템 전체 태그 전체 데이터셋 육군 장비 정비이력"
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
          "status": "ok"
        }
      ],
      "buttonResults": [],
      "snippet": "통합 대시보드 K-RMF 증빙관리 서비스/도구 카탈로그 반입·반출 승인 통합검색 프로젝트/워크스페이스 크레딧 관리 마이페이지 환경설정 육해공군 관리 제안 게시판 시연 환경입니다. 현재 데이터는 샘플 데이터이며 실제 운영 시스템과 다를 수 있습니다. 로그아웃 프로젝트/워크스페이스 프로젝트/워크스페이스 관리 프로젝트 목록 프로젝트 생성 신청 ID 프로젝트명 상"
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
      "snippet": "통합 대시보드 K-RMF 증빙관리 서비스/도구 카탈로그 반입·반출 승인 통합검색 프로젝트/워크스페이스 크레딧 관리 마이페이지 환경설정 육해공군 관리 제안 게시판 시연 환경입니다. 현재 데이터는 샘플 데이터이며 실제 운영 시스템과 다를 수 있습니다. 로그아웃 크레딧 관리 프로젝트별 크레딧 관리 총 부여 크레딧 440,000 총 사용 크레딧 374,500 총 "
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
      "snippet": "통합 대시보드 K-RMF 증빙관리 서비스/도구 카탈로그 반입·반출 승인 통합검색 프로젝트/워크스페이스 크레딧 관리 마이페이지 환경설정 육해공군 관리 제안 게시판 시연 환경입니다. 현재 데이터는 샘플 데이터이며 실제 운영 시스템과 다를 수 있습니다. 로그아웃 마이페이지 김국방님의 계정, 세션, 프로젝트, 자원, 알림, API Key, 활동 이력을 관리할 수 "
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
      "snippet": "통합 대시보드 K-RMF 증빙관리 서비스/도구 카탈로그 반입·반출 승인 통합검색 프로젝트/워크스페이스 크레딧 관리 마이페이지 환경설정 육해공군 관리 제안 게시판 시연 환경입니다. 현재 데이터는 샘플 데이터이며 실제 운영 시스템과 다를 수 있습니다. 로그아웃 환경설정 포털 전역 시스템 파라미터, 보안 정책, 자원할당 기준, 운영 설정을 관리합니다. 전체 파라"
    },
    {
      "mode": "guest",
      "route": "/tenant-management",
      "name": "육해공군 관리",
      "title": "국방지능형플랫폼포털",
      "menuVisible": true,
      "badWord": null,
      "consoleErrors": [],
      "networkErrors": [],
      "errors": [],
      "tabResults": [],
      "buttonResults": [],
      "snippet": "통합 대시보드 K-RMF 증빙관리 서비스/도구 카탈로그 반입·반출 승인 통합검색 프로젝트/워크스페이스 크레딧 관리 마이페이지 환경설정 육해공군 관리 제안 게시판 시연 환경입니다. 현재 데이터는 샘플 데이터이며 실제 운영 시스템과 다를 수 있습니다. 로그아웃 육해공군 관리자 권한 및 멀티테넌트 관리 육해공군 관리자 권한 및 멀티테넌트 관리 전체 테넌트 4 육"
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
      "snippet": "통합 대시보드 K-RMF 증빙관리 서비스/도구 카탈로그 반입·반출 승인 통합검색 프로젝트/워크스페이스 크레딧 관리 마이페이지 환경설정 육해공군 관리 제안 게시판 시연 환경입니다. 현재 데이터는 샘플 데이터이며 실제 운영 시스템과 다를 수 있습니다. 로그아웃 제안 게시판 AI 모델 개발, 빅데이터 분석, 데이터셋 구축 등 제안을 등록하고 공감/검토할 수 있습"
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
      "snippet": "통합 대시보드 K-RMF 증빙관리 서비스/도구 카탈로그 반입·반출 승인 통합검색 프로젝트/워크스페이스 크레딧 관리 마이페이지 환경설정 육해공군 관리 제안 게시판 시연 환경입니다. 현재 데이터는 샘플 데이터이며 실제 운영 시스템과 다를 수 있습니다. 로그아웃 접근 권한이 없습니다 이 화면은 권한이 부여된 관리자만 사용할 수 있습니다. 통합 대시보드로 이동"
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
      "snippet": "통합 대시보드 K-RMF 증빙관리 서비스/도구 카탈로그 반입·반출 승인 통합검색 프로젝트/워크스페이스 크레딧 관리 마이페이지 환경설정 육해공군 관리 제안 게시판 시연 환경입니다. 현재 데이터는 샘플 데이터이며 실제 운영 시스템과 다를 수 있습니다. 로그아웃 접근 권한이 없습니다 이 화면은 권한이 부여된 관리자만 사용할 수 있습니다. 통합 대시보드로 이동"
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
      "snippet": "통합 대시보드 K-RMF 증빙관리 서비스/도구 카탈로그 반입·반출 승인 통합검색 프로젝트/워크스페이스 크레딧 관리 마이페이지 환경설정 육해공군 관리 제안 게시판 시연 환경입니다. 현재 데이터는 샘플 데이터이며 실제 운영 시스템과 다를 수 있습니다. 로그아웃 접근 권한이 없습니다 이 화면은 권한이 부여된 관리자만 사용할 수 있습니다. 통합 대시보드로 이동"
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
      "snippet": "통합 대시보드 K-RMF 증빙관리 서비스/도구 카탈로그 반입·반출 승인 통합검색 프로젝트/워크스페이스 크레딧 관리 마이페이지 환경설정 육해공군 관리 제안 게시판 시연 환경입니다. 현재 데이터는 샘플 데이터이며 실제 운영 시스템과 다를 수 있습니다. 로그아웃 접근 권한이 없습니다 이 화면은 권한이 부여된 관리자만 사용할 수 있습니다. 통합 대시보드로 이동"
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
      "snippet": "통합 대시보드 관리자 콘솔 K-RMF 증빙관리 요구사항 대응현황 플랫폼 API 연계현황 업무흐름/연계 시나리오 서비스/도구 카탈로그 반입·반출 승인 통합검색 프로젝트/워크스페이스 크레딧 관리 마이페이지 환경설정 육해공군 관리 제안 게시판 시연 환경입니다. 현재 데이터는 샘플 데이터이며 실제 운영 시스템과 다를 수 있습니다. 로그아웃 요구사항 대응현황 메뉴 "
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
      "snippet": "통합 대시보드 관리자 콘솔 K-RMF 증빙관리 요구사항 대응현황 플랫폼 API 연계현황 업무흐름/연계 시나리오 서비스/도구 카탈로그 반입·반출 승인 통합검색 프로젝트/워크스페이스 크레딧 관리 마이페이지 환경설정 육해공군 관리 제안 게시판 시연 환경입니다. 현재 데이터는 샘플 데이터이며 실제 운영 시스템과 다를 수 있습니다. 로그아웃 요구사항 대응현황 메뉴 "
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
      "snippet": "통합 대시보드 관리자 콘솔 K-RMF 증빙관리 요구사항 대응현황 플랫폼 API 연계현황 업무흐름/연계 시나리오 서비스/도구 카탈로그 반입·반출 승인 통합검색 프로젝트/워크스페이스 크레딧 관리 마이페이지 환경설정 육해공군 관리 제안 게시판 시연 환경입니다. 현재 데이터는 샘플 데이터이며 실제 운영 시스템과 다를 수 있습니다. 로그아웃 플랫폼 API 연계현황 "
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
      "snippet": "통합 대시보드 관리자 콘솔 K-RMF 증빙관리 요구사항 대응현황 플랫폼 API 연계현황 업무흐름/연계 시나리오 서비스/도구 카탈로그 반입·반출 승인 통합검색 프로젝트/워크스페이스 크레딧 관리 마이페이지 환경설정 육해공군 관리 제안 게시판 시연 환경입니다. 현재 데이터는 샘플 데이터이며 실제 운영 시스템과 다를 수 있습니다. 로그아웃 업무흐름/연계 시나리오 "
    }
  ]
}
```