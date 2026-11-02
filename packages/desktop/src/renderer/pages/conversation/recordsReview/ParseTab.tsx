/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Button, Empty, Input, InputNumber, Spin, Tag } from '@arco-design/web-react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { ipcBridge } from '@/common';
import type {
  AnnotateRequest,
  Bbox,
  DocumentReport,
  DocumentSearchHit,
  StoredBlock,
  StoredDocument,
  StoredIssue,
  StoredPage,
} from '@/common/types/recordsReview';
import { buildFileStreamUrl } from '@/renderer/utils/file/fileUrls';
import { PageCanvas, PageThumb } from './PageImage';

const statusColor = (status: string): string => {
  switch (status) {
    case 'passed':
      return '#30a46c';
    case 'failed':
      return '#e5484d';
    case 'pending':
      return '#8f8f8f';
    default:
      return '#f76b15';
  }
};

const pageUrl = (path: string, fallback: (rel: string) => string): string => {
  if (!path) return '';
  if (path.startsWith('/')) return buildFileStreamUrl({ kind: 'local', path });
  return fallback(path);
};

export const ParseTab: React.FC<{ projectId: string; fileUrl: (path: string) => string }> = ({ projectId, fileUrl }) => {
  const { t } = useTranslation();
  const { data: detail } = useSWR(projectId ? `explorer-project/${projectId}` : null, (key: string) =>
    ipcBridge.project.get.invoke({ project_id: key.slice('explorer-project/'.length) })
  );
  const folder = detail?.explorer.entries.find((e) => e.role === 'workspace')?.display_path ?? '';
  const docs = useSWR(projectId ? `documents/${projectId}` : null, () => ipcBridge.documents.list.invoke({ project_id: projectId }));
  const [selected, setSelected] = useState<string | null>(null);
  const [metric, setMetric] = useState('csn');
  const [raw, setRaw] = useState('');
  const [pageNo, setPageNo] = useState(1);
  const [draft, setDraft] = useState<Bbox | null>(null);
  const [query, setQuery] = useState('');
  const [parsing, setParsing] = useState<{ done: number; total: number } | null>(null);
  const current = docs.data?.find((d) => d.doc_id === selected) ?? docs.data?.[0];
  const currentId = current?.doc_id;
  const report = useSWR(currentId ? `doc-report/${currentId}` : null, () => ipcBridge.documents.report.invoke({ id: currentId as string }));
  const pages = useSWR(currentId ? `doc-pages/${currentId}` : null, () => ipcBridge.documents.pages.invoke({ id: currentId as string }));
  const issues = useSWR(currentId ? `doc-issues/${currentId}` : null, () => ipcBridge.documents.issues.invoke({ id: currentId as string }));
  const blocks = useSWR(currentId ? `doc-blocks/${currentId}/${pageNo}` : null, () =>
    ipcBridge.documents.blocks.invoke({ id: currentId as string, page_no: pageNo })
  );
  const hits = useSWR(projectId && query.trim() ? `doc-search/${projectId}/${query.trim()}` : null, () =>
    ipcBridge.documents.search.invoke({ project_id: projectId, q: query.trim() })
  );

  const pageIssues = useMemo(
    () => (issues.data ?? []).filter((issue) => issue.page_no === pageNo),
    [issues.data, pageNo]
  );
  const overlays = useMemo(() => {
    const fromIssues = pageIssues
      .filter((issue): issue is StoredIssue & { bbox: Bbox } => Array.isArray(issue.bbox))
      .map((issue) => ({ bbox: issue.bbox, color: issue.severity === 'high' ? '#e5484d' : '#f76b15' }));
    const fromBlocks = (blocks.data ?? [])
      .filter((block): block is StoredBlock & { bbox: Bbox } => Array.isArray(block.bbox))
      .map((block) => ({ bbox: block.bbox, color: '#30a46c' }));
    return [...fromBlocks, ...fromIssues];
  }, [pageIssues, blocks.data]);

  const scan = async () => {
    if (!folder) return;
    await ipcBridge.documents.scan.invoke({ project_id: projectId, folder });
    await docs.mutate();
  };
  const parse = async () => {
    if (!currentId) return;
    let progress = (await ipcBridge.documents.parse.invoke({ id: currentId })).progress;
    const finished = (value: { done: number; failed: number }) => value.done + value.failed;
    setParsing({ done: finished(progress), total: progress.total });
    // The request only queues the document. Poll until the worker drains it, and
    // refresh the page each time so finished pages show up while the rest run.
    for (let attempt = 0; attempt < 600 && finished(progress) < progress.total && !progress.paused; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      progress = await ipcBridge.documents.progress.invoke({ doc_id: currentId });
      setParsing({ done: finished(progress), total: progress.total });
      await Promise.all([report.mutate(), pages.mutate(), issues.mutate(), blocks.mutate()]);
    }
    setParsing(null);
  };
  const save = async () => {
    if (!current || !raw.trim()) return;
    const body: AnnotateRequest = {
      project_id: projectId,
      sha256: current.sha256,
      page_no: pageNo,
      bbox: draft,
      metric,
      raw: raw.trim(),
    };
    await ipcBridge.documents.annotate.invoke(body);
    setRaw('');
    setDraft(null);
    await issues.mutate();
  };
  const openHit = (hit: DocumentSearchHit) => {
    setSelected(hit.doc_id);
    setPageNo(hit.page_no);
  };

  if (docs.isLoading) {
    return (
      <div className='flex-1 flex items-center justify-center'>
        <Spin />
      </div>
    );
  }

  const url = pageUrl(current?.path ?? '', fileUrl);

  return (
    <div className='flex-1 min-h-0 overflow-y-auto px-14px py-10px flex flex-col gap-12px'>
      <div className='flex gap-6px flex-wrap'>
        <Button size='mini' type='primary' onClick={() => void scan()}>
          {t('conversation.recordsReview.scanFolder')}
        </Button>
        <Button size='mini' onClick={() => void parse()} disabled={!currentId || parsing !== null}>
          {parsing ? `${parsing.done} / ${parsing.total}` : t('conversation.recordsReview.parseNow')}
        </Button>
        <Input
          size='mini'
          value={query}
          onChange={setQuery}
          placeholder={t('conversation.workspace.searchPlaceholder')}
          style={{ width: 200 }}
        />
      </div>
      {(hits.data ?? []).map((hit) => (
        <button
          key={`${hit.doc_id}-${hit.block_id}`}
          type='button'
          className='text-left border-none bg-2 rd-6px px-8px py-6px cursor-pointer'
          onClick={() => openHit(hit)}
        >
          <div className='text-12px font-600'>{hit.filename} p.{hit.page_no}</div>
          <div className='text-11px text-t-tertiary'>{hit.snippet}</div>
        </button>
      ))}
      {!docs.data?.length ? (
        <Empty description={t('conversation.recordsReview.parseEmpty')} />
      ) : (
        <>
          <div className='flex flex-col gap-4px'>
            {(docs.data as StoredDocument[]).map((doc) => (
              <button
                key={doc.doc_id}
                type='button'
                className='text-left border-none rd-6px px-8px py-6px cursor-pointer'
                style={{ background: currentId === doc.doc_id ? 'var(--bg-2)' : 'transparent' }}
                onClick={() => {
                  setSelected(doc.doc_id);
                  setPageNo(1);
                  setDraft(null);
                }}
              >
                <div className='text-12px font-600 text-t-primary'>{doc.filename}</div>
                <div className='text-11px text-t-tertiary'>
                  {doc.page_count} p · {doc.sha256.slice(0, 10)}
                </div>
              </button>
            ))}
          </div>
          {report.data && <ReportCard report={report.data} />}
          <div className='flex flex-wrap gap-8px'>
            {(pages.data ?? []).map((page: StoredPage) => {
              const firstBox = (issues.data ?? []).find((issue) => issue.page_no === page.page_no && issue.bbox)?.bbox ?? null;
              return (
                <button
                  key={page.page_no}
                  type='button'
                  className='border-none bg-transparent p-0 cursor-pointer'
                  onClick={() => {
                    setPageNo(page.page_no);
                    setDraft(null);
                  }}
                >
                  <div className='text-10px mb-2px' style={{ color: statusColor(page.status) }}>
                    p.{page.page_no} {page.status}
                  </div>
                  <PageThumb url={url} page={page.page_no} bbox={firstBox} width={88} />
                </button>
              );
            })}
          </div>
          {current && (
            <div className='flex gap-12px flex-wrap'>
              <PageCanvas url={url} page={pageNo} width={420} overlays={overlays} draft={draft} onDraft={setDraft} />
              <div className='flex-1 min-w-220px'>
                <div className='text-12px font-700 mb-6px'>{t('conversation.recordsReview.parseReport')}</div>
                {(blocks.data ?? []).map((block: StoredBlock) => (
                  <div key={block.block_id} className='text-12px bg-2 rd-6px px-8px py-6px mb-4px whitespace-pre-wrap'>
                    <div className='text-10px text-t-tertiary mb-2px'>
                      {block.provider}
                      {block.label ? ` · ${block.label}` : ''}
                    </div>
                    {block.text || block.html}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className='text-12px font-700 mb-6px'>{t('conversation.recordsReview.issues')}</div>
            {pageIssues.map((issue: StoredIssue) => (
              <div key={issue.issue_id} className='text-12px bg-2 rd-6px px-8px py-6px mb-4px'>
                <Tag size='small' color={issue.severity === 'high' ? 'red' : 'orange'}>
                  {issue.code}
                </Tag>
                <span className='ml-6px text-t-secondary'>
                  p.{issue.page_no} {issue.detail}
                </span>
              </div>
            ))}
          </div>
          <div className='bg-2 rd-6px p-8px'>
            <div className='text-12px font-700 mb-6px'>{t('conversation.recordsReview.annotate')}</div>
            <div className='flex gap-6px items-center flex-wrap'>
              <InputNumber size='mini' min={1} value={pageNo} onChange={(v) => setPageNo(Number(v) || 1)} />
              <Input size='mini' value={metric} onChange={setMetric} style={{ width: 90 }} />
              <Input size='mini' value={raw} onChange={setRaw} placeholder={pages.data?.find((p) => p.page_no === pageNo)?.kind} />
              <Button size='mini' type='primary' onClick={() => void save()}>
                {t('conversation.recordsReview.annotate')}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const ReportCard: React.FC<{ report: DocumentReport }> = ({ report }) => {
  const { t } = useTranslation();
  return (
    <div className='bg-2 rd-6px px-10px py-8px text-12px'>
      <div className='font-700 mb-4px'>{t('conversation.recordsReview.parseReport')}</div>
      <div className='text-t-secondary'>
        {report.engine} · {t('conversation.recordsReview.passed')} {report.passed} · {t('conversation.recordsReview.doubtful')}{' '}
        {report.doubtful} · {t('conversation.recordsReview.failed')} {report.failed}
      </div>
    </div>
  );
};
