/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSyncExternalStore } from 'react';
import type {
  WorkbenchShowArgs,
  WorkbenchShowFocus,
  WorkbenchShowLifeView,
  WorkbenchShowPage,
} from '@/common/chat/workbenchShow';

export type WorkbenchPage = WorkbenchShowPage;
export type WorkbenchSubject = 'aircraft' | 'engine' | 'blade';
export type LifeView = WorkbenchShowLifeView;
export type EvMetric = 'all' | 'tsn' | 'csn';
export type WorkbenchFocus = WorkbenchShowFocus;

export type WorkbenchState = {
  page: WorkbenchPage;
  subject: WorkbenchSubject;
  lifeView: LifeView;
  evMetric: EvMetric;
  focus: WorkbenchFocus;
  driveId: string;
  aircraftId: string | null;
  /** Selected LLP node. */
  selectedId: string | null;
  /**
   * Part number / serial number / node id the assistant asked to show. The LLP
   * page resolves it against its part tree and moves it into `selectedId`.
   */
  partQuery: string | null;
  /** Selected Annex II item in the delivery package, e.g. `F007`. */
  packageItem: string | null;
};

const AIRCRAFT_KEY = 'aviator.activeProjectId';

const readAircraftId = (): string | null => {
  try {
    return localStorage.getItem(AIRCRAFT_KEY);
  } catch {
    return null;
  }
};

let state: WorkbenchState = {
  page: 'overview',
  subject: 'aircraft',
  lifeView: 'full',
  evMetric: 'all',
  focus: 'summary',
  driveId: 'verdict',
  aircraftId: readAircraftId(),
  selectedId: null,
  partQuery: null,
  packageItem: null,
};

const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getWorkbenchState = (): WorkbenchState => state;

export const useWorkbenchState = (): WorkbenchState =>
  useSyncExternalStore(subscribe, getWorkbenchState, getWorkbenchState);

export const patchWorkbench = (patch: Partial<WorkbenchState>): void => {
  state = { ...state, ...patch };
  emit();
};

export const setWorkbenchAircraft = (aircraftId: string | null): void => {
  if (aircraftId === state.aircraftId) return;
  patchWorkbench({ aircraftId, subject: 'aircraft', page: 'overview', packageItem: null, partQuery: null });
};

/** Applies an assistant `workbench_show` request to the center pane. */
export const showInWorkbench = (args: WorkbenchShowArgs): void => {
  const patch: Partial<WorkbenchState> = { page: args.page };
  if (args.page === 'llp') {
    patch.focus = args.focus ?? 'summary';
    patch.lifeView = args.life_view ?? 'full';
    if (args.part) patch.partQuery = args.part;
  }
  if (args.page === 'records' && args.package_item) patch.packageItem = args.package_item;
  patchWorkbench(patch);
};
