/**
 * 포털 디자인 토큰.
 * 모든 화면에서 공통으로 사용하는 색상/간격/레이아웃/그림자/타이포 값을 정의한다.
 * 상태색은 텍스트 대비 WCAG AA(4.5:1) 이상이 되는 bg/text 쌍으로 정의한다.
 */

export const colors = {
  primaryNavy: 'var(--portal-primary, #173B5E)',
  primaryBlue: 'var(--portal-primary, #2457D6)',
  background: 'var(--portal-bg, #F5F7FB)',
  surface: 'var(--portal-surface, #FFFFFF)',
  textPrimary: 'var(--portal-text, #172033)',
  textSecondary: 'var(--portal-muted, #667085)',
  border: 'var(--portal-line, #E2E8F0)',
  // 상태색: bg/text 쌍의 명암비를 주석으로 기재 (모두 AA 4.5:1 충족)
  success: { bg: '#E7F4EA', text: '#1E6B34' }, // 대비 약 5.8:1
  warning: { bg: '#FDF3E1', text: '#8A5A00' }, // 대비 약 5.4:1
  error: { bg: '#FDECEA', text: '#B3261E' }, // 대비 약 5.7:1
  info: { bg: '#E8F1FB', text: '#1B4F8A' }, // 대비 약 7.3:1
  neutral: { bg: '#EEF1F4', text: '#4A5568' }, // 대비 약 6.6:1
} as const;

export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export const spacingTokens = {
  sectionGap: 24,
  cardGap: 16,
  base: 8,
} as const;

export const layoutTokens = {
  sidebarWidth: 256,
  sidebarCollapsedWidth: 72,
  pageMaxWidth: 1680,
  cardRadius: 18,
} as const;

export const shadows = {
  card: '0 3px 20px rgba(16, 24, 40, 0.035)',
  raised: '0 4px 8px rgba(16, 24, 40, 0.10), 0 2px 4px rgba(16, 24, 40, 0.06)',
} as const;

export interface TypographyToken {
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
}

export const typographyTokens: Record<
  'pageTitle' | 'sectionTitle' | 'body' | 'caption',
  TypographyToken
> = {
  pageTitle: {
    fontSize: 'calc(28px * var(--portal-font-scale, 1))',
    fontWeight: 700,
    lineHeight: 1.4,
  },
  sectionTitle: {
    fontSize: 'calc(17px * var(--portal-font-scale, 1))',
    fontWeight: 650,
    lineHeight: 1.5,
  },
  body: {
    fontSize: 'calc(14px * var(--portal-font-scale, 1))',
    fontWeight: 400,
    lineHeight: 1.7,
  },
  caption: {
    fontSize: 'calc(12px * var(--portal-font-scale, 1))',
    fontWeight: 400,
    lineHeight: 1.6,
  },
};
