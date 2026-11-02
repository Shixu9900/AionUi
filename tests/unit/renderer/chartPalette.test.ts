import { describe, expect, it } from 'vitest';
import { CHART_SERIES_PALETTE, seriesColor } from '@/renderer/components/charts/chartPalette';

describe('CHART_SERIES_PALETTE', () => {
  it('keeps the original four stint colors as the first four light entries, unchanged', () => {
    // LifeTrack.tsx used to hardcode these as `STINT_COLORS`; existing stint
    // bars must not shift color when it switches to importing this palette.
    expect(CHART_SERIES_PALETTE.light.slice(0, 4)).toEqual(['#3b82f6', '#14b8a6', '#8b5cf6', '#f59e0b']);
  });

  it('has the same number of hues in light and dark', () => {
    expect(CHART_SERIES_PALETTE.dark.length).toBe(CHART_SERIES_PALETTE.light.length);
  });

  it('keeps the shared six-hue palette instead of a per-theme Aviator series', () => {
    expect([...CHART_SERIES_PALETTE.light]).toEqual(['#3b82f6', '#14b8a6', '#8b5cf6', '#f59e0b', '#ec4899', '#64748b']);
    expect([...CHART_SERIES_PALETTE.dark]).toEqual(['#60a5fa', '#2dd4bf', '#a78bfa', '#fbbf24', '#f472b6', '#94a3b8']);
  });
});

describe('seriesColor', () => {
  it('wraps around the palette for indices beyond its length', () => {
    const palette = CHART_SERIES_PALETTE.light;
    expect(seriesColor('light', palette.length)).toBe(palette[0]);
    expect(seriesColor('light', palette.length + 2)).toBe(palette[2]);
  });

  it('picks the matching appearance', () => {
    expect(seriesColor('dark', 0)).toBe(CHART_SERIES_PALETTE.dark[0]);
    expect(seriesColor('light', 0)).toBe(CHART_SERIES_PALETTE.light[0]);
  });
});
