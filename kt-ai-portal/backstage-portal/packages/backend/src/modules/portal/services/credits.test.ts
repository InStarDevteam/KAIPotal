import { Knex } from 'knex';
import {
  addMinor,
  applyCreditTransaction,
  compareMinor,
  fromMinor,
  multiplyMinorHalfUp,
  toMinor,
  validSignForType,
} from './credits';

describe('credit decimal (scale 4, string 기반 — JS number 미사용)', () => {
  test('toMinor/fromMinor round trip, 음수·4자리 패딩 포함', () => {
    expect(toMinor('100')).toBe(1000000n);
    expect(toMinor('0.0001')).toBe(1n);
    expect(toMinor('-12.3456')).toBe(-123456n);
    expect(fromMinor(1000000n)).toBe('100.0000');
    expect(fromMinor(1n)).toBe('0.0001');
    expect(fromMinor(-123456n)).toBe('-12.3456');
    expect(fromMinor(toMinor('999999999999.9999'))).toBe('999999999999.9999');
  });
  test('유효하지 않은 금액 문자열은 거부한다', () => {
    for (const bad of [
      '',
      'abc',
      '1.23456',
      '1,000',
      '0x10',
      '--1',
      '1e3',
      'Infinity',
    ]) {
      expect(() => toMinor(bad)).toThrow('invalid_amount');
    }
  });
  test('반올림은 half-up이며 스케일 8 곱셈 결과를 4자리로 맞춘다', () => {
    expect(multiplyMinorHalfUp(3n, 5000n)).toBe(2n);
    expect(multiplyMinorHalfUp(3n, 5001n)).toBe(2n);
    expect(multiplyMinorHalfUp(3n, 4999n)).toBe(1n);
    expect(multiplyMinorHalfUp(-1n, 5000n)).toBe(-1n);
    expect(multiplyMinorHalfUp(toMinor('2.5'), toMinor('3.1'))).toBe(
      toMinor('7.75'),
    );
    expect(multiplyMinorHalfUp(toMinor('0.0001'), toMinor('0.0001'))).toBe(0n);
  });
  test('부호 규칙: grant/charge는 양수, deduct는 음수, adjust는 0이 아닌任意 부호', () => {
    expect(validSignForType('grant', 1n)).toBe(true);
    expect(validSignForType('grant', -1n)).toBe(false);
    expect(validSignForType('charge', 0n)).toBe(false);
    expect(validSignForType('deduct', -1n)).toBe(true);
    expect(validSignForType('deduct', 1n)).toBe(false);
    expect(validSignForType('adjust', 1n)).toBe(true);
    expect(validSignForType('adjust', -1n)).toBe(true);
    expect(validSignForType('adjust', 0n)).toBe(false);
  });
  test('덧셈·비교는 정수 연산으로 정확하다', () => {
    expect(addMinor(toMinor('0.1'), toMinor('0.2'))).toBe(toMinor('0.3'));
    expect(compareMinor(toMinor('1.0000'), toMinor('1'))).toBe(0);
    expect(compareMinor(toMinor('2'), toMinor('1.9999'))).toBe(1);
  });
});

interface FakeAccount {
  id: string;
  tenant_id: string;
  balance: string;
  version: number;
}

const makeTrx = (
  state: {
    accounts: FakeAccount[];
    transactions: Array<Record<string, unknown>>;
  },
  tenantId: string,
) => {
  let lastRawAmount = '0';
  const matches = (
    row: Record<string, unknown>,
    conds: Array<Record<string, unknown>>,
  ) =>
    conds.every(c =>
      Object.entries(c).every(([key, value]) => row[key] === value),
    );
  const trx = ((table: string) => {
    const conds: Array<Record<string, unknown>> = [];
    const qb: Record<string, unknown> = {};
    qb.where = (c: Record<string, unknown>) => {
      conds.push(c);
      return qb;
    };
    qb.modify = (fn: (b: unknown) => void) => {
      fn(qb);
      return qb;
    };
    qb.whereRaw = () => qb;
    qb.first = async () => {
      const tenantScoped = <T extends { tenant_id?: string }>(
        row: T,
      ): boolean => row.tenant_id === undefined || row.tenant_id === tenantId;
      if (table === 'portal.fc_credit_transaction') {
        return state.transactions.find(
          row => tenantScoped(row) && matches(row, conds),
        );
      }
      return state.accounts.find(
        row => tenantScoped(row) && matches(row as never, conds),
      );
    };
    qb.update = async () => {
      const account = state.accounts.find(
        row => row.tenant_id === tenantId && matches(row as never, conds),
      );
      if (!account) return 0;
      account.balance = fromMinor(
        toMinor(account.balance) + toMinor(lastRawAmount),
      );
      account.version += 1;
      return 1;
    };
    qb.insert = (row: Record<string, unknown>) => ({
      returning: async () => {
        const saved = { ...row, id: `tx-${state.transactions.length + 1}` };
        state.transactions.push(saved);
        return [saved];
      },
    });
    return qb;
  }) as unknown as {
    (table: string): unknown;
    raw: (sql: string, bindings?: unknown[]) => Promise<{ rows: unknown[] }>;
  };
  trx.raw = async (_sql: string, bindings?: unknown[]) => {
    if (Array.isArray(bindings) && typeof bindings[0] === 'string') {
      lastRawAmount = bindings[0];
    }
    return { rows: [] };
  };
  (trx as unknown as { fn: unknown }).fn = { now: () => new Date() };
  return trx as unknown as Knex.Transaction;
};

describe('applyCreditTransaction (멱등 차감·낙관적 락·잔액 부족)', () => {
  const baseAccount: FakeAccount = {
    id: 'acc-1',
    tenant_id: 't-1',
    balance: '100.0000',
    version: 1,
  };

  test('차감 성공: 잔액·버전 갱신과 거래 원장 INSERT가 함께 반영된다', async () => {
    const state = {
      accounts: [{ ...baseAccount }],
      transactions: [] as Array<Record<string, unknown>>,
    };
    const trx = makeTrx(state, 't-1');
    const result = await applyCreditTransaction(trx, 't-1', {
      accountId: 'acc-1',
      type: 'deduct',
      amount: '-30.0000',
      reason: '사용 차감',
      idempotencyKey: 'deduct-1',
      createdBy: 'u-1',
    });
    expect(result).toMatchObject({
      ok: true,
      value: { balance: '70.0000', transaction: { type: 'deduct' } },
    });
    expect(state.accounts[0].version).toBe(2);
    expect(state.transactions).toHaveLength(1);
  });

  test('잔액 부족 차감은 거부(409 계열 코드)하고 원장에 남기지 않는다', async () => {
    const state = {
      accounts: [{ ...baseAccount }],
      transactions: [] as Array<Record<string, unknown>>,
    };
    const result = await applyCreditTransaction(makeTrx(state, 't-1'), 't-1', {
      accountId: 'acc-1',
      type: 'deduct',
      amount: '-100.0001',
      reason: '초과 차감',
      createdBy: 'u-1',
    });
    expect(result).toMatchObject({ ok: false, code: 'insufficient_balance' });
    expect(state.accounts[0].balance).toBe('100.0000');
    expect(state.accounts[0].version).toBe(1);
    expect(state.transactions).toHaveLength(0);
  });

  test('idempotency_key 재시도는 기존 거래를 반환하고 잔액을 두 번 차감하지 않는다', async () => {
    const state = {
      accounts: [{ ...baseAccount }],
      transactions: [] as Array<Record<string, unknown>>,
    };
    const input = {
      accountId: 'acc-1',
      type: 'deduct' as const,
      amount: '-10.0000',
      reason: '차감',
      idempotencyKey: 'same-key',
      createdBy: 'u-1',
    };
    const first = await applyCreditTransaction(
      makeTrx(state, 't-1'),
      't-1',
      input,
    );
    const second = await applyCreditTransaction(
      makeTrx(state, 't-1'),
      't-1',
      input,
    );
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok)
      throw new Error('Expected both credit transactions to succeed');
    expect(second.value.transaction.id).toBe(first.value.transaction.id);
    expect(second.value.balance).toBe('90.0000');
    expect(state.transactions).toHaveLength(1);
    expect(state.accounts[0].balance).toBe('90.0000');
  });

  test('expectedVersion 불일치는 version_conflict로 거부한다', async () => {
    const state = {
      accounts: [{ ...baseAccount }],
      transactions: [] as Array<Record<string, unknown>>,
    };
    const result = await applyCreditTransaction(makeTrx(state, 't-1'), 't-1', {
      accountId: 'acc-1',
      type: 'grant',
      amount: '5.0000',
      reason: '충전',
      createdBy: 'u-1',
      expectedVersion: 99,
    });
    expect(result).toMatchObject({ ok: false, code: 'version_conflict' });
    expect(state.accounts[0].balance).toBe('100.0000');
  });

  test('타 테넌트 계정은 RLS·조건으로 조회되지 않는다 (not_found)', async () => {
    const state = {
      accounts: [{ ...baseAccount, tenant_id: 'other-tenant' }],
      transactions: [] as Array<Record<string, unknown>>,
    };
    const result = await applyCreditTransaction(makeTrx(state, 't-1'), 't-1', {
      accountId: 'acc-1',
      type: 'grant',
      amount: '5.0000',
      reason: '충전',
      createdBy: 'u-1',
    });
    expect(result).toMatchObject({ ok: false, code: 'not_found' });
  });
});
