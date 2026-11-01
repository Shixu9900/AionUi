/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Input } from '@arco-design/web-react';
import type { ElicitItem, ElicitStance } from '@/common/types/recordsReview';

const LABELS: Record<ElicitStance, string> = {
  agree: '对',
  disagree: '不对',
  unsure: '说不准',
};

export const ElicitBar: React.FC<{
  current?: ElicitItem;
  onChoose: (stance: ElicitStance, reason: string) => void;
}> = ({ current, onChoose }) => {
  const [reason, setReason] = useState(current?.reason ?? '');
  return (
    <div className='mt-6px' onClick={(e) => e.stopPropagation()}>
      <div className='flex gap-4px'>
        {(['agree', 'disagree', 'unsure'] as const).map((stance) => (
          <button
            key={stance}
            type='button'
            className='px-8px py-2px text-11px rd-4px cursor-pointer border-none'
            style={{
              background: current?.stance === stance ? 'rgb(var(--primary-6))' : 'var(--bg-3)',
              color: current?.stance === stance ? '#fff' : 'var(--text-secondary)',
            }}
            onClick={() => onChoose(stance, reason)}
          >
            {LABELS[stance]}
          </button>
        ))}
      </div>
      <Input.TextArea
        className='mt-4px'
        autoSize={{ minRows: 1, maxRows: 3 }}
        placeholder='为什么对、不对，或为什么说不准'
        value={reason}
        onChange={setReason}
        onBlur={() => {
          if (current && reason !== current.reason) onChoose(current.stance, reason);
        }}
      />
    </div>
  );
};
