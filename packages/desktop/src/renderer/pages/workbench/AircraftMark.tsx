/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export type AircraftFamily = 'narrow' | 'wide' | 'jumbo' | 'regional' | 'prop';

/** Match a typed type name to a side-view family. The drawing is original, not a manufacturer photo. */
export const aircraftFamily = (type?: string): AircraftFamily => {
  const value = (type ?? '').toUpperCase().replace(/\s+/g, '');
  if (/A380|B747|747|380/.test(value)) return 'jumbo';
  if (/ATR|Q400|DHC|72-/.test(value)) return 'prop';
  if (/E1[79]0|E190|E175|CRJ|ARJ|ERJ/.test(value)) return 'regional';
  if (/A33|A34|A35|B76|B77|B78|767|777|787|330|340|350/.test(value)) return 'wide';
  return 'narrow';
};

const PATHS: Record<AircraftFamily, string> = {
  narrow: 'M4 26h28l10-2 8 2h16l6 3-6 2H42l-6 8H28l2-8H14L8 40H4l2-6 4-2-6-3 4-3z',
  wide: 'M2 24h34l12-3 10 3h22l7 4-7 2H50l-8 10H30l3-10H12L6 42H2l3-7 5-2-8-4 5-5z',
  jumbo: 'M2 22h18l6-8h10l4 8h22l8-2 8 2h8l6 4-6 2H74l-6 12H40l2-12H16L8 44H2l4-8 6-2-8-5 6-7z',
  regional: 'M6 28h22l8-2 6 2h10l5 3-5 2H36l-4 7H24l2-7H12L8 38H5l2-4 3-1-4-3z',
  prop: 'M4 30h20l4-7 4 7h12l4 2-4 2H30l-2 6H20l1-6H10L6 38H3l2-4z M28 18v8M24 22h8',
};

const AircraftMark: React.FC<{ type?: string; size?: number }> = ({ type, size = 36 }) => {
  const family = aircraftFamily(type);
  return (
    <svg width={size} height={size} viewBox='0 0 96 48' aria-hidden='true' className='text-t-secondary'>
      <path d={PATHS[family]} fill='currentColor' />
    </svg>
  );
};

export default AircraftMark;
