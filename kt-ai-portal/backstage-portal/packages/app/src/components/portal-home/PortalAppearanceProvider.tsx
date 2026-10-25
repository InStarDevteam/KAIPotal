import { CSSProperties, ReactNode, useEffect, useMemo } from 'react';
import { createTheme, ThemeProvider, useTheme } from '@material-ui/core/styles';
import { useTenantSettings } from '../tenant-settings/TenantSettingsContext';
import { usePlatformAccess } from '../tenant-settings/PlatformAccessContext';
import { PortalAppearanceContext, useDesignReview } from './homeDesign';
import {
  APPEARANCE_SURFACES,
  mixColor,
  resolveAppearance,
} from './appearanceModel';
import './portalAppearance.css';

/** One appearance layer supplies every route and MUI portal (dialogs, menus).
 * Existing API permissions and business state remain in their own providers. */
export function PortalAppearanceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { settings } = useTenantSettings();
  const { preferences } = usePlatformAccess();
  const { selection, reviewEnabled } = useDesignReview();
  const outerTheme = useTheme();
  const appearance = resolveAppearance({
    tenant: settings.branding,
    personal: preferences,
    review: selection,
    reviewEnabled,
  });
  const surface = APPEARANCE_SURFACES[appearance.design];
  const primary = settings.branding.primaryColor;
  const accent = settings.branding.accentColor;
  const scale = appearance.fontScale;
  const theme = useMemo(
    () =>
      createTheme(outerTheme, {
        palette: {
          type: 'light',
          primary: { main: primary, contrastText: '#fff' },
          secondary: { main: accent },
          background: { default: surface.background, paper: surface.surface },
          text: { primary: surface.text, secondary: surface.muted },
          divider: surface.line,
        },
        typography: {
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", Arial, sans-serif',
          fontSize: 14 * scale,
          h1: {
            fontSize: `${3 * scale}rem`,
            fontWeight: 700,
            letterSpacing: '-0.04em',
          },
          h2: {
            fontSize: `${2.25 * scale}rem`,
            fontWeight: 700,
            letterSpacing: '-0.035em',
          },
          h3: {
            fontSize: `${1.8 * scale}rem`,
            fontWeight: 700,
            letterSpacing: '-0.03em',
          },
          h4: {
            fontSize: `${1.65 * scale}rem`,
            fontWeight: 700,
            letterSpacing: '-0.03em',
          },
          h5: {
            fontSize: `${1.3 * scale}rem`,
            fontWeight: 650,
            lineHeight: 1.5,
          },
          h6: {
            fontSize: `${1.075 * scale}rem`,
            fontWeight: 650,
            lineHeight: 1.5,
          },
          body1: { fontSize: `${0.9375 * scale}rem`, lineHeight: 1.75 },
          body2: { fontSize: `${0.875 * scale}rem`, lineHeight: 1.7 },
          subtitle1: { fontSize: `${0.9375 * scale}rem`, fontWeight: 600 },
          subtitle2: { fontSize: `${0.875 * scale}rem`, fontWeight: 600 },
          caption: { fontSize: `${0.75 * scale}rem`, lineHeight: 1.65 },
          button: {
            fontSize: `${0.875 * scale}rem`,
            fontWeight: 600,
            textTransform: 'none',
          },
        },
        shape: { borderRadius: 14 },
        overrides: {
          MuiPaper: {
            rounded: { borderRadius: 16 },
            elevation1: { boxShadow: '0 3px 18px #17293b06' },
          },
          MuiButton: {
            root: {
              borderRadius: 10,
              minHeight: 40,
              padding: '8px 16px',
              textTransform: 'none',
            },
            contained: { boxShadow: 'none' },
            containedPrimary: {
              '&:hover': { boxShadow: '0 4px 14px #122b3c20' },
            },
          },
          MuiOutlinedInput: {
            root: { borderRadius: 10 },
            notchedOutline: { borderColor: surface.line },
          },
          MuiTab: {
            root: { textTransform: 'none', fontWeight: 600, minHeight: 52 },
          },
          MuiTableCell: {
            root: { borderColor: surface.line, lineHeight: 1.65 },
            head: {
              fontWeight: 650,
              backgroundColor: mixColor(primary, '#ffffff', 0.95),
            },
          },
          MuiDialog: {
            paper: { borderRadius: 20, boxShadow: '0 24px 80px #0d1c3b30' },
          },
          MuiTooltip: {
            tooltip: {
              fontSize: `${12 * scale}px`,
              borderRadius: 8,
              padding: '8px 12px',
            },
          },
          MuiChip: { root: { fontSize: `${12 * scale}px` } },
        },
      }),
    [outerTheme, primary, accent, scale, surface],
  );
  const variables = useMemo(
    () => ({
      '--portal-primary': primary,
      '--portal-accent': accent,
      '--portal-primary-soft': mixColor(primary, '#ffffff', 0.93),
      '--portal-highlight': mixColor(accent, '#ffffff', 0.45),
      '--portal-bg': surface.background,
      '--portal-surface': surface.surface,
      '--portal-text': surface.text,
      '--portal-muted': surface.muted,
      '--portal-text-secondary': surface.muted,
      '--portal-border': surface.line,
      '--portal-line': surface.line,
      '--portal-header': mixColor(
        surface.header,
        primary,
        appearance.design === 'canvas' ? 0.06 : 0.4,
      ),
      '--portal-header-text': surface.headerText,
      '--portal-header-muted': surface.headerMuted,
      '--portal-font-scale': String(scale),
    }),
    [primary, accent, surface, scale, appearance.design],
  );
  useEffect(() => {
    const root = document.documentElement;
    const previous = Object.fromEntries(
      Object.keys(variables).map(key => [
        key,
        root.style.getPropertyValue(key),
      ]),
    );
    const previousDesign = root.dataset.portalDesign;
    const previousScale = root.dataset.portalFontScale;
    Object.entries(variables).forEach(([key, value]) =>
      root.style.setProperty(key, value),
    );
    root.dataset.portalDesign = appearance.design;
    root.dataset.portalFontScale = String(scale);
    return () => {
      Object.entries(previous).forEach(([key, value]) =>
        value
          ? root.style.setProperty(key, value)
          : root.style.removeProperty(key),
      );
      if (previousDesign) root.dataset.portalDesign = previousDesign;
      else delete root.dataset.portalDesign;
      if (previousScale) root.dataset.portalFontScale = previousScale;
      else delete root.dataset.portalFontScale;
    };
  }, [variables, appearance.design, scale]);
  return (
    <PortalAppearanceContext.Provider value={appearance}>
      <ThemeProvider theme={theme}>
        <div
          className="portal-appearance"
          data-design={appearance.design}
          data-font-scale={scale}
          data-appearance-source={appearance.source}
          style={variables as CSSProperties}
        >
          {children}
        </div>
      </ThemeProvider>
    </PortalAppearanceContext.Provider>
  );
}
