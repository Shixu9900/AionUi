/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { WorkflowDraft, WorkflowLibraryIndex, WorkflowTeachSession } from '@/common/types/createWorkflow';

export const AVIATOR_ROOT = '/Users/9900macbook/Aviator-workspace/aviator';
export const WORKFLOWS_ROOT = `${AVIATOR_ROOT}/workflows`;

const LIBRARY_INDEX = '_sessions/library.json';
/** Single-session pointer written before the library existed; folded into the library on first read. */
const LEGACY_CURRENT = '_sessions/current.json';

/** A main process started before the createWorkflow bridge existed never answers; don't hang the page on it. */
const READ_TIMEOUT_MS = 5000;

export const readText = async (relativePath: string): Promise<string | null> => {
  let timer = 0;
  const timeout = new Promise<null>((resolve) => {
    timer = window.setTimeout(() => resolve(null), READ_TIMEOUT_MS);
  });
  try {
    return await Promise.race([ipcBridge.createWorkflow.readFile.invoke({ relativePath }), timeout]);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
};

export const writeText = (relativePath: string, data: string) =>
  ipcBridge.createWorkflow.writeFile.invoke({ relativePath, data });

const parseJson = <T>(text: string | null): T | null => {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

export const parseDraft = (text: string | null) => parseJson<WorkflowDraft>(text);

/** Formal output directory of a workflow (WORKFLOW.md + skill/), outside the gitignored _sessions/. */
export const deliverDirOf = (session: WorkflowTeachSession) => `teach-${session.createdAt}`;

export const skillNameOf = (session: WorkflowTeachSession) => `workflow-${deliverDirOf(session)}`;

export const readLibrary = async (): Promise<WorkflowTeachSession[]> => {
  const index = parseJson<WorkflowLibraryIndex>(await readText(LIBRARY_INDEX));
  if (index?.items) return index.items;
  const legacy = parseJson<WorkflowTeachSession>(await readText(LEGACY_CURRENT));
  const items = legacy?.conversationId ? [legacy] : [];
  if (items.length > 0) await writeLibrary(items);
  return items;
};

export const writeLibrary = async (items: WorkflowTeachSession[]) => {
  const index: WorkflowLibraryIndex = { schema: 'aviator.workflow-library/v1', items };
  await writeText(LIBRARY_INDEX, JSON.stringify(index, null, 2));
};
