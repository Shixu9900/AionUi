/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ComponentReview, PartNode } from '@/common/types/recordsReview';
import LifeTrack from './LifeTrack';
import { LLP_PACKAGE_ITEM, type LlpTarget } from './deliveryPackage';
import { patchWorkbench, useWorkbenchState, type WorkbenchFocus } from './workbenchStore';

type Row = {
  id: string;
  label: string;
  detail: string;
  depth: number;
  reviewable: boolean;
  partNumber?: string;
  serialNumber?: string;
};

const partRows = (node: PartNode, depth: number): Row[] => [
  {
    id: node.id,
    label: node.label,
    detail: [node.part_number, node.serial_number].filter(Boolean).join(' · '),
    depth,
    reviewable: node.focus || Boolean(node.serial_number),
    partNumber: node.part_number,
    serialNumber: node.serial_number,
  },
  ...node.children.flatMap((child) => partRows(child, depth + 1)),
];

const normalizePartKey = (value: string): string => value.replace(/[\s-]/g, '').toUpperCase();

/**
 * Finds the part-tree row an assistant query refers to: an exact node id first,
 * then a serial number, then a part number (preferring a reviewable row, since a
 * part number can repeat across positions).
 */
export const resolvePartQuery = (rows: Row[], query: string): string | null => {
  const byId = rows.find((row) => row.id === query);
  if (byId) return byId.id;
  const key = normalizePartKey(query);
  if (!key) return null;
  const bySerial = rows.find((row) => row.serialNumber && normalizePartKey(row.serialNumber) === key);
  if (bySerial) return bySerial.id;
  const byPart = rows.filter((row) => row.partNumber && normalizePartKey(row.partNumber) === key);
  return (byPart.find((row) => row.reviewable) ?? byPart[0])?.id ?? null;
};

const LlpPane: React.FC<{ review: ComponentReview | null }> = ({ review }) => {
  const { t } = useTranslation();
  const { selectedId, partQuery, focus, lifeView } = useWorkbenchState();
  const esn = review?.timeline.find((e) => e.host.esn)?.host.esn;
  const root = review?.part_tree.root;
  const tree = useMemo(() => (root ? partRows(root, 1) : []), [root]);

  // Waits for the part tree: the query usually arrives before the review loads.
  useEffect(() => {
    if (!partQuery || tree.length === 0) return;
    const resolved = resolvePartQuery(tree, partQuery);
    patchWorkbench({ partQuery: null, ...(resolved ? { selectedId: resolved } : {}) });
  }, [partQuery, tree]);
  const rows: Row[] = [
    {
      id: 'engine',
      label: t('conversation.workbench.engine'),
      detail: esn ? `ESN ${esn}` : '',
      depth: 0,
      reviewable: false,
    },
    ...tree,
    { id: 'apu', label: 'APU', detail: t('conversation.workbench.llpMissing'), depth: 0, reviewable: false },
    {
      id: 'gear',
      label: t('conversation.workbench.gear'),
      detail: t('conversation.workbench.llpMissing'),
      depth: 0,
      reviewable: false,
    },
  ];
  const active = selectedId ?? tree.find((row) => row.reviewable)?.id ?? 'engine';
  const showReview = review != null && (active === 'engine' || tree.some((row) => row.id === active && row.reviewable));
  const assembly: LlpTarget = active === 'apu' || active === 'gear' ? active : 'engine';
  const packageCode = LLP_PACKAGE_ITEM[assembly];

  return (
    <div className='grid gap-16px' style={{ gridTemplateColumns: 'minmax(220px, 320px) minmax(0, 1fr)' }}>
      <div className='flex flex-col'>
        {rows.map((row) => (
          <button
            key={row.id}
            type='button'
            onClick={() => patchWorkbench({ selectedId: row.id, page: 'llp' })}
            className={`text-left py-6px pe-8px text-13px border-0 bg-transparent cursor-pointer rounded-4px ${
              active === row.id
                ? 'bg-[rgba(var(--primary-6),0.10)] text-t-primary font-600'
                : 'text-t-secondary hover:bg-fill-2'
            }`}
            style={{ paddingLeft: 8 + row.depth * 18 }}
          >
            <span className='block truncate'>{row.label}</span>
            {row.detail && <span className='block text-11px text-t-tertiary truncate'>{row.detail}</span>}
          </button>
        ))}
      </div>
      <div className='min-w-0 flex flex-col gap-10px'>
        <button
          type='button'
          className='self-start text-12px text-[rgb(var(--primary-6))] bg-transparent border-0 p-0 cursor-pointer'
          onClick={() => patchWorkbench({ page: 'records', packageItem: packageCode })}
        >
          {t('conversation.workbench.package.openFiles', { code: packageCode })}
        </button>
        {showReview && review ? (
          <FocusBody review={review} focus={focus} lifeView={lifeView} />
        ) : (
          <div className='text-13px text-t-secondary'>{t('conversation.workbench.llpMissing')}</div>
        )}
      </div>
    </div>
  );
};

const FocusBody: React.FC<{
  review: ComponentReview;
  focus: WorkbenchFocus;
  lifeView: 'full' | 'budget' | 'yearly';
}> = ({ review, focus, lifeView }) => {
  const { t } = useTranslation();
  if (focus === 'life') return <LifeTrack review={review} view={lifeView} />;
  if (focus === 'evidence') {
    return (
      <div className='flex flex-col gap-6px text-13px'>
        {review.evidence.chains.flatMap((chain) =>
          chain.points.map((point) => (
            <div
              key={point.id}
              className='flex justify-between gap-8px border-b border-b-solid border-[var(--color-border-2)] py-4px'
            >
              <span className='text-t-secondary'>{point.date}</span>
              <span className='text-t-primary font-600'>{point.display}</span>
            </div>
          ))
        )}
      </div>
    );
  }
  if (focus === 'items') {
    return (
      <div className='flex flex-col gap-8px'>
        {review.open_items.map((item) => (
          <div key={item.id} className='text-13px'>
            <div className='font-600 text-t-primary'>{item.title}</div>
            <div className='text-12px text-t-secondary'>{item.detail}</div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className='flex flex-col gap-8px'>
      <div className='text-14px font-600 text-t-primary'>
        {review.component.description} · {review.component.serial_number}
      </div>
      <div className='text-13px text-t-secondary'>
        {t('conversation.workbench.remaining', {
          n:
            review.life.remaining_cycles == null
              ? '—'
              : Math.round(review.life.remaining_cycles).toLocaleString('en-US'),
        })}
      </div>
      <div className='flex gap-6px'>
        {(['life', 'evidence', 'items'] as const).map((item) => (
          <button
            key={item}
            type='button'
            className='text-12px text-t-secondary underline cursor-pointer bg-transparent border-0'
            onClick={() => patchWorkbench({ focus: item, page: 'llp' })}
          >
            {t(`conversation.workbench.focus.${item}`)}
          </button>
        ))}
      </div>
      <LifeTrack review={review} view={lifeView} />
    </div>
  );
};

export default LlpPane;
