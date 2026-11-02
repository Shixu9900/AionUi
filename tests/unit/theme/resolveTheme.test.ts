import { describe, it, expect } from 'vitest';
import { resolveActiveTheme } from '@/common/theme/resolveTheme';
import {
  AVIATOR_ALLOY_THEME_ID,
  AVIATOR_BLUE_THEME_ID,
  AVIATOR_HC_DARK_THEME_ID,
  AVIATOR_HC_LIGHT_THEME_ID,
  AVIATOR_NIGHT_CRUISE_THEME_ID,
  AVIATOR_PARCHMENT_THEME_ID,
  LIGHT_THEME_ID,
  DARK_THEME_ID,
  SYSTEM_THEME_ID,
} from '@/common/theme/constants';
import { isThemeTokenKey } from '@/common/theme/tokenContract';
import type { Theme, ThemeTokens, TokenMap } from '@/common/theme/types';
import { AVIATOR_BUILTIN_THEMES } from '@/renderer/theme/aviatorBuiltinThemes';
import { BUILTIN_THEMES } from '@/renderer/theme/builtinThemes';
import { previewPaletteFromTokens } from '@/renderer/utils/theme/previewPalette';
import { tokensToCss } from '@/renderer/utils/theme/tokensToCss';

const mk = (id: string, appearance: 'light' | 'dark' = 'light'): Theme => ({
  id,
  name: id,
  appearance,
  builtin: true,
  created_at: 0,
  updated_at: 0,
});
const light = mk(LIGHT_THEME_ID);
const dark = mk(DARK_THEME_ID, 'dark');
const userTheme: Theme = {
  id: 'u1',
  name: 'Mine',
  appearance: 'dark',
  css: 'body{}',
  builtin: false,
  created_at: 1,
  updated_at: 1,
};
const themes = [light, dark, userTheme];

describe('resolveActiveTheme', () => {
  it('returns a theme by id', () => {
    expect(resolveActiveTheme(DARK_THEME_ID, themes).id).toBe(DARK_THEME_ID);
  });
  it('returns a user theme by id', () => {
    expect(resolveActiveTheme('u1', themes).id).toBe('u1');
  });
  it('falls back to Light when id is unknown', () => {
    expect(resolveActiveTheme('nope', themes).id).toBe(LIGHT_THEME_ID);
  });
  it('falls back to Light when id is empty', () => {
    expect(resolveActiveTheme('', themes).id).toBe(LIGHT_THEME_ID);
  });
  it('falls back to Light when activeId points at a removed community theme', () => {
    // Decorative community skins (e.g. hello-kitty, retro-windows) were deprecated and
    // removed. A persisted activeId still pointing at one is unknown to the resolver
    // and safely resolves to Light — no crash, no blank UI. Aviator builtins are
    // separate known ids and are not part of this fallback.
    const remainingBuiltins = [light, dark];
    expect(resolveActiveTheme('hello-kitty', remainingBuiltins).id).toBe(LIGHT_THEME_ID);
    expect(resolveActiveTheme('retro-windows', remainingBuiltins).id).toBe(LIGHT_THEME_ID);
  });
  it('falls back to first theme when no Light present', () => {
    expect(resolveActiveTheme('nope', [dark, userTheme]).id).toBe(DARK_THEME_ID);
  });
  it('resolves system to Dark when prefersDark is true', () => {
    expect(resolveActiveTheme(SYSTEM_THEME_ID, themes, true).id).toBe(DARK_THEME_ID);
  });
  it('resolves system to Light when prefersDark is false', () => {
    expect(resolveActiveTheme(SYSTEM_THEME_ID, themes, false).id).toBe(LIGHT_THEME_ID);
  });
  it('resolves system to Light when prefersDark is undefined', () => {
    expect(resolveActiveTheme(SYSTEM_THEME_ID, themes).id).toBe(LIGHT_THEME_ID);
  });
  it('ignores prefersDark for non-system ids', () => {
    expect(resolveActiveTheme('u1', themes, true).id).toBe('u1');
    expect(resolveActiveTheme(LIGHT_THEME_ID, themes, true).id).toBe(LIGHT_THEME_ID);
  });
  it('falls back to Light when system resolves to a missing Dark theme', () => {
    expect(resolveActiveTheme(SYSTEM_THEME_ID, [light, userTheme], true).id).toBe(LIGHT_THEME_ID);
  });
});

function appearanceTokens(theme: Theme): TokenMap {
  const tokens: ThemeTokens | undefined = theme.tokens;
  if (!tokens) return {};
  if ('light' in tokens || 'dark' in tokens || 'root' in tokens) {
    const layered = tokens as { light?: TokenMap; dark?: TokenMap };
    return (theme.appearance === 'dark' ? layered.dark : layered.light) ?? {};
  }
  return tokens;
}

const CARD_FALLBACK = {
  appBg: '#f7f8fa',
  headerBg: '#eef1f5',
  sideBg: '#eef1f5',
  mainBg: '#f7f8fa',
  border: '#d9dde5',
  accent: '#3b82f6',
  textMuted: '#8b95a7',
  userBubble: '#dbeafe',
  aiBubble: '#e5e7eb',
};

describe('Aviator builtin themes', () => {
  it('registers six selectable themes with product names and appearances', () => {
    expect(AVIATOR_BUILTIN_THEMES.map((theme) => [theme.id, theme.name, theme.appearance])).toEqual([
      [AVIATOR_NIGHT_CRUISE_THEME_ID, 'Night Cruise', 'dark'],
      [AVIATOR_BLUE_THEME_ID, 'Aviator Blue', 'light'],
      [AVIATOR_PARCHMENT_THEME_ID, 'Parchment', 'light'],
      [AVIATOR_ALLOY_THEME_ID, 'Alloy', 'light'],
      [AVIATOR_HC_LIGHT_THEME_ID, 'Light HC', 'light'],
      [AVIATOR_HC_DARK_THEME_ID, 'Dark HC', 'dark'],
    ]);
  });

  it('keeps Night Cruise as the dark amber name and palette', () => {
    const theme = AVIATOR_BUILTIN_THEMES.find((item) => item.id === AVIATOR_NIGHT_CRUISE_THEME_ID);
    const tokens = theme ? appearanceTokens(theme) : {};
    expect(theme?.name).toBe('Night Cruise');
    expect(JSON.stringify(theme)).not.toContain('夜航');
    expect(tokens['--primary']).toBe('#C4A574');
    expect(tokens['--bg-base']).toBe('#0B0C0E');
  });

  it('keeps the other signature colors from the design source', () => {
    const byId = Object.fromEntries(AVIATOR_BUILTIN_THEMES.map((theme) => [theme.id, appearanceTokens(theme)]));
    expect({
      blueBg: byId[AVIATOR_BLUE_THEME_ID]['--bg-base'],
      bluePrimary: byId[AVIATOR_BLUE_THEME_ID]['--primary'],
      blueInk: byId[AVIATOR_BLUE_THEME_ID]['--text-primary'],
      blueElev: byId[AVIATOR_BLUE_THEME_ID]['--brand-light'],
      parchmentBg: byId[AVIATOR_PARCHMENT_THEME_ID]['--bg-base'],
      parchmentPrimary: byId[AVIATOR_PARCHMENT_THEME_ID]['--primary'],
      alloyBg: byId[AVIATOR_ALLOY_THEME_ID]['--bg-base'],
      alloyPrimary: byId[AVIATOR_ALLOY_THEME_ID]['--primary'],
      hcLightBg: byId[AVIATOR_HC_LIGHT_THEME_ID]['--bg-base'],
      hcLightPrimary: byId[AVIATOR_HC_LIGHT_THEME_ID]['--primary'],
      hcDarkBg: byId[AVIATOR_HC_DARK_THEME_ID]['--bg-base'],
      hcDarkPrimary: byId[AVIATOR_HC_DARK_THEME_ID]['--primary'],
      hcDarkDanger: byId[AVIATOR_HC_DARK_THEME_ID]['--danger'],
    }).toEqual({
      blueBg: '#F7F9FC',
      bluePrimary: '#1E6BFF',
      blueInk: '#0B1F4D',
      blueElev: '#EAF2FC',
      parchmentBg: '#F8F2E6',
      parchmentPrimary: '#3D5A73',
      alloyBg: '#F4F5F7',
      alloyPrimary: '#5A6B7D',
      hcLightBg: '#FFFFFF',
      hcLightPrimary: '#0072B2',
      hcDarkBg: '#0A0A0A',
      hcDarkPrimary: '#56B4E9',
      hcDarkDanger: '#FF5252',
    });
  });

  it('lists Aviator themes after the Light and Dark baselines', () => {
    expect(BUILTIN_THEMES.slice(0, 2).map((theme) => theme.id)).toEqual([LIGHT_THEME_ID, DARK_THEME_ID]);
    expect(BUILTIN_THEMES[0]?.tokens).toBeUndefined();
    expect(BUILTIN_THEMES[1]?.tokens).toBeUndefined();
    expect(BUILTIN_THEMES.slice(2).map((theme) => theme.id)).toEqual(AVIATOR_BUILTIN_THEMES.map((theme) => theme.id));
  });

  it('emits only contract tokens under the matching appearance selector', () => {
    for (const theme of AVIATOR_BUILTIN_THEMES) {
      const css = tokensToCss(theme.tokens) ?? '';
      const tokens = appearanceTokens(theme);
      const selector = theme.appearance === 'dark' ? ":root[data-theme='dark']" : ":root[data-theme='light']";
      const other = theme.appearance === 'dark' ? ":root[data-theme='light']" : ":root[data-theme='dark']";
      expect(css.startsWith(selector)).toBe(true);
      expect(css).not.toContain(other);
      expect(css).toContain(`--primary: ${tokens['--primary']}`);
      expect(Object.keys(tokens).every((key) => isThemeTokenKey(key))).toBe(true);
    }
  });

  it('keeps status red, amber, and green distinct from the accent', () => {
    for (const theme of AVIATOR_BUILTIN_THEMES) {
      const tokens = appearanceTokens(theme);
      expect([tokens['--danger'], tokens['--warning'], tokens['--success']]).not.toContain(tokens['--primary']);
      expect(tokens['--danger']).toMatch(/^#(D32F2F|FF5252)$/);
      expect(tokens['--warning']).toMatch(/^#(E0A020|F0C000)$/);
      expect(tokens['--success']).toMatch(/^#(2E7D32|66BB6A)$/);
    }
  });

  it('resolves a registered Aviator id and still falls back to Light when that id is absent', () => {
    expect(resolveActiveTheme(AVIATOR_PARCHMENT_THEME_ID, BUILTIN_THEMES).appearance).toBe('light');
    const baselines = BUILTIN_THEMES.filter((theme) => theme.id === LIGHT_THEME_ID || theme.id === DARK_THEME_ID);
    expect(resolveActiveTheme(AVIATOR_NIGHT_CRUISE_THEME_ID, baselines).id).toBe(LIGHT_THEME_ID);
  });
});

describe('previewPaletteFromTokens', () => {
  it('paints Night Cruise from the dark token layer', () => {
    const theme = AVIATOR_BUILTIN_THEMES.find((item) => item.id === AVIATOR_NIGHT_CRUISE_THEME_ID);
    const palette = previewPaletteFromTokens(theme?.tokens, 'dark', CARD_FALLBACK);
    expect(palette?.appBg).toBe('#0B0C0E');
    expect(palette?.accent).toBe('#C4A574');
  });

  it('does not borrow a dark-only layer when the preview appearance is light', () => {
    const theme = AVIATOR_BUILTIN_THEMES.find((item) => item.id === AVIATOR_NIGHT_CRUISE_THEME_ID);
    expect(previewPaletteFromTokens(theme?.tokens, 'light', CARD_FALLBACK)).toBeNull();
  });

  it('returns null when there is nothing to paint', () => {
    expect(previewPaletteFromTokens(undefined, 'light', CARD_FALLBACK)).toBeNull();
    expect(previewPaletteFromTokens({ root: { '--text-disabled': '#777777' } }, 'dark', CARD_FALLBACK)).toBeNull();
  });

  it('lets the appearance layer override root tokens', () => {
    const palette = previewPaletteFromTokens(
      { root: { '--primary': '#000000', '--bg-base': '#111111' }, light: { '--primary': '#1E6BFF' } },
      'light',
      CARD_FALLBACK
    );
    expect(palette?.accent).toBe('#1E6BFF');
    expect(palette?.appBg).toBe('#111111');
  });
});
