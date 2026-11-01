/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { KnowledgeIndex, KnowledgeItem } from '@/common/types/knowledgeBase';

const INDEX_PATH = 'index.json';
const READ_TIMEOUT_MS = 5000;

export const readKnowledgeText = async (relativePath: string): Promise<string> => {
  let timer = 0;
  const timeout = new Promise<string>((resolve) => {
    timer = window.setTimeout(() => resolve(''), READ_TIMEOUT_MS);
  });
  try {
    return await Promise.race([ipcBridge.knowledgeBase.readFile.invoke({ relativePath }), timeout]);
  } catch {
    return '';
  } finally {
    window.clearTimeout(timer);
  }
};

const readText = readKnowledgeText;

export const writeKnowledgeText = (relativePath: string, data: string) =>
  ipcBridge.knowledgeBase.writeFile.invoke({ relativePath, data });

export const readKnowledgeIndex = async (): Promise<KnowledgeItem[]> => {
  const text = await readText(INDEX_PATH);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text) as KnowledgeIndex;
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
};

export const writeKnowledgeIndex = async (items: KnowledgeItem[]): Promise<void> => {
  const index: KnowledgeIndex = { schema: 'aviator.knowledge-index/v1', items };
  await ipcBridge.knowledgeBase.writeFile.invoke({
    relativePath: INDEX_PATH,
    data: JSON.stringify(index, null, 2),
  });
};
