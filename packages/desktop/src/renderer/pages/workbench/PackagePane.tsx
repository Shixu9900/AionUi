/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Button, Spin } from '@arco-design/web-react';
import { useTranslation } from 'react-i18next';
import { ipcBridge } from '@/common';
import { localFileRef } from '@/common/types/chatFile';
import type { DocumentEntry } from '@/common/types/recordsReview';
import { PageThumb } from '@renderer/pages/conversation/recordsReview/PageImage';
import { buildFileStreamUrl } from '@/renderer/utils/file/fileUrls';
import {
  PACKAGE_GROUPS,
  itemStatus,
  itemWorkflows,
  llpTargetOf,
  packageItem,
  reviewDocItem,
  scanPackage,
  type ItemStatus,
  type PackageFile,
  type PackageScan,
  type PackageWorkflow,
} from './deliveryPackage';
import { patchWorkbench, useWorkbenchState } from './workbenchStore';

const PROPELLER_TYPES = /ATR|Q[1-4]00|DHC|Dash|Saab|Dornier|Do\s?328|King\s?Air|C-?130|Y-?12|MA-?60/i;

/** Selections that aren't Annex II items: group-level files, the inherited bible, unrecognised folders. */
const INHERITED = '_inherited';
const UNFILED = '_unfiled';
const groupKey = (code: string) => `_group:${code}`;

const STATUS_CLASS: Record<ItemStatus, string> = {
  present: 'text-[rgb(var(--success-6))]',
  missing: 'text-[rgb(var(--danger-6))]',
  na: 'text-t-tertiary',
};

const usePackageScan = (workspace: string | undefined, hasPropellers: boolean) =>
  useSWR<PackageScan>(
    workspace ? `delivery-package/${workspace}/${hasPropellers}` : null,
    async () => scanPackage(await ipcBridge.fs.listWorkspaceFiles.invoke({ root: workspace ?? '' }), hasPropellers),
    { revalidateOnFocus: false }
  );

type PackagePaneProps = {
  workspace?: string;
  aircraftType?: string;
  documents: DocumentEntry[];
  reviewFileUrl: ((path: string) => string) | null;
  esn?: string;
  onEditWorkspace: () => void;
};

const PackagePane: React.FC<PackagePaneProps> = ({
  workspace,
  aircraftType,
  documents,
  reviewFileUrl,
  esn,
  onEditWorkspace,
}) => {
  const { t } = useTranslation();
  const { packageItem: selected } = useWorkbenchState();
  const hasPropellers = PROPELLER_TYPES.test(aircraftType ?? '');
  const swr = usePackageScan(workspace, hasPropellers);
  const scan = swr.data;
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(['F', 'G', 'I']));

  const reviewDocs = useMemo(() => {
    const map = new Map<string, DocumentEntry[]>();
    for (const doc of documents) {
      const code = reviewDocItem(doc.doc_type);
      if (!code) continue;
      map.set(code, [...(map.get(code) ?? []), doc]);
    }
    return map;
  }, [documents]);

  if (!workspace) {
    return (
      <div className='rd-8px border border-dashed border-[var(--color-border-3)] p-16px text-13px text-t-secondary flex items-center gap-12px'>
        <span className='flex-1'>{t('conversation.workbench.package.noWorkspace')}</span>
        <Button size='small' onClick={onEditWorkspace}>
          {t('conversation.workbench.package.setWorkspace')}
        </Button>
      </div>
    );
  }
  if (swr.isLoading || !scan) {
    return (
      <div className='py-40px flex justify-center'>
        {swr.error ? (
          <span className='text-13px text-[rgb(var(--danger-6))]'>
            {t('conversation.workbench.package.readFailed')}
          </span>
        ) : (
          <Spin />
        )}
      </div>
    );
  }

  const statuses = PACKAGE_GROUPS.flatMap((g) => g.items.map((item) => itemStatus(scan, item, hasPropellers)));
  const count = (s: ItemStatus) => statuses.filter((x) => x === s).length;
  const select = (key: string) => patchWorkbench({ packageItem: key, page: 'records' });
  const toggle = (code: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  return (
    <div className='flex flex-col gap-10px'>
      <div className='flex items-center gap-12px flex-wrap text-12px text-t-secondary'>
        <span className='text-t-tertiary truncate max-w-full' title={workspace}>
          {workspace}
        </span>
        <span className={STATUS_CLASS.present}>
          {t('conversation.workbench.package.present', { n: count('present') })}
        </span>
        <span className={STATUS_CLASS.missing}>
          {t('conversation.workbench.package.missing', { n: count('missing') })}
        </span>
        <span>{t('conversation.workbench.package.na', { n: count('na') })}</span>
        <span>{t(`conversation.workbench.package.style.${scan.style}`)}</span>
        <button
          type='button'
          className='ms-auto text-12px text-t-secondary bg-transparent border-0 cursor-pointer p-0'
          onClick={() => void swr.mutate()}
        >
          {t('conversation.workbench.package.rescan')}
        </button>
      </div>
      <div className='grid gap-16px' style={{ gridTemplateColumns: 'minmax(260px, 380px) minmax(0, 1fr)' }}>
        <div className='flex flex-col'>
          {PACKAGE_GROUPS.map((group) => {
            const opened = openGroups.has(group.code);
            const loose = scan.byGroup.get(group.code) ?? [];
            const have = group.items.filter((item) => itemStatus(scan, item, hasPropellers) === 'present').length;
            return (
              <div key={group.code}>
                <button
                  type='button'
                  className='w-full text-left py-5px bg-transparent border-0 cursor-pointer text-13px text-t-primary font-600 hover:bg-fill-2 rounded-4px'
                  onClick={() => toggle(group.code)}
                >
                  <span className='text-t-tertiary me-6px'>{opened ? '▾' : '▸'}</span>
                  {`${group.code}  ${group.title}`}
                  <span className='ms-6px text-11px font-400 text-t-tertiary'>{`${have}/${group.items.length}`}</span>
                </button>
                {opened &&
                  group.items.map((item) => {
                    const status = itemStatus(scan, item, hasPropellers);
                    const n = scan.byItem.get(item.code)?.length ?? 0;
                    return (
                      <TreeRow
                        key={item.code}
                        active={selected === item.code}
                        onClick={() => select(item.code)}
                        code={item.code}
                        label={item.title}
                        note={status === 'present' ? String(n) : t(`conversation.workbench.package.status.${status}`)}
                        noteClass={STATUS_CLASS[status]}
                        linked={llpTargetOf(item.code) != null}
                      />
                    );
                  })}
                {opened && loose.length > 0 && (
                  <TreeRow
                    active={selected === groupKey(group.code)}
                    onClick={() => select(groupKey(group.code))}
                    code=''
                    label={t('conversation.workbench.package.groupLoose')}
                    note={String(loose.length)}
                    noteClass='text-t-secondary'
                  />
                )}
              </div>
            );
          })}
          <div className='mt-8px pt-6px border-t border-t-solid border-[var(--color-border-2)]'>
            <TreeRow
              active={selected === INHERITED}
              onClick={() => select(INHERITED)}
              code=''
              label={t('conversation.workbench.package.inherited')}
              note={String(scan.inherited.length)}
              noteClass='text-t-secondary'
            />
            <TreeRow
              active={selected === UNFILED}
              onClick={() => select(UNFILED)}
              code=''
              label={t('conversation.workbench.package.unfiled')}
              note={String(scan.unfiled.length)}
              noteClass={scan.unfiled.length > 0 ? STATUS_CLASS.missing : 'text-t-tertiary'}
            />
          </div>
        </div>
        <div className='min-w-0'>
          <Detail
            selection={selected}
            scan={scan}
            hasPropellers={hasPropellers}
            reviewDocs={reviewDocs}
            reviewFileUrl={reviewFileUrl}
            esn={esn}
          />
        </div>
      </div>
    </div>
  );
};

const TreeRow: React.FC<{
  active: boolean;
  onClick: () => void;
  code: string;
  label: string;
  note: string;
  noteClass: string;
  linked?: boolean;
}> = ({ active, onClick, code, label, note, noteClass, linked }) => (
  <button
    type='button'
    onClick={onClick}
    className={`w-full flex items-center gap-6px text-left py-4px pe-8px text-12px border-0 cursor-pointer rounded-4px ${
      active
        ? 'bg-[rgba(var(--primary-6),0.10)] text-t-primary font-600'
        : 'bg-transparent text-t-secondary hover:bg-fill-2'
    }`}
    style={{ paddingLeft: 22 }}
  >
    {code && <span className='text-t-tertiary shrink-0'>{code}</span>}
    <span className='truncate flex-1'>{label}</span>
    {linked && <span className='text-11px text-[rgb(var(--primary-6))] shrink-0'>LLP</span>}
    <span className={`text-11px shrink-0 ${noteClass}`}>{note}</span>
  </button>
);

type DetailProps = {
  selection: string | null;
  scan: PackageScan;
  hasPropellers: boolean;
  reviewDocs: Map<string, DocumentEntry[]>;
  reviewFileUrl: ((path: string) => string) | null;
  esn?: string;
};

const Detail: React.FC<DetailProps> = ({ selection, scan, hasPropellers, reviewDocs, reviewFileUrl, esn }) => {
  const { t } = useTranslation();
  if (!selection) {
    return <div className='text-13px text-t-tertiary'>{t('conversation.workbench.package.pickItem')}</div>;
  }
  if (selection === INHERITED || selection === UNFILED || selection.startsWith('_group:')) {
    const files =
      selection === INHERITED
        ? scan.inherited
        : selection === UNFILED
          ? scan.unfiled
          : (scan.byGroup.get(selection.slice('_group:'.length)) ?? []);
    const title =
      selection === INHERITED
        ? t('conversation.workbench.package.inherited')
        : selection === UNFILED
          ? t('conversation.workbench.package.unfiled')
          : `${selection.slice('_group:'.length)} · ${t('conversation.workbench.package.groupLoose')}`;
    return (
      <div className='flex flex-col gap-8px'>
        <div className='text-14px font-600 text-t-primary'>{title}</div>
        <FileList files={files} esn={esn} />
      </div>
    );
  }

  const item = packageItem(selection);
  if (!item) return null;
  const files = scan.byItem.get(item.code) ?? [];
  const status = itemStatus(scan, item, hasPropellers);
  const target = llpTargetOf(item.code);
  const docs = reviewDocs.get(item.code) ?? [];
  const folders = [...new Set(files.map((f) => f.folder).filter(Boolean))];

  return (
    <div className='flex flex-col gap-10px'>
      <div>
        <div className='text-14px font-600 text-t-primary'>{`${item.code}  ${item.title}`}</div>
        {folders.length > 0 && (
          <div className='text-11px text-t-tertiary truncate'>
            {t('conversation.workbench.package.folderName', { name: folders.join(' / ') })}
          </div>
        )}
      </div>
      <div className='flex items-center gap-6px flex-wrap'>
        {itemWorkflows(item.code).map((wf) => (
          <WorkflowChip key={wf} workflow={wf} onOpen={wf === 'llp' && target ? () => openLlp(target) : undefined} />
        ))}
        <span className={`text-12px ${STATUS_CLASS[status]}`}>
          {status === 'present'
            ? t('conversation.workbench.package.fileCount', { n: files.length })
            : t(`conversation.workbench.package.status.${status}`)}
        </span>
      </div>
      {docs.length > 0 && (
        <div className='flex flex-col gap-4px rd-6px bg-fill-1 px-10px py-8px'>
          <div className='text-12px text-t-tertiary'>{t('conversation.workbench.package.reviewCited')}</div>
          {docs.map((doc) => (
            <ReviewDoc key={doc.id} doc={doc} fileUrl={reviewFileUrl} />
          ))}
        </div>
      )}
      <FileList files={files} esn={esn} />
    </div>
  );
};

const openLlp = (target: 'engine' | 'apu' | 'gear') => patchWorkbench({ page: 'llp', selectedId: target });

const WorkflowChip: React.FC<{ workflow: PackageWorkflow; onOpen?: () => void }> = ({ workflow, onOpen }) => {
  const { t } = useTranslation();
  const label = t(`conversation.workbench.package.workflow.${workflow}`);
  const base = 'h-22px px-8px rd-4px text-11px border border-solid flex items-center';
  if (!onOpen) {
    return <span className={`${base} border-[var(--color-border-2)] text-t-secondary`}>{label}</span>;
  }
  return (
    <button
      type='button'
      onClick={onOpen}
      className={`${base} cursor-pointer border-[rgb(var(--primary-6))] bg-[rgba(var(--primary-6),0.08)] text-[rgb(var(--primary-6))]`}
    >
      {`${label} →`}
    </button>
  );
};

const ReviewDoc: React.FC<{ doc: DocumentEntry; fileUrl: ((path: string) => string) | null }> = ({ doc, fileUrl }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className='flex flex-col gap-6px'>
      <button
        type='button'
        className='text-left text-12px text-t-primary bg-transparent border-0 p-0 cursor-pointer'
        onClick={() => setOpen(!open)}
      >
        {doc.title}
        <span className='ms-6px text-11px text-t-tertiary'>
          {doc.signed ? t('conversation.workbench.signed') : t('conversation.workbench.unsigned')}
        </span>
      </button>
      {open && fileUrl && <PageThumb url={fileUrl(doc.file)} page={doc.pages[0] ?? 1} bbox={null} width={360} />}
    </div>
  );
};

const PREVIEWABLE = /\.pdf$/i;
const IMAGE = /\.(png|jpe?g|gif|webp|tiff?)$/i;

/** Files grouped by their instance folder (one engine, one gear leg); the reviewed engine is marked. */
const FileList: React.FC<{ files: PackageFile[]; esn?: string }> = ({ files, esn }) => {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<string | null>(null);
  if (files.length === 0) return null;
  const byInstance = new Map<string, PackageFile[]>();
  for (const file of files) {
    const key = file.instance ?? '';
    byInstance.set(key, [...(byInstance.get(key) ?? []), file]);
  }
  const pickedFile = files.find((f) => f.fullPath === picked) ?? null;
  return (
    <div className='flex flex-col gap-8px'>
      <div className='flex flex-col max-h-320px overflow-y-auto'>
        {[...byInstance.entries()].map(([instance, list]) => (
          <div key={instance} className='flex flex-col'>
            {instance && (
              <div className='text-12px text-t-tertiary pt-4px'>
                {instance}
                {esn && instance.includes(esn) && (
                  <span className='ms-6px text-[rgb(var(--primary-6))]'>
                    {t('conversation.workbench.package.reviewed')}
                  </span>
                )}
              </div>
            )}
            {list.map((file) => (
              <button
                key={file.fullPath}
                type='button'
                title={file.relativePath}
                onClick={() => setPicked(file.fullPath)}
                className={`text-left py-3px bg-transparent border-0 cursor-pointer text-12px truncate ${
                  picked === file.fullPath ? 'text-t-primary font-600' : 'text-t-secondary'
                }`}
                style={{ paddingLeft: instance ? 12 : 0 }}
              >
                {file.name}
              </button>
            ))}
          </div>
        ))}
      </div>
      {pickedFile && <FilePreview file={pickedFile} />}
    </div>
  );
};

const FilePreview: React.FC<{ file: PackageFile }> = ({ file }) => {
  const { t } = useTranslation();
  const ref = localFileRef(file.fullPath);
  const url = buildFileStreamUrl(ref);
  return (
    <div className='flex flex-col gap-6px pt-6px border-t border-t-solid border-[var(--color-border-2)]'>
      <div className='flex items-center gap-8px'>
        <span className='text-12px text-t-primary truncate flex-1' title={file.relativePath}>
          {file.relativePath}
        </span>
        <Button size='mini' onClick={() => void ipcBridge.fs.openSystem.invoke({ file: ref })}>
          {t('conversation.workbench.package.openSystem')}
        </Button>
      </div>
      {PREVIEWABLE.test(file.name) && <PageThumb url={url} page={1} bbox={null} width={360} />}
      {IMAGE.test(file.name) && <img src={url} alt='' style={{ maxWidth: 360, borderRadius: 4 }} />}
    </div>
  );
};

export default PackagePane;
