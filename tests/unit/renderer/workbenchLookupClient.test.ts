import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  lookupWorkbenchCard,
  workbenchAuthHeaders,
  workbenchBackendUrl,
} from '@/process/resources/builtinMcp/workbenchLookupClient';

describe('workbenchLookupClient', () => {
  it('strips a trailing slash from the backend url', () => {
    expect(workbenchBackendUrl({ AIONUI_BASE_URL: 'http://127.0.0.1:25808/' })).toBe('http://127.0.0.1:25808');
  });

  it('forwards the runtime token and conversation id', () => {
    expect(
      workbenchAuthHeaders({
        AIONUI_RUNTIME_TOKEN: 'tok',
        AIONUI_USER_ID: 'u1',
        AIONUI_CONVERSATION_ID: 'c1',
      })
    ).toMatchObject({
      authorization: 'Bearer tok',
      'x-aionui-runtime-token': 'tok',
      'x-aionui-user-id': 'u1',
      'x-aionui-conversation-id': 'c1',
    });
  });

  it('posts the local package to the backend lookup route', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'wb-lookup-'));
    await writeFile(
      path.join(cwd, 'records-review.json'),
      JSON.stringify({ schema: 'aviator.records-review/v1', component: { part_number: 'A', serial_number: 'B' } }),
      'utf8'
    );
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          found: true,
          query: 'B',
          part_number: 'A',
          serial_number: 'B',
          description: '',
          open_items: 0,
          page: 'llp',
          focus: 'life',
          part: 'B',
          label: 'B',
        },
      }),
    })) as unknown as typeof fetch;

    const card = await lookupWorkbenchCard('B 寿命', {
      cwd,
      env: { AIONUI_BASE_URL: 'http://127.0.0.1:9' } as NodeJS.ProcessEnv,
      fetchImpl,
    });
    expect(card.serial_number).toBe('B');
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://127.0.0.1:9/api/records-review/lookup',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
