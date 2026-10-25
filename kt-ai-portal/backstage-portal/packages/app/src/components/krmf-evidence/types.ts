export type ControlCheckStatus =
  | 'not_checked'
  | 'preparing'
  | 'checking'
  | 'compliant'
  | 'non_compliant'
  | 'remediating'
  | 'completed';

export type EvidenceStatus =
  | 'not_submitted'
  | 'submitted'
  | 'reviewing'
  | 'revision_requested'
  | 'approved'
  | 'rejected';

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IssueStatus =
  | 'registered'
  | 'in_progress'
  | 'resolved'
  | 'reviewing'
  | 'closed'
  | 'deferred';

export type ControlArea =
  | 'access_control'
  | 'account_management'
  | 'log_management'
  | 'encryption'
  | 'network_security'
  | 'vulnerability_management'
  | 'data_protection'
  | 'backup_recovery'
  | 'change_management'
  | 'security_audit'
  | 'security_requirement_plan'
  | 'krmf_standard'
  | 'control_implementation'
  | 'security_plan'
  | 'evidence_submission'
  | 'security_evaluation'
  | 'operational_transition';

export type EvidenceType =
  | 'policy_document'
  | 'config_capture'
  | 'log_file'
  | 'scan_report'
  | 'approval_history'
  | 'training_material'
  | 'architecture_doc'
  | 'operational_procedure';

export interface Evidence {
  id: string;
  controlItemId: string;
  name: string;
  type: EvidenceType;
  submitter: string;
  submittedAt: string;
  reviewer?: string;
  status: EvidenceStatus;
  filename: string;
  version: string;
  note?: string;
}

export interface RiskIssue {
  id: string;
  controlItemId: string;
  title: string;
  severity: RiskSeverity;
  foundAt: string;
  owner: string;
  dueDate: string;
  status: IssueStatus;
  actionContent?: string;
  residualRisk?: string;
}

export interface ExternalSubmission {
  id: string;
  vendorName: string;
  evidenceName: string;
  controlItemId: string;
  submittedAt: string;
  status: EvidenceStatus;
  reviewer?: string;
  reviewResult?: string;
  revisionRequested: boolean;
  note?: string;
}

export type ImplementationPhase =
  | 'development'
  | 'test'
  | 'assessment'
  | 'operation';

export type ImplementationStatus =
  | 'planned'
  | 'in_progress'
  | 'submitted'
  | 'reviewing'
  | 'completed'
  | 'delayed';

export type AssessmentType = 'internal' | 'formal' | 'reassessment';

export type AssessmentResult =
  | 'not_started'
  | 'in_review'
  | 'conforming'
  | 'conditional'
  | 'nonconforming';

export type AuthorizationStatus =
  | 'not_requested'
  | 'requested'
  | 'reviewing'
  | 'authorized'
  | 'conditional'
  | 'rejected';

export type HandoverStatus =
  | 'not_started'
  | 'preparing'
  | 'reviewing'
  | 'completed';

export type ChangeType =
  | 'external-interface'
  | 'security-boundary'
  | 'classification'
  | 'identity-access'
  | 'encryption-key'
  | 'platform-version'
  | 'architecture'
  | 'new-data-source'
  | 'export-path'
  | 'vulnerability-incident'
  | 'control-exception';

export type ChangeImpactStatus =
  | 'requested'
  | 'analyzing'
  | 'approved'
  | 'rejected'
  | 'implemented'
  | 'verified';

export interface KrmfImplementationPlan {
  id: string;
  controlId: string;
  phase: ImplementationPhase;
  ownerOrg: string;
  ownerUser: string;
  plannedStart: string;
  plannedEnd: string;
  verificationMethod: string;
  expectedEvidenceTypes: EvidenceType[];
  status: ImplementationStatus;
}

export interface KrmfAssessment {
  id: string;
  projectId: string;
  assessmentType: AssessmentType;
  scheduledAt: string;
  result: AssessmentResult;
  authorizationStatus: AuthorizationStatus;
  decisionAuthority: string;
  opinionCount: number;
  unresolvedIssueCount: number;
  packageVersion: string;
}

export interface KrmfOperationalTransition {
  id: string;
  projectId: string;
  authorizationRef?: string;
  handoverStatus: HandoverStatus;
  monitoringPlanStatus: string;
  backupRecoveryStatus: string;
  contactTransferStatus: string;
  periodicReviewDate: string;
}

export interface KrmfChangeImpact {
  id: string;
  requestedAt: string;
  requester: string;
  changeType: ChangeType;
  targetSystems: string[];
  description: string;
  affectedControlIds: string[];
  affectedEvidenceIds: string[];
  riskLevel: RiskSeverity;
  reassessmentRequired: boolean;
  reassessmentReason?: string;
  reviewer: string;
  status: ChangeImpactStatus;
}

export const IMPLEMENTATION_PHASE_LABELS: Record<ImplementationPhase, string> = {
  development: '개발',
  test: '시험',
  assessment: '평가',
  operation: '운영',
};

export const IMPLEMENTATION_STATUS_LABELS: Record<ImplementationStatus, string> = {
  planned: '계획',
  in_progress: '이행 중',
  submitted: '증적 제출',
  reviewing: '검토 중',
  completed: '완료',
  delayed: '지연',
};

export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  internal: '내부평가',
  formal: '정식평가',
  reassessment: '재평가',
};

export const ASSESSMENT_RESULT_LABELS: Record<AssessmentResult, string> = {
  not_started: '미착수',
  in_review: '심의 중',
  conforming: '적합',
  conditional: '조건부 적합',
  nonconforming: '부적합',
};

export const AUTHORIZATION_STATUS_LABELS: Record<AuthorizationStatus, string> = {
  not_requested: '인가 미신청',
  requested: '인가 신청',
  reviewing: '인가 심의 중',
  authorized: '인가(소요기관)',
  conditional: '조건부 인가(소요기관)',
  rejected: '인가 반려(소요기관)',
};

export const HANDOVER_STATUS_LABELS: Record<HandoverStatus, string> = {
  not_started: '미착수',
  preparing: '준비 중',
  reviewing: '검토 중',
  completed: '완료',
};

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  'external-interface': '외부체계 연계 변경',
  'security-boundary': '보안경계 변경',
  classification: '비밀 등급 변경',
  'identity-access': '인증·접근정책 변경',
  'encryption-key': '암호키 변경',
  'platform-version': '플랫폼 버전 변경',
  architecture: '아키텍처 변경',
  'new-data-source': '신규 데이터 소스',
  'export-path': '반출경로 추가',
  'vulnerability-incident': '취약점·사고',
  'control-exception': '통제 예외 변경',
};

export const CHANGE_IMPACT_STATUS_LABELS: Record<ChangeImpactStatus, string> = {
  requested: '접수',
  analyzing: '영향 분석 중',
  approved: '변경 승인',
  rejected: '반려',
  implemented: '반영 완료',
  verified: '검증 완료',
};

export const RISK_LEVEL_LABELS: Record<RiskSeverity, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
  critical: '긴급',
};

export interface ControlItem {
  id: string;
  area: ControlArea;
  name: string;
  description: string;
  applied: boolean;
  owner: string;
  ownerOrg: string;
  importance: 'low' | 'medium' | 'high';
  checkStatus: ControlCheckStatus;
  evidenceCount: number;
  issueCount: number;
  lastCheckedAt?: string;
  purpose: string;
  targetSystems: string[];
  relatedProjects: string[];
  implementationStatus: string;
  relatedExportRequestIds?: string[];
  auditLog: string[];
}
