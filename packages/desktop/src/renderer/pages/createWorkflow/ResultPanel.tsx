/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Modal } from '@arco-design/web-react';
import classNames from 'classnames';
import type { I18nKey } from '@/renderer/services/i18n';
import type { WorkflowDraft, WorkflowStepAuto } from '@/common/types/createWorkflow';
import { nonEmpty } from './TeachGuide';
import styles from './index.module.css';

/** bpmn-js is ~1 MB; split it out so only this page pays for it. */
const BpmnFlow = React.lazy(() => import('./BpmnFlow'));

const AUTO_KEY: Record<WorkflowStepAuto, I18nKey> = {
  assistant: 'guid.createWorkflow.auto.assistant',
  assistant_with_review: 'guid.createWorkflow.auto.review',
  human: 'guid.createWorkflow.auto.human',
};

/** What the master has distilled so far — results only; all interaction lives in the conversation column. */
export const ResultPanel: React.FC<{ draft: WorkflowDraft; workflowMd: string }> = ({ draft, workflowMd }) => {
  const { t } = useTranslation();
  const [zoomed, setZoomed] = useState(false);
  const steps = draft.steps ?? [];
  const stepLabelOf = (stepId: string) => {
    const index = steps.findIndex((step) => step.id === stepId);
    return index < 0 ? stepId : t('guid.createWorkflow.stepN', { n: index + 1 });
  };
  const painPoints = (draft.pain_points ?? []).filter((point) => point.text.trim());
  const doneWhen = nonEmpty(draft.goal?.done_when);
  const wrongWhen = nonEmpty(draft.goal?.wrong_when);
  const changes = nonEmpty(draft.changes);
  const meta = [
    draft.job?.who && t('guid.createWorkflow.who', { value: draft.job.who }),
    draft.job?.deliver_to && t('guid.createWorkflow.deliverTo', { value: draft.job.deliver_to }),
    draft.job?.trigger && t('guid.createWorkflow.when', { value: draft.job.trigger }),
    draft.job?.frequency,
  ].filter(Boolean);

  return (
    <aside className={styles.result}>
      <div className={styles.resultHead}>
        <span className={styles.chatTitle}>{t('guid.createWorkflow.resultTitle')}</span>
        <span className={styles.guideHint}>{t('guid.createWorkflow.resultHint')}</span>
      </div>
      <div className={styles.resultBody}>
        <div className='flex items-center justify-between'>
          <div className={styles.sectionLabel}>{t('guid.createWorkflow.flow')}</div>
          {steps.length > 0 && (
            <Button size='mini' type='text' onClick={() => setZoomed(true)}>
              {t('guid.createWorkflow.zoom')}
            </Button>
          )}
        </div>
        {steps.length === 0 ? (
          <div className={styles.flowEmpty}>{t('guid.createWorkflow.flowEmpty')}</div>
        ) : (
          <Suspense fallback={<div className={styles.flowEmpty}>{t('guid.createWorkflow.flowLoading')}</div>}>
            <BpmnFlow steps={steps} height={240} />
            <Modal
              title={draft.job?.name || t('guid.createWorkflow.flow')}
              visible={zoomed}
              footer={null}
              style={{ width: '90vw' }}
              onCancel={() => setZoomed(false)}
              unmountOnExit
            >
              <BpmnFlow steps={steps} height={Math.round(window.innerHeight * 0.5)} />
            </Modal>
          </Suspense>
        )}

        <section className={styles.goalCard}>
          <div className={styles.goalTitle}>{draft.job?.name || t('guid.createWorkflow.unnamed')}</div>
          {meta.length > 0 && <div className={styles.goalMeta}>{meta.join(' · ')}</div>}
          {draft.goal?.problem && (
            <div className={styles.goalBlock}>{t('guid.createWorkflow.problem', { value: draft.goal.problem })}</div>
          )}
          {draft.goal?.deliverable && (
            <div className={styles.goalBlock}>{t('guid.createWorkflow.deliverable', { value: draft.goal.deliverable })}</div>
          )}
          {doneWhen.length > 0 && (
            <div className={styles.goalBlock}>
              <div className={styles.sectionLabel}>{t('guid.createWorkflow.doneWhen')}</div>
              <ul className={styles.plainList}>
                {doneWhen.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {wrongWhen.length > 0 && (
            <div className={styles.goalBlock}>
              <div className={styles.sectionLabel}>{t('guid.createWorkflow.wrongWhen')}</div>
              <ul className={styles.plainList}>
                {wrongWhen.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {steps.length > 0 && (
          <div className={styles.flowCanvas}>
            <div className={styles.sectionLabel}>{t('guid.createWorkflow.stepDetail')}</div>
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={classNames(styles.flowNode, {
                  [styles.flowCheck]: step.kind === 'check',
                  [styles.flowOutput]: step.kind === 'output',
                  [styles.flowSuggested]: step.from === 'suggested',
                })}
              >
                <div className='flex items-start gap-8px'>
                  <span className={styles.flowIndex}>{index + 1}</span>
                  <span className={styles.flowText}>{step.title}</span>
                  {step.kind === 'check' && <span className={styles.flowBadge}>{t('guid.createWorkflow.check')}</span>}
                  {step.from === 'suggested' && <span className={styles.flowBadge}>{t('guid.createWorkflow.suggested')}</span>}
                </div>
                {step.actor && <div className={styles.flowSub}>{t('guid.createWorkflow.actor', { value: step.actor })}</div>}
                {(step.look_at ?? []).length > 0 && (
                  <div className={styles.flowSub}>
                    {t('guid.createWorkflow.look', { value: (step.look_at ?? []).join(t('guid.createWorkflow.listSep')) })}
                  </div>
                )}
                {step.result && <div className={styles.flowSub}>{t('guid.createWorkflow.outcome', { value: step.result })}</div>}
                {step.pitfall && <div className={styles.flowSub}>{t('guid.createWorkflow.pitfall', { value: step.pitfall })}</div>}
                {step.escalate && (
                  <div className={styles.flowSub}>{t('guid.createWorkflow.escalate', { value: step.escalate })}</div>
                )}
                {step.auto && <div className={styles.flowSub}>{t(AUTO_KEY[step.auto])}</div>}
                {(step.branches ?? []).map((branch) => (
                  <div key={branch.when} className={styles.flowBranch}>
                    {branch.when}
                    {branch.goto ? ` → ${stepLabelOf(branch.goto)}` : ''}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {painPoints.length > 0 && (
          <div className={styles.goalBlock}>
            <div className={styles.sectionLabel}>{t('guid.createWorkflow.pain')}</div>
            <ul className={styles.plainList}>
              {painPoints.map((point) => (
                <li key={point.text}>
                  {point.text}
                  {point.step ? `（${stepLabelOf(point.step)}）` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {changes.length > 0 && (
          <div className={styles.goalBlock}>
            <div className={styles.sectionLabel}>{t('guid.createWorkflow.changes')}</div>
            <ul className={styles.plainList}>
              {changes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {workflowMd && (
          <div className={styles.goalBlock}>
            <div className={styles.sectionLabel}>{t('guid.createWorkflow.method')}</div>
            <pre className={styles.workflowPreview}>{workflowMd}</pre>
          </div>
        )}
      </div>
    </aside>
  );
};
