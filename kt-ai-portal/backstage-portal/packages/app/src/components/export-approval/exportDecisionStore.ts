import { AuditLogEntry, ExportRequest } from './types';

export type ExportReviewDecision = 'approved' | 'rejected';

export interface ExportDecision {
  requestId: string;
  decision: ExportReviewDecision;
  approver: string;
  decidedAt: string;
}

export const exportDecisionStorageKey = (
  tenantId: string,
  actorId: string,
) =>
  `kai.demo.export-decisions.v1:${encodeURIComponent(
    tenantId,
  )}:${encodeURIComponent(actorId)}`;

export const readExportDecisions = (
  key: string,
): { items: ExportDecision[]; error?: string } => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { items: [] };
    const data = JSON.parse(raw);
    if (
      data.version !== 1 ||
      !Array.isArray(data.items) ||
      data.items.length > 300 ||
      !data.items.every(
        (item: ExportDecision) =>
          item &&
          typeof item.requestId === 'string' &&
          typeof item.approver === 'string' &&
          typeof item.decidedAt === 'string' &&
          ['approved', 'rejected'].includes(item.decision),
      )
    )
      throw new Error('invalid');
    return { items: data.items };
  } catch {
    return {
      items: [],
      error:
        '저장된 승인·반려 결정을 읽지 못했습니다. 다시 결정하면 현재 상태로 복구됩니다.',
    };
  }
};

export const saveExportDecisions = (key: string, items: ExportDecision[]) => {
  if (items.length > 300)
    throw new Error(
      '이 브라우저에서는 승인·반려 결정을 최대 300건까지 보관합니다.',
    );
  try {
    localStorage.setItem(key, JSON.stringify({ version: 1, items }));
  } catch {
    throw new Error(
      '브라우저에 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인하세요.',
    );
  }
};

export const createExportDecision = (
  requestId: string,
  decision: ExportReviewDecision,
  approver: string,
): ExportDecision => ({
  requestId,
  decision,
  approver,
  decidedAt: new Date().toISOString(),
});

const decisionLabel: Record<ExportReviewDecision, string> = {
  approved: '승인',
  rejected: '반려',
};

export const applyExportDecision = (
  request: ExportRequest,
  decision: ExportDecision,
): ExportRequest => {
  const entry: AuditLogEntry = {
    timestamp: decision.decidedAt,
    actor: decision.approver,
    action: decisionLabel[decision.decision],
    result: '완료',
    note: `포털에서 ${decisionLabel[decision.decision]} 처리`,
  };
  return {
    ...request,
    status: decision.decision,
    approver: decision.approver,
    approvedAt: decision.decidedAt,
    auditLog: [...request.auditLog, entry],
  };
};
