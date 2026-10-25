import { Knex } from 'knex';
import {
  addTransferFileVersion,
  canTransitionTransfer,
  resolveTransferDownload,
  TRANSFER_STATUSES,
  validSha256,
  validTransferMime,
} from './transfers';

describe('반입·반출 상태 전이', () => {
  test('허용 전이 매트릭스', () => {
    expect(canTransitionTransfer('requested', 'in_review')).toBe(true);
    expect(canTransitionTransfer('requested', 'approved')).toBe(true);
    expect(canTransitionTransfer('requested', 'rejected')).toBe(true);
    expect(canTransitionTransfer('requested', 'supplement_requested')).toBe(true);
    expect(canTransitionTransfer('requested', 'cancelled')).toBe(true);
    expect(canTransitionTransfer('in_review', 'approved')).toBe(true);
    expect(canTransitionTransfer('supplement_requested', 'in_review')).toBe(true);
  });
  test.each(TRANSFER_STATUSES)('종결·취소 상태(%s)는 어떤 전이도 허용하지 않는다', from => {
    if (from === 'requested' || from === 'in_review' || from === 'supplement_requested') {
      return;
    }
    for (const to of TRANSFER_STATUSES) {
      expect(canTransitionTransfer(from, to)).toBe(false);
    }
  });
  test('불가 전이: 승인 후 재승인/반려, 취소 후 변경, requested→직접 종결 외 비정규 경로', () => {
    expect(canTransitionTransfer('approved', 'rejected')).toBe(false);
    expect(canTransitionTransfer('approved', 'approved')).toBe(false);
    expect(canTransitionTransfer('cancelled', 'requested')).toBe(false);
    expect(canTransitionTransfer('in_review', 'cancelled')).toBe(false);
    expect(canTransitionTransfer('rejected', 'in_review')).toBe(false);
  });
});

describe('파일 형식·체크섬 검증', () => {
  test('MIME 허용 목록', () => {
    expect(validTransferMime('application/pdf')).toBe(true);
    expect(validTransferMime('text/csv')).toBe(true);
    expect(validTransferMime('image/png')).toBe(true);
    expect(validTransferMime('application/x-msdownload')).toBe(false);
    expect(validTransferMime('application/x-dosexec')).toBe(false);
  });
  test('sha256은 소문자 64자 hex만 허용한다', () => {
    expect(validSha256('a'.repeat(64))).toBe(true);
    expect(validSha256('A'.repeat(64))).toBe(false);
    expect(validSha256('z'.repeat(64))).toBe(false);
    expect(validSha256('a'.repeat(63))).toBe(false);
  });
});

interface FakeRequestRow {
  id: string;
  tenant_id: string;
  status: string;
  requested_by: string;
  approved_file_version: number | null;
}

interface FakeFileRow {
  id: string;
  tenant_id: string;
  request_id: string;
  version: number;
}

const makeTrx = (
  state: {
    requests: FakeRequestRow[];
    files: FakeFileRow[];
  },
  tenantId: string,
) => {
  const trx = ((table: string) => {
    const conds: Array<Record<string, unknown>> = [];
    const qb: Record<string, unknown> = {};
    const rows = () =>
      table === 'portal.fc_transfer_request' ? state.requests : state.files;
    const matched = () =>
      (rows() as unknown as Array<Record<string, unknown>>).filter(
        row =>
          row.tenant_id === tenantId &&
          conds.every(c =>
            Object.entries(c).every(([key, value]) => row[key] === value),
          ),
      );
    qb.where = (c: Record<string, unknown>) => {
      conds.push(c);
      return qb;
    };
    qb.first = async () => matched()[0];
    qb.max = (column: string) => ({
      first: async () => {
        const values = matched().map(row => Number(row[column.split(' ')[0]]));
        return { max_version: values.length ? Math.max(...values) : null };
      },
    });
    qb.insert = (row: Record<string, unknown>) => ({
      returning: async () => {
        (rows() as unknown as Array<Record<string, unknown>>).push(row);
        return [row];
      },
    });
    return qb;
  }) as unknown as {
    (table: string): unknown;
    raw: (sql: string, bindings?: unknown[]) => Promise<{ rows: unknown[] }>;
  };
  trx.raw = async () => ({ rows: [] });
  (trx as unknown as { fn: unknown }).fn = { now: () => new Date() };
  return trx as unknown as Knex.Transaction;
};

describe('승인 버전 고정·다운로드 허용 버전', () => {
  const request: FakeRequestRow = {
    id: 'req-1',
    tenant_id: 't-1',
    status: 'approved',
    requested_by: 'u-1',
    approved_file_version: 1,
  };

  test('승인된 버전의 파일만 다운로드 허용', async () => {
    const state = {
      requests: [{ ...request }],
      files: [
        { id: 'f-1', tenant_id: 't-1', request_id: 'req-1', version: 1 },
      ],
    };
    const result = await resolveTransferDownload(makeTrx(state, 't-1'), 't-1', 'f-1');
    expect(result).toMatchObject({ ok: true, value: { file: { id: 'f-1' } } });
  });

  test('승인 후 교체한 신규 버전은 다운로드 거부(409 계열 코드)', async () => {
    const state = {
      requests: [{ ...request }],
      files: [
        { id: 'f-1', tenant_id: 't-1', request_id: 'req-1', version: 1 },
        { id: 'f-2', tenant_id: 't-1', request_id: 'req-1', version: 2 },
      ],
    };
    const result = await resolveTransferDownload(makeTrx(state, 't-1'), 't-1', 'f-2');
    expect(result).toMatchObject({ ok: false, code: 'not_approved_version' });
  });

  test('승인되지 않은 신청의 파일은 다운로드 거부', async () => {
    const state = {
      requests: [{ ...request, status: 'in_review', approved_file_version: null }],
      files: [
        { id: 'f-1', tenant_id: 't-1', request_id: 'req-1', version: 1 },
      ],
    };
    const result = await resolveTransferDownload(makeTrx(state, 't-1'), 't-1', 'f-1');
    expect(result).toMatchObject({ ok: false, code: 'not_approved_version' });
  });

  test('타 테넌트 파일은 찾을 수 없다 (not_found)', async () => {
    const state = {
      requests: [{ ...request, tenant_id: 'other-tenant' }],
      files: [
        { id: 'f-1', tenant_id: 'other-tenant', request_id: 'req-1', version: 1 },
      ],
    };
    const result = await resolveTransferDownload(makeTrx(state, 't-1'), 't-1', 'f-1');
    expect(result).toMatchObject({ ok: false, code: 'not_found' });
  });
});

describe('파일 신규 버전 업로드', () => {
  const validMeta = {
    storedName: 'stored-uuid',
    originalName: '증빙.pdf',
    mime: 'application/pdf',
    sizeBytes: 1024,
    sha256: 'a'.repeat(64),
  };

  test('버전이 1씩 증가하고 승인된 요청에는 staleApproval이 표시된다', async () => {
    const state = {
      requests: [
        {
          id: 'req-1',
          tenant_id: 't-1',
          status: 'approved',
          requested_by: 'u-1',
          approved_file_version: 1,
        },
      ],
      files: [
        { id: 'f-1', tenant_id: 't-1', request_id: 'req-1', version: 1 },
      ],
    };
    const result = await addTransferFileVersion(
      makeTrx(state, 't-1'),
      't-1',
      'req-1',
      'u-1',
      validMeta,
    );
    expect(result).toMatchObject({
      ok: true,
      value: { file: { version: 2 }, staleApproval: true, previousApprovedVersion: 1 },
    });
    expect(state.files).toHaveLength(2);
  });

  test('본인 신청이 아니면 파일 교체를 거부한다 (forbidden)', async () => {
    const state = {
      requests: [
        {
          id: 'req-1',
          tenant_id: 't-1',
          status: 'requested',
          requested_by: 'u-1',
          approved_file_version: null,
        },
      ],
      files: [] as FakeFileRow[],
    };
    const result = await addTransferFileVersion(
      makeTrx(state, 't-1'),
      't-1',
      'req-1',
      'u-2',
      validMeta,
    );
    expect(result).toMatchObject({ ok: false, code: 'forbidden' });
    expect(state.files).toHaveLength(0);
  });

  test.each([
    { ...validMeta, mime: 'application/x-msdownload' },
    { ...validMeta, sizeBytes: 0 },
    { ...validMeta, sha256: 'not-a-hash' },
    { ...validMeta, storedName: '../escape' },
  ])('잘못된 파일 메타(%o)는 invalid_input으로 거부한다', async meta => {
    const state = {
      requests: [
        {
          id: 'req-1',
          tenant_id: 't-1',
          status: 'requested',
          requested_by: 'u-1',
          approved_file_version: null,
        },
      ],
      files: [] as FakeFileRow[],
    };
    const result = await addTransferFileVersion(
      makeTrx(state, 't-1'),
      't-1',
      'req-1',
      'u-1',
      meta,
    );
    expect(result).toMatchObject({ ok: false, code: 'invalid_input' });
    expect(state.files).toHaveLength(0);
  });
});
