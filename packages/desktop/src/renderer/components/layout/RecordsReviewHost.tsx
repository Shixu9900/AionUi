/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Rightmost workbench column: component records review results. Lives outside
 * Layout's measured [content | preview | explorer] row, so that row's width
 * clamps keep working on whatever space remains.
 */

import React from 'react';
import { useResizableSplit } from '@renderer/hooks/ui/useResizableSplit';
import { useCurrentProject } from '@renderer/pages/conversation/explorer/currentProjectStore';
import { RecordsReviewPanel } from '@renderer/pages/conversation/recordsReview/RecordsReviewPanel';
import { useRecordsReviewOpen } from '@renderer/pages/conversation/recordsReview/recordsReviewStore';

export const RecordsReviewHost: React.FC<{ viewportWidth: number }> = ({ viewportWidth }) => {
  const projectId = useCurrentProject();
  const open = useRecordsReviewOpen();
  const { splitRatio: widthPx, createDragHandle } = useResizableSplit({
    unit: 'px',
    defaultWidth: 480,
    minWidth: 380,
    maxWidth: Math.max(380, Math.round(viewportWidth * 0.6)),
    storageKey: 'records-review-width-px',
  });

  if (!projectId || !open) return null;

  return (
    <div
      data-records-review-host
      className='!bg-1 h-full flex-shrink-0 overflow-hidden relative'
      style={{ width: `${widthPx}px`, borderLeft: '1px solid var(--bg-3)' }}
    >
      {createDragHandle({ className: 'absolute start-0 top-0 bottom-0 z-20', reverse: true })}
      <RecordsReviewPanel key={projectId} projectId={projectId} />
    </div>
  );
};
