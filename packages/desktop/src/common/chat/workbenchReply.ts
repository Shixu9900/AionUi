/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TMessage } from '@/common/chat/chatLib';
import { isWorkbenchShowToolName } from '@/common/chat/workbenchShow';

/** Assistant text message ids that belong to a turn that opened the workbench. */
export const workbenchReplyTextIds = (messages: readonly TMessage[]): Set<string> => {
  const turnIds = new Set<string>();
  const showIndexes: number[] = [];
  messages.forEach((message, index) => {
    if (message.type !== 'tool_call' || !isWorkbenchShowToolName(message.content.name)) return;
    if (message.backend_turn_id) turnIds.add(message.backend_turn_id);
    else showIndexes.push(index);
  });

  const ids = new Set<string>();
  for (const message of messages) {
    if (message.type !== 'text' || message.position === 'right') continue;
    if (message.backend_turn_id && turnIds.has(message.backend_turn_id)) ids.add(message.id);
  }

  for (const showIndex of showIndexes) {
    let start = 0;
    for (let i = showIndex; i >= 0; i--) {
      if (messages[i].type === 'text' && messages[i].position === 'right') {
        start = i;
        break;
      }
    }
    let end = messages.length;
    for (let i = showIndex + 1; i < messages.length; i++) {
      if (messages[i].type === 'text' && messages[i].position === 'right') {
        end = i;
        break;
      }
    }
    for (let i = start; i < end; i++) {
      const message = messages[i];
      if (message.type === 'text' && message.position !== 'right') ids.add(message.id);
    }
  }
  return ids;
};

export const firstTwoNonEmptyLines = (text: string): { preview: string; clamped: boolean } => {
  const lines = text.split('\n');
  let nonEmpty = 0;
  const kept: string[] = [];
  for (const line of lines) {
    kept.push(line);
    if (line.trim()) nonEmpty += 1;
    if (nonEmpty >= 2) break;
  }
  const preview = kept.join('\n');
  return { preview, clamped: preview.length < text.replace(/\s+$/, '').length };
};
