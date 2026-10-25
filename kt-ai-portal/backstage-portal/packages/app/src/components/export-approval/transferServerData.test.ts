import {
  buildTransferFileForm,
  buildTransferSubmitForm,
  canCancelTransfer,
  canDecideTransferStatus,
  classifyTransferFetchError,
  extractDownloadFilename,
  formatFileSize,
  isTransferFileDownloadable,
  newIdempotencyKey,
  shortSha256,
  validateTransferFile,
  validateTransferReason,
  TransferRequestDetail,
  TransferRequestRow,
} from './transferServerData';

describe('transfer server data utilities', () => {
  describe('validateTransferFile', () => {
    it('accepts supported types within the size limit', () => {
      expect(
        validateTransferFile({ name: 'a.pdf', size: 1024, type: 'application/pdf' }),
      ).toBeNull();
      expect(
        validateTransferFile({ name: 'a.txt', size: 10, type: 'text/markdown' }),
      ).toBeNull();
      expect(
        validateTransferFile({ name: 'a.png', size: 5, type: 'image/png' }),
      ).toBeNull();
    });
    it('rejects empty, oversized and unsupported files with guidance', () => {
      expect(
        validateTransferFile({ name: 'a.pdf', size: 0, type: 'application/pdf' }),
      ).toContain('빈 파일');
      expect(
        validateTransferFile({
          name: 'a.zip',
          size: 100 * 1024 * 1024 + 1,
          type: 'application/zip',
        }),
      ).toContain('100MB');
      expect(
        validateTransferFile({ name: 'a.exe', size: 10, type: 'application/x-msdownload' }),
      ).toContain('형식');
    });
  });

  describe('decision and download guards', () => {
    it('only requested and in_review rows are decideable', () => {
      expect(canDecideTransferStatus('requested')).toBe(true);
      expect(canDecideTransferStatus('in_review')).toBe(true);
      expect(canDecideTransferStatus('supplement_requested')).toBe(false);
      expect(canDecideTransferStatus('approved')).toBe(false);
      expect(canDecideTransferStatus('rejected')).toBe(false);
      expect(canDecideTransferStatus('cancelled')).toBe(false);
    });
    it('only the requester can cancel a requested row', () => {
      const row = { status: 'requested' as const, requested_by: 'u1' };
      expect(canCancelTransfer(row, 'u1')).toBe(true);
      expect(canCancelTransfer(row, 'u2')).toBe(false);
      expect(canCancelTransfer({ status: 'in_review', requested_by: 'u1' }, 'u1')).toBe(false);
    });
    it('only the approved file version is downloadable', () => {
      const detail = { status: 'approved' as const, approved_file_version: 2 };
      expect(isTransferFileDownloadable({ version: 2 }, detail)).toBe(true);
      expect(isTransferFileDownloadable({ version: 3 }, detail)).toBe(false);
      expect(
        isTransferFileDownloadable(
          { version: 1 },
          { status: 'rejected' as const, approved_file_version: null },
        ),
      ).toBe(false);
    });
  });

  describe('multipart form builders', () => {
    const file = new Blob(['data'], { type: 'application/pdf' }) as Blob & {
      name?: string;
    };
    file.name = '보고서.pdf';

    it('builds the create form with fields, file and idempotency key', () => {
      const key = newIdempotencyKey();
      const form = buildTransferSubmitForm(
        {
          kind: 'export',
          subjectType: 'artifact',
          title: ' 모델 반출 ',
          purpose: '협력사 전달',
          securityGrade: 'confidential',
          publicConsent: false,
          publicScope: 'none',
          usagePermission: 'approved_users',
        },
        file,
        key,
      );
      expect(form.get('kind')).toBe('export');
      expect(form.get('subject_type')).toBe('artifact');
      expect(form.get('title')).toBe('모델 반출');
      expect(form.get('public_consent')).toBe('false');
      expect(form.get('public_scope')).toBe('none');
      expect(form.get('idempotency_key')).toBe(key);
      const sent = form.get('file');
      expect(sent).toBeInstanceOf(Blob);
      expect((sent as { name?: string }).name).toBe('보고서.pdf');
    });
    it('builds the file-version form with a single file field', () => {
      const form = buildTransferFileForm(file);
      expect(form.get('file')).toBeInstanceOf(Blob);
      expect([...form.keys()]).toEqual(['file']);
    });
  });

  describe('classifyTransferFetchError', () => {
    const errorWith = (status?: number, code?: string, message = '실패') => {
      const error = new Error(message) as Error & { status?: number; code?: string };
      if (status !== undefined) error.status = status;
      if (code !== undefined) error.code = code;
      return error;
    };
    it('maps 403 to permission and 409 to conflict', () => {
      expect(classifyTransferFetchError(errorWith(403)).kind).toBe('permission');
      expect(classifyTransferFetchError(errorWith(undefined, 'forbidden')).kind).toBe('permission');
      expect(classifyTransferFetchError(errorWith(409)).kind).toBe('conflict');
      expect(
        classifyTransferFetchError(errorWith(undefined, 'not_approved_version')).kind,
      ).toBe('conflict');
    });
    it('maps 422/file_too_large to invalid and the rest to network', () => {
      expect(classifyTransferFetchError(errorWith(422)).kind).toBe('invalid');
      expect(
        classifyTransferFetchError(errorWith(undefined, 'file_too_large')).kind,
      ).toBe('invalid');
      expect(classifyTransferFetchError(errorWith(503, 'storage_unavailable')).kind).toBe('network');
      expect(classifyTransferFetchError(new Error('boom')).message).toBe('boom');
    });
  });

  describe('display helpers', () => {
    it('formats file sizes without fabricating', () => {
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(2048)).toBe('2.0 KB');
      expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
      expect(formatFileSize(-1)).toBe('—');
    });
    it('shortens sha256 digests', () => {
      expect(shortSha256('a'.repeat(64))).toBe(`${'a'.repeat(16)}…`);
      expect(shortSha256('abc')).toBe('abc');
    });
    it('parses UTF-8 content-disposition filenames', () => {
      expect(
        extractDownloadFilename(
          "attachment; filename*=UTF-8''%EB%B3%B4%EA%B3%A0%EC%84%9C.pdf",
          'fallback',
        ),
      ).toBe('보고서.pdf');
      expect(extractDownloadFilename('attachment; filename="report.pdf"', 'fallback')).toBe(
        'report.pdf',
      );
      expect(extractDownloadFilename(null, 'fallback.pdf')).toBe('fallback.pdf');
    });
    it('validates decision reasons', () => {
      expect(validateTransferReason('')).toContain('입력');
      expect(validateTransferReason('x'.repeat(501))).toContain('500자');
      expect(validateTransferReason('승인')).toBeNull();
    });
  });

  describe('server detail mapping assumptions', () => {
    it('uses the server-provided stale approval flags as-is', () => {
      const detail = {
        status: 'approved',
        approved_file_version: 1,
        staleApproval: true,
        staleApprovalMessage: '승인 후 파일 변경됨(버전 1→2).',
      } as TransferRequestDetail;
      expect(detail.staleApproval).toBe(true);
      expect(detail.staleApprovalMessage).toContain('승인 후 파일 변경됨');
    });
    it('treats supplement_requested as a review state, not a decision', () => {
      const row = { status: 'supplement_requested' } as TransferRequestRow;
      expect(canDecideTransferStatus(row.status)).toBe(false);
    });
  });
});
