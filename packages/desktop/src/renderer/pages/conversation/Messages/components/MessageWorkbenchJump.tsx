/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IMessageToolCall } from '@/common/chat/chatLib';
import { parseWorkbenchShowArgs } from '@/common/chat/workbenchShow';
import { showInWorkbench } from '@/renderer/pages/workbench/workbenchStore';
import { ArrowRightUp } from '@icon-park/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import MessageToolCall from './MessageToolCall';

/**
 * A `workbench_show` call rendered as a one-line pointer to the center pane,
 * instead of a tool step — the result itself lives in the workbench.
 */
const MessageWorkbenchJump: React.FC<{ message: IMessageToolCall }> = ({ message }) => {
  const { t } = useTranslation();
  const args = parseWorkbenchShowArgs(message.content.args ?? message.content.input);
  if (!args || message.content.status === 'error') return <MessageToolCall message={message} />;

  const done = message.content.status === 'completed';
  return (
    <button
      type='button'
      onClick={() => showInWorkbench(args)}
      disabled={!done}
      className='group flex items-center gap-6px max-w-full py-6px px-10px rd-8px border border-solid border-[var(--color-border-2)] bg-transparent text-13px text-t-secondary cursor-pointer enabled:hover:bg-fill-2 disabled:cursor-default'
    >
      <ArrowRightUp theme='outline' size='14' fill='currentColor' className='flex-shrink-0' />
      <span className='truncate text-t-primary'>
        {t(done ? 'conversation.workbench.jump.opened' : 'conversation.workbench.jump.opening', { label: args.label })}
      </span>
      {done && (
        <span className='flex-shrink-0 text-12px text-t-tertiary opacity-0 group-hover:opacity-100 transition-opacity'>
          {t('conversation.workbench.jump.reopen')}
        </span>
      )}
    </button>
  );
};

export default MessageWorkbenchJump;
