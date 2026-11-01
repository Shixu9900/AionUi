/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Input, Message, Tag } from '@arco-design/web-react';
import classNames from 'classnames';
import { ipcBridge } from '@/common';
import type { TChatConversation } from '@/common/config/storage';
import type { WorkflowDraft, WorkflowTeachSession } from '@/common/types/createWorkflow';
import { useGuidModelSelection } from '@renderer/pages/guid/hooks/useGuidModelSelection';
import { STAGES, stageIndex } from './stages';
import { TeachChat } from './TeachChat';
import { UnderstandingPanel, type DeliverState } from './UnderstandingPanel';
import styles from './index.module.css';

const AVIATOR_ROOT = '/Users/9900macbook/Aviator-workspace/aviator';
const WORKFLOWS_ROOT = `${AVIATOR_ROOT}/workflows`;
const MASTER_SKILL_DIR = `${AVIATOR_ROOT}/skills/create-workflow`;
const MASTER_SKILL = 'create-workflow';
const MASTER_NAME = '工作流师傅';
const CURRENT_SESSION = '_sessions/current.json';
const DRAFT_POLL_MS = 2000;
const DEFAULT_JOB = 'APU 寿命件履历审查';
// The master rewrites draft.json every turn; a per-turn approval prompt would bury the expert.
const TEACH_PERMISSION = 'yolo';

type AionrsConversation = Extract<TChatConversation, { type: 'aionrs' }>;

/** A main process started before the createWorkflow bridge existed never answers; don't hang the page on it. */
const READ_TIMEOUT_MS = 5000;

const readText = async (relativePath: string): Promise<string | null> => {
  let timer = 0;
  const timeout = new Promise<null>((resolve) => {
    timer = window.setTimeout(() => resolve(null), READ_TIMEOUT_MS);
  });
  try {
    return await Promise.race([ipcBridge.createWorkflow.readFile.invoke({ relativePath }), timeout]);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
};

const writeText = (relativePath: string, data: string) => ipcBridge.createWorkflow.writeFile.invoke({ relativePath, data });

const parseDraft = (text: string | null): WorkflowDraft | null => {
  if (!text) return null;
  try {
    return JSON.parse(text) as WorkflowDraft;
  } catch {
    return null;
  }
};

const kickoff = (job: string) =>
  `我们开始吧。我想教你一项工作：「${job}」。请按工作流师傅的方法，从第一步「这是什么工作」开始问我。`;

const skillFromWorkflow = (skillName: string, job: string, workflowMd: string) =>
  `---\nname: ${skillName}\ndescription: ${job}。由专家在「创建工作流」中教会并确认的工作方法。只含做法和判断规则。\n---\n\n${workflowMd}\n`;

const CreateWorkflowPage: React.FC = () => {
  const { current_model } = useGuidModelSelection();
  const [session, setSession] = useState<WorkflowTeachSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [conversation, setConversation] = useState<AionrsConversation | null>(null);
  const [draft, setDraft] = useState<WorkflowDraft>({});
  const draftTextRef = useRef('');
  const [jobName, setJobName] = useState(DEFAULT_JOB);
  const [starting, setStarting] = useState(false);
  const [deliver, setDeliver] = useState<DeliverState>({
    workflowMd: '',
    saved: false,
    assistantCreated: false,
    busy: false,
  });

  useEffect(() => {
    void readText(CURRENT_SESSION).then((text) => {
      if (text) {
        try {
          setSession(JSON.parse(text) as WorkflowTeachSession);
        } catch {
          setSession(null);
        }
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!session) {
      setConversation(null);
      return;
    }
    void ipcBridge.conversation.get
      .invoke({ id: session.conversationId })
      .then((result) => setConversation(result?.type === 'aionrs' ? result : null))
      .catch(() => setConversation(null));
  }, [session]);

  const pollDraft = useCallback(async () => {
    if (!session) return;
    const draftText = await readText(`${session.relativeDir}/draft.json`);
    if (draftText && draftText !== draftTextRef.current) {
      const parsed = parseDraft(draftText);
      if (parsed) {
        draftTextRef.current = draftText;
        setDraft(parsed);
      }
    }
    const workflowMd = await readText(`${session.relativeDir}/WORKFLOW.md`);
    setDeliver((prev) => (prev.workflowMd === (workflowMd ?? '') ? prev : { ...prev, workflowMd: workflowMd ?? '' }));
  }, [session]);

  useEffect(() => {
    if (!session) return;
    void pollDraft();
    const timer = window.setInterval((): void => {
      void pollDraft();
    }, DRAFT_POLL_MS);
    return () => window.clearInterval(timer);
  }, [session, pollDraft]);

  const ensureMasterAssistant = async (): Promise<string> => {
    await ipcBridge.fs.importSkill.invoke({ skill_path: MASTER_SKILL_DIR });
    const list = await ipcBridge.assistants.list.invoke();
    const existing = list.find((assistant) => assistant.name === MASTER_NAME);
    if (existing) return existing.id;
    const created = await ipcBridge.assistants.create.invoke({
      name: MASTER_NAME,
      description: '像徒弟一样跟专家学一项工作，整理成助手能照做的工作方法。管理团队专用。',
      enabled_skills: [MASTER_SKILL],
    });
    return created.id;
  };

  const startSession = async () => {
    const job = jobName.trim() || DEFAULT_JOB;
    if (!current_model) {
      Message.warning('还没有可用的模型，请先在设置里配置一个模型。');
      return;
    }
    setStarting(true);
    try {
      const assistantId = await ensureMasterAssistant();
      const createdAt = Date.now();
      const relativeDir = `_sessions/teach-${createdAt}`;
      const sessionDir = `${WORKFLOWS_ROOT}/${relativeDir}`;
      const initialDraft: WorkflowDraft = {
        schema: 'aviator.workflow-draft/v1',
        stage: 'job',
        job: { name: job },
      };
      await writeText(`${relativeDir}/draft.json`, JSON.stringify(initialDraft, null, 2));
      const created = await ipcBridge.conversation.create.invoke({
        name: `创建工作流 · ${job}`,
        model: current_model,
        assistant: {
          id: assistantId,
          locale: 'zh-CN',
          conversation_overrides: {
            model: current_model.use_model,
            permission: TEACH_PERMISSION,
            skill_ids: [MASTER_SKILL],
          },
        },
        extra: { workspace: sessionDir, custom_workspace: true, default_files: [] },
      });
      if (!created?.id) {
        Message.error('没能开始对话，请稍后再试。');
        return;
      }
      sessionStorage.setItem(`aionrs_initial_message_${created.id}`, JSON.stringify({ input: kickoff(job) }));
      const next: WorkflowTeachSession = {
        sessionDir,
        relativeDir,
        conversationId: created.id,
        assistantId,
        title: job,
        createdAt,
      };
      await writeText(CURRENT_SESSION, JSON.stringify(next, null, 2));
      draftTextRef.current = '';
      setDraft(initialDraft);
      setDeliver({ workflowMd: '', saved: false, assistantCreated: false, busy: false });
      setSession(next);
    } catch (error) {
      console.error('[createWorkflow] start failed', error);
      Message.error('没能开始对话，请稍后再试。');
    } finally {
      setStarting(false);
    }
  };

  const handleVerdict = async (id: string, verdict: 'right' | 'wrong', correction: string) => {
    if (!session) return;
    const next = parseDraft(await readText(`${session.relativeDir}/draft.json`)) ?? structuredClone(draft);
    const target = next.run?.find((item) => item.id === id);
    if (!target) return;
    target.verdict = verdict;
    target.correction = correction;
    const text = JSON.stringify(next, null, 2);
    await writeText(`${session.relativeDir}/draft.json`, text);
    draftTextRef.current = text;
    setDraft(next);
  };

  const slug = session ? `teach-${session.createdAt}` : '';

  const handleSave = async () => {
    if (!session || !deliver.workflowMd) return;
    setDeliver((prev) => ({ ...prev, busy: true }));
    try {
      const { run: _run, files: _files, ...method } = draft;
      await Promise.all([
        writeText(`${slug}/WORKFLOW.md`, deliver.workflowMd),
        writeText(`${slug}/draft.json`, JSON.stringify(method, null, 2)),
        writeText(
          `${slug}/skill/SKILL.md`,
          skillFromWorkflow(`workflow-${slug}`, draft.job?.name ?? session.title, deliver.workflowMd)
        ),
      ]);
      setDeliver((prev) => ({ ...prev, saved: true }));
      Message.success('已保存为正式工作流。');
    } finally {
      setDeliver((prev) => ({ ...prev, busy: false }));
    }
  };

  const handleCreateAssistant = async () => {
    if (!session) return;
    setDeliver((prev) => ({ ...prev, busy: true }));
    try {
      const skillName = `workflow-${slug}`;
      await ipcBridge.fs.importSkill.invoke({ skill_path: `${WORKFLOWS_ROOT}/${slug}/skill` });
      await ipcBridge.assistants.create.invoke({
        name: `${draft.job?.name ?? session.title}（测试）`,
        description: '由「创建工作流」教会的工作方法生成，用来验证新助手能照着做。',
        enabled_skills: [skillName],
      });
      setDeliver((prev) => ({ ...prev, assistantCreated: true }));
    } finally {
      setDeliver((prev) => ({ ...prev, busy: false }));
    }
  };

  const currentStage = stageIndex(draft.stage);

  if (!loaded) {
    return (
      <div className={styles.page}>
        <div className={styles.startCard}>正在打开创建工作流……</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={styles.page}>
        <div className={styles.startCard}>
          <div className='flex items-center gap-10px'>
            <h1 className={styles.title}>创建工作流</h1>
            <Tag color='orange'>管理团队专用</Tag>
          </div>
          <p className={styles.lead}>
            像带一个新徒弟那样，把你的一项工作教给「工作流师傅」。它会先问清这是什么工作、要达到什么，再听你讲怎么做，
            边听边画出流程，指出缺了、多了、重复的地方，然后用一套真实资料照做一遍请你批改，直到你满意。
          </p>
          <ol className={styles.startSteps}>
            {STAGES.map((stage) => (
              <li key={stage.id}>
                <b>{stage.title}</b>　{stage.hint}
              </li>
            ))}
          </ol>
          <div className={styles.sectionLabel}>你要教的这项工作叫什么？</div>
          <Input size='large' value={jobName} onChange={setJobName} placeholder='例如：APU 寿命件履历审查' />
          <Button className='mt-16px' type='primary' size='large' loading={starting} onClick={() => void startSession()}>
            开始教
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.teach}>
      <nav className={styles.stageRail}>
        <div className={styles.railTitle}>{draft.job?.name || session.title}</div>
        {STAGES.map((stage, index) => (
          <div
            key={stage.id}
            className={classNames(styles.stageItem, {
              [styles.stageDone]: index < currentStage,
              [styles.stageCurrent]: index === currentStage,
            })}
          >
            <span className={styles.stageNo}>{index < currentStage ? '✓' : index + 1}</span>
            <span className='flex flex-col min-w-0'>
              <span className={styles.stageTitle}>{stage.title}</span>
              <span className={styles.stageHint}>{stage.hint}</span>
            </span>
          </div>
        ))}
        <div className={styles.railFooter}>
          <div className={styles.stageHint}>第 4 到第 7 步会来回几轮，直到流程没问题。</div>
          <Button
            className='mt-10px'
            long
            onClick={() => {
              setSession(null);
              setDraft({});
            }}
          >
            教一项新工作
          </Button>
        </div>
      </nav>

      <main className={styles.chat}>
        <div className={styles.chatHead}>
          <span className={styles.chatTitle}>第 {currentStage + 1} 步：{STAGES[currentStage].title}</span>
          <span className={styles.stageHint}>想说话：点一下输入框，连按两下 Fn 键开始听写，再按一下 Fn 结束。要交文件，点输入框里的回形针。</span>
        </div>
        <div className={styles.chatBody}>
          {conversation ? (
            <TeachChat conversation={conversation} assistantId={session.assistantId} />
          ) : (
            <div className={styles.chatEmpty}>正在连接工作流师傅……</div>
          )}
        </div>
      </main>

      <UnderstandingPanel
        draft={draft}
        deliver={deliver}
        onVerdict={(id, verdict, correction) => void handleVerdict(id, verdict, correction)}
        onSave={() => void handleSave()}
        onCreateAssistant={() => void handleCreateAssistant()}
      />
    </div>
  );
};

export default CreateWorkflowPage;
