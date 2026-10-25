import {
  fieldName,
  integrationContracts,
  readHistory,
  resolveReadPath,
  sampleRequest,
  sampleResponse,
  saveHistory,
  TestResult,
  validateContract,
} from './integrationModel';

describe('developer console contracts', () => {
  it('preserves confirmed integration candidates and excludes unrequested standalone pilot contracts', () => {
    expect(integrationContracts).toHaveLength(34);
    expect(
      integrationContracts.filter(item => item.platform === 'vdi'),
    ).toHaveLength(2);
    expect(
      integrationContracts.some(
        item =>
          item.id.startsWith('PORTAL-PILOT-') ||
          item.endpointCandidate.includes('/pilot/'),
      ),
    ).toBe(false);
    expect(
      integrationContracts.some(item => item.name.includes('변경영향')),
    ).toBe(true);
    expect(integrationContracts.every(item => !('relatedSfrIds' in item))).toBe(
      true,
    );
  });
  it('validates editable JSON objects, missing fields, and wrong types', () => {
    expect(validateContract(null, ['tenantId'])).toEqual([
      'JSON 객체를 입력하세요.',
    ]);
    expect(validateContract({}, ['tenantId'])).toContain(
      'tenantId: 필수 필드 누락',
    );
    expect(
      validateContract({ workspaces: 'not an array', total: 'twelve' }, [
        'workspaces',
        'total',
      ]),
    ).toHaveLength(2);
    expect(
      validateContract({ workspaces: [], total: 0 }, ['workspaces', 'total']),
    ).toEqual([]);
  });
  it('generates usable draft fixtures for every preserved contract and detects missing response fields', () => {
    integrationContracts.forEach(item => {
      expect(
        validateContract(sampleRequest(item, 'army'), item.requestData),
      ).toEqual([]);
      const response = sampleResponse(item);
      expect(validateContract(response, item.responseData)).toEqual([]);
      delete response[fieldName(item.responseData[0])];
      expect(
        validateContract(response, item.responseData).length,
      ).toBeGreaterThan(0);
    });
  });
  it('escapes query values and rejects path injection while leaving tenant choice to server', () => {
    const item = integrationContracts.find(contract =>
      contract.endpointCandidate.includes('{projectId}'),
    )!;
    expect(() => resolveReadPath(item, { projectId: '../other' })).toThrow();
    expect(
      resolveReadPath(item, {
        projectId: 'sample-1',
        tenantId: 'forged',
        query: 'x&admin=true',
      }),
    ).toEqual({
      path: item.endpointCandidate.replace('{projectId}', 'sample-1'),
      query: 'query=x%26admin%3Dtrue',
    });
  });
  it('isolates bounded history by user and tenant and never persists response bodies', () => {
    localStorage.clear();
    const result: TestResult = {
      id: 'test-1',
      occurredAt: new Date().toISOString(),
      contractName: 'test',
      platform: 'ai',
      mode: 'sample',
      kind: 'contract',
      outcome: 'passed',
      status: 200,
      elapsedMs: 1,
      message: 'ok',
      checks: [],
      response: { sensitive: 'never persist' },
    };
    saveHistory(
      'army',
      'user-1',
      Array.from({ length: 45 }, (_, index) => ({
        ...result,
        id: `test-${index}`,
      })),
    );
    expect(readHistory('army', 'user-1')).toHaveLength(40);
    expect(readHistory('navy', 'user-1')).toEqual([]);
    expect(readHistory('army', 'user-2')).toEqual([]);
    expect(readHistory('army', 'user-1')[0].response).toBeUndefined();
    expect(JSON.stringify(localStorage)).not.toContain('never persist');
  });
});
