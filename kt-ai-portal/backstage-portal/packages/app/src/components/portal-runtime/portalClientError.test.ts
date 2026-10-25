import { classifyPortalClientError } from './portalClientError';

const errorWith = (status?: number, code?: string, message = '실패') => {
  const error = new Error(message) as Error & { status?: number; code?: string };
  if (status !== undefined) error.status = status;
  if (code !== undefined) error.code = code;
  return error;
};

test('classifies status codes into permission, not found, conflict, invalid and network', () => {
  expect(classifyPortalClientError(errorWith(403)).kind).toBe('permission');
  expect(
    classifyPortalClientError(errorWith(undefined, 'permission_denied')).kind,
  ).toBe('permission');
  expect(classifyPortalClientError(errorWith(404)).kind).toBe('not_found');
  expect(classifyPortalClientError(errorWith(409, 'version_conflict')).kind).toBe(
    'conflict',
  );
  expect(classifyPortalClientError(errorWith(422, 'invalid_project')).kind).toBe(
    'invalid',
  );
  expect(classifyPortalClientError(errorWith(500, 'internal_error')).kind).toBe(
    'network',
  );
  expect(classifyPortalClientError(new TypeError('boom')).kind).toBe('network');
});

test('keeps the server message and code for display and keeps unknown errors honest', () => {
  const conflict = classifyPortalClientError(
    errorWith(409, 'reviewed_locked', '답변이 등록된 제안은 수정할 수 없습니다.'),
  );
  expect(conflict.message).toBe('답변이 등록된 제안은 수정할 수 없습니다.');
  expect(conflict.code).toBe('reviewed_locked');
  expect(conflict.status).toBe(409);
  const unknown = classifyPortalClientError('not-an-error');
  expect(unknown.kind).toBe('network');
  expect(unknown.code).toBeNull();
  expect(unknown.status).toBeNull();
});
