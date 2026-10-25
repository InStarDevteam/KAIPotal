import {
  mockControlItems,
  mockEvidenceList,
  mockRiskIssues,
  mockImplementationPlans,
  mockAssessments,
  mockOperationalTransitions,
  mockChangeImpacts,
  summarizeKrmfProgress,
} from './mockKrmfEvidence';
import {
  IMPLEMENTATION_PHASE_LABELS,
  IMPLEMENTATION_STATUS_LABELS,
  ASSESSMENT_TYPE_LABELS,
  ASSESSMENT_RESULT_LABELS,
  AUTHORIZATION_STATUS_LABELS,
  HANDOVER_STATUS_LABELS,
  CHANGE_TYPE_LABELS,
  CHANGE_IMPACT_STATUS_LABELS,
} from './types';

const controlIds = new Set(mockControlItems.map(c => c.id));
const evidenceIds = new Set(mockEvidenceList.map(e => e.id));

describe('K-RMF 기준 데이터 무결성', () => {
  it('이행계획 10건이 존재하고 통제항목 참조가 유효하다', () => {
    expect(mockImplementationPlans).toHaveLength(10);
    for (const plan of mockImplementationPlans) {
      expect(controlIds.has(plan.controlId)).toBe(true);
      expect(IMPLEMENTATION_PHASE_LABELS[plan.phase]).toBeDefined();
      expect(IMPLEMENTATION_STATUS_LABELS[plan.status]).toBeDefined();
      expect(plan.expectedEvidenceTypes.length).toBeGreaterThan(0);
      expect(plan.plannedStart <= plan.plannedEnd).toBe(true);
    }
  });

  it('평가·인가 4건의 라벨과 필수 필드가 유효하다', () => {
    expect(mockAssessments).toHaveLength(4);
    for (const assessment of mockAssessments) {
      expect(ASSESSMENT_TYPE_LABELS[assessment.assessmentType]).toBeDefined();
      expect(ASSESSMENT_RESULT_LABELS[assessment.result]).toBeDefined();
      expect(
        AUTHORIZATION_STATUS_LABELS[assessment.authorizationStatus],
      ).toBeDefined();
      expect(assessment.decisionAuthority).not.toHaveLength(0);
      expect(assessment.packageVersion).toMatch(/^v\d/);
      expect(assessment.unresolvedIssueCount).toBeLessThanOrEqual(
        assessment.opinionCount,
      );
    }
    // 정식평가의 판단권한은 소요기관이어야 한다
    const formal = mockAssessments.find(a => a.assessmentType === 'formal');
    expect(formal?.decisionAuthority).toContain('소요기관');
  });

  it('운영전환 3건의 인수인계 상태가 유효하다', () => {
    expect(mockOperationalTransitions).toHaveLength(3);
    for (const transition of mockOperationalTransitions) {
      expect(HANDOVER_STATUS_LABELS[transition.handoverStatus]).toBeDefined();
      expect(transition.periodicReviewDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('변경영향 9건 이상, 서로 다른 변경유형 8종 이상, 참조가 유효하다', () => {
    expect(mockChangeImpacts.length).toBeGreaterThanOrEqual(9);
    const distinctTypes = new Set(mockChangeImpacts.map(c => c.changeType));
    expect(distinctTypes.size).toBeGreaterThanOrEqual(8);
    for (const impact of mockChangeImpacts) {
      expect(CHANGE_TYPE_LABELS[impact.changeType]).toBeDefined();
      expect(CHANGE_IMPACT_STATUS_LABELS[impact.status]).toBeDefined();
      for (const controlId of impact.affectedControlIds) {
        expect(controlIds.has(controlId)).toBe(true);
      }
      for (const evidenceId of impact.affectedEvidenceIds) {
        expect(evidenceIds.has(evidenceId)).toBe(true);
      }
      // 재평가가 필요하지 않은 경우에만 사유가 비어 있어야 한다.
      expect(
        impact.reassessmentRequired ||
          impact.reassessmentReason === undefined,
      ).toBe(true);
    }
  });

  it('기준 데이터에 조치闭环 등 중국어 혼입 문자가 없다', () => {
    const serialized = JSON.stringify({
      mockControlItems,
      mockEvidenceList,
      mockRiskIssues,
      mockImplementationPlans,
      mockAssessments,
      mockOperationalTransitions,
      mockChangeImpacts,
    });
    expect(serialized).not.toContain('闭环');
    // CJK 호환 한자·간체 혼입 방지용 확인
    expect(serialized).not.toMatch(/[\u2E80-\u9FFF\uF900-\uFAFF]/);
  });

  it('대시보드 집계 헬퍼가 mock 배열 길이와 일치한다', () => {
    const summary = summarizeKrmfProgress(
      mockControlItems,
      mockEvidenceList,
      mockRiskIssues,
    );
    expect(summary.totalControls).toBe(mockControlItems.length);
    expect(summary.totalControls).toBe(18);
    expect(summary.submittedEvidence).toBe(
      mockEvidenceList.filter(e => e.status !== 'not_submitted').length,
    );
    expect(summary.approvedEvidence).toBe(
      mockEvidenceList.filter(e => e.status === 'approved').length,
    );
    expect(summary.openIssues).toBe(
      mockRiskIssues.filter(i => i.status !== 'closed').length,
    );
    expect(summary.progressPercent).toBe(
      Math.round(
        (mockControlItems.filter(c => c.checkStatus === 'completed').length /
          mockControlItems.length) *
          100,
      ),
    );
  });
});
