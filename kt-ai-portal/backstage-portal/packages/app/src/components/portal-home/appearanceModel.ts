import { HomeDesign, isHomeDesign } from './homeDesign';

export const FONT_SCALES = [0.9, 1, 1.1, 1.2] as const;
const isFontScale = (value: unknown): value is number =>
  typeof value === 'number' && FONT_SCALES.some(scale => scale === value);
export interface AppearanceInput {
  tenant: { design?: string; fontScale?: number };
  personal?: { design?: string; fontScale?: number };
  review?: HomeDesign;
  reviewEnabled: boolean;
}

/** A review choice is temporary. Stored preferences are scoped by the API to
 * the current membership, and omitted personal values inherit tenant defaults. */
export function resolveAppearance(input: AppearanceInput) {
  const tenantDesign = isHomeDesign(input.tenant.design)
    ? input.tenant.design
    : 'aurora';
  const personalDesign = isHomeDesign(input.personal?.design)
    ? (input.personal!.design as HomeDesign)
    : undefined;
  const reviewDesign = input.reviewEnabled ? input.review : undefined;
  const tenantScale = isFontScale(input.tenant.fontScale)
    ? input.tenant.fontScale!
    : 1;
  const personalScale = isFontScale(input.personal?.fontScale)
    ? input.personal!.fontScale
    : undefined;
  let source: 'review' | 'personal' | 'tenant' = 'tenant';
  if (personalDesign) source = 'personal';
  if (reviewDesign) source = 'review';
  return {
    design: reviewDesign ?? personalDesign ?? tenantDesign,
    fontScale: personalScale ?? tenantScale,
    source,
  } as const;
}

export const APPEARANCE_SURFACES: Record<
  HomeDesign,
  {
    background: string;
    surface: string;
    text: string;
    muted: string;
    line: string;
    header: string;
    headerText: string;
    headerMuted: string;
  }
> = {
  aurora: {
    background: '#f2f5fa',
    surface: '#ffffff',
    text: '#17263d',
    muted: '#57677e',
    line: '#dce4ee',
    header: '#102b50',
    headerText: '#f5f8ff',
    headerMuted: '#c3d3e8',
  },
  focus: {
    background: '#eef4f1',
    surface: '#ffffff',
    text: '#19332f',
    muted: '#536e67',
    line: '#d9e5df',
    header: '#103f3b',
    headerText: '#f3faf6',
    headerMuted: '#bdd6cf',
  },
  orbit: {
    background: '#f3f2ef',
    surface: '#ffffff',
    text: '#292b30',
    muted: '#65665f',
    line: '#e3e0d8',
    header: '#191e26',
    headerText: '#fff8e9',
    headerMuted: '#d4cbb8',
  },
  canvas: {
    background: '#f6f4ef',
    surface: '#fffefb',
    text: '#283b3a',
    muted: '#64716a',
    line: '#e1e3d8',
    header: '#faf9f5',
    headerText: '#273e3b',
    headerMuted: '#61716b',
  },
};

export function mixColor(first: string, second: string, ratio: number) {
  const channels = [1, 3, 5].map(offset =>
    Math.round(
      parseInt(first.slice(offset, offset + 2), 16) * (1 - ratio) +
        parseInt(second.slice(offset, offset + 2), 16) * ratio,
    )
      .toString(16)
      .padStart(2, '0'),
  );
  return `#${channels.join('')}`;
}
