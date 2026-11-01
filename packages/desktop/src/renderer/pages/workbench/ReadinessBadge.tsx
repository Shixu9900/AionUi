/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Check } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import type { RedeliveryReadiness } from '@/common/types/aircraftProject';

export const READINESS_COLOR: Record<RedeliveryReadiness, string> = {
  not_ready: '#e5a000',
  ready: '#30a46c',
  delivered: '#3b82f6',
};

const ReadinessGlyph: React.FC<{ readiness: RedeliveryReadiness; size: number }> = ({ readiness, size }) => {
  const color = READINESS_COLOR[readiness];
  switch (readiness) {
    case 'not_ready':
      return (
        <span className='inline-block rd-full shrink-0' style={{ width: size, height: size, background: color }} />
      );
    case 'ready':
      return <Check theme='outline' size={size + 4} fill={color} strokeWidth={5} />;
    case 'delivered':
      return (
        <span
          className='inline-flex items-center justify-center rd-full shrink-0'
          style={{ width: size + 4, height: size + 4, background: color }}
        >
          <Check theme='outline' size={size} fill='#fff' strokeWidth={6} />
        </span>
      );
    default: {
      const exhaustive: never = readiness;
      return exhaustive;
    }
  }
};

const ReadinessBadge: React.FC<{ readiness?: RedeliveryReadiness; compact?: boolean }> = ({
  readiness = 'not_ready',
  compact,
}) => {
  const { t } = useTranslation();
  const label = t(`conversation.workbench.readiness.${readiness}`);
  if (compact) {
    return (
      <span title={label} className='inline-flex'>
        <ReadinessGlyph readiness={readiness} size={7} />
      </span>
    );
  }
  return (
    <span
      className='inline-flex items-center gap-4px shrink-0 px-6px h-18px leading-18px rd-4px text-11px font-600'
      style={{ color: READINESS_COLOR[readiness], background: `${READINESS_COLOR[readiness]}1a` }}
    >
      <ReadinessGlyph readiness={readiness} size={7} />
      {label}
    </span>
  );
};

export default ReadinessBadge;
