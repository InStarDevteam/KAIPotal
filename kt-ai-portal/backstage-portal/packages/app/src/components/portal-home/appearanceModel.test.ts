import {
  resolveAppearance,
  mixColor,
  APPEARANCE_SURFACES,
} from './appearanceModel';

describe('membership-scoped portal appearance', () => {
  it('inherits a tenant design and readable default size for old branding', () => {
    expect(resolveAppearance({ tenant: {}, reviewEnabled: false })).toEqual({
      design: 'aurora',
      fontScale: 1,
      source: 'tenant',
    });
    expect(
      resolveAppearance({
        tenant: { design: 'focus', fontScale: 1.2 },
        personal: { design: 'tenant' },
        reviewEnabled: false,
      }),
    ).toEqual({ design: 'focus', fontScale: 1.2, source: 'tenant' });
  });
  it('applies saved personal design and size after review mode is removed', () => {
    expect(
      resolveAppearance({
        tenant: { design: 'focus', fontScale: 1.2 },
        personal: { design: 'canvas', fontScale: 0.9 },
        review: 'orbit',
        reviewEnabled: false,
      }),
    ).toEqual({ design: 'canvas', fontScale: 0.9, source: 'personal' });
  });
  it('temporarily previews all concepts without changing saved values or font size', () => {
    Object.keys(APPEARANCE_SURFACES).forEach(design => {
      const saved = { design: 'focus', fontScale: 1.1 };
      const preview = resolveAppearance({
        tenant: { design: 'canvas' },
        personal: saved,
        review: design as keyof typeof APPEARANCE_SURFACES,
        reviewEnabled: true,
      });
      expect(preview.design).toBe(design);
      expect(preview.fontScale).toBe(1.1);
      expect(preview.source).toBe('review');
      expect(saved).toEqual({ design: 'focus', fontScale: 1.1 });
    });
  });
  it('rejects invalid cached preferences and inherits the current tenant', () => {
    expect(
      resolveAppearance({
        tenant: { design: 'orbit', fontScale: 1.1 },
        personal: { design: 'unknown', fontScale: 9 },
        reviewEnabled: true,
      }),
    ).toEqual({ design: 'orbit', fontScale: 1.1, source: 'tenant' });
  });
  it('keeps color blends deterministic for tenant accents', () => {
    expect(mixColor('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixColor('#123456', '#ffffff', 0)).toBe('#123456');
  });
});
