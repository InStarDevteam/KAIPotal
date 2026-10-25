# K-RMF 이행·증적관리 생애주기 및 역할 설계 (KRMF_LIFECYCLE_AND_ROLE_DESIGN)

최종공고문 260723_v1의 SER-002~SER-008 요구에 따른 K-RMF 이행·증적관리 기능의 설계 문서다.
구현 소스: `backstage-portal/packages/app/src/components/krmf-evidence/`.
SER 매핑 상세는 `docs/FINAL_RFP_KRMF_MAPPING.md`, 역할·권한 정의는 `docs/ROLE_PERMISSION_MATRIX.md`를 따른다.

## 1. 목적과 범위

포털은 K-RMF 통제 구현, 증적 축적, 평가 준비, 보완조치, 변경영향 추적을 지원한다.
통제 선정/제외/대체 승인과 평가·인가 최종 판단은 소요기관 권한이며, 포털은 이를 대신하지 않는다.
이 문구는 화면 안남문과 동일하게 유지하며, 포털 내 어떤 역할도 평가·인가를 확정할 수 없다.

## 2. 8단계 생애주기

화면 상단의 생애주기 Stepper(`KrmfLifecycleStepper`)가 8단계 진행 상태를 표시한다.

| 단계 | 명칭 | 포털 기능 | 담당 역할 | 산출물 | 관련 SER |
|---|---|---|---|---|---|
| 1 | 적용범위·통제기준 | 통제항목 적용 여부·중요도·대상 시스템 관리(선정 승인은 소요기관) | security-manager | 통제기준 목록, 적용범위 정의 | SER-003 |
| 2 | 이행계획 | 통제별 담당자·일정·검증방법·예상 증적 유형 등록 | security-manager | 이행계획서 | SER-002, SER-005 |
| 3 | 통제 구현 | 통제항목 이행 상태(계획/이행 중/지연 등) 추적 | security-manager | 이행 현황 | SER-004 |
| 4 | 증적 제출·검토 | 증빙자료 등록, 검토/승인/반려, 보완 요청 | project-manager(제출), security-manager(검토) | 구현 증적 | SER-006 |
| 5 | 미흡사항 보완 | 미흡·리스크 등록, 조치 내용·기한·잔여위험 관리 | security-manager | 보완조치 이력 | SER-005, SER-006 |
| 6 | 평가·인가 지원 | 평가 일정·결과·인가 상태 기록, 증적 패키지 구성(판단은 소요기관) | security-manager | 평가 패키지, 인가 이력 | SER-007 |
| 7 | 운영전환 | 인수인계, 모니터링 계획, 백업·복구, 연락체계 이관 상태 관리 | security-manager | 운영전환 자료 | SER-008 |
| 8 | 지속모니터링·변경영향 | 변경 접수, 영향 통제·증적 매핑, 재평가 필요 여부 검토 | security-manager | 변경영향 분석서 | SER-007, SER-008 |

## 3. 탭 구성

| 탭 | 기능 | 주요 역할 |
|---|---|---|
| 대시보드 | 생애주기 Stepper, 진행 요약 카드, 통제 영역별 현황 | krmf.view 보유 전 역할 |
| 통제항목 | 통제 목록/상세, 점검 상태, 증적·이슈 수, 감사 이력 | security-manager |
| 이행계획 | 단계(개발/시험/평가/운영)별 계획 등록·상태 관리 | security-manager |
| 증빙자료 | 증적 등록(8종 유형), 검토/승인/반려 | project-manager(등록), security-manager(검토) |
| 미흡·보완조치 | 리스크 이슈 등록, 심각도·기한·조치·잔여위험 추적 | security-manager |
| 타 수행사 자료 | 외부 수행사 제출 증적 수집·검토 결과 관리 | security-manager |
| 평가·인가 지원 | 평가 유형·결과·인가 상태, 미해결 이슈 수, 패키지 버전 | security-manager, security-auditor(조회) |
| 운영전환·변경관리 | 인수인계 상태, 변경영향 접수·분석·검증, 재평가 필요 표시 | security-manager |

## 4. 데이터 모델

| 모델 | 주요 필드 | 설명 |
|---|---|---|
| ControlItem | id, area(17종 영역), name, applied, owner/ownerOrg, importance, checkStatus, evidenceCount, issueCount, targetSystems, relatedProjects, auditLog | 통제항목 단위. 적용 여부와 점검 상태를 관리 |
| Evidence | id, controlItemId, name, type(8종), submitter, submittedAt, reviewer, status(6종), filename, version | 통제별 구현 증적 |
| RiskIssue | id, controlItemId, title, severity(4단계), foundAt, owner, dueDate, status(6종), actionContent, residualRisk | 미흡·보완조치 이슈 |
| ExternalSubmission | id, vendorName, evidenceName, controlItemId, submittedAt, status, reviewer, reviewResult, revisionRequested | 타 수행사 제출 자료 |
| KrmfImplementationPlan | id, controlId, phase(개발/시험/평가/운영), ownerOrg/ownerUser, plannedStart/End, verificationMethod, expectedEvidenceTypes, status | 통제별 이행계획 |
| KrmfAssessment | id, projectId, assessmentType(internal/formal/reassessment), scheduledAt, result(5종), authorizationStatus(6종), decisionAuthority, opinionCount, unresolvedIssueCount, packageVersion | 평가·인가 지원 정보. 인가 상태 라벨에 '소요기관' 명기 |
| KrmfOperationalTransition | id, projectId, authorizationRef, handoverStatus, monitoringPlanStatus, backupRecoveryStatus, contactTransferStatus, periodicReviewDate | 운영전환·인수인계 상태 |
| KrmfChangeImpact | id, requestedAt, requester, changeType(11종), targetSystems, description, affectedControlIds, affectedEvidenceIds, riskLevel, reassessmentRequired, reassessmentReason, reviewer, status(6종) | 변경영향 분석. 영향받는 통제·증적을 직접 매핑 |

## 5. SER-002~008 매핑

| 요구 ID | 요구사항 | 포털 대응(화면 탭) |
|---|---|---|
| SER-002 | 보안요구사항 이행계획 | 이행계획 탭(단계·일정·검증방법·예상 증적) |
| SER-003 | K-RMF 적용기준 | 통제항목 탭(적용 여부·중요도·대상 시스템) |
| SER-004 | 통제항목 이행관리 | 통제항목 탭 + 대시보드(점검 상태·진행 요약) |
| SER-005 | 보안계획서 | 이행계획 탭 + 미흡·보완조치 탭 |
| SER-006 | 구현증적 | 증빙자료 탭 + 타 수행사 자료 탭 |
| SER-007 | 평가·후속조치·인가 | 평가·인가 지원 탭(판단은 소요기관) |
| SER-008 | 운영전환·모니터링 준비 | 운영전환·변경관리 탭 |

## 6. 역할별 권한

● = 가능, ○ = 조회 전용, 공란 = 불가

| 역할 | 조회 | 증적 등록 | 검토/반려 | 관리(통제·계획·평가지원·전환) |
|---|---|---|---|---|
| security-manager | ● | ● | ● | ● |
| security-auditor | ○ | | | |
| portal-admin | ○ | ●(권한 보유 시) | | |
| project-manager | | ●(본인 과제) | | |
| general-user | | ●(배정 시) | | |

평가·인가 최종 판단은 소요기관 권한으로, 위 어떤 역할에도 부여하지 않는다.
버튼 노출은 `KrmfPermissionGate`와 역할 정책(`rolePolicies.ts`)으로 게이트한다.

## 7. 변경영향 관리

### 7.1 changeType 11종

| 코드 | 명칭 |
|---|---|
| external-interface | 외부체계 연계 변경 |
| security-boundary | 보안경계 변경 |
| classification | 비밀 등급 변경 |
| identity-access | 인증·접근정책 변경 |
| encryption-key | 암호키 변경 |
| platform-version | 플랫폼 버전 변경 |
| architecture | 아키텍처 변경 |
| new-data-source | 신규 데이터 소스 |
| export-path | 반출경로 추가 |
| vulnerability-incident | 취약점·사고 |
| control-exception | 통제 예외 변경 |

### 7.2 재평가 표현 원칙

- 변경영향의 재평가 여부는 `검토 필요` 또는 `소요기관 판단 필요`로만 표현한다.
- 포털이 재평가 필요 여부를 자동 확정하지 않는다(자동 확정 금지).
- `reassessmentRequired`는 검토 의견의 기록이며, 재평가 착수 결정은 소요기관이 내린다.

## 8. 구현 위치

| 구분 | 경로 |
|---|---|
| 화면 루트 | `backstage-portal/packages/app/src/components/krmf-evidence/KrmfEvidencePage.tsx` |
| 생애주기 Stepper | `krmf-evidence/KrmfLifecycleStepper.tsx` |
| 탭 패널 | `ImplementationPlanPanel.tsx`, `AssessmentSupportPanel.tsx`, `OperationTransitionPanel.tsx` 등 |
| 데이터 모델 | `krmf-evidence/types.ts` |
| 권한 게이트 | `krmf-evidence/KrmfPermissionGate.tsx` |
| 테스트 | `krmf-evidence/krmfData.test.ts` |
