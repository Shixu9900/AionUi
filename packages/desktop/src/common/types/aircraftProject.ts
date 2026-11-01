/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

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
  kind: AircraftProjectKind;
  workspace?: string;
  createdAt: number;
  updatedAt: number;
};
