/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Button, Input } from '@arco-design/web-react';
import classNames from 'classnames';
import type { WorkflowDraft, WorkflowDraftRunItem } from '@/common/types/createWorkflow';
import { STAGES, stageIndex } from './stages';
import styles from './index.module.css';

const FEEDBACK_GROUPS: { key: 'missing' | 'extra' | 'duplicate' | 'unclear'; title: string }[] = [
  { key: 'missing', title: '我觉得缺了' },
  { key: 'extra', title: '可能多余' },
  { key: 'duplicate', title: '好像重复了' },
  { key: 'unclear', title: '我还没听懂' },
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
  const current = stageIndex(draft.stage);
  const stage = STAGES[current];
  const [expanded, setExpanded] = useState(true);
  useEffect(() => {
    setExpanded(true);
  }, [draft.stage]);

  const questions = (draft.questions ?? []).filter((q) => q.status !== 'answered' && q.text.trim());
  const feedback = FEEDBACK_GROUPS.map((group) => ({
    key: group.key,
    title: group.title,
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
            {index < current ? '✓' : index + 1} {item.title}
          </li>
        ))}
      </ol>

      <div className={styles.guideCard}>
        <div className='flex items-start justify-between gap-12px'>
          <div className='min-w-0'>
            <div className={styles.guideStage}>
              现在：第 {current + 1} 步 · {stage.title}
              <span className={styles.guideHint}>{stage.hint}</span>
            </div>
            {draft.say && <div className={styles.guideSay}>{draft.say}</div>}
          </div>
          {hasDetail && (
            <Button size='mini' type='text' onClick={() => setExpanded((value) => !value)}>
              {expanded ? '收起' : '展开'}
            </Button>
          )}
        </div>

        {expanded && hasDetail && (
          <div className={styles.guideDetail}>
            {questions.length > 0 && (
              <div>
                <div className={styles.sectionLabel}>它在等你回答</div>
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
                  需要的文件（缺 {files.filter((file) => file.status !== 'received').length} 份）· 点输入框里的回形针交给它
                </div>
                <div className='flex flex-col gap-6px'>
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
              </div>
            )}

            {showRun && (
              <div>
                <div className={styles.sectionLabel}>
                  它照做的结果：逐条点「对」或「不对」，不对的写正确答案，然后在下面告诉它「批改完了」
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
                  {deliver.workflowMd
                    ? '工作方法已写好（右边可以看全文）。只含做法和判断规则，不带这套资料的数字和编号。'
                    : '跟它说「可以交付了」，它会先写好工作方法。'}
                </div>
                <div className='flex flex-wrap gap-8px'>
                  <Button type='primary' disabled={!deliver.workflowMd} loading={deliver.busy} onClick={onSave}>
                    {deliver.saved ? '已保存，再存一次' : '保存到工作流库'}
                  </Button>
                  <Button disabled={!deliver.saved} loading={deliver.busy} onClick={onCreateAssistant}>
                    {deliver.assistantCreated ? '已建好测试助手，再建一个' : '建一个测试助手试试'}
                  </Button>
                </div>
                {deliver.assistantCreated && <div className={styles.flowOk}>可以在左侧「助手」里找到它。</div>}
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
          size='small'
          type={item.verdict === 'right' ? 'primary' : 'secondary'}
          status={item.verdict === 'right' ? 'success' : 'default'}
          onClick={() => onVerdict(item.id, 'right', '')}
        >
          对
        </Button>
        <Button
          size='small'
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
