/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  patchWorkbench,
  useWorkbenchState,
  type EvMetric,
  type LifeView,
  type WorkbenchFocus,
  type WorkbenchPage,
} from './workbenchStore';

type Drive = {
  id: string;
  say: 'verdict' | 'remain' | 'source' | 'gap' | 'files' | 'llp' | 'report';
  page: WorkbenchPage;
  focus: WorkbenchFocus;
  lifeView: LifeView;
  evMetric: EvMetric;
};

const DRIVES: Drive[] = [
  { id: 'verdict', say: 'verdict', page: 'overview', focus: 'summary', lifeView: 'full', evMetric: 'all' },
  { id: 'llp', say: 'llp', page: 'llp', focus: 'summary', lifeView: 'full', evMetric: 'all' },
  { id: 'remain', say: 'remain', page: 'llp', focus: 'life', lifeView: 'full', evMetric: 'all' },
  { id: 'source', say: 'source', page: 'llp', focus: 'evidence', lifeView: 'full', evMetric: 'csn' },
  { id: 'gap', say: 'gap', page: 'llp', focus: 'items', lifeView: 'full', evMetric: 'all' },
  { id: 'files', say: 'files', page: 'records', focus: 'summary', lifeView: 'full', evMetric: 'all' },
  { id: 'report', say: 'report', page: 'report', focus: 'summary', lifeView: 'full', evMetric: 'all' },
];

const ProcessStrip: React.FC = () => {
  const { t } = useTranslation();
  const wb = useWorkbenchState();

  return (
    <div className='shrink-0 max-h-148px overflow-y-auto border-b border-b-solid border-[var(--color-border-2)] px-10px py-8px flex flex-col gap-6px'>
      <div className='text-12px text-t-secondary'>
        <span className='font-600 text-t-primary me-6px'>{t('conversation.workbench.process')}</span>
        {t(`conversation.workbench.pages.${wb.page}`)}
      </div>
      <div className='flex gap-4px flex-wrap'>
        {DRIVES.map((item) => (
          <button
            key={item.id}
            type='button'
            className={`text-left text-12px px-6px py-2px rd-4px cursor-pointer border border-solid ${
              wb.driveId === item.id
                ? 'border-[rgb(var(--primary-6))] text-t-primary'
                : 'border-transparent text-t-secondary hover:bg-fill-2'
            }`}
            onClick={() =>
              patchWorkbench({
                driveId: item.id,
                page: item.page,
                subject: 'aircraft',
                focus: item.focus,
                lifeView: item.lifeView,
                evMetric: item.evMetric,
              })
            }
          >
            {t(`conversation.workbench.drives.${item.say}`)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProcessStrip;
