import { Knex } from 'knex';
import { setTenantContext } from './context';

export const CREDIT_DECIMAL_SCALE = 4;
const SCALE_FACTOR = 10n ** BigInt(CREDIT_DECIMAL_SCALE);
const HALF_UP_UNIT = SCALE_FACTOR / 2n;

export const CREDIT_OWNER_TYPES = ['user', 'project', 'tenant'] as const;
export type CreditOwnerType = (typeof CREDIT_OWNER_TYPES)[number];

export const CREDIT_TRANSACTION_TYPES = [
  'grant',
  'charge',
  'deduct',
  'adjust',
] as const;
export type CreditTransactionType = (typeof CREDIT_TRANSACTION_TYPES)[number];

export const CREDIT_REQUEST_TYPES = [
  'initial_grant',
  'charge',
  'adjustment',
] as const;
export type CreditRequestType = (typeof CREDIT_REQUEST_TYPES)[number];

const AMOUNT_PATTERN = /^-?\d+(\.\d{1,4})?$/;

export const toMinor = (amount: string): bigint => {
  if (typeof amount !== 'string' || !AMOUNT_PATTERN.test(amount)) {
    throw new Error('invalid_amount');
  }
  const negative = amount.startsWith('-');
  const unsigned = negative ? amount.slice(1) : amount;
  const [whole, fraction = ''] = unsigned.split('.');
  const minor =
    BigInt(whole) * SCALE_FACTOR +
    BigInt(`${fraction}0000`.slice(0, CREDIT_DECIMAL_SCALE));
  return negative ? -minor : minor;
};

export const fromMinor = (minor: bigint): string => {
  const negative = minor < 0n;
  const absolute = negative ? -minor : minor;
  const whole = absolute / SCALE_FACTOR;
  const fraction = (absolute % SCALE_FACTOR)
    .toString()
    .padStart(CREDIT_DECIMAL_SCALE, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
};

export const addMinor = (a: bigint, b: bigint): bigint => a + b;

export const compareMinor = (a: bigint, b: bigint): number => {
  if (a < b) return -1;
  return a > b ? 1 : 0;
};

export const multiplyMinorHalfUp = (
  quantity: bigint,
  unitPrice: bigint,
): bigint => {
  const product = quantity * unitPrice;
  const magnitude = product >= 0n ? product : -product;
  const rounded = (magnitude + HALF_UP_UNIT) / SCALE_FACTOR;
  return product >= 0n ? rounded : -rounded;
};

export const validSignForType = (
  type: CreditTransactionType,
  minor: bigint,
): boolean => {
  if (minor === 0n) return false;
  if (type === 'grant' || type === 'charge') return minor > 0n;
  if (type === 'deduct') return minor < 0n;
  return true;
};

export type CreditFailureCode =
  | 'not_found'
  | 'invalid_amount'
  | 'invalid_state'
  | 'insufficient_balance'
  | 'version_conflict';

export type CreditResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: CreditFailureCode; message: string };

const ok = <T>(value: T): CreditResult<T> => ({ ok: true, value });
const fail = <T>(
  code: CreditFailureCode,
  message: string,
): CreditResult<T> => ({
  ok: false,
  code,
  message,
});

export interface ApplyCreditTransactionInput {
  accountId: string;
  type: CreditTransactionType;
  amount: string;
  unitPriceSnapshot?: string | undefined;
  quantity?: string | undefined;
  reason: string;
  refType?: string | undefined;
  refId?: string | undefined;
  idempotencyKey?: string | undefined;
  createdBy: string;
  expectedVersion?: number | undefined;
}

export const applyCreditTransaction = async (
  trx: Knex.Transaction,
  tenantId: string,
  input: ApplyCreditTransactionInput,
): Promise<
  CreditResult<{ transaction: Record<string, unknown>; balance: string }>
> => {
  await setTenantContext(trx, tenantId);

  if (input.idempotencyKey) {
    const existing = await trx('portal.fc_credit_transaction')
      .where({ tenant_id: tenantId, idempotency_key: input.idempotencyKey })
      .first();
    if (existing) {
      const account = await trx('portal.fc_credit_account')
        .where({ id: input.accountId })
        .first('balance');
      return ok({
        transaction: existing as Record<string, unknown>,
        balance: account ? (account.balance as string) : fromMinor(0n),
      });
    }
  }

  let minor: bigint;
  try {
    minor = toMinor(input.amount);
  } catch {
    return fail('invalid_amount', '금액 형식이 올바르지 않습니다.');
  }
  if (!validSignForType(input.type, minor)) {
    return fail('invalid_amount', '거래 유형에 맞지 않는 부호의 금액입니다.');
  }

  const account = await trx('portal.fc_credit_account')
    .where({ id: input.accountId })
    .first();
  if (!account) return fail('not_found', '크레딧 계정을 찾을 수 없습니다.');

  const balanceMinor = toMinor(account.balance as string);
  const nextMinor = addMinor(balanceMinor, minor);
  if (nextMinor < 0n) {
    return fail('insufficient_balance', '잔액이 부족합니다.');
  }
  if (
    input.expectedVersion !== undefined &&
    input.expectedVersion !== account.version
  ) {
    return fail('version_conflict', '계정이 다른 변경으로 갱신되었습니다.');
  }

  const updated = await trx('portal.fc_credit_account')
    .where({ id: input.accountId })
    .modify(qb => {
      if (input.expectedVersion !== undefined) {
        qb.where({ version: input.expectedVersion });
      }
    })
    .whereRaw('balance + ? >= 0', [input.amount])
    .update({
      balance: trx.raw('balance + ?', [input.amount]),
      version: trx.raw('version + 1'),
      updated_by: input.createdBy,
      updated_at: trx.fn.now(),
    });
  if (updated === 0) {
    return fail(
      'version_conflict',
      '계정 갱신에 실패했습니다. 다시 시도하세요.',
    );
  }

  const [transaction] = await trx('portal.fc_credit_transaction')
    .insert({
      tenant_id: tenantId,
      account_id: input.accountId,
      type: input.type,
      amount: input.amount,
      unit_price_snapshot: input.unitPriceSnapshot ?? null,
      quantity: input.quantity ?? null,
      reason: input.reason,
      ref_type: input.refType ?? null,
      ref_id: input.refId ?? null,
      idempotency_key: input.idempotencyKey ?? null,
      created_by: input.createdBy,
    })
    .returning('*');

  const fresh = await trx('portal.fc_credit_account')
    .where({ id: input.accountId })
    .first('balance');
  return ok({
    transaction: transaction as Record<string, unknown>,
    balance: (fresh?.balance as string) ?? fromMinor(nextMinor),
  });
};

export interface CreateCreditRequestInput {
  type: CreditRequestType;
  ownerType: CreditOwnerType;
  ownerId: string;
  amount: string;
  reason: string;
  requestedBy: string;
  idempotencyKey?: string | undefined;
}

export const createCreditRequest = async (
  trx: Knex.Transaction,
  tenantId: string,
  input: CreateCreditRequestInput,
): Promise<CreditResult<Record<string, unknown>>> => {
  await setTenantContext(trx, tenantId);

  if (input.idempotencyKey) {
    const existing = await trx('portal.fc_credit_request')
      .where({ tenant_id: tenantId, idempotency_key: input.idempotencyKey })
      .first();
    if (existing) return ok(existing as Record<string, unknown>);
  }

  let minor: bigint;
  try {
    minor = toMinor(input.amount);
  } catch {
    return fail('invalid_amount', '금액 형식이 올바르지 않습니다.');
  }
  if (minor <= 0n) {
    return fail('invalid_amount', '요청 금액은 0보다 커야 합니다.');
  }

  const [row] = await trx('portal.fc_credit_request')
    .insert({
      tenant_id: tenantId,
      type: input.type,
      owner_type: input.ownerType,
      owner_id: input.ownerId,
      amount: input.amount,
      reason: input.reason,
      requested_by: input.requestedBy,
      idempotency_key: input.idempotencyKey ?? null,
    })
    .returning('*');
  return ok(row as Record<string, unknown>);
};

export type CreditDecision = 'approved' | 'rejected';

const REQUEST_TYPE_TO_TRANSACTION: Record<
  CreditRequestType,
  CreditTransactionType
> = {
  initial_grant: 'grant',
  charge: 'charge',
  adjustment: 'adjust',
};

export const decideCreditRequest = async (
  trx: Knex.Transaction,
  tenantId: string,
  requestId: string,
  actorUserId: string,
  decision: CreditDecision,
  reason: string,
  expectedVersion?: number | undefined,
): Promise<CreditResult<Record<string, unknown>>> => {
  await setTenantContext(trx, tenantId);
  const request = await trx('portal.fc_credit_request')
    .where({ id: requestId })
    .first();
  if (!request) return fail('not_found', '크레딧 요청을 찾을 수 없습니다.');
  if (request.status !== 'requested') {
    return fail('invalid_state', '이미 결정된 요청입니다.');
  }
  if (expectedVersion !== undefined && expectedVersion !== request.version) {
    return fail('version_conflict', '요청이 다른 변경으로 갱신되었습니다.');
  }

  const updated = await trx('portal.fc_credit_request')
    .where({ id: requestId, status: 'requested' })
    .update({
      status: decision,
      decided_by: actorUserId,
      decided_at: trx.fn.now(),
      decision_reason: reason,
      version: trx.raw('version + 1'),
    });
  if (updated === 0) {
    return fail('invalid_state', '이미 결정된 요청입니다.');
  }

  if (decision === 'rejected') {
    const [row] = await trx('portal.fc_credit_request')
      .where({ id: requestId })
      .returning('*');
    return ok(row as Record<string, unknown>);
  }

  const ownerType = request.owner_type as CreditOwnerType;
  const ownerId = request.owner_id as string;
  const existingAccount = await trx('portal.fc_credit_account')
    .where({ tenant_id: tenantId, owner_type: ownerType, owner_id: ownerId })
    .first();
  let accountId = existingAccount?.id as string | undefined;
  if (!accountId) {
    const [created] = await trx('portal.fc_credit_account')
      .insert({
        tenant_id: tenantId,
        owner_type: ownerType,
        owner_id: ownerId,
        balance: fromMinor(0n),
        created_by: actorUserId,
        updated_by: actorUserId,
      })
      .returning('id');
    accountId = created.id as string;
  }

  const applied = await applyCreditTransaction(trx, tenantId, {
    accountId,
    type: REQUEST_TYPE_TO_TRANSACTION[request.type as CreditRequestType],
    amount: request.amount as string,
    reason: `크레딧 요청 승인: ${request.reason}`,
    refType: 'credit_request',
    refId: requestId,
    idempotencyKey: `credit-request:${requestId}`,
    createdBy: actorUserId,
  });
  if (!applied.ok) {
    throw new Error(`credit transaction failed: ${applied.code}`);
  }

  const [row] = await trx('portal.fc_credit_request')
    .where({ id: requestId })
    .returning('*');
  return ok(row as Record<string, unknown>);
};

export const reconcileCreditAccount = async (
  trx: Knex.Transaction,
  tenantId: string,
  accountId: string,
): Promise<
  CreditResult<{ balance: string; ledgerSum: string; balanced: boolean }>
> => {
  await setTenantContext(trx, tenantId);
  const account = await trx('portal.fc_credit_account')
    .where({ id: accountId })
    .first('balance');
  if (!account) return fail('not_found', '크레딧 계정을 찾을 수 없습니다.');
  const row = await trx('portal.fc_credit_transaction')
    .where({ tenant_id: tenantId, account_id: accountId })
    .sum('amount as total')
    .first();
  const ledgerSum = (row?.total as string | null | undefined) ?? fromMinor(0n);
  const balance = account.balance as string;
  return ok({
    balance,
    ledgerSum,
    balanced: compareMinor(toMinor(balance), toMinor(ledgerSum)) === 0,
  });
};

export const getCreditUsageTrend = async (
  _trx: Knex.Transaction,
  _tenantId: string,
  _ownerType: CreditOwnerType,
  _ownerId: string,
  _from?: string | undefined,
  _to?: string | undefined,
): Promise<{ items: unknown[]; measured: boolean }> => ({
  items: [],
  measured: false,
});
