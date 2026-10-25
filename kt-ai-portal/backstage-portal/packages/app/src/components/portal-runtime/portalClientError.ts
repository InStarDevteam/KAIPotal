export type PortalErrorKind =
  | 'permission'
  | 'not_found'
  | 'conflict'
  | 'invalid'
  | 'network';

export interface PortalClientError {
  kind: PortalErrorKind;
  message: string;
  code: string | null;
  status: number | null;
}

export const classifyPortalClientError = (error: unknown): PortalClientError => {
  const status =
    (error as { status?: number } | null)?.status ?? null;
  const code = (error as { code?: string } | null)?.code ?? null;
  const message =
    error instanceof Error && error.message
      ? error.message
      : '요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.';
  if (status === 403 || code === 'permission_denied')
    return { kind: 'permission', message, code, status };
  if (status === 404 || code === 'not_found')
    return { kind: 'not_found', message, code, status };
  if (status === 409)
    return { kind: 'conflict', message, code, status };
  if (status === 422)
    return { kind: 'invalid', message, code, status };
  return { kind: 'network', message, code, status };
};
