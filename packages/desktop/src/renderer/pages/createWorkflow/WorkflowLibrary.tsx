/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Button, Input, Tag } from '@arco-design/web-react';
import type { WorkflowDraft, WorkflowTeachSession } from '@/common/types/createWorkflow';
import { STAGES, stageIndex } from './stages';
import { deliverDirOf, parseDraft, readText } from './workflowFiles';
import styles from './index.module.css';

type CardInfo = { draft: WorkflowDraft | null; hasMethod: boolean; delivered: boolean };

const formatDate = (ms: number) => {
  const date = new Date(ms);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const statusOf = (info: CardInfo | undefined): { label: string; color: string } => {
  if (info?.delivered) return { label: '已交付', color: 'green' };
  if (info?.hasMethod) return { label: '方法已写好，待保存', color: 'arcoblue' };
  return { label: '教学中', color: 'orange' };
};

export const WorkflowLibrary: React.FC<{
  items: WorkflowTeachSession[];
  starting: boolean;
  onOpen: (session: WorkflowTeachSession) => void;
  onCreate: (jobName: string) => void;
}> = ({ items, starting, onOpen, onCreate }) => {
  const [jobName, setJobName] = useState('');
  const [infos, setInfos] = useState<Record<string, CardInfo>>({});

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      items.map(async (item) => {
        const [draftText, workflowMd, skill] = await Promise.all([
          readText(`${item.relativeDir}/draft.json`),
          readText(`${item.relativeDir}/WORKFLOW.md`),
          readText(`${deliverDirOf(item)}/skill/SKILL.md`),
        ]);
        return [item.relativeDir, { draft: parseDraft(draftText), hasMethod: Boolean(workflowMd), delivered: Boolean(skill) }] as const;
      })
    ).then((entries) => {
      if (!cancelled) setInfos(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [items]);

  const create = () => {
    const name = jobName.trim();
    if (name) onCreate(name);
  };

  return (
    <div className={styles.page}>
      <div className={styles.library}>
        <div className={styles.brandRow}>
          <h1 className={styles.title}>工作流SOP创建器 — YESIFU</h1>
          <Tag color='orange'>管理团队专用</Tag>
        </div>
        <p className={styles.lead}>
          你是行业里的师傅。YESIFU 让你把一项工作怎么做，教会这个 AI
          徒弟。它问、你讲，边听边画出流程，再拿一套真实资料照做一遍请你批改，直到你说学会了，练成一份
          SOP。每一份 SOP 的对话、流程图、资料和交付结果都记在它自己名下。
        </p>

        <div className={styles.newCard}>
          <div className={styles.sectionLabel}>教一项新工作</div>
          <div className='flex gap-10px'>
            <Input
              size='large'
              value={jobName}
              onChange={setJobName}
              onPressEnter={create}
              placeholder='这项工作叫什么？例如：APU 寿命件履历审查'
            />
            <Button type='primary' size='large' loading={starting} disabled={!jobName.trim()} onClick={create}>
              开始教
            </Button>
          </div>
        </div>

        <div className={styles.sectionLabel}>已有的 SOP（{items.length}）</div>
        {items.length === 0 ? (
          <div className={styles.flowEmpty}>还没有 SOP。在上面写下第一项工作的名字就能开始。</div>
        ) : (
          <div className={styles.libraryGrid}>
            {items.map((item) => {
              const info = infos[item.relativeDir];
              const stage = stageIndex(info?.draft?.stage);
              const status = statusOf(info);
              const stepCount = info?.draft?.steps?.length ?? 0;
              return (
                <button key={item.relativeDir} type='button' className={styles.libraryCard} onClick={() => onOpen(item)}>
                  <div className='flex items-start justify-between gap-8px'>
                    <span className={styles.libraryName}>{info?.draft?.job?.name || item.title}</span>
                    <Tag size='small' color={status.color}>
                      {status.label}
                    </Tag>
                  </div>
                  <div className={styles.progressBar}>
                    {STAGES.map((s, index) => (
                      <span
                        key={s.id}
                        className={index < stage ? styles.progressDone : index === stage ? styles.progressNow : undefined}
                      />
                    ))}
                  </div>
                  <div className={styles.flowSub}>
                    第 {stage + 1} / {STAGES.length} 步：{STAGES[stage].title}
                    {stepCount > 0 ? ` · 已梳理 ${stepCount} 步` : ''}
                  </div>
                  <div className={styles.flowSub}>
                    {info?.draft?.job?.who ? `${info.draft.job.who} · ` : ''}
                    {formatDate(item.createdAt)} 开始
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
