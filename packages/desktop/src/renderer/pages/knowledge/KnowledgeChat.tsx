/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ipcBridge } from '@/common';
import type { IProvider, TChatConversation, TProviderWithModel } from '@/common/config/storage';
import AionrsChat from '@renderer/pages/conversation/platforms/aionrs/AionrsChat';
import { useAionrsModelSelection } from '@renderer/pages/conversation/platforms/aionrs/useAionrsModelSelection';

type AionrsConversation = Extract<TChatConversation, { type: 'aionrs' }>;

export const KnowledgeChat: React.FC<{ conversation: AionrsConversation; assistantId: string }> = ({
  conversation,
  assistantId,
}) => {
  const { t } = useTranslation();
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
      agent_name={t('guid.knowledge.agentName')}
      assistantId={assistantId}
      loadedSkills={(conversation.extra as { skills?: string[] }).skills}
      emptySlot={null}
    />
  );
};
