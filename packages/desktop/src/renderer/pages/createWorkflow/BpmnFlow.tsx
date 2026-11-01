/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';
import { layoutProcess } from 'bpmn-auto-layout';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import type { WorkflowDraftStep } from '@/common/types/createWorkflow';
import { draftToBpmn, taskIdOf } from './draftToBpmn';
import styles from './index.module.css';

type Box = { x: number; y: number; width: number; height: number };

type CanvasService = {
  zoom: (level?: 'fit-viewport') => number;
  viewbox: {
    (): Box & { inner: Box; outer: { width: number; height: number } };
    (box: Box): void;
  };
  addMarker: (elementId: string, marker: string) => void;
};

/** Below this the task labels stop being readable; show the start of the flow instead and let the user pan. */
const MIN_READABLE_ZOOM = 0.6;

const fitReadable = (canvas: CanvasService) => {
  if (canvas.zoom('fit-viewport') >= MIN_READABLE_ZOOM) return;
  const { inner, outer } = canvas.viewbox();
  const width = outer.width / MIN_READABLE_ZOOM;
  const height = outer.height / MIN_READABLE_ZOOM;
  canvas.viewbox({ x: inner.x - 20, y: inner.y + inner.height / 2 - height / 2, width, height });
};

const markerOf = (step: WorkflowDraftStep): string | null => {
  if (step.from === 'suggested') return 'aviator-suggested';
  switch (step.kind) {
    case 'check':
      return 'aviator-check';
    case 'output':
      return 'aviator-output';
    case 'do':
    case undefined:
      return null;
    default: {
      const exhaustive: never = step.kind;
      return exhaustive;
    }
  }
};

/** Read-only BPMN view of the draft steps; the bpmn.io watermark must stay visible (bpmn-js license). */
const BpmnFlow: React.FC<{ steps: WorkflowDraftStep[]; height: number }> = ({ steps, height }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<NavigatedViewer | null>(null);
  const [renderMs, setRenderMs] = useState<number | null>(null);
  const [error, setError] = useState('');
  const xml = draftToBpmn(steps);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  useEffect(() => {
    if (!hostRef.current) return undefined;
    const viewer = new NavigatedViewer({ container: hostRef.current });
    viewerRef.current = viewer;
    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return undefined;
    let cancelled = false;
    const startedAt = performance.now();
    void (async () => {
      try {
        const laidOut = await layoutProcess(xml);
        if (cancelled) return;
        await viewer.importXML(laidOut);
        if (cancelled) return;
        const canvas = viewer.get('canvas') as CanvasService;
        stepsRef.current.forEach((step, index) => {
          const marker = markerOf(step);
          if (marker) canvas.addMarker(taskIdOf(index), marker);
        });
        fitReadable(canvas);
        setError('');
        setRenderMs(Math.round(performance.now() - startedAt));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [xml]);

  return (
    <div className={styles.bpmnWrap}>
      <div ref={hostRef} className={styles.bpmnHost} style={{ height }} />
      <div className={styles.bpmnMeta}>
        {error ? `流程图没画出来：${error}` : renderMs !== null ? `按住拖动看后面的步骤，滚轮缩放 · 画图用时 ${renderMs} 毫秒` : '正在画图……'}
      </div>
    </div>
  );
};

export default BpmnFlow;
