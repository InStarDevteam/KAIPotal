import { ResourcePrice, ResourceType } from './types';

export const creditPriceStorageKey = (tenantId: string, actorId: string) =>
  `kai.demo.credit-prices.v1:${encodeURIComponent(
    tenantId,
  )}:${encodeURIComponent(actorId)}`;

const resourceTypes: ResourceType[] = [
  'cpu',
  'gpu',
  'memory',
  'storage',
  'network',
  'notebook',
  'training_job',
  'inference_api',
];

export const readCreditPrices = (
  key: string,
  fallback: ResourcePrice[],
): { items: ResourcePrice[]; error?: string } => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { items: fallback };
    const data = JSON.parse(raw);
    if (
      data.version !== 1 ||
      !Array.isArray(data.items) ||
      data.items.length > 100 ||
      !data.items.every(
        (item: ResourcePrice) =>
          item &&
          resourceTypes.includes(item.resourceType) &&
          typeof item.unit === 'string' &&
          typeof item.price === 'number' &&
          Number.isFinite(item.price) &&
          item.price >= 0 &&
          typeof item.description === 'string' &&
          typeof item.active === 'boolean',
      )
    )
      throw new Error('invalid');
    const byType = new Map(
      (data.items as ResourcePrice[]).map(item => [item.resourceType, item]),
    );
    return {
      items: fallback.map(item => byType.get(item.resourceType) || item),
    };
  } catch {
    return {
      items: fallback,
      error:
        '저장된 단가를 읽지 못했습니다. 샘플 단가를 표시합니다. 다시 저장하면 현재 단가로 복구됩니다.',
    };
  }
};

export const saveCreditPrices = (key: string, items: ResourcePrice[]) => {
  if (items.length > 100)
    throw new Error(
      '이 브라우저에서는 단가를 최대 100개까지 보관합니다. 필요 없는 단가를 삭제해 주세요.',
    );
  try {
    localStorage.setItem(key, JSON.stringify({ version: 1, items }));
  } catch {
    throw new Error(
      '브라우저에 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인하세요. 입력 내용은 유지됩니다.',
    );
  }
};

export const validateCreditPrice = (value: string): string | null => {
  if (!value.trim()) return '단가를 입력하세요.';
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0 || price > 1000000)
    return '단가를 0 이상 1,000,000 이하의 숫자로 입력하세요.';
  return null;
};
