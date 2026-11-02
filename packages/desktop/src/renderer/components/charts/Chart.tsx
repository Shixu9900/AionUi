/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { ComposeOption } from 'echarts/core';
import type { BarSeriesOption, LineSeriesOption, PieSeriesOption } from 'echarts/charts';
import type {
  DataZoomComponentOption,
  GridComponentOption,
  LegendComponentOption,
  MarkLineComponentOption,
  TooltipComponentOption,
} from 'echarts/components';

// Registered once, tree-shaken to what the workbench's charts actually need
// today (bars, lines, pies — no map/graph/radar). Add a chart/component type
// here, not a full `import 'echarts'`, when a new chart needs one.
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  CanvasRenderer,
]);

/** The option shape this wrapper accepts, matching what it registers above. */
export type ChartOption = ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | PieSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | DataZoomComponentOption
  | MarkLineComponentOption
>;

export interface ChartProps {
  option: ChartOption;
  /** CSS height; width always fills the container. Default `'100%'`. */
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  /** Forwarded to `chart.setOption`. Default `true`: each `option` fully replaces the last render, so removed series/axes do not linger. */
  notMerge?: boolean;
}

/**
 * Thin, generic ECharts host: owns the instance's lifecycle (init, resize,
 * dispose) and nothing else. Callers build the full `option` themselves,
 * typically combining their data with `useChartTheme()` for colors — this
 * component does not know about the app's theme or design tokens.
 */
export const Chart: React.FC<ChartProps> = ({ option, height = '100%', className, style, notMerge = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  // Instance lifecycle: created once per mount, disposed on unmount. Resize is
  // handled by the instance's own `resize()`, not by recreating it.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const instance = echarts.init(container, undefined, { renderer: 'canvas' });
    instanceRef.current = instance;

    const resizeObserver = new ResizeObserver(() => instance.resize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      instance.dispose();
      instanceRef.current = null;
    };
    // Intentionally mount-only: `option` updates are applied by the effect
    // below via `setOption`, not by tearing down and re-creating the instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    instanceRef.current?.setOption(option, { notMerge });
  }, [option, notMerge]);

  return <div ref={containerRef} className={className} style={{ width: '100%', height, ...style }} />;
};

export default Chart;
