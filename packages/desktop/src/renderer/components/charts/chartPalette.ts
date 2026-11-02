/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared categorical palette for workbench charts (stint/operator/lessor bars,
 * life-track segments, BI series, …).
 *
 * This is deliberately its own small, curated set rather than a derivation from
 * the chrome's `--primary` accent: a chart that colors 4-6 unrelated categories
 * needs enough hue separation to stay readable, which a single-accent theme
 * cannot provide. It was promoted unchanged from `LifeTrack.tsx`'s original
 * `STINT_COLORS` so existing stint bars do not shift color, then extended to six
 * entries so every multi-series chart in the workbench shares one identity.
 *
 * Dark-mode entries are the same hues lightened for contrast on dark
 * backgrounds, not a different palette.
 */
export const CHART_SERIES_PALETTE = {
  light: ['#3b82f6', '#14b8a6', '#8b5cf6', '#f59e0b', '#ec4899', '#64748b'],
  dark: ['#60a5fa', '#2dd4bf', '#a78bfa', '#fbbf24', '#f472b6', '#94a3b8'],
} as const;

export type ChartAppearance = keyof typeof CHART_SERIES_PALETTE;

/** The series color for index `i`, wrapping around the palette. */
export const seriesColor = (appearance: ChartAppearance, i: number): string => {
  const palette = CHART_SERIES_PALETTE[appearance];
  return palette[i % palette.length];
};
