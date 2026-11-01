/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useState } from 'react';
import { Button, Modal } from '@arco-design/web-react';
import classNames from 'classnames';
import type { WorkflowDraft, WorkflowStepAuto } from '@/common/types/createWorkflow';
import { nonEmpty } from './TeachGuide';
import styles from './index.module.css';

/** bpmn-js is ~1 MB; split it out so only this page pays for it. */
const BpmnFlow = React.lazy(() => import('./BpmnFlow'));

const AUTO_LABEL: Record<WorkflowStepAuto, string> = {
  assistant: '助手可以自己做',
  assistant_with_review: '助手先做，专家复核',
  human: '必须人来做',
};

/** What the master has distilled so far — results only; all interaction lives in the conversation column. */
export const ResultPanel: React.FC<{ draft: WorkflowDraft; workflowMd: string }> = ({ draft, workflowMd }) => {
  const [zoomed, setZoomed] = useState(false);
  const steps = draft.steps ?? [];
  const stepLabelOf = (stepId: string) => {
    const index = steps.findIndex((step) => step.id === stepId);
    return index < 0 ? stepId : `第 ${index + 1} 步`;
  };
  const painPoints = (draft.pain_points ?? []).filter((point) => point.text.trim());
  const doneWhen = nonEmpty(draft.goal?.done_when);
  const wrongWhen = nonEmpty(draft.goal?.wrong_when);
  const changes = nonEmpty(draft.changes);
  const meta = [
    draft.job?.who && `谁来做：${draft.job.who}`,
    draft.job?.deliver_to && `交给：${draft.job.deliver_to}`,
    draft.job?.trigger && `什么时候做：${draft.job.trigger}`,
    draft.job?.frequency,
  ].filter(Boolean);

  return (
    <aside className={styles.result}>
      <div className={styles.resultHead}>
        <span className={styles.chatTitle}>梳理结果</span>
        <span className={styles.guideHint}>它每听懂一点就更新一次</span>
      </div>
      <div className={styles.resultBody}>
        <div className='flex items-center justify-between'>
          <div className={styles.sectionLabel}>流程图</div>
          {steps.length > 0 && (
            <Button size='mini' type='text' onClick={() => setZoomed(true)}>
              放大看
            </Button>
          )}
        </div>
        {steps.length === 0 ? (
          <div className={styles.flowEmpty}>等你讲做法，这里会一步一步画出来。</div>
        ) : (
          <Suspense fallback={<div className={styles.flowEmpty}>正在打开流程图……</div>}>
            <BpmnFlow steps={steps} height={240} />
            <Modal
              title={draft.job?.name || '流程图'}
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
          <div className={styles.goalTitle}>{draft.job?.name || '还没说是什么工作'}</div>
          {meta.length > 0 && <div className={styles.goalMeta}>{meta.join(' · ')}</div>}
          {draft.goal?.problem && <div className={styles.goalBlock}>要解决：{draft.goal.problem}</div>}
          {draft.goal?.deliverable && <div className={styles.goalBlock}>最后交出：{draft.goal.deliverable}</div>}
          {doneWhen.length > 0 && (
            <div className={styles.goalBlock}>
              <div className={styles.sectionLabel}>合格标准</div>
              <ul className={styles.plainList}>
                {doneWhen.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {wrongWhen.length > 0 && (
            <div className={styles.goalBlock}>
              <div className={styles.sectionLabel}>算做错</div>
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
            <div className={styles.sectionLabel}>每一步看什么、得出什么</div>
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
                  {step.kind === 'check' && <span className={styles.flowBadge}>判断</span>}
                  {step.from === 'suggested' && <span className={styles.flowBadge}>它建议的</span>}
                </div>
                {step.actor && <div className={styles.flowSub}>谁做：{step.actor}</div>}
                {(step.look_at ?? []).length > 0 && (
                  <div className={styles.flowSub}>看：{(step.look_at ?? []).join('、')}</div>
                )}
                {step.result && <div className={styles.flowSub}>得出：{step.result}</div>}
                {step.pitfall && <div className={styles.flowSub}>容易错：{step.pitfall}</div>}
                {step.escalate && <div className={styles.flowSub}>拿不准就问：{step.escalate}</div>}
                {step.auto && <div className={styles.flowSub}>{AUTO_LABEL[step.auto]}</div>}
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
            <div className={styles.sectionLabel}>现在最费劲、最容易出错的地方</div>
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
            <div className={styles.sectionLabel}>根据你的批改改过的地方</div>
            <ul className={styles.plainList}>
              {changes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {workflowMd && (
          <div className={styles.goalBlock}>
            <div className={styles.sectionLabel}>写好的工作方法</div>
            <pre className={styles.workflowPreview}>{workflowMd}</pre>
          </div>
        )}
      </div>
    </aside>
  );
};
