/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback } from 'react';
import { ipcBridge } from '@/common';
import type { IProvider, TChatConversation, TProviderWithModel } from '@/common/config/storage';
import AionrsChat from '@renderer/pages/conversation/platforms/aionrs/AionrsChat';
import { useAionrsModelSelection } from '@renderer/pages/conversation/platforms/aionrs/useAionrsModelSelection';
import styles from './index.module.css';

type AionrsConversation = Extract<TChatConversation, { type: 'aionrs' }>;

export const TeachChat: React.FC<{ conversation: AionrsConversation; assistantId: string }> = ({
  conversation,
  assistantId,
}) => {
  const onSelectModel = useCallback(
    async (provider: IProvider, modelName: string) => {
      const selected = { ...provider, use_model: modelName } as TProviderWithModel;
      return Boolean(await ipcBridge.conversation.update.invoke({ id: conversation.id, updates: { model: selected } }));
    },
    [conversation.id]
  );
  const modelSelection = useAionrsModelSelection({ initialModel: conversation.model, onSelectModel });

  return (
    <AionrsChat
      conversation_id={conversation.id}
      workspace={conversation.extra.workspace}
      modelSelection={modelSelection}
      session_mode={conversation.extra?.session_mode}
      agent_name='工作流师傅'
      assistantId={assistantId}
      loadedSkills={(conversation.extra as { skills?: string[] }).skills}
      emptySlot={<div className={styles.chatEmpty}>工作流师傅正在准备第一个问题……</div>}
    />
  );
};
