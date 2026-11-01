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

/** Only the user moves a project to `ready` or `delivered`; the system never does. */
export type RedeliveryReadiness = 'not_ready' | 'ready' | 'delivered';

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
  readiness?: RedeliveryReadiness;
  createdAt: number;
  updatedAt: number;
};

export type ReviewChoice = 'correct' | 'wrong' | 'supplement';

/**
 * One user judgement on a system result, or a readiness change. Append-only:
 * it is both the rubric signal for the engine and the consultant's audit trail
 * the client sees in the final report.
 */
export type ReviewAction = {
  id: string;
  projectId: string;
  at: number;
  target: string;
  label: string;
  systemValue: string;
  choice: ReviewChoice | 'readiness';
  note?: string;
  readiness?: RedeliveryReadiness;
};
