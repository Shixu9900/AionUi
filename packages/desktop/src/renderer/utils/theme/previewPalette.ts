/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ThemeAppearance, ThemeTokens, TokenMap } from '@/common/theme/types';

/** Colors for the appearance-gallery card thumbnail. */
export type ThemeCardPreviewPalette = {
  appBg: string;
  headerBg: string;
  sideBg: string;
  mainBg: string;
  border: string;
  accent: string;
  textMuted: string;
  userBubble: string;
  aiBubble: string;
};

function isLayered(tokens: ThemeTokens): tokens is { root?: TokenMap; light?: TokenMap; dark?: TokenMap } {
  return 'root' in tokens || 'light' in tokens || 'dark' in tokens;
}

function layersOf(tokens: ThemeTokens): { root?: TokenMap; light?: TokenMap; dark?: TokenMap } {
  if (isLayered(tokens)) return tokens;
  return { root: tokens };
}

function mergedLayer(tokens: ThemeTokens, appearance: ThemeAppearance): TokenMap {
  const layers = layersOf(tokens);
  const scoped = appearance === 'dark' ? layers.dark : layers.light;
  return { ...layers.root, ...scoped };
}

function firstColor(map: TokenMap, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = map[key]?.trim();
    if (!value || /var\(/i.test(value)) continue;
    return value;
  }
  return undefined;
}

/**
 * Preview a token theme using its own appearance, not the currently active one.
 * Returns null when the tokens carry no background or accent, so CSS-only
 * themes keep the CSS extractor.
 */
export function previewPaletteFromTokens(
  tokens: ThemeTokens | undefined,
  appearance: ThemeAppearance,
  fallback: ThemeCardPreviewPalette
): ThemeCardPreviewPalette | null {
  if (!tokens) return null;
  const map = mergedLayer(tokens, appearance);
  const appBg = firstColor(map, ['--bg-base', '--bg-1']);
  const accent = firstColor(map, ['--primary', '--brand']);
  if (!appBg && !accent) return null;

  const pick = (keys: readonly string[], fallbackColor: string) => firstColor(map, keys) ?? fallbackColor;
  const headerBg = pick(['--bg-1', '--bg-2'], fallback.headerBg);
  return {
    appBg: appBg ?? fallback.appBg,
    headerBg,
    sideBg: headerBg,
    mainBg: pick(['--bg-base', '--bg-1'], fallback.mainBg),
    border: pick(['--border-base', '--bg-3'], fallback.border),
    accent: accent ?? fallback.accent,
    textMuted: pick(['--text-secondary'], fallback.textMuted),
    userBubble: pick(['--message-user-bg', '--brand-light'], fallback.userBubble),
    aiBubble: pick(['--bg-2', '--message-tips-bg'], fallback.aiBubble),
  };
}
