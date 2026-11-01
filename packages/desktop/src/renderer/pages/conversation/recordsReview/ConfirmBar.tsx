/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Input } from '@arco-design/web-react';
import type { FeedbackAction, FeedbackItem } from '@/common/types/recordsReview';

export const ConfirmBar: React.FC<{
  current?: FeedbackItem;
  onChoose: (action: FeedbackAction, after: string) => void;
}> = ({ current, onChoose }) => {
  const [after, setAfter] = useState(current && current.action === 'corrected' ? String(current.after ?? '') : '');
  return (
    <div className='mt-6px' onClick={(e) => e.stopPropagation()}>
      <div className='flex gap-4px'>
        <button
          type='button'
          className='px-8px py-2px text-11px rd-4px cursor-pointer border-none'
          style={{
            background: current?.action === 'accepted' ? 'rgb(var(--primary-6))' : 'var(--bg-3)',
            color: current?.action === 'accepted' ? '#fff' : 'var(--text-secondary)',
          }}
          onClick={() => onChoose('accepted', after)}
        >
          确认
        </button>
        <button
          type='button'
          className='px-8px py-2px text-11px rd-4px cursor-pointer border-none'
          style={{
            background: current?.action === 'corrected' ? 'rgb(var(--primary-6))' : 'var(--bg-3)',
            color: current?.action === 'corrected' ? '#fff' : 'var(--text-secondary)',
          }}
          onClick={() => onChoose('corrected', after)}
        >
          修改
        </button>
      </div>
      <Input
        className='mt-4px'
        size='mini'
        placeholder='改成什么（选修改时填写）'
        value={after}
        onChange={setAfter}
      />
    </div>
  );
};
