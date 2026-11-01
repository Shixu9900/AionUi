/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Input, Message, Modal } from '@arco-design/web-react';
import { useTranslation } from 'react-i18next';
import type { ReviewAction, ReviewChoice } from '@/common/types/aircraftProject';

export const CHOICE_COLOR: Record<ReviewChoice, string> = {
  correct: '#30a46c',
  wrong: '#e5484d',
  supplement: '#3b82f6',
};

const CHOICES: ReviewChoice[] = ['correct', 'wrong', 'supplement'];
const GLYPH: Record<ReviewChoice, string> = { correct: '✓', wrong: '✕', supplement: '+' };

type TraceButtonsProps = {
  label: string;
  systemValue: string;
  latest?: ReviewAction;
  disabled?: boolean;
  onRecord: (choice: ReviewChoice, note?: string) => Promise<void>;
};

/** Correct / wrong / supplement on one system result. Wrong and supplement need a note: it goes into the report. */
const TraceButtons: React.FC<TraceButtonsProps> = ({ label, systemValue, latest, disabled, onRecord }) => {
  const { t } = useTranslation();
  const [asking, setAsking] = useState<ReviewChoice | null>(null);
  const [note, setNote] = useState('');
  const current = latest && latest.choice !== 'readiness' ? latest.choice : null;

  const pick = (choice: ReviewChoice) => {
    if (choice === 'correct') {
      void onRecord('correct');
      return;
    }
    setNote('');
    setAsking(choice);
  };

  const submit = async () => {
    if (!asking) return;
    if (!note.trim()) {
      Message.warning(t('conversation.workbench.trace.noteRequired'));
      return;
    }
    await onRecord(asking, note.trim());
    setAsking(null);
  };

  return (
    <div className='flex flex-col gap-2px min-w-0'>
      <div className='flex items-center gap-4px'>
        {CHOICES.map((choice) => {
          const active = current === choice;
          return (
            <button
              key={choice}
              type='button'
              disabled={disabled}
              title={t(`conversation.workbench.trace.${choice}`)}
              onClick={() => pick(choice)}
              className='h-20px px-6px rd-4px text-11px border border-solid cursor-pointer disabled:cursor-not-allowed disabled:opacity-40'
              style={{
                borderColor: active ? CHOICE_COLOR[choice] : 'var(--color-border-2)',
                background: active ? CHOICE_COLOR[choice] : 'transparent',
                color: active ? '#fff' : 'var(--color-text-2)',
              }}
            >
              {`${GLYPH[choice]} ${t(`conversation.workbench.trace.${choice}`)}`}
            </button>
          );
        })}
      </div>
      {latest?.note && current !== 'correct' && (
        <div
          className='text-11px truncate'
          style={{ color: current ? CHOICE_COLOR[current] : undefined }}
          title={latest.note}
        >
          {latest.note}
        </div>
      )}
      <Modal
        visible={asking !== null}
        title={asking ? `${t(`conversation.workbench.trace.${asking}`)} · ${label}` : ''}
        onCancel={() => setAsking(null)}
        onOk={submit}
        autoFocus={false}
        unmountOnExit
      >
        <div className='flex flex-col gap-8px'>
          <div className='text-12px text-t-secondary'>
            {t('conversation.workbench.trace.systemValue', { value: systemValue })}
          </div>
          <Input.TextArea
            autoFocus
            value={note}
            onChange={setNote}
            autoSize={{ minRows: 3, maxRows: 8 }}
            placeholder={
              asking === 'wrong'
                ? t('conversation.workbench.trace.wrongPlaceholder')
                : t('conversation.workbench.trace.supplementPlaceholder')
            }
          />
          <div className='text-11px text-t-tertiary'>{t('conversation.workbench.trace.noteHint')}</div>
        </div>
      </Modal>
    </div>
  );
};

export default TraceButtons;
