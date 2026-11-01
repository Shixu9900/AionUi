/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DocumentEntry } from '@/common/types/recordsReview';
import { PageThumb } from '@renderer/pages/conversation/recordsReview/PageImage';

/** IATA aircraft redelivery records, Annex II. Codes match the leasewire template. */
const SECTIONS: Array<{ code: string; title: string; required: boolean; types: string[] }> = [
  { code: '1', title: 'Aircraft Status Report', required: true, types: ['status_screen'] },
  { code: '2', title: 'Certificate of Airworthiness', required: true, types: [] },
  { code: '3', title: 'Certificate of Registration', required: true, types: [] },
  { code: '4', title: 'Noise Certificate', required: false, types: [] },
  { code: '5', title: 'Radio Station Licence', required: false, types: [] },
  { code: '6', title: 'Aircraft Flight Log', required: true, types: [] },
  { code: '7', title: 'Aircraft Technical Log', required: true, types: [] },
  { code: '8', title: 'Engine Log Book', required: true, types: ['logbook'] },
  { code: '9', title: 'APU Log Book', required: true, types: [] },
  { code: '10', title: 'Landing Gear Log Book', required: true, types: [] },
  { code: '11', title: 'Propeller Log Book', required: false, types: [] },
  { code: '12', title: 'Component History Cards', required: true, types: ['movement_sheet'] },
  { code: '13', title: 'AD Status', required: true, types: [] },
  { code: '14', title: 'SB Status / Modification Status', required: true, types: [] },
  { code: '15', title: 'Repairs / Major Repairs', required: true, types: [] },
  { code: '16', title: 'LLP Status', required: true, types: ['llp_sheet'] },
  { code: '17', title: 'Release Certificates / 8130 Forms', required: true, types: ['release_certificate'] },
  { code: '18', title: 'Shop Visit Reports', required: true, types: ['shop_report', 'work_order'] },
  { code: '19', title: 'ICS (Incident Clearance Statement)', required: true, types: ['statement'] },
  { code: '20', title: 'Component Inventory / Parts List', required: false, types: [] },
  { code: '21', title: 'Weight and Balance', required: false, types: [] },
  { code: '22', title: 'MEL / CDL Items', required: false, types: [] },
  { code: '23', title: 'Deferred Defects', required: false, types: [] },
];

const RecordsPane: React.FC<{
  documents: DocumentEntry[];
  fileUrl: ((path: string) => string) | null;
}> = ({ documents, fileUrl }) => {
  const { t } = useTranslation();
  const [openCode, setOpenCode] = useState<string | null>('16');
  const [picked, setPicked] = useState<string | null>(null);
  const used = new Set<string>();
  const grouped = SECTIONS.map((section) => {
    const files = documents.filter((doc) => section.types.includes(doc.doc_type) && !used.has(doc.id));
    files.forEach((doc) => used.add(doc.id));
    return { section, files };
  });
  const loose = documents.filter((doc) => !used.has(doc.id));
  const selected = documents.find((doc) => doc.id === picked) ?? null;

  return (
    <div className='grid gap-16px' style={{ gridTemplateColumns: 'minmax(240px, 360px) minmax(0, 1fr)' }}>
      <div className='flex flex-col'>
        <div className='text-12px text-t-tertiary mb-6px'>{t('conversation.workbench.recordsHint')}</div>
        {grouped.map(({ section, files }) => {
          const ready = files.length > 0;
          const opened = openCode === section.code;
          return (
            <div key={section.code}>
              <button
                type='button'
                className='w-full text-left py-5px bg-transparent border-0 cursor-pointer text-13px text-t-primary hover:bg-fill-2'
                onClick={() => setOpenCode(opened ? null : section.code)}
              >
                <span className='text-t-tertiary me-6px'>{section.code}</span>
                {section.title}
                <span
                  className={`ms-6px text-11px ${ready ? 'text-t-secondary' : section.required ? 'text-[rgb(var(--danger-6))]' : 'text-t-tertiary'}`}
                >
                  {ready
                    ? t('conversation.workbench.ready', { count: files.length })
                    : section.required
                      ? t('conversation.workbench.notReady')
                      : ''}
                </span>
              </button>
              {opened &&
                files.map((doc) => (
                  <button
                    key={doc.id}
                    type='button'
                    className={`w-full text-left py-4px bg-transparent border-0 cursor-pointer text-12px ${picked === doc.id ? 'text-t-primary font-600' : 'text-t-secondary'}`}
                    style={{ paddingLeft: 28 }}
                    onClick={() => setPicked(doc.id)}
                  >
                    {doc.title}
                  </button>
                ))}
            </div>
          );
        })}
        {loose.length > 0 && (
          <div className='mt-8px'>
            <div className='text-12px text-t-tertiary'>{t('conversation.workbench.unfiled')}</div>
            {loose.map((doc) => (
              <button
                key={doc.id}
                type='button'
                className='w-full text-left py-4px bg-transparent border-0 cursor-pointer text-12px text-t-secondary'
                style={{ paddingLeft: 16 }}
                onClick={() => setPicked(doc.id)}
              >
                {doc.title}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className='min-w-0'>
        {selected && fileUrl ? (
          <div className='flex flex-col gap-8px'>
            <div className='text-14px font-600 text-t-primary'>{selected.title}</div>
            <div className='text-12px text-t-tertiary'>
              {selected.signed ? t('conversation.workbench.signed') : t('conversation.workbench.unsigned')}
            </div>
            <PageThumb url={fileUrl(selected.file)} page={selected.pages[0] ?? 1} bbox={null} width={360} />
          </div>
        ) : (
          <div className='text-13px text-t-tertiary'>{t('conversation.workbench.pickFile')}</div>
        )}
      </div>
    </div>
  );
};

export default RecordsPane;
