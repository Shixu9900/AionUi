/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TChatConversation } from '@/common/config/storage';
import { BUILTIN_WORKBENCH_MCP_NAME } from '@/common/chat/workbenchShow';

export const normalizeWorkspace = (value: string): string => value.replace(/[\\/]+$/, '');

const extraOf = (conversation: TChatConversation): Record<string, unknown> =>
  (conversation.extra ?? {}) as Record<string, unknown>;

export const isTeamConversation = (conversation: TChatConversation): boolean => {
  const extra = extraOf(conversation);
  return Boolean(extra.team_id || extra.teamId);
};

/** Workspace folder this conversation is pinned to, if the user chose one. */
export const conversationWorkspace = (conversation: TChatConversation): string | undefined => {
  const extra = extraOf(conversation);
  if (extra.custom_workspace !== true) return undefined;
  return typeof extra.workspace === 'string' && extra.workspace ? extra.workspace : undefined;
};

const sessionMcpNames = (conversation: TChatConversation): string[] => {
  const extra = extraOf(conversation);
  const names = new Set<string>();
  const listed = extra.mcp_servers;
  if (Array.isArray(listed)) {
    for (const name of listed) {
      if (typeof name === 'string' && name) names.add(name);
    }
  }
  const sessions = extra.session_mcp_servers ?? extra.selected_session_mcp_servers;
  if (Array.isArray(sessions)) {
    for (const server of sessions) {
      if (server && typeof server === 'object' && 'name' in server && typeof server.name === 'string' && server.name) {
        names.add(server.name);
      }
    }
  }
  return [...names];
};

export const conversationHasWorkbenchMcp = (conversation: TChatConversation): boolean =>
  sessionMcpNames(conversation).includes(BUILTIN_WORKBENCH_MCP_NAME);

/**
 * A conversation that can become a project's single thread: aionrs, same
 * records folder, workbench MCP attached, not a team chat.
 */
export const isAdoptableProjectConversation = (conversation: TChatConversation, workspace: string): boolean => {
  if (conversation.type !== 'aionrs') return false;
  if (isTeamConversation(conversation)) return false;
  const pinned = conversationWorkspace(conversation);
  if (!pinned || normalizeWorkspace(pinned) !== normalizeWorkspace(workspace)) return false;
  return conversationHasWorkbenchMcp(conversation);
};

const activityTime = (conversation: TChatConversation): number =>
  conversation.modified_at || conversation.created_at || 0;

export const pickAdoptableConversation = (
  conversations: readonly TChatConversation[],
  workspace: string
): TChatConversation | undefined =>
  conversations
    .filter((conversation) => isAdoptableProjectConversation(conversation, workspace))
    .toSorted((a, b) => activityTime(b) - activityTime(a))[0];

/** Same-folder conversations that should be archived once one is bound. */
export const extraConversationsToArchive = (
  conversations: readonly TChatConversation[],
  workspace: string,
  keepId: string
): TChatConversation[] =>
  conversations.filter((conversation) => {
    if (conversation.id === keepId) return false;
    if (isTeamConversation(conversation)) return false;
    const pinned = conversationWorkspace(conversation);
    return Boolean(pinned && normalizeWorkspace(pinned) === normalizeWorkspace(workspace));
  });
