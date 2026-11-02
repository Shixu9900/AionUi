/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Built-in MCP server that lets the assistant switch the workbench's center pane
 * and look up a review card from the backend engine.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  BUILTIN_WORKBENCH_MCP_NAME,
  WORKBENCH_FOCUSES,
  WORKBENCH_LIFE_VIEWS,
  WORKBENCH_LOOKUP_TOOL,
  WORKBENCH_PAGES,
  WORKBENCH_SHOW_TOOL,
  parseWorkbenchShowArgs,
} from '@/common/chat/workbenchShow';
import { lookupWorkbenchCard, writeWorkbenchMemory } from './workbenchLookupClient';

const SHOW_DESCRIPTION = `Open a result in the workbench's center pane. The center pane is where results live; the chat panel only shows your process and a short conclusion.

For a presentable project question (verdict, remaining life, TSN/CSN, open items, records, report): call workbench_lookup first, then call this tool once with the card's page/focus/part. After that, reply in at most two short lines. Do not invent numbers.

Pages:
- overview: the project's verdict summary.
- llp: life-limited parts. Pass \`part\` (part number, serial number, or node id) to select a component, and \`focus\`: summary (verdict + life track), life (life track only), evidence (source pages per reading), items (open/missing items). \`life_view\`: full, budget, or yearly.
- records: the delivery package / record files. Pass \`package_item\` (Annex II item code such as F007) to open one item.
- report: the redelivery report.

If the answer cannot be shown in the workbench (a general question, an explanation), do not call this tool and answer normally.`;

const LOOKUP_DESCRIPTION = `Look up the current review card from the records-review engine. Returns verdict, TSN/CSN, remaining life, open-item count, and the page/focus/part to pass to workbench_show.

Call this before workbench_show when the user asks about a part, serial, remaining life, verdict, or open items. Never invent numbers; use this card.`;

async function main() {
  const server = new McpServer({ name: BUILTIN_WORKBENCH_MCP_NAME, version: '1.0.0' });

  server.tool(
    WORKBENCH_LOOKUP_TOOL,
    LOOKUP_DESCRIPTION,
    {
      query: z
        .string()
        .describe('Part number, serial number, node id, or a short question such as "RGF34904 remaining life".'),
    },
    async ({ query }) => {
      try {
        const card = await lookupWorkbenchCard(query);
        return { content: [{ type: 'text' as const, text: JSON.stringify(card) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    WORKBENCH_SHOW_TOOL,
    SHOW_DESCRIPTION,
    {
      page: z.enum(WORKBENCH_PAGES).describe('Which workbench page to open.'),
      label: z
        .string()
        .describe('Very short label of what is shown, in the user\'s language, e.g. "RGF34904 · 寿命轨迹".'),
      part: z.string().optional().describe('llp page: part number, serial number, or part-tree node id to select.'),
      focus: z.enum(WORKBENCH_FOCUSES).optional().describe('llp page: which part of the component review to show.'),
      life_view: z.enum(WORKBENCH_LIFE_VIEWS).optional().describe('llp page: life-track variant.'),
      package_item: z.string().optional().describe('records page: Annex II item code, e.g. F007.'),
    },
    async (raw) => {
      const args = parseWorkbenchShowArgs(raw);
      if (!args) {
        return { content: [{ type: 'text' as const, text: 'Error: unknown workbench page.' }], isError: true };
      }
      await writeWorkbenchMemory(process.cwd(), { last_show: args }).catch(() => undefined);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Opened in the workbench center pane: ${args.label}. Now reply in at most two short lines; do not repeat what the center pane shows.`,
          },
        ],
      };
    }
  );

  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error('[WorkbenchMCP] Fatal error:', error);
  process.exit(1);
});
