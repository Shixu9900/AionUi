/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useEffect, useState } from 'react';
import { Button, Input, Modal } from '@arco-design/web-react';
import classNames from 'classnames';
import type {
  WorkflowDraft,
  WorkflowDraftRunItem,
  WorkflowDraftStage,
  WorkflowStepAuto,
} from '@/common/types/createWorkflow';
import styles from './index.module.css';

/** bpmn-js is ~1 MB; split it out so only this page pays for it. */
const BpmnFlow = React.lazy(() => import('./BpmnFlow'));

type Tab = 'flow' | 'feedback' | 'files' | 'run' | 'deliver';

const TAB_FOR_STAGE: Record<WorkflowDraftStage, Tab> = {
  job: 'flow',
  goal: 'flow',
  method: 'flow',
  confirm: 'feedback',
  evidence: 'files',
  run: 'run',
  review: 'run',
  deliver: 'deliver',
};

const FEEDBACK_GROUPS: { key: 'missing' | 'extra' | 'duplicate' | 'unclear'; title: string }[] = [
  { key: 'missing', title: '我觉得缺了' },
  { key: 'extra', title: '可能多余' },
  { key: 'duplicate', title: '好像重复了' },
  { key: 'unclear', title: '我还没听懂' },
];

const AUTO_LABEL: Record<WorkflowStepAuto, string> = {
  assistant: '助手可以自己做',
  assistant_with_review: '助手先做，专家复核',
  human: '必须人来做',
};

const nonEmpty = (list: string[] | undefined) => (list ?? []).filter((item) => item.trim().length > 0);

export type DeliverState = {
  workflowMd: string;
  saved: boolean;
  assistantCreated: boolean;
  busy: boolean;
};

export const UnderstandingPanel: React.FC<{
  draft: WorkflowDraft;
  deliver: DeliverState;
  onVerdict: (id: string, verdict: 'right' | 'wrong', correction: string) => void;
  onSave: () => void;
  onCreateAssistant: () => void;
}> = ({ draft, deliver, onVerdict, onSave, onCreateAssistant }) => {
  const stage = draft.stage ?? 'job';
  const [tab, setTab] = useState<Tab>(TAB_FOR_STAGE[stage]);
  const [flowZoomed, setFlowZoomed] = useState(false);
  useEffect(() => {
    setTab(TAB_FOR_STAGE[stage]);
  }, [stage]);

  const feedbackCount = FEEDBACK_GROUPS.reduce((sum, group) => sum + nonEmpty(draft.feedback?.[group.key]).length, 0);
  const openQuestions = (draft.questions ?? []).filter((q) => q.status !== 'answered');
  const painPoints = (draft.pain_points ?? []).filter((point) => point.text.trim().length > 0);
  const stepLabelOf = (stepId: string) => {
    const index = (draft.steps ?? []).findIndex((step) => step.id === stepId);
    return index < 0 ? stepId : `第 ${index + 1} 步`;
  };
  const files = draft.files ?? [];
  const missingFiles = files.filter((file) => file.status !== 'received').length;
  const run = draft.run ?? [];
  const pendingRun = run.filter((item) => !item.verdict || item.verdict === 'pending').length;

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'flow', label: '它的理解' },
    { id: 'feedback', label: '它的反馈', badge: feedbackCount + openQuestions.length + painPoints.length },
    { id: 'files', label: '文件', badge: missingFiles },
    { id: 'run', label: '照做结果', badge: pendingRun },
    { id: 'deliver', label: '交付' },
  ];

  const renderFlow = () => {
    const steps = draft.steps ?? [];
    return (
      <>
        <section className={styles.goalCard}>
          <div className={styles.sectionLabel}>这项工作</div>
          <div className={styles.goalTitle}>{draft.job?.name || '还没说'}</div>
          <div className={styles.goalMeta}>
            {draft.job?.who ? `谁来做：${draft.job.who}` : ''}
            {draft.job?.deliver_to ? ` · 交给：${draft.job.deliver_to}` : ''}
            {draft.job?.frequency ? ` · ${draft.job.frequency}` : ''}
          </div>
          {(draft.goal?.problem || draft.goal?.deliverable) && (
            <div className={styles.goalBlock}>
              {draft.goal?.problem && <div>要解决：{draft.goal.problem}</div>}
              {draft.goal?.deliverable && <div>最后交出：{draft.goal.deliverable}</div>}
            </div>
          )}
          {nonEmpty(draft.goal?.done_when).length > 0 && (
            <div className={styles.goalBlock}>
              <div className={styles.sectionLabel}>合格标准</div>
              <ul className={styles.plainList}>
                {nonEmpty(draft.goal?.done_when).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {nonEmpty(draft.goal?.wrong_when).length > 0 && (
            <div className={styles.goalBlock}>
              <div className={styles.sectionLabel}>算做错</div>
              <ul className={styles.plainList}>
                {nonEmpty(draft.goal?.wrong_when).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <div className='flex items-center justify-between'>
          <div className={styles.sectionLabel}>流程图</div>
          {steps.length > 0 && (
            <Button size='mini' type='text' onClick={() => setFlowZoomed(true)}>
              放大看
            </Button>
          )}
        </div>
        {steps.length === 0 ? (
          <div className={styles.flowEmpty}>等你讲做法，这里会一步一步画出来。</div>
        ) : (
          <Suspense fallback={<div className={styles.flowEmpty}>正在打开流程图……</div>}>
            <BpmnFlow steps={steps} height={200} />
            <Modal
              title={draft.job?.name || '流程图'}
              visible={flowZoomed}
              footer={null}
              style={{ width: '90vw' }}
              onCancel={() => setFlowZoomed(false)}
              unmountOnExit
            >
              <BpmnFlow steps={steps} height={Math.round(window.innerHeight * 0.5)} />
            </Modal>
          </Suspense>
        )}
        {steps.length > 0 && (
          <div className={styles.flowCanvas}>
            <div className={styles.sectionLabel}>每一步看什么、得出什么</div>
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div
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
              </React.Fragment>
            ))}
          </div>
        )}
        {(draft.changes ?? []).length > 0 && (
          <div className={styles.goalBlock}>
            <div className={styles.sectionLabel}>根据你的批改改过的地方</div>
            <ul className={styles.plainList}>
              {nonEmpty(draft.changes).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </>
    );
  };

  const renderFeedback = () => (
    <>
      {openQuestions.length > 0 && (
        <section className={styles.feedbackGroup}>
          <div className={styles.sectionLabel}>它在等你回答</div>
          {openQuestions.map((question) => (
            <div key={question.id} className={styles.questionItem}>
              {question.text}
            </div>
          ))}
        </section>
      )}
      {FEEDBACK_GROUPS.map((group) => {
        const items = nonEmpty(draft.feedback?.[group.key]);
        if (items.length === 0) return null;
        return (
          <section key={group.key} className={styles.feedbackGroup}>
            <div className={styles.sectionLabel}>{group.title}</div>
            {items.map((item) => (
              <div key={item} className={styles.feedbackItem}>
                {item}
              </div>
            ))}
          </section>
        );
      })}
      {painPoints.length > 0 && (
        <section className={styles.feedbackGroup}>
          <div className={styles.sectionLabel}>现在最费劲、最容易出错的地方</div>
          {painPoints.map((point) => (
            <div key={point.text} className={styles.feedbackItem}>
              {point.text}
              {point.step ? `（${stepLabelOf(point.step)}）` : ''}
            </div>
          ))}
        </section>
      )}
      {feedbackCount === 0 && openQuestions.length === 0 && painPoints.length === 0 && (
        <div className={styles.flowEmpty}>流程讲完后，它会在这里告诉你它觉得缺了什么、多了什么、哪里重复。</div>
      )}
    </>
  );

  const renderFiles = () =>
    files.length === 0 ? (
      <div className={styles.flowEmpty}>拿资料讲一遍时，它会在这里列出需要的全部文件。在左边对话框里点回形针就能交给它。</div>
    ) : (
      <div className='flex flex-col gap-8px'>
        {files.map((file) => (
          <div key={file.id} className={styles.fileItem}>
            <span className={classNames(styles.fileMark, { [styles.fileMarkDone]: file.status === 'received' })}>
              {file.status === 'received' ? '✓' : '缺'}
            </span>
            <div className='flex-1 min-w-0'>
              <div className={styles.fileName}>{file.name}</div>
              {file.why && <div className={styles.flowSub}>{file.why}</div>}
            </div>
          </div>
        ))}
      </div>
    );

  const renderRun = () =>
    run.length === 0 ? (
      <div className={styles.flowEmpty}>文件交齐后，它会照着流程做一遍，结果逐条出现在这里，请你批改。</div>
    ) : (
      <div className='flex flex-col gap-10px'>
        <div className={styles.flowSub}>
          逐条点「对」或「不对」。不对的写一句正确答案，然后在对话里告诉它「我批改完了」。
        </div>
        {run.map((item) => (
          <RunCard key={item.id} item={item} onVerdict={onVerdict} />
        ))}
      </div>
    );

  const renderDeliver = () => (
    <div className='flex flex-col gap-12px'>
      <div className={styles.flowSub}>
        你确认可以之后，它会写好一份工作方法。这份方法只写做法和判断规则，不带这套资料里的具体数字和编号。
      </div>
      {deliver.workflowMd ? (
        <pre className={styles.workflowPreview}>{deliver.workflowMd}</pre>
      ) : (
        <div className={styles.flowEmpty}>还没有写好工作方法。跟它说「可以交付了」，它会先写好。</div>
      )}
      <Button type='primary' size='large' disabled={!deliver.workflowMd} loading={deliver.busy} onClick={onSave}>
        {deliver.saved ? '已保存，再存一次' : '保存为正式工作流'}
      </Button>
      <Button size='large' disabled={!deliver.saved} loading={deliver.busy} onClick={onCreateAssistant}>
        {deliver.assistantCreated ? '已建好测试助手，再建一个' : '建一个测试助手试试'}
      </Button>
      {deliver.assistantCreated && <div className={styles.flowOk}>可以在左侧「助手」里找到它。</div>}
    </div>
  );

  const renderTab = () => {
    switch (tab) {
      case 'flow':
        return renderFlow();
      case 'feedback':
        return renderFeedback();
      case 'files':
        return renderFiles();
      case 'run':
        return renderRun();
      case 'deliver':
        return renderDeliver();
      default: {
        const exhaustive: never = tab;
        return exhaustive;
      }
    }
  };

  return (
    <aside className={styles.panel}>
      <div className={styles.panelTabs}>
        {tabs.map((item) => (
          <button
            key={item.id}
            type='button'
            className={classNames(styles.panelTab, { [styles.panelTabActive]: item.id === tab })}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {item.badge ? <span className={styles.panelBadge}>{item.badge}</span> : null}
          </button>
        ))}
      </div>
      {draft.say && <div className={styles.say}>{draft.say}</div>}
      <div className={styles.panelBody}>{renderTab()}</div>
    </aside>
  );
};

const RunCard: React.FC<{
  item: WorkflowDraftRunItem;
  onVerdict: (id: string, verdict: 'right' | 'wrong', correction: string) => void;
}> = ({ item, onVerdict }) => {
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
      {item.evidence && <div className={styles.flowSub}>依据：{item.evidence}</div>}
      <div className='flex gap-8px mt-8px'>
        <Button
          type={item.verdict === 'right' ? 'primary' : 'secondary'}
          status={item.verdict === 'right' ? 'success' : 'default'}
          onClick={() => onVerdict(item.id, 'right', '')}
        >
          对
        </Button>
        <Button
          type={item.verdict === 'wrong' ? 'primary' : 'secondary'}
          status={item.verdict === 'wrong' ? 'danger' : 'default'}
          onClick={() => onVerdict(item.id, 'wrong', correction)}
        >
          不对
        </Button>
      </div>
      {item.verdict === 'wrong' && (
        <Input.TextArea
          className='mt-8px'
          autoSize={{ minRows: 1, maxRows: 4 }}
          placeholder='正确的应该是……，因为……'
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
