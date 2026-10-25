import {
  classifyCreditFetchError,
  formatCreditAmount,
  isPendingCreditRequest,
  validateCreditAmountInput,
  validateCreditReason,
  CreditRequestRow,
} from './creditServerData';

describe('credit server data utilities', () => {
  describe('formatCreditAmount', () => {
    it('trims the 4-decimal scale without locale grouping loss', () => {
      expect(formatCreditAmount('37500.0000')).toBe('37,500');
      expect(formatCreditAmount('120.5000')).toBe('120.5');
      expect(formatCreditAmount('0.0001')).toBe('0.0001');
      expect(formatCreditAmount('-12.3400')).toBe('-12.34');
      expect(formatCreditAmount('1234567.0000')).toBe('1,234,567');
    });
    it('renders unavailable values as a dash instead of fabricating', () => {
      expect(formatCreditAmount(null)).toBe('—');
      expect(formatCreditAmount(undefined)).toBe('—');
      expect(formatCreditAmount('')).toBe('—');
      expect(formatCreditAmount('abc')).toBe('—');
    });
  });

  describe('validateCreditAmountInput', () => {
    it('accepts positive amounts up to 4 decimals', () => {
      expect(validateCreditAmountInput('100')).toBeNull();
      expect(validateCreditAmountInput('0.0001')).toBeNull();
    });
    it('rejects zero, negative, malformed and over-scale amounts', () => {
      expect(validateCreditAmountInput('')).toContain('입력');
      expect(validateCreditAmountInput('0')).toContain('0');
      expect(validateCreditAmountInput('-5')).toContain('0보다');
      expect(validateCreditAmountInput('1.00001')).toContain('소수점');
      expect(validateCreditAmountInput('1.2.3')).toContain('소수점');
      expect(validateCreditAmountInput('abc')).toContain('소수점');
    });
    it('allows negative amounts only for admin adjustment', () => {
      expect(validateCreditAmountInput('-10', { allowNegative: true })).toBeNull();
      expect(validateCreditAmountInput('0', { allowNegative: true })).toContain('0이 아니어야');
    });
  });

  describe('validateCreditReason', () => {
    it('requires 1~500 chars', () => {
      expect(validateCreditReason('')).toContain('입력');
      expect(validateCreditReason('   ')).toContain('입력');
      expect(validateCreditReason('사유')).toBeNull();
      expect(validateCreditReason('x'.repeat(501))).toContain('500자');
    });
  });

  describe('isPendingCreditRequest', () => {
    it('only treats requested rows as pending', () => {
      const base = {} as CreditRequestRow;
      expect(isPendingCreditRequest({ ...base, status: 'requested' })).toBe(true);
      expect(isPendingCreditRequest({ ...base, status: 'approved' })).toBe(false);
      expect(isPendingCreditRequest({ ...base, status: 'rejected' })).toBe(false);
      expect(isPendingCreditRequest({ ...base, status: 'cancelled' })).toBe(false);
    });
  });

  describe('classifyCreditFetchError', () => {
    const errorWith = (status?: number, code?: string, message = '실패') => {
      const error = new Error(message) as Error & { status?: number; code?: string };
      if (status !== undefined) error.status = status;
      if (code !== undefined) error.code = code;
      return error;
    };
    it('maps 403 to permission', () => {
      expect(classifyCreditFetchError(errorWith(403)).kind).toBe('permission');
      expect(classifyCreditFetchError(errorWith(undefined, 'permission_denied')).kind).toBe('permission');
    });
    it('maps 409 conflicts to conflict', () => {
      expect(classifyCreditFetchError(errorWith(409)).kind).toBe('conflict');
      expect(classifyCreditFetchError(errorWith(undefined, 'version_conflict')).kind).toBe('conflict');
      expect(classifyCreditFetchError(errorWith(undefined, 'invalid_state')).kind).toBe('conflict');
    });
    it('maps 404 to not_found and the rest to network', () => {
      expect(classifyCreditFetchError(errorWith(404)).kind).toBe('not_found');
      expect(classifyCreditFetchError(errorWith(500)).kind).toBe('network');
      expect(classifyCreditFetchError(new Error('boom')).kind).toBe('network');
      expect(classifyCreditFetchError(new Error('boom')).message).toBe('boom');
    });
  });
});
