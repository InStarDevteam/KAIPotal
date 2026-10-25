import {
  SERVER_PROJECT_LABELS,
  WorkOverviewData,
  workSectionReady,
  unavailableWorkSections,
  approvalCount,
  mapMyRequestsToQueue,
  auditExclusionMessage,
  classifyWorkFetchError,
  describeObservation,
  mapApprovalQueueToQueue,
} from './workServerData';

describe('work server data mapping', () => {
  describe('mapApprovalQueueToQueue', () => {
    it('maps counts to summary rows with labels and routes', () => {
      expect(
        mapApprovalQueueToQueue([
          { type: 'workspace', count: 3 },
          { type: 'export', count: 1 },
          { type: 'credit', count: 2 },
        ]),
      ).toEqual([
        {
          id: 'queue-workspace',
          name: '작업환경 검토 대기',
          detail: '3건이 검토를 기다리고 있습니다',
          type: '작업환경',
          status: '3건',
          route: '/project-workspace?tab=request',
        },
        {
          id: 'queue-export',
          name: '반입·반출 검토 대기',
          detail: '1건이 검토를 기다리고 있습니다',
          type: '반입·반출',
          status: '1건',
          route: '/export-approval',
        },
        {
          id: 'queue-credit',
          name: '크레딧 검토 대기',
          detail: '2건이 검토를 기다리고 있습니다',
          type: '크레딧',
          status: '2건',
          route: '/credit-manager',
        },
      ]);
    });
    it('skips zero counts and unknown types', () => {
      expect(
        mapApprovalQueueToQueue([
          { type: 'workspace', count: 0 },
          { type: 'unknown', count: 5 },
        ]),
      ).toEqual([]);
    });
    it('returns an empty list while data is unavailable', () => {
      expect(mapApprovalQueueToQueue(undefined)).toEqual([]);
    });
    it('uses labels matching the demo queue filter types', () => {
      const rows = mapApprovalQueueToQueue([{ type: 'export', count: 4 }]);
      expect(rows[0].type).toBe('반입·반출');
    });
  });

  describe('describeObservation', () => {
    const asOf = '2026-09-24T07:00:00.000Z';
    const at = new Date(asOf).getTime();
    it('marks fresh observations as not stale', () => {
      expect(describeObservation({ asOf }, at + 30_000)?.stale).toBe(false);
    });
    it('marks observations older than staleAfterSec as stale', () => {
      expect(describeObservation({ asOf }, at + 121_000)?.stale).toBe(true);
    });
    it('honours an explicit staleAfterSec', () => {
      expect(
        describeObservation({ asOf, staleAfterSec: 30 }, at + 31_000)?.stale,
      ).toBe(true);
      expect(
        describeObservation({ asOf, staleAfterSec: 300 }, at + 121_000)?.stale,
      ).toBe(false);
    });
    it('defaults staleAfterSec to 120', () => {
      expect(describeObservation({ asOf }, at + 119_000)?.stale).toBe(false);
      expect(describeObservation({ asOf }, at + 120_001)?.stale).toBe(true);
    });
    it('returns null without a usable asOf', () => {
      expect(describeObservation(null)).toBeNull();
      expect(describeObservation({})).toBeNull();
      expect(describeObservation({ asOf: 'not-a-date' })).toBeNull();
    });
    it('formats the observed time as HH:MM', () => {
      const info = describeObservation({ asOf }, at);
      expect(info?.observedAt).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('auditExclusionMessage', () => {
    it('explains the permission_missing reason', () => {
      expect(auditExclusionMessage('permission_missing')).toBe(
        '감사 조회 권한이 필요합니다',
      );
    });
    it('returns null when audit data is available', () => {
      expect(auditExclusionMessage(null)).toBeNull();
    });
    it('falls back for unknown reasons', () => {
      expect(auditExclusionMessage('something_else')).toBe(
        '감사 기록을 조회할 수 없습니다',
      );
    });
  });

  describe('classifyWorkFetchError', () => {
    it('classifies 403 as a permission failure', () => {
      const error = new Error('권한이 없습니다.');
      (error as { status?: number }).status = 403;
      expect(classifyWorkFetchError(error)).toEqual({
        kind: 'permission',
        message: '권한이 없습니다.',
        code: undefined,
      });
    });
    it('classifies permission_denied code as a permission failure', () => {
      const error = new Error('denied');
      (error as { code?: string }).code = 'permission_denied';
      expect(classifyWorkFetchError(error).kind).toBe('permission');
    });
    it('classifies network and server failures as retryable', () => {
      expect(classifyWorkFetchError(new TypeError('fetch failed')).kind).toBe(
        'network',
      );
      const error = new Error('요청을 처리하지 못했습니다 (500).');
      (error as { status?: number }).status = 500;
      expect(classifyWorkFetchError(error).kind).toBe('network');
    });
    it('provides a fallback message for non-error throws', () => {
      expect(classifyWorkFetchError(undefined).message).toBe(
        '업무 현황을 불러오지 못했습니다.',
      );
    });
  });

  describe('SERVER_PROJECT_LABELS', () => {
    it('covers the server-side project status', () => {
      expect(SERVER_PROJECT_LABELS.active).toBe('진행 중');
    });
  });
});

describe('partial overview and request counts', () => {
  const data: WorkOverviewData = {
    myProjects: [],
    myRequests: [],
    approvalQueue: [],
    recentAudit: [],
    auditExcludedReason: null,
    credits: { state: 'pending_integration' },
    resourceUsage: { state: 'pending_integration' },
  };
  it('treats a successful empty list as ready, but unavailable as unknown', () => {
    expect(workSectionReady(data, 'myProjects')).toBe(true);
    expect(workSectionReady(null, 'myProjects')).toBe(false);
    const partial = {
      ...data,
      sections: {
        myProjects: 'unavailable' as const,
        myRequests: 'ready' as const,
      },
    };
    expect(workSectionReady(partial, 'myProjects')).toBe(false);
    expect(workSectionReady(partial, 'myRequests')).toBe(true);
    expect(unavailableWorkSections(partial)).toEqual(['내 프로젝트']);
  });
  it('keeps permission exclusion separate from source outages', () => {
    const excluded = {
      ...data,
      sections: { recentAudit: 'permission_missing' as const },
    };
    expect(workSectionReady(excluded, 'recentAudit')).toBe(false);
    expect(unavailableWorkSections(excluded)).toEqual([]);
  });
  it('counts actual requests rather than summary rows', () => {
    const rows = [
      { type: 'export', count: 7 },
      { type: 'workspace', count: 3 },
    ];
    expect(approvalCount(rows)).toBe(10);
    expect(approvalCount(rows, 'export')).toBe(7);
    expect(approvalCount(undefined)).toBe(0);
  });
  it('maps the requester own rows when no approval permission exists', () => {
    expect(
      mapMyRequestsToQueue([
        {
          id: 'a',
          type: 'workspace',
          title: '분석 환경 신청',
          status: 'requested',
        },
      ]),
    ).toEqual([
      {
        id: 'a',
        name: '분석 환경 신청',
        detail: '작업환경 신청',
        type: '작업환경',
        status: '신청 접수',
        route: '/project-workspace?tab=request',
      },
    ]);
    expect(mapMyRequestsToQueue([{ id: 'unknown', type: 'unknown' }])).toEqual(
      [],
    );
  });
});
