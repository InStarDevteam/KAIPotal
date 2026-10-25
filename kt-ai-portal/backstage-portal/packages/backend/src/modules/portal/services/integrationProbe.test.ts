import {
  configuredTargets,
  pathAllowed,
  responseShape,
  runIntegrationProbe,
  IntegrationTarget,
} from './integrationProbe';

const target: IntegrationTarget = {
  baseUrl: 'https://ai.example.test',
  healthPath: '/health',
  readPaths: ['/api/ai/workspaces', '/api/projects/{projectId}/usage'],
  tokenEnv: 'PORTAL_CONNECTOR_AI_TOKEN',
};
const env = { PORTAL_CONNECTOR_AI_TOKEN: 'server-only-secret' };
const input = {
  platform: 'ai' as const,
  kind: 'contract' as const,
  path: '/api/ai/workspaces',
  query: 'tenantId=forged&limit=5',
};

describe('integration diagnostics', () => {
  it('isolates deployment configuration by tenant and rejects insecure URLs or credential-bearing URLs', () => {
    const config = {
      PORTAL_INTEGRATION_TARGETS: JSON.stringify({
        army: { ai: target },
        navy: { ai: { ...target, baseUrl: 'http://insecure.test' } },
      }),
    };
    expect(configuredTargets('army', config).ai).toEqual(target);
    expect(configuredTargets('navy', config)).toEqual({});
    expect(configuredTargets('unknown', config)).toEqual({});
    expect(
      configuredTargets('army', {
        PORTAL_INTEGRATION_TARGETS: JSON.stringify({
          army: {
            ai: { ...target, baseUrl: 'https://user:secret@example.test' },
          },
        }),
      }),
    ).toEqual({});
  });
  it('matches only approved paths and safe path parameters', () => {
    expect(pathAllowed('/api/projects/project-1/usage', target.readPaths)).toBe(
      true,
    );
    [
      '/api/projects/../usage',
      '//evil.test',
      '/api/projects/a/b/usage',
      '/api/ai/workspaces/delete',
      '/api/projects/%2e%2e/usage',
    ].forEach(path => expect(pathAllowed(path, target.readPaths)).toBe(false));
  });
  it('does not contact unconfigured, non-allowlisted or unauthenticated targets', async () => {
    const fetcher = jest.fn();
    expect(
      (await runIntegrationProbe(undefined, input, 'army', { fetcher }))
        .outcome,
    ).toBe('blocked');
    expect(
      (
        await runIntegrationProbe(
          target,
          { ...input, path: '/admin/delete' },
          'army',
          { fetcher, env },
        )
      ).outcome,
    ).toBe('blocked');
    expect(
      (await runIntegrationProbe(target, input, 'army', { fetcher, env: {} }))
        .outcome,
    ).toBe('blocked');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('sends GET with server credential and verified tenant; returns no platform values', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          workspaces: [{ name: 'confidential', accessToken: 'private' }],
          total: 3,
        }),
        { status: 200 },
      ),
    );
    const result = await runIntegrationProbe(target, input, 'army', {
      fetcher,
      env,
    });
    const [url, init] = fetcher.mock.calls[0];
    expect(url.searchParams.getAll('tenantId')).toEqual(['army']);
    expect(init.method).toBe('GET');
    expect(init.redirect).toBe('manual');
    expect(init.headers.Authorization).toBe('Bearer server-only-secret');
    expect(init.headers['X-Portal-Tenant-Id']).toBe('army');
    expect(result.outcome).toBe('passed');
    expect(result.status).toBe(200);
    expect(JSON.stringify(result.response)).not.toMatch(/confidential|private/);
    expect(result.response).toEqual({
      workspaces: [{ name: '[string]', accessToken: '[redacted]' }],
      total: 0,
    });
  });
  it('uses the configured health path for connection diagnostics', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(new Response('ok', { status: 200 }));
    const result = await runIntegrationProbe(
      target,
      {
        platform: 'ai',
        kind: 'connection',
        path: '/ignored',
        query: 'tenantId=forged&token=never-send',
      },
      'army',
      { fetcher, env },
    );
    expect(fetcher.mock.calls[0][0].pathname).toBe('/health');
    expect(fetcher.mock.calls[0][0].search).toBe('');
    expect(result.outcome).toBe('passed');
  });
  it('blocks redirects, reports HTTP failures, and rejects non-JSON API responses', async () => {
    for (const [status, expected] of [
      [302, 'blocked'],
      [401, 'failed'],
      [503, 'failed'],
    ] as const) {
      const fetcher = jest
        .fn()
        .mockResolvedValue(new Response(null, { status }));
      const result = await runIntegrationProbe(target, input, 'army', {
        fetcher,
        env,
      });
      expect(result.outcome).toBe(expected);
      expect(result.status).toBe(status);
    }
    expect(
      (
        await runIntegrationProbe(target, input, 'army', {
          fetcher: jest
            .fn()
            .mockResolvedValue(new Response('<html>login</html>')),
          env,
        })
      ).outcome,
    ).toBe('failed');
  });
  it('caps response size and reports timeout without leaking underlying errors', async () => {
    const large = jest.fn().mockResolvedValue(new Response('x'.repeat(65537)));
    expect(
      (
        await runIntegrationProbe(target, input, 'army', {
          fetcher: large,
          env,
        })
      ).message,
    ).toContain('64KB');
    const fetcher = jest.fn(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new Error('internal secret')),
          );
        }),
    );
    const result = await runIntegrationProbe(target, input, 'army', {
      fetcher,
      env,
      timeoutMs: 5,
    });
    expect(result.outcome).toBe('failed');
    expect(result.message).toContain('응답이 완료되지');
    expect(result.message).not.toContain('internal secret');
  });
  it('rejects query credentials before contacting the network', async () => {
    const fetcher = jest.fn();
    expect(
      (
        await runIntegrationProbe(
          target,
          { ...input, query: 'access_token=secret' },
          'army',
          { fetcher, env },
        )
      ).outcome,
    ).toBe('blocked');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('cancels streaming bodies when redirect or error headers cause an early return', async () => {
    for (const status of [302, 401, 503]) {
      const cancel = jest.fn();
      const stream = new ReadableStream({ cancel });
      const fetcher = jest
        .fn()
        .mockResolvedValue(new Response(stream, { status }));
      await runIntegrationProbe(target, input, 'army', { fetcher, env });
      expect(cancel).toHaveBeenCalledTimes(1);
    }
  });
  it('binds tenant path variables to authenticated context and rejects alternate query tenant keys', async () => {
    const fetcher = jest.fn().mockResolvedValue(new Response('{}'));
    const scopedTarget = {
      ...target,
      readPaths: ['/api/tenants/{tenantId}/workspaces'],
    };
    expect(
      (
        await runIntegrationProbe(
          scopedTarget,
          { ...input, path: '/api/tenants/navy/workspaces' },
          'army',
          { fetcher, env },
        )
      ).outcome,
    ).toBe('blocked');
    for (const key of ['tenant_id', 'tenantID', 'tenant-id']) {
      expect(
        (
          await runIntegrationProbe(
            target,
            { ...input, query: `${key}=navy` },
            'army',
            { fetcher, env },
          )
        ).outcome,
      ).toBe('blocked');
    }
    expect(fetcher).not.toHaveBeenCalled();
    expect(
      (
        await runIntegrationProbe(
          scopedTarget,
          { ...input, path: '/api/tenants/army/workspaces' },
          'army',
          { fetcher, env },
        )
      ).outcome,
    ).toBe('passed');
  });
  it('redacts nested secrets and limits nested response structures', () => {
    expect(
      responseShape({
        password: 'secret',
        nested: { token: 'secret', enabled: true, count: 200 },
      }),
    ).toEqual({
      password: '[redacted]',
      nested: { token: '[redacted]', enabled: false, count: 0 },
    });
  });
});
