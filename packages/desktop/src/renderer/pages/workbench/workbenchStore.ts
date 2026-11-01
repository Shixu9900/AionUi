/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSyncExternalStore } from 'react';

export type WorkbenchPage = 'overview' | 'llp' | 'records' | 'report';
export type WorkbenchSubject = 'aircraft' | 'engine' | 'blade';
export type LifeView = 'full' | 'budget' | 'yearly';
export type EvMetric = 'all' | 'tsn' | 'csn';
export type WorkbenchFocus = 'summary' | 'life' | 'evidence' | 'items';

export type WorkbenchState = {
  page: WorkbenchPage;
  subject: WorkbenchSubject;
  lifeView: LifeView;
  evMetric: EvMetric;
  focus: WorkbenchFocus;
  driveId: string;
  aircraftId: string | null;
  /** Selected LLP node or IATA file id. */
  selectedId: string | null;
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
  patchWorkbench({ aircraftId, subject: 'aircraft', page: 'overview' });
};
