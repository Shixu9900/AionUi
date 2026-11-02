import { describe, expect, it } from 'vitest';
import {
  conversationHasWorkbenchMcp,
  extraConversationsToArchive,
  isAdoptableProjectConversation,
  pickAdoptableConversation,
} from '@/common/chat/projectConversation';
import { BUILTIN_WORKBENCH_MCP_NAME } from '@/common/chat/workbenchShow';
import type { TChatConversation } from '@/common/config/storage';

const workspace = '/records/msn-1100';

const conversation = (overrides: Partial<TChatConversation> & { extra?: Record<string, unknown> }): TChatConversation =>
  ({
    id: 'c1',
    type: 'aionrs',
    name: 'review',
    created_at: 1,
    modified_at: 1,
    extra: {
      workspace,
      custom_workspace: true,
      session_mcp_servers: [{ id: 'w', name: BUILTIN_WORKBENCH_MCP_NAME }],
    },
    ...overrides,
  }) as TChatConversation;

describe('projectConversation', () => {
  it('accepts an aionrs conversation on the same workspace with the workbench MCP', () => {
    expect(isAdoptableProjectConversation(conversation({}), workspace)).toBe(true);
    expect(conversationHasWorkbenchMcp(conversation({}))).toBe(true);
  });

  it('rejects ACP conversations, team chats, and conversations without the workbench MCP', () => {
    expect(isAdoptableProjectConversation(conversation({ type: 'acp' }), workspace)).toBe(false);
    expect(
      isAdoptableProjectConversation(
        conversation({ extra: { workspace, custom_workspace: true, team_id: 't1', session_mcp_servers: [] } }),
        workspace
      )
    ).toBe(false);
    expect(
      isAdoptableProjectConversation(
        conversation({ extra: { workspace, custom_workspace: true, session_mcp_servers: [] } }),
        workspace
      )
    ).toBe(false);
  });

  it('picks the most recently modified adoptable conversation', () => {
    const older = conversation({ id: 'old', modified_at: 10 });
    const newer = conversation({ id: 'new', modified_at: 20 });
    expect(pickAdoptableConversation([older, newer], workspace)?.id).toBe('new');
  });

  it('lists same-folder extras to archive, keeping the bound conversation and team chats', () => {
    const keep = conversation({ id: 'keep' });
    const extra = conversation({ id: 'extra', extra: { workspace, custom_workspace: true } });
    const team = conversation({
      id: 'team',
      extra: { workspace, custom_workspace: true, team_id: 't1' },
    });
    const otherFolder = conversation({
      id: 'other',
      extra: { workspace: '/somewhere-else', custom_workspace: true },
    });
    expect(extraConversationsToArchive([keep, extra, team, otherFolder], workspace, 'keep').map((c) => c.id)).toEqual([
      'extra',
    ]);
  });
});
