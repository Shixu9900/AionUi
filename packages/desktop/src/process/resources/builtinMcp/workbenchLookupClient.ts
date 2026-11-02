/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RECORDS_REVIEW_PACKAGE_FILE } from '@/common/types/recordsReview';
import { WORKBENCH_MEMORY_FILE } from '@/common/chat/workbenchShow';

export type WorkbenchLookupCard = {
  found: boolean;
  query: string;
  part_number: string;
  serial_number: string;
  description: string;
  verdict?: string | null;
  tsn?: string | null;
  csn?: string | null;
  remaining_cycles?: number | null;
  remaining_hours?: number | null;
  open_items: number;
  page: string;
  focus: string;
  part: string;
  label: string;
};

export type WorkbenchMemory = {
  last_show?: Record<string, unknown>;
  last_lookup?: WorkbenchLookupCard;
  last_conclusion?: string;
  updated_at?: string;
};

const PACKAGE_CANDIDATES = [RECORDS_REVIEW_PACKAGE_FILE, path.join('knowledge', RECORDS_REVIEW_PACKAGE_FILE)];

export const workbenchBackendUrl = (env: NodeJS.ProcessEnv = process.env): string =>
  (env.AIONUI_BASE_URL ?? '').trim().replace(/\/$/, '');

export const workbenchAuthHeaders = (env: NodeJS.ProcessEnv = process.env): Record<string, string> => {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const token = env.AIONUI_RUNTIME_TOKEN?.trim();
  const userId = env.AIONUI_USER_ID?.trim();
  const conversationId = env.AIONUI_CONVERSATION_ID?.trim();
  if (token) {
    headers.authorization = `Bearer ${token}`;
    headers['x-aionui-runtime-token'] = token;
  }
  if (userId) headers['x-aionui-user-id'] = userId;
  if (conversationId) headers['x-aionui-conversation-id'] = conversationId;
  return headers;
};

export const readReviewPackage = async (cwd: string): Promise<unknown | null> => {
  for (const relative of PACKAGE_CANDIDATES) {
    try {
      return JSON.parse(await readFile(path.join(cwd, relative), 'utf8'));
    } catch {
      // try the next known location
    }
  }
  return null;
};

export const writeWorkbenchMemory = async (cwd: string, patch: WorkbenchMemory): Promise<void> => {
  const file = path.join(cwd, WORKBENCH_MEMORY_FILE);
  await mkdir(path.dirname(file), { recursive: true });
  let previous: WorkbenchMemory = {};
  try {
    previous = JSON.parse(await readFile(file, 'utf8')) as WorkbenchMemory;
  } catch {
    previous = {};
  }
  await writeFile(
    file,
    `${JSON.stringify({ ...previous, ...patch, updated_at: new Date().toISOString() }, null, 2)}\n`,
    'utf8'
  );
};

export const lookupWorkbenchCard = async (
  query: string,
  options: { cwd?: string; env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {}
): Promise<WorkbenchLookupCard> => {
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const baseUrl = workbenchBackendUrl(env);
  if (!baseUrl) {
    throw new Error('AIONUI_BASE_URL is missing; the workbench backend is not attached to this session.');
  }
  const pkg = await readReviewPackage(cwd);
  if (!pkg) {
    throw new Error(
      `${RECORDS_REVIEW_PACKAGE_FILE} was not found in the project folder. Extract the records first.`
    );
  }
  const response = await (options.fetchImpl ?? fetch)(`${baseUrl}/api/records-review/lookup`, {
    method: 'POST',
    headers: workbenchAuthHeaders(env),
    body: JSON.stringify({ query, package: pkg }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`workbench lookup failed (${response.status}): ${text.slice(0, 400)}`);
  }
  const payload = (await response.json()) as { data?: WorkbenchLookupCard };
  if (!payload.data) {
    throw new Error('workbench lookup returned no card.');
  }
  await writeWorkbenchMemory(cwd, {
    last_lookup: payload.data,
    last_conclusion: [
      payload.data.label,
      payload.data.verdict,
      payload.data.remaining_cycles != null ? `${payload.data.remaining_cycles} cycles remaining` : '',
    ]
      .filter(Boolean)
      .join(' · '),
  });
  return payload.data;
};
