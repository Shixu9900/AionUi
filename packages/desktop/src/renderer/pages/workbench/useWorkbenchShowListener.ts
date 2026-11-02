/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { ipcBridge } from '@/common';
import type { IResponseMessage } from '@/common/adapter/ipcBridge';
import { isWorkbenchShowToolName, parseWorkbenchShowArgs, type WorkbenchShowArgs } from '@/common/chat/workbenchShow';
import { getCurrentConversation } from '@/renderer/pages/conversation/explorer/currentConversationStore';
import { showInWorkbench } from './workbenchStore';

type ToolCallFrame = { call_id?: unknown; name?: unknown; args?: unknown; status?: unknown };

/**
 * Matches streamed `tool_call` frames for `workbench_show`. The running frame
 * carries the arguments and the completed frame carries only the status, so
 * arguments are remembered by `call_id` until the call completes.
 */
export const createWorkbenchShowTracker = () => {
  const pending = new Map<string, unknown>();
  return (message: Pick<IResponseMessage, 'type' | 'data'>): WorkbenchShowArgs | null => {
    if (message.type !== 'tool_call') return null;
    const frame = (message.data ?? {}) as ToolCallFrame;
    if (typeof frame.call_id !== 'string') return null;
    const known = pending.has(frame.call_id);
    if (!known && !isWorkbenchShowToolName(frame.name)) return null;
    if (frame.args && typeof frame.args === 'object') pending.set(frame.call_id, frame.args);
    if (frame.status === 'error' || frame.status === 'canceled') {
      pending.delete(frame.call_id);
      return null;
    }
    if (frame.status !== 'completed') return null;
    const args = pending.get(frame.call_id);
    pending.delete(frame.call_id);
    return parseWorkbenchShowArgs(args);
  };
};

/** Moves the center pane when the visible conversation's assistant calls `workbench_show`. */
export const useWorkbenchShowListener = (): void => {
  useEffect(() => {
    const stream = ipcBridge.conversation?.responseStream;
    if (!stream?.on) return;
    const track = createWorkbenchShowTracker();
    return stream.on((message) => {
      const current = getCurrentConversation();
      if (current && message.conversation_id !== current) return;
      const args = track(message);
      if (args) showInWorkbench(args);
    });
  }, []);
};
