/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Message } from '@arco-design/web-react';
import { ipcBridge } from '@/common';
import type { TChatConversation } from '@/common/config/storage';
import type { WorkflowDraft, WorkflowTeachSession } from '@/common/types/createWorkflow';
import { useGuidModelSelection } from '@renderer/pages/guid/hooks/useGuidModelSelection';
import { ResultPanel } from './ResultPanel';
import { TeachChat } from './TeachChat';
import { TeachGuide, type DeliverState } from './TeachGuide';
import { WorkflowLibrary } from './WorkflowLibrary';
import {
  AVIATOR_ROOT,
  WORKFLOWS_ROOT,
  deliverDirOf,
  parseDraft,
  readLibrary,
  readText,
  skillNameOf,
  writeLibrary,
  writeText,
} from './workflowFiles';
import styles from './index.module.css';

const MASTER_SKILL_DIR = `${AVIATOR_ROOT}/skills/create-workflow`;
const MASTER_SKILL = 'create-workflow';
const MASTER_NAME = '叶师傅';
const DRAFT_POLL_MS = 2000;
// The master rewrites draft.json every turn; a per-turn approval prompt would bury the expert.
const TEACH_PERMISSION = 'yolo';

type AionrsConversation = Extract<TChatConversation, { type: 'aionrs' }>;

const EMPTY_DELIVER: DeliverState = { workflowMd: '', saved: false, assistantCreated: false, busy: false };

const kickoff = (job: string) =>
  `我们开始吧，叶师傅。我想教你一项工作：「${job}」。请按工作流师傅的方法，从第一步「这是什么工作」开始问我。`;

const skillFromWorkflow = (skillName: string, job: string, workflowMd: string) =>
  `---\nname: ${skillName}\ndescription: ${job}。由专家在「创建工作流」中教会并确认的工作方法。只含做法和判断规则。\n---\n\n${workflowMd}\n`;

const CreateWorkflowPage: React.FC = () => {
  const { current_model } = useGuidModelSelection();
  const [library, setLibrary] = useState<WorkflowTeachSession[] | null>(null);
  const [session, setSession] = useState<WorkflowTeachSession | null>(null);
  const [conversation, setConversation] = useState<AionrsConversation | null>(null);
  const [draft, setDraft] = useState<WorkflowDraft>({});
  const draftTextRef = useRef('');
  const [starting, setStarting] = useState(false);
  const [deliver, setDeliver] = useState<DeliverState>(EMPTY_DELIVER);

  useEffect(() => {
    void readLibrary().then(setLibrary);
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
    const workflowMd = (await readText(`${session.relativeDir}/WORKFLOW.md`)) ?? '';
    setDeliver((prev) => (prev.workflowMd === workflowMd ? prev : { ...prev, workflowMd }));
  }, [session]);

  useEffect(() => {
    if (!session) return;
    void pollDraft();
    const timer = window.setInterval((): void => {
      void pollDraft();
    }, DRAFT_POLL_MS);
    return () => window.clearInterval(timer);
  }, [session, pollDraft]);

  const openSession = (next: WorkflowTeachSession) => {
    draftTextRef.current = '';
    setDraft({});
    setDeliver(EMPTY_DELIVER);
    setSession(next);
  };

  const backToLibrary = () => {
    setSession(null);
    setDraft({});
    void readLibrary().then(setLibrary);
  };

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

  const startSession = async (job: string) => {
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
      const initialDraft: WorkflowDraft = { schema: 'aviator.workflow-draft/v1', stage: 'job', job: { name: job } };
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
      const items = [next, ...(await readLibrary())];
      await writeLibrary(items);
      setLibrary(items);
      openSession(next);
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

  const handleSave = async () => {
    if (!session || !deliver.workflowMd) return;
    const dir = deliverDirOf(session);
    setDeliver((prev) => ({ ...prev, busy: true }));
    try {
      const { run: _run, files: _files, ...method } = draft;
      await Promise.all([
        writeText(`${dir}/WORKFLOW.md`, deliver.workflowMd),
        writeText(`${dir}/draft.json`, JSON.stringify(method, null, 2)),
        writeText(
          `${dir}/skill/SKILL.md`,
          skillFromWorkflow(skillNameOf(session), draft.job?.name ?? session.title, deliver.workflowMd)
        ),
      ]);
      setDeliver((prev) => ({ ...prev, saved: true }));
      Message.success('这份 SOP 已保存。');
    } finally {
      setDeliver((prev) => ({ ...prev, busy: false }));
    }
  };

  const handleCreateAssistant = async () => {
    if (!session) return;
    setDeliver((prev) => ({ ...prev, busy: true }));
    try {
      await ipcBridge.fs.importSkill.invoke({ skill_path: `${WORKFLOWS_ROOT}/${deliverDirOf(session)}/skill` });
      await ipcBridge.assistants.create.invoke({
        name: `${draft.job?.name ?? session.title}（测试）`,
        description: '由「创建工作流」教会的工作方法生成，用来验证新助手能照着做。',
        enabled_skills: [skillNameOf(session)],
      });
      setDeliver((prev) => ({ ...prev, assistantCreated: true }));
    } finally {
      setDeliver((prev) => ({ ...prev, busy: false }));
    }
  };

  if (!library) {
    return (
      <div className={styles.page}>
        <div className={styles.library}>正在打开……</div>
      </div>
    );
  }

  if (!session) {
    return (
      <WorkflowLibrary
        items={library}
        starting={starting}
        onOpen={openSession}
        onCreate={(job) => void startSession(job)}
      />
    );
  }

  return (
    <div className={styles.teach}>
      <main className={styles.chat}>
        <div className={styles.chatHead}>
          <Button size='small' type='text' onClick={backToLibrary}>
            ← 返回
          </Button>
          <span className={styles.chatTitle}>{draft.job?.name || session.title}</span>
          <span className={styles.guideHint}>想说话：点一下输入框，连按两下 Fn 开始听写，再按一下 Fn 结束</span>
        </div>
        <TeachGuide
          draft={draft}
          deliver={deliver}
          onVerdict={(id, verdict, correction) => void handleVerdict(id, verdict, correction)}
          onSave={() => void handleSave()}
          onCreateAssistant={() => void handleCreateAssistant()}
        />
        <div className={styles.chatBody}>
          {conversation ? (
            <TeachChat conversation={conversation} assistantId={session.assistantId} />
          ) : (
            <div className={styles.chatEmpty}>正在连接叶师傅……</div>
          )}
        </div>
      </main>
      <ResultPanel draft={draft} workflowMd={deliver.workflowMd} />
    </div>
  );
};

export default CreateWorkflowPage;
