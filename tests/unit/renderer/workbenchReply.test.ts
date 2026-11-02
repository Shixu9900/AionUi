import { describe, expect, it } from 'vitest';
import { firstTwoNonEmptyLines, workbenchReplyTextIds } from '@/common/chat/workbenchReply';
import type { TMessage } from '@/common/chat/chatLib';

const text = (id: string, position: 'left' | 'right', turn?: string): TMessage =>
  ({
    id,
    type: 'text',
    position,
    backend_turn_id: turn,
    content: { content: id },
  }) as TMessage;

const show = (id: string, turn?: string): TMessage =>
  ({
    id,
    type: 'tool_call',
    backend_turn_id: turn,
    content: { name: 'workbench_show', args: { page: 'llp' } },
  }) as TMessage;

describe('workbenchReplyTextIds', () => {
  it('marks assistant text that shares a turn with workbench_show', () => {
    const ids = workbenchReplyTextIds([
      text('u1', 'right', 't1'),
      text('a1', 'left', 't1'),
      show('s1', 't1'),
      text('a2', 'left', 't1'),
      text('u2', 'right', 't2'),
      text('a3', 'left', 't2'),
    ]);
    expect([...ids].toSorted()).toEqual(['a1', 'a2']);
  });

  it('falls back to the user-message window when the show call has no turn id', () => {
    const ids = workbenchReplyTextIds([text('u1', 'right'), text('a1', 'left'), show('s1'), text('a2', 'left')]);
    expect([...ids].toSorted()).toEqual(['a1', 'a2']);
  });
});

describe('firstTwoNonEmptyLines', () => {
  it('keeps two non-empty lines and reports when more remain', () => {
    expect(firstTwoNonEmptyLines('one\n\ntwo\nthree')).toEqual({ preview: 'one\n\ntwo', clamped: true });
    expect(firstTwoNonEmptyLines('one\ntwo')).toEqual({ preview: 'one\ntwo', clamped: false });
  });
});
