import { useCallback } from 'react';
import {
  discoveryApiRef,
  identityApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { extractDownloadFilename } from './transferServerData';

export interface TransferHttpErrorShape {
  status?: number;
  code?: string;
}

const toHttpError = (
  status: number,
  body: { error?: { code?: string; message?: string } } | null,
): Error => {
  const error = new Error(
    body?.error?.message || `요청을 처리하지 못했습니다 (${status}).`,
  ) as Error & TransferHttpErrorShape;
  error.status = status;
  error.code = body?.error?.code;
  return error;
};

const readErrorBody = async (
  response: Response,
): Promise<{ error?: { code?: string; message?: string } } | null> =>
  response.json().catch(() => null);

export const useTransferFileHttp = () => {
  const discovery = useApi(discoveryApiRef);
  const identity = useApi(identityApiRef);
  const { tenantId } = usePortalRuntime();

  const authFetch = useCallback(
    async (path: string, init: RequestInit): Promise<Response> => {
      const [{ token }, base] = await Promise.all([
        identity.getCredentials(),
        discovery.getBaseUrl('portal'),
      ]);
      const headers = new Headers(init.headers);
      if (token) headers.set('Authorization', `Bearer ${token}`);
      if (tenantId) headers.set('x-portal-tenant-id', tenantId);
      return fetch(`${base}${path}`, {
        ...init,
        headers,
        credentials: 'include',
      });
    },
    [identity, discovery, tenantId],
  );

  const uploadForm = useCallback(
    async <T,>(
      path: string,
      form: FormData,
    ): Promise<{ data: T; meta: Record<string, unknown> }> => {
      const response = await authFetch(path, { method: 'POST', body: form });
      const body = await readErrorBody(response);
      if (!response.ok) throw toHttpError(response.status, body);
      return body as { data: T; meta: Record<string, unknown> };
    },
    [authFetch],
  );

  const downloadFile = useCallback(
    async (
      path: string,
      fallbackName: string,
    ): Promise<{ blob: Blob; filename: string }> => {
      const response = await authFetch(path, { method: 'GET' });
      if (!response.ok) {
        throw toHttpError(response.status, await readErrorBody(response));
      }
      const blob = await response.blob();
      const filename = extractDownloadFilename(
        response.headers.get('Content-Disposition'),
        fallbackName,
      );
      return { blob, filename };
    },
    [authFetch],
  );

  return { uploadForm, downloadFile };
};
