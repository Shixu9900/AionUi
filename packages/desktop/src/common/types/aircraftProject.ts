/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

export type AircraftProjectLine = 'transition' | 'component';

export type AircraftProjectKind = 'redelivery' | 'delivery' | 'midterm' | 'transaction' | 'other';

export const AIRCRAFT_PROJECT_KINDS: AircraftProjectKind[] = [
  'redelivery',
  'delivery',
  'midterm',
  'transaction',
  'other',
];

/** One aircraft = one project. `workspace` is the folder holding that aircraft's records. */
export type AircraftProject = {
  id: string;
  name: string;
  msn: string;
  aircraftType?: string;
  registration?: string;
  /** 进退租 or a single-component review. Fleet management is not stored: it stays locked. */
  line?: AircraftProjectLine;
  kind: AircraftProjectKind;
  workspace?: string;
  createdAt: number;
  updatedAt: number;
};
