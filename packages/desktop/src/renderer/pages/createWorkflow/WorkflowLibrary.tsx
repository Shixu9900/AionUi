/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Tag } from '@arco-design/web-react';
import { useNavigate } from 'react-router-dom';
import type { TFunction } from 'i18next';
import type { WorkflowDraft, WorkflowTeachSession } from '@/common/types/createWorkflow';
import { STAGES, stageIndex, stageTitleKey } from './stages';
import { deliverDirOf, parseDraft, readText } from './workflowFiles';
import styles from './index.module.css';

type CardInfo = { draft: WorkflowDraft | null; hasMethod: boolean; delivered: boolean };

/** Leaves the SOP creator for the default workbench. Shown at the top-right of every creator view. */
export const BackToWorkbench: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Button className={styles.homeButton} onClick={() => void navigate('/guid')}>
      {t('guid.createWorkflow.back')}
    </Button>
  );
};

const formatDate = (ms: number) => {
  const date = new Date(ms);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const statusOf = (info: CardInfo | undefined, t: TFunction): { label: string; color: string } => {
  if (info?.delivered) return { label: t('guid.createWorkflow.status.delivered'), color: 'green' };
  if (info?.hasMethod) return { label: t('guid.createWorkflow.status.ready'), color: 'arcoblue' };
  return { label: t('guid.createWorkflow.status.teaching'), color: 'orange' };
};

export const WorkflowLibrary: React.FC<{
  items: WorkflowTeachSession[];
  starting: boolean;
  onOpen: (session: WorkflowTeachSession) => void;
  onCreate: (jobName: string) => void;
}> = ({ items, starting, onOpen, onCreate }) => {
  const { t } = useTranslation();
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
      <div className={styles.homeBar}>
        <BackToWorkbench />
      </div>
      <div className={styles.library}>
        <div className={styles.brandRow}>
          <h1 className={styles.title}>{t('guid.createWorkflow.title')}</h1>
          <Tag color='orange'>{t('guid.createWorkflow.badge')}</Tag>
        </div>
        <p className={styles.lead}>{t('guid.createWorkflow.lead')}</p>

        <div className={styles.newCard}>
          <div className={styles.sectionLabel}>{t('guid.createWorkflow.newJob')}</div>
          <div className='flex gap-10px'>
            <Input
              size='large'
              value={jobName}
              onChange={setJobName}
              onPressEnter={create}
              placeholder={t('guid.createWorkflow.jobPlaceholder')}
            />
            <Button type='primary' size='large' loading={starting} disabled={!jobName.trim()} onClick={create}>
              {t('guid.createWorkflow.start')}
            </Button>
          </div>
        </div>

        <div className={styles.sectionLabel}>{t('guid.createWorkflow.existing', { count: items.length })}</div>
        {items.length === 0 ? (
          <div className={styles.flowEmpty}>{t('guid.createWorkflow.empty')}</div>
        ) : (
          <div className={styles.libraryGrid}>
            {items.map((item) => {
              const info = infos[item.relativeDir];
              const stage = stageIndex(info?.draft?.stage);
              const status = statusOf(info, t);
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
                    {t('guid.createWorkflow.libraryProgress', {
                      current: stage + 1,
                      total: STAGES.length,
                      title: t(stageTitleKey(STAGES[stage].id)),
                    })}
                    {stepCount > 0 ? t('guid.createWorkflow.stepsNoted', { count: stepCount }) : ''}
                  </div>
                  <div className={styles.flowSub}>
                    {info?.draft?.job?.who ? `${info.draft.job.who} · ` : ''}
                    {t('guid.createWorkflow.startedOn', { date: formatDate(item.createdAt) })}
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
