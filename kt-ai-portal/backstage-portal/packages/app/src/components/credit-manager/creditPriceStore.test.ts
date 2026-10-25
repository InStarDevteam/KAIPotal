import {
  creditPriceStorageKey,
  readCreditPrices,
  saveCreditPrices,
  validateCreditPrice,
} from './creditPriceStore';
import { ResourcePrice } from './types';

const fallback: ResourcePrice[] = [
  {
    resourceType: 'cpu',
    unit: '코어·시간',
    price: 10,
    description: 'CPU 사용량',
    active: true,
  },
  {
    resourceType: 'gpu',
    unit: 'GPU·시간',
    price: 120,
    description: 'GPU 사용량',
    active: false,
  },
];

afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

test('validateCreditPrice blocks empty, non-numeric, negative and out-of-range values', () => {
  expect(validateCreditPrice('')).toContain('입력');
  expect(validateCreditPrice('   ')).toContain('입력');
  expect(validateCreditPrice('abc')).toContain('숫자');
  expect(validateCreditPrice('-1')).toContain('숫자');
  expect(validateCreditPrice('1000001')).toContain('숫자');
  expect(validateCreditPrice('0')).toBeNull();
  expect(validateCreditPrice('120.5')).toBeNull();
});

test('persists prices without crossing tenant or actor and falls back per row', () => {
  const key = creditPriceStorageKey('army', 'demo:portal-admin');
  const updated: ResourcePrice[] = [
    { ...fallback[0], price: 42 },
    { ...fallback[1], active: true },
  ];
  saveCreditPrices(key, updated);
  expect(readCreditPrices(key, fallback).items).toEqual(updated);
  expect(
    readCreditPrices(creditPriceStorageKey('navy', 'demo:portal-admin'), fallback)
      .items,
  ).toEqual(fallback);
  expect(
    readCreditPrices(creditPriceStorageKey('army', 'demo:general-user'), fallback)
      .items,
  ).toEqual(fallback);
  const partial = readCreditPrices(key, [
    { ...fallback[0], price: 999 },
    { ...fallback[1], price: 888 },
    {
      resourceType: 'memory',
      unit: 'GiB·시간',
      price: 5,
      description: 'Memory 사용량',
      active: true,
    },
  ]);
  expect(partial.items[0].price).toBe(42);
  expect(partial.items[1].price).toBe(120);
  expect(partial.items[1].active).toBe(true);
  expect(partial.items[2].price).toBe(5);
});

test('malformed records and storage failures remain visible failures', () => {
  localStorage.setItem('broken', '{"version":1,"items":[null]}');
  expect(readCreditPrices('broken', fallback).error).toBeTruthy();
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  expect(() => saveCreditPrices('key', [])).toThrow('저장하지 못했습니다');
});
