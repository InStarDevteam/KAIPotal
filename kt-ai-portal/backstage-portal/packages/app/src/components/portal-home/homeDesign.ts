import { createContext, useContext, useState, useEffect } from 'react';
import { configApiRef, useApi } from '@backstage/core-plugin-api';

export const HOME_DESIGNS = [
  {
    id: 'aurora',
    name: 'Aurora',
    label: '빛으로 연결하다',
    description: '밝은 여백과 푸른 유리빛의 정돈된 포털',
    number: '01',
  },
  {
    id: 'focus',
    name: 'Focus',
    label: '시작에 집중하다',
    description: '깊은 청록색과 은빛 조형의 차분한 포털',
    number: '02',
  },
  {
    id: 'orbit',
    name: 'Orbit',
    label: '가능성을 확장하다',
    description: '흑연색과 금빛 궤도의 선명한 포털',
    number: '03',
  },
  {
    id: 'canvas',
    name: 'Canvas',
    label: '나의 업무를 펼치다',
    description: '따뜻한 아이보리와 입체 조형의 편안한 포털',
    number: '04',
  },
] as const;
export type HomeDesign = (typeof HOME_DESIGNS)[number]['id'];
const KEY = 'kai.portal.home-design';
export const PortalAppearanceContext = createContext<
  | {
      design: HomeDesign;
      fontScale: number;
      source: 'review' | 'personal' | 'tenant';
    }
  | undefined
>(undefined);
export const isHomeDesign = (value: unknown): value is HomeDesign =>
  HOME_DESIGNS.some(d => d.id === value);
export const readHomeDesignSelection = (): HomeDesign | undefined => {
  try {
    const value = sessionStorage.getItem(KEY);
    return isHomeDesign(value) ? value : undefined;
  } catch {
    return undefined;
  }
};
export const readHomeDesign = (): HomeDesign =>
  readHomeDesignSelection() ?? 'aurora';
export const selectHomeDesign = (value: HomeDesign) => {
  if (!isHomeDesign(value)) return;
  try {
    sessionStorage.setItem(KEY, value);
  } catch {
    /* session storage may be unavailable */
  }
  window.dispatchEvent(new Event('portal-design-change'));
};
export const clearHomeDesignSelection = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* inherit saved appearance */
  }
  window.dispatchEvent(new Event('portal-design-change'));
};
export function useDesignReview() {
  const config = useApi(configApiRef);
  const reviewEnabled =
    config.getOptionalBoolean('app.designReviewEnabled') ??
    config.getOptionalBoolean('app.proposalCapture.enabled') ??
    false;
  const [selection, setSelection] = useState(readHomeDesignSelection);
  useEffect(() => {
    const update = () => setSelection(readHomeDesignSelection());
    window.addEventListener('portal-design-change', update);
    return () => window.removeEventListener('portal-design-change', update);
  }, []);
  return {
    selection,
    reviewEnabled,
  };
}
export function useHomeDesign() {
  const appearance = useContext(PortalAppearanceContext);
  const { selection, reviewEnabled } = useDesignReview();
  return {
    design:
      appearance?.design ?? (reviewEnabled ? selection ?? 'aurora' : 'aurora'),
    fontScale: appearance?.fontScale ?? 1,
    source: appearance?.source ?? 'review',
    reviewEnabled,
  };
}
