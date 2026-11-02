/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

// Shared by the standalone `aionui-workbench` MCP process and the renderer, so it
// must stay free of renderer/Electron imports.

export const BUILTIN_WORKBENCH_MCP_NAME = 'aionui-workbench';
export const WORKBENCH_SHOW_TOOL = 'workbench_show';
export const WORKBENCH_LOOKUP_TOOL = 'workbench_lookup';
export const WORKBENCH_MEMORY_FILE = '.aionui/workbench-memory.json';

export const WORKBENCH_PAGES = ['overview', 'llp', 'records', 'report'] as const;
export const WORKBENCH_FOCUSES = ['summary', 'life', 'evidence', 'items'] as const;
export const WORKBENCH_LIFE_VIEWS = ['full', 'budget', 'yearly'] as const;

export type WorkbenchShowPage = (typeof WORKBENCH_PAGES)[number];
export type WorkbenchShowFocus = (typeof WORKBENCH_FOCUSES)[number];
export type WorkbenchShowLifeView = (typeof WORKBENCH_LIFE_VIEWS)[number];

export type WorkbenchShowArgs = {
  page: WorkbenchShowPage;
  /** Short human label for the jump card, e.g. `RGF34904 · 寿命轨迹`. */
  label: string;
  /** Part number, serial number, or part-tree node id to select on the LLP page. */
  part?: string;
  focus?: WorkbenchShowFocus;
  life_view?: WorkbenchShowLifeView;
  /** Annex II delivery-package item code on the records page, e.g. `F007`. */
  package_item?: string;
};

/** aionrs keeps an MCP tool's own name unless it collides, then prefixes it with the server. */
export const isWorkbenchShowToolName = (name: unknown): boolean =>
  typeof name === 'string' && (name === WORKBENCH_SHOW_TOOL || name.endsWith(`_${WORKBENCH_SHOW_TOOL}`));

const oneOf = <T extends string>(values: readonly T[], value: unknown): T | undefined =>
  typeof value === 'string' && (values as readonly string[]).includes(value) ? (value as T) : undefined;

const text = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

/** Validates model-supplied tool arguments; returns null when `page` is missing or unknown. */
export const parseWorkbenchShowArgs = (raw: unknown): WorkbenchShowArgs | null => {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const page = oneOf(WORKBENCH_PAGES, record.page);
  if (!page) return null;
  return {
    page,
    label: text(record.label) ?? page,
    part: text(record.part),
    focus: oneOf(WORKBENCH_FOCUSES, record.focus),
    life_view: oneOf(WORKBENCH_LIFE_VIEWS, record.life_view),
    package_item: text(record.package_item)?.toUpperCase(),
  };
};
