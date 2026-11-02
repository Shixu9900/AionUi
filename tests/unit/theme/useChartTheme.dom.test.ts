import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useChartTheme } from '@/renderer/hooks/theme/useChartTheme';

const root = document.documentElement;

const setToken = (name: string, value: string) => root.style.setProperty(name, value);

beforeEach(() => {
  root.removeAttribute('data-theme');
  document.getElementById('theme-tokens')?.remove();
  setToken('--limit', '#c026d3');
  setToken('--bg-1', '#ffffff');
  setToken('--bg-2', '#f2f3f5');
  setToken('--border-light', '#e5e6eb');
  setToken('--border-base', '#c9cdd4');
  setToken('--text-secondary', '#4e5969');
  setToken('--text-primary', '#1d2129');
  setToken('--success', '#00b42a');
  setToken('--warning', '#ff7d00');
  setToken('--danger', '#f53f3f');
});

afterEach(() => {
  root.removeAttribute('style');
  root.removeAttribute('data-theme');
  document.getElementById('theme-tokens')?.remove();
});

describe('useChartTheme', () => {
  it('resolves token CSS variables into plain color strings, not var() references', () => {
    const { result } = renderHook(() => useChartTheme());
    expect(result.current.limit).toBe('#c026d3');
    expect(result.current.muted).toBe('#f2f3f5');
    expect(result.current.surface).toBe('#ffffff');
  });

  it('defaults appearance to light and picks the matching series palette', () => {
    const { result } = renderHook(() => useChartTheme());
    expect(result.current.appearance).toBe('light');
    expect(result.current.series[0]).toBe('#3b82f6');
  });

  it('re-reads tokens and flips the series palette when data-theme changes', async () => {
    const { result } = renderHook(() => useChartTheme());
    expect(result.current.appearance).toBe('light');

    setToken('--limit', '#e879f9');
    root.setAttribute('data-theme', 'dark');

    await waitFor(() => expect(result.current.appearance).toBe('dark'));
    expect(result.current.limit).toBe('#e879f9');
    expect(result.current.series[0]).toBe('#60a5fa');
  });

  it('re-reads tokens when a #theme-tokens style tag is inserted (custom theme applied)', async () => {
    const { result } = renderHook(() => useChartTheme());

    const style = document.createElement('style');
    style.id = 'theme-tokens';
    document.head.appendChild(style);
    setToken('--limit', '#ff00ff');
    // Mimic `tokensToCss.ts` writing content into the tag, the real trigger
    // `applyTheme.ts` uses for a custom-theme re-tint.
    style.textContent = ':root { --limit: #ff00ff; }';

    await waitFor(() => expect(result.current.limit).toBe('#ff00ff'));
  });
});
