export const integrationPlatformIds = [
  'ai',
  'data',
  'cloud',
  'vdi',
  'identity',
  'security',
  'portal',
  'external',
] as const;
export type IntegrationPlatformId = (typeof integrationPlatformIds)[number];
export interface IntegrationTarget {
  baseUrl: string;
  healthPath: string;
  readPaths: string[];
  tokenEnv?: string;
}
export interface ProbeInput {
  platform: IntegrationPlatformId;
  kind: 'connection' | 'contract';
  path?: string;
  query?: string;
}
export interface ProbeResult {
  outcome: 'passed' | 'failed' | 'blocked';
  status: number | null;
  elapsedMs: number;
  message: string;
  response?: unknown;
  checks: string[];
}
const safePath = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\/[a-zA-Z0-9/_{}.-]*$/.test(value) &&
  !value.includes('..') &&
  !value.startsWith('//');
export const configuredTargets = (
  tenantId: string,
  env: NodeJS.ProcessEnv = process.env,
): Partial<Record<IntegrationPlatformId, IntegrationTarget>> => {
  // Only deployment configuration supplies destinations. Tenant admins cannot turn
  // this diagnostic endpoint into an arbitrary network proxy.
  try {
    const data = JSON.parse(env.PORTAL_INTEGRATION_TARGETS || '{}')[tenantId];
    if (!data || typeof data !== 'object') return {};
    return Object.fromEntries(
      integrationPlatformIds.flatMap(id => {
        const item = data[id];
        if (!item || typeof item.baseUrl !== 'string') return [];
        const url = new URL(item.baseUrl);
        if (
          url.protocol !== 'https:' ||
          url.username ||
          url.password ||
          url.search ||
          url.hash ||
          !safePath(item.healthPath) ||
          !Array.isArray(item.readPaths) ||
          !item.readPaths.every(safePath)
        )
          return [];
        if (
          item.tokenEnv !== undefined &&
          (typeof item.tokenEnv !== 'string' ||
            !/^PORTAL_CONNECTOR_[A-Z0-9_]+_TOKEN$/.test(item.tokenEnv))
        )
          return [];
        return [
          [
            id,
            {
              baseUrl: url.toString().replace(/\/$/, ''),
              healthPath: item.healthPath,
              readPaths: item.readPaths,
              tokenEnv: item.tokenEnv,
            },
          ],
        ];
      }),
    );
  } catch {
    return {};
  }
};

export const pathAllowed = (path: string, patterns: string[]) =>
  safePath(path) &&
  patterns.some(pattern => {
    const expression = pattern
      .replace(/[.*+?^$()|[\]\\]/g, '\\$&')
      .replace(/\{\w+\}/g, '[A-Za-z0-9_-]+');
    return new RegExp(`^${expression}$`).test(path);
  });

// A connection test returns structure, not raw platform content. This avoids
// copying access tokens, business data, or personal data into the browser/history.
export const responseShape = (value: unknown, depth = 0): unknown => {
  if (depth > 4) return '[nested]';
  if (value === null) return null;
  if (Array.isArray(value))
    return value.slice(0, 1).map(item => responseShape(item, depth + 1));
  if (typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 60)
        .map(([key, item]) => [
          key,
          /token|secret|password|authorization|cookie/i.test(key)
            ? '[redacted]'
            : responseShape(item, depth + 1),
        ]),
    );
  if (typeof value === 'number') return 0;
  if (typeof value === 'boolean') return false;
  return '[string]';
};

export const runIntegrationProbe = async (
  target: IntegrationTarget | undefined,
  input: ProbeInput,
  tenantId: string,
  options: {
    fetcher?: typeof fetch;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
  } = {},
): Promise<ProbeResult> => {
  const start = Date.now();
  const result = (
    outcome: ProbeResult['outcome'],
    message: string,
    status: number | null = null,
    response?: unknown,
  ): ProbeResult => ({
    outcome,
    message,
    status,
    response,
    elapsedMs: Date.now() - start,
    checks: [
      '서버 인가 및 테넌트 확인',
      '등록된 HTTPS 목적지 · GET 전용',
      '응답값 비식별화',
    ],
  });
  if (!target)
    return result(
      'blocked',
      '이 테넌트에 등록된 실연동 주소가 없습니다. 배포 담당자가 연결 설정을 등록해야 합니다.',
    );
  const path = input.kind === 'connection' ? target.healthPath : input.path;
  const tenantPaths = target.readPaths.map(pattern =>
    pattern.replace(/\{tenant[_-]?id\}/gi, tenantId),
  );
  if (
    !path ||
    !safePath(path) ||
    (input.kind === 'contract' && !pathAllowed(path, tenantPaths))
  )
    return result(
      'blocked',
      '허용된 조회 API 경로가 아닙니다. 배포 설정의 readPaths를 확인하세요.',
    );
  const env = options.env || process.env;
  const token = target.tokenEnv ? env[target.tokenEnv] : undefined;
  if (target.tokenEnv && !token)
    return result('blocked', '서버의 연동 인증정보가 등록되지 않았습니다.');
  const url = new URL(`${target.baseUrl}${path}`);
  if (input.kind === 'contract' && input.query) {
    if (input.query.length > 4096)
      return result('blocked', '조회 조건이 너무 깁니다.');
    const query = new URLSearchParams(input.query);
    if (
      [...query.keys()].some(
        key =>
          key !== 'tenantId' &&
          key.replace(/[_-]/g, '').toLowerCase() === 'tenantid',
      )
    )
      return result(
        'blocked',
        '테넌트 식별자는 서버의 현재 소속만 사용할 수 있습니다.',
      );
    if (
      [...query.keys()].some(key =>
        /token|secret|password|authorization/i.test(key),
      )
    )
      return result('blocked', '인증정보를 조회 조건에 포함할 수 없습니다.');
    url.search = query.toString();
  }
  // Never trust a tenant ID supplied in the request editor.
  if (input.kind === 'contract') url.searchParams.set('tenantId', tenantId);
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs || 8000,
  );
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await (options.fetcher || fetch)(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'X-Portal-Tenant-Id': tenantId,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    reader = response.body?.getReader();
    if (response.status >= 300 && response.status < 400)
      return result(
        'blocked',
        '리다이렉트 응답은 따라가지 않습니다. 최종 API 주소를 등록하세요.',
        response.status,
      );
    if (!response.ok)
      return result(
        'failed',
        `플랫폼이 HTTP ${response.status}로 응답했습니다. 인증·권한·API 경로를 확인하세요.`,
        response.status,
      );
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      let chunk = await reader.read();
      while (!chunk.done) {
        size += chunk.value.byteLength;
        if (size > 65536)
          return result(
            'failed',
            '응답이 64KB 제한을 초과했습니다. 더 작은 조회 범위로 다시 실행하세요.',
            response.status,
          );
        chunks.push(chunk.value);
        chunk = await reader.read();
      }
    }
    const body = Buffer.concat(chunks).toString('utf8');
    let shape: unknown;
    try {
      shape = body ? responseShape(JSON.parse(body)) : null;
    } catch {
      return result(
        input.kind === 'connection' ? 'passed' : 'failed',
        input.kind === 'connection'
          ? 'HTTPS 접속 성공. JSON 응답이 아닌 상태 점검 경로입니다.'
          : '접속은 성공했지만 JSON 응답 계약을 확인할 수 없습니다.',
        response.status,
      );
    }
    return result(
      'passed',
      input.kind === 'connection'
        ? '등록된 상태 점검 경로에 실제 HTTPS 접속을 완료했습니다.'
        : '실제 GET 응답을 수신했습니다. 아래에는 값이 제거된 응답 구조만 표시됩니다.',
      response.status,
      shape,
    );
  } catch {
    return result(
      'failed',
      controller.signal.aborted
        ? '8초 이내에 응답이 완료되지 않았습니다. 플랫폼 상태와 네트워크를 확인하세요.'
        : 'HTTPS 접속에 실패했습니다. DNS·인증서·방화벽·플랫폼 가동 상태를 확인하세요.',
    );
  } finally {
    clearTimeout(timeout);
    if (reader) await reader.cancel().catch(() => {});
  }
};
