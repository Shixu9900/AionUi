/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '@arco-design/web-react';
import classNames from 'classnames';
import type { WorkflowDraft, WorkflowDraftRunItem } from '@/common/types/createWorkflow';
import type { I18nKey } from '@/renderer/services/i18n';
import { STAGES, stageHintKey, stageIndex, stageTitleKey } from './stages';
import styles from './index.module.css';

const FEEDBACK_GROUPS: { key: 'missing' | 'extra' | 'duplicate' | 'unclear'; titleKey: I18nKey }[] = [
  { key: 'missing', titleKey: 'guid.createWorkflow.feedback.missing' },
  { key: 'extra', titleKey: 'guid.createWorkflow.feedback.extra' },
  { key: 'duplicate', titleKey: 'guid.createWorkflow.feedback.duplicate' },
  { key: 'unclear', titleKey: 'guid.createWorkflow.feedback.unclear' },
];

export const nonEmpty = (list: string[] | undefined) => (list ?? []).filter((item) => item.trim().length > 0);

export type DeliverState = {
  workflowMd: string;
  saved: boolean;
  assistantCreated: boolean;
  busy: boolean;
};

/**
 * Everything the expert has to read or act on this turn, kept right above the conversation:
 * where we are in the eight stages, what the master is waiting for, and the stage's own action.
 */
export const TeachGuide: React.FC<{
  draft: WorkflowDraft;
  deliver: DeliverState;
  onVerdict: (id: string, verdict: 'right' | 'wrong', correction: string) => void;
  onSave: () => void;
  onCreateAssistant: () => void;
}> = ({ draft, deliver, onVerdict, onSave, onCreateAssistant }) => {
  const { t } = useTranslation();
  const current = stageIndex(draft.stage);
  const stage = STAGES[current];
  const [expanded, setExpanded] = useState(true);
  useEffect(() => {
    setExpanded(true);
  }, [draft.stage]);

  const questions = (draft.questions ?? []).filter((q) => q.status !== 'answered' && q.text.trim());
  const feedback = FEEDBACK_GROUPS.map((group) => ({
    key: group.key,
    title: t(group.titleKey),
    items: nonEmpty(draft.feedback?.[group.key]),
  })).filter((group) => group.items.length > 0);
  const files = draft.files ?? [];
  const run = draft.run ?? [];
  const showFiles = files.length > 0 && (draft.stage === 'evidence' || draft.stage === 'run');
  const showRun = run.length > 0 && (draft.stage === 'run' || draft.stage === 'review');
  const showDeliver = draft.stage === 'deliver';
  const hasDetail = questions.length > 0 || feedback.length > 0 || showFiles || showRun || showDeliver;

  return (
    <section className={styles.guide}>
      <ol className={styles.stageStrip}>
        {STAGES.map((item, index) => (
          <li
            key={item.id}
            className={classNames(styles.stagePill, {
              [styles.stagePillDone]: index < current,
              [styles.stagePillNow]: index === current,
            })}
          >
            {index < current ? '✓' : index + 1} {t(stageTitleKey(item.id))}
          </li>
        ))}
      </ol>

      <div className={styles.guideCard}>
        <div className='flex items-start justify-between gap-12px'>
          <div className='min-w-0'>
            <div className={styles.guideStage}>
              {t('guid.createWorkflow.now', { n: current + 1, title: t(stageTitleKey(stage.id)) })}
              <span className={styles.guideHint}>{t(stageHintKey(stage.id))}</span>
            </div>
            {draft.say && <div className={styles.guideSay}>{draft.say}</div>}
          </div>
          {hasDetail && (
            <Button size='mini' type='text' onClick={() => setExpanded((value) => !value)}>
              {expanded ? t('guid.createWorkflow.collapse') : t('guid.createWorkflow.expand')}
            </Button>
          )}
        </div>

        {expanded && hasDetail && (
          <div className={styles.guideDetail}>
            {questions.length > 0 && (
              <div>
                <div className={styles.sectionLabel}>{t('guid.createWorkflow.waiting')}</div>
                <ol className={styles.plainList}>
                  {questions.map((question) => (
                    <li key={question.id}>{question.text}</li>
                  ))}
                </ol>
              </div>
            )}

            {feedback.map((group) => (
              <div key={group.key}>
                <div className={styles.sectionLabel}>{group.title}</div>
                <ul className={styles.plainList}>
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}

            {showFiles && (
              <div>
                <div className={styles.sectionLabel}>
                  {t('guid.createWorkflow.filesNeeded', {
                    count: files.filter((file) => file.status !== 'received').length,
                  })}
                </div>
                <div className='flex flex-col gap-6px'>
                  {files.map((file) => (
                    <div key={file.id} className={styles.fileItem}>
                      <span className={classNames(styles.fileMark, { [styles.fileMarkDone]: file.status === 'received' })}>
                        {file.status === 'received' ? '✓' : t('guid.createWorkflow.missingMark')}
                      </span>
                      <div className='flex-1 min-w-0'>
                        <div className={styles.fileName}>{file.name}</div>
                        {file.why && <div className={styles.flowSub}>{file.why}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showRun && (
              <div>
                <div className={styles.sectionLabel}>
                  {t('guid.createWorkflow.runHint')}
                </div>
                <div className='flex flex-col gap-8px'>
                  {run.map((item) => (
                    <RunCard key={item.id} item={item} onVerdict={onVerdict} />
                  ))}
                </div>
              </div>
            )}

            {showDeliver && (
              <div>
                <div className={styles.sectionLabel}>
                  {deliver.workflowMd ? t('guid.createWorkflow.deliverReady') : t('guid.createWorkflow.deliverWait')}
                </div>
                <div className='flex flex-wrap gap-8px'>
                  <Button type='primary' disabled={!deliver.workflowMd} loading={deliver.busy} onClick={onSave}>
                    {deliver.saved ? t('guid.createWorkflow.saveAgain') : t('guid.createWorkflow.saveSop')}
                  </Button>
                  <Button disabled={!deliver.saved} loading={deliver.busy} onClick={onCreateAssistant}>
                    {deliver.assistantCreated
                      ? t('guid.createWorkflow.assistantAgain')
                      : t('guid.createWorkflow.createAssistant')}
                  </Button>
                </div>
                {deliver.assistantCreated && <div className={styles.flowOk}>{t('guid.createWorkflow.assistantFound')}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

const RunCard: React.FC<{
  item: WorkflowDraftRunItem;
  onVerdict: (id: string, verdict: 'right' | 'wrong', correction: string) => void;
}> = ({ item, onVerdict }) => {
  const { t } = useTranslation();
  const [correction, setCorrection] = useState(item.correction ?? '');
  useEffect(() => {
    setCorrection(item.correction ?? '');
  }, [item.correction]);
  return (
    <div
      className={classNames(styles.runCard, {
        [styles.runRight]: item.verdict === 'right',
        [styles.runWrong]: item.verdict === 'wrong',
      })}
    >
      <div className={styles.fileName}>{item.claim}</div>
      {item.evidence && <div className={styles.flowSub}>{t('guid.createWorkflow.evidence', { text: item.evidence })}</div>}
      <div className='flex gap-8px mt-8px'>
        <Button
          size='small'
          type={item.verdict === 'right' ? 'primary' : 'secondary'}
          status={item.verdict === 'right' ? 'success' : 'default'}
          onClick={() => onVerdict(item.id, 'right', '')}
        >
          {t('guid.createWorkflow.right')}
        </Button>
        <Button
          size='small'
          type={item.verdict === 'wrong' ? 'primary' : 'secondary'}
          status={item.verdict === 'wrong' ? 'danger' : 'default'}
          onClick={() => onVerdict(item.id, 'wrong', correction)}
        >
          {t('guid.createWorkflow.wrong')}
        </Button>
      </div>
      {item.verdict === 'wrong' && (
        <Input.TextArea
          className='mt-8px'
          autoSize={{ minRows: 1, maxRows: 4 }}
          placeholder={t('guid.createWorkflow.correctionPlaceholder')}
          value={correction}
          onChange={setCorrection}
          onBlur={() => {
            if (correction !== (item.correction ?? '')) onVerdict(item.id, 'wrong', correction);
          }}
        />
      )}
    </div>
  );
};
