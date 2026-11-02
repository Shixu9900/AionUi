/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { getCSSVar } from '@/renderer/styles/colors';
import { CHART_SERIES_PALETTE, type ChartAppearance } from '@/renderer/components/charts/chartPalette';

/**
 * Resolved color values an ECharts `option` should use, read from the app's own
 * theme tokens (`default-color-scheme.css` / `tokenContract.ts`) rather than a
 * second, chart-specific palette. ECharts draws on canvas, so it needs actual
 * color strings — `var(--token)` does not work there the way it does in CSS/SVG.
 */
export interface ChartTheme {
  appearance: ChartAppearance;
  /** Axis/tick/legend label color (`--text-secondary`). */
  text: string;
  /** Emphasized label color, e.g. a value readout (`--text-primary`). */
  textStrong: string;
  /** Gridline / split-line color (`--border-light`). */
  grid: string;
  /** Axis line color (`--border-base`). */
  axisLine: string;
  /** Tooltip/card background (`--bg-1`). */
  surface: string;
  /** Neutral "unfilled/remaining" fill (`--bg-2`) — not a status color. */
  muted: string;
  success: string;
  warning: string;
  danger: string;
  /** Life-limit / target-line color — chart-only, never a status indicator. */
  limit: string;
  /** Six-hue categorical series palette, already appearance-matched. */
  series: readonly string[];
}

const readAppearance = (): ChartAppearance =>
  (document.documentElement.getAttribute('data-theme') as ChartAppearance | null) ?? 'light';

const readChartTheme = (): ChartTheme => {
  const appearance = readAppearance();
  return {
    appearance,
    text: getCSSVar('--text-secondary'),
    textStrong: getCSSVar('--text-primary'),
    grid: getCSSVar('--border-light'),
    axisLine: getCSSVar('--border-base'),
    surface: getCSSVar('--bg-1'),
    muted: getCSSVar('--bg-2'),
    success: getCSSVar('--success'),
    warning: getCSSVar('--warning'),
    danger: getCSSVar('--danger'),
    limit: getCSSVar('--limit'),
    series: CHART_SERIES_PALETTE[appearance],
  };
};

/**
 * Live chart theme that re-reads the app's CSS tokens whenever the appearance
 * (`data-theme`) flips or a user theme swaps the `#theme-tokens` style tag —
 * the same two triggers `applyTheme.ts` writes on every theme change. Values
 * are plain color strings suitable for an ECharts `option`, not CSS `var()`.
 */
export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(readChartTheme);

  useEffect(() => {
    const refresh = () => setTheme(readChartTheme());

    const appearanceObserver = new MutationObserver(refresh);
    appearanceObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // A custom theme can re-tint tokens (e.g. a different `--primary`) without
    // touching `data-theme`; `applyTheme.ts` does this by replacing the
    // `#theme-tokens` <style> element's content, so watch `<head>` for that.
    const tokensObserver = new MutationObserver(refresh);
    tokensObserver.observe(document.head, { childList: true, subtree: true, characterData: true });

    return () => {
      appearanceObserver.disconnect();
      tokensObserver.disconnect();
    };
  }, []);

  return theme;
}
