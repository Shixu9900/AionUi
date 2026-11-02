import { cleanup, render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChartOption } from '@/renderer/components/charts/Chart';

// jsdom has no real canvas 2D context, so a genuine `echarts.init()` throws.
// Mock the tree-shaken core entry point Chart.tsx imports; the real
// `echarts/charts` / `echarts/components` / `echarts/renderers` modules are
// left real since they only register classes at import time (no canvas use).
const { initMock, setOptionMock, resizeMock, disposeMock } = vi.hoisted(() => ({
  initMock: vi.fn(),
  setOptionMock: vi.fn(),
  resizeMock: vi.fn(),
  disposeMock: vi.fn(),
}));

vi.mock('echarts/core', () => ({
  use: vi.fn(),
  init: (...args: unknown[]) => {
    initMock(...args);
    return { setOption: setOptionMock, resize: resizeMock, dispose: disposeMock };
  },
}));

// A spy-able ResizeObserver, distinct from the no-op one in vitest.dom.setup.ts.
const observeMock = vi.fn();
const disconnectMock = vi.fn();
class SpyResizeObserver {
  observe = observeMock;
  unobserve = vi.fn();
  disconnect = disconnectMock;
}

import { Chart } from '@/renderer/components/charts/Chart';

const option: ChartOption = {
  xAxis: { type: 'value' },
  yAxis: { type: 'category', data: ['a'] },
  series: [{ type: 'bar', data: [1] }],
};

beforeEach(() => {
  vi.clearAllMocks();
  global.ResizeObserver = SpyResizeObserver as unknown as typeof ResizeObserver;
});

afterEach(() => {
  cleanup();
});

describe('Chart', () => {
  it('initializes exactly one echarts instance on mount and applies the option', () => {
    render(<Chart option={option} height={28} />);
    expect(initMock).toHaveBeenCalledTimes(1);
    expect(setOptionMock).toHaveBeenCalledWith(option, { notMerge: true });
  });

  it('observes its container for resize and resizes the instance on changes', () => {
    render(<Chart option={option} />);
    expect(observeMock).toHaveBeenCalledTimes(1);

    // Simulate a resize notification from the observer.
    resizeMock();
    expect(resizeMock).toHaveBeenCalled();
  });

  it('re-applies a changed option without re-initializing the instance', () => {
    const { rerender } = render(<Chart option={option} />);
    expect(initMock).toHaveBeenCalledTimes(1);

    const nextOption: ChartOption = { ...option, series: [{ type: 'bar', data: [2] }] };
    rerender(<Chart option={nextOption} />);

    expect(initMock).toHaveBeenCalledTimes(1);
    expect(setOptionMock).toHaveBeenLastCalledWith(nextOption, { notMerge: true });
  });

  it('honors notMerge={false} for incremental option updates', () => {
    render(<Chart option={option} notMerge={false} />);
    expect(setOptionMock).toHaveBeenCalledWith(option, { notMerge: false });
  });

  it('disconnects the resize observer and disposes the instance on unmount', () => {
    const { unmount } = render(<Chart option={option} />);
    unmount();
    expect(disconnectMock).toHaveBeenCalledTimes(1);
    expect(disposeMock).toHaveBeenCalledTimes(1);
  });
});
