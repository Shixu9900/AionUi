/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Message } from '@arco-design/web-react';
import { useNavigate } from 'react-router-dom';
import { ipcBridge } from '@/common';
import type { TChatConversation } from '@/common/config/storage';
import {
  KNOWLEDGE_KINDS,
  emptyKnowledgeFields,
  proposeKnowledgeItem,
  type KnowledgeFields,
  type KnowledgeItem,
  type KnowledgeKind,
} from '@/common/types/knowledgeBase';
import { useGuidModelSelection } from '@renderer/pages/guid/hooks/useGuidModelSelection';
import { fenceReply } from './fence';
import { KnowledgeChat } from './KnowledgeChat';
import { KnowledgeTree } from './KnowledgeTree';
import { readKnowledgeIndex, readKnowledgeText, writeKnowledgeIndex, writeKnowledgeText } from './knowledgeFiles';
import { buildKnowledgeTree, pruneUnfilled } from './treeModel';
import styles from './index.module.css';

const PROJECT_ID = 'knowledge-inbox';
const SKILL = 'knowledge-archive';
const SKILL_DIR = '/Users/9900macbook/Aviator-workspace/aviator/skills/knowledge-archive';
const ASSISTANT_NAME = '知识库整理';
const WORKSPACE = '/Users/9900macbook/Aviator-workspace/aviator/knowledge/workspace';

type AionrsConversation = Extract<TChatConversation, { type: 'aionrs' }>;
type SessionFile = { conversationId: string; assistantId: string };

const newId = () => `kb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const filenameOf = (filePath: string) => filePath.split(/[/\\]/).pop() || filePath;

const isKind = (value: string): value is KnowledgeKind => (KNOWLEDGE_KINDS as readonly string[]).includes(value);

const applyProposals = (items: KnowledgeItem[], text: string): KnowledgeItem[] | null => {
  if (!text) return null;
  let parsed: { items?: { kind?: string; source_path?: string; fields?: Record<string, string> }[] };
  try {
    parsed = JSON.parse(text) as typeof parsed;
  } catch {
    return null;
  }
  if (!Array.isArray(parsed.items)) return null;
  let next = items;
  let changed = false;
  for (const proposal of parsed.items) {
    if (!proposal.kind || !proposal.source_path || !isKind(proposal.kind)) continue;
    const fields = emptyKnowledgeFields(proposal.source_path);
    for (const key of Object.keys(fields) as (keyof KnowledgeFields)[]) {
      const value = proposal.fields?.[key];
      if (typeof value === 'string') fields[key] = value;
    }
    const existing = next.find((item) => item.source_path === proposal.source_path);
    if (existing) {
      next = next.map((item) =>
        item.id === existing.id ? { ...item, kind: proposal.kind as KnowledgeKind, fields, status: 'ready' } : item
      );
    } else {
      next = [
        {
          id: newId(),
          kind: proposal.kind,
          archived: false,
          status: 'ready',
          filename: filenameOf(proposal.source_path),
          source_path: proposal.source_path,
          doc_id: '',
          excerpt: '',
          fields,
          updated_at: new Date().toISOString(),
        },
        ...next,
      ];
    }
    changed = true;
  }
  return changed ? next : null;
};

const KnowledgePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { current_model } = useGuidModelSelection();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [showAll, setShowAll] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<AionrsConversation | null>(null);
  const [assistantId, setAssistantId] = useState('');
  const [notice, setNotice] = useState('');
  const [dragging, setDragging] = useState(false);
  const started = useRef(false);

  const [open, setOpen] = useState<Record<string, boolean>>({ root: true });
  const tree = useMemo(() => buildKnowledgeTree(items), [items]);
  const shown = useMemo(() => (showAll ? tree : pruneUnfilled(tree)) ?? tree, [showAll, tree]);

  useEffect(() => {
    void readKnowledgeIndex().then(setItems);
  }, []);

  const ensureSession = useCallback(async () => {
    if (!current_model) return;
    await ipcBridge.fs.importSkill.invoke({ skill_path: SKILL_DIR });
    await writeKnowledgeText(
      'workspace/STRUCTURE.md',
      [
        '结构已固定，不要改这个文件。识页只用本机 MinerU。',
        '五种记录：件号、适航指令、服务通告引用、手册节点、租赁条款。',
        '只写身份字段和路径，不写正文、序号、自新小时或自新循环。',
        '服务通告只记引用。租赁条款只记用户这次放入的那一份。',
        '民航、通航、直升机、固定翼是目录位置，不是另一套库。',
        '读不清的字段留空。',
        '',
      ].join('\n')
    );
    const saved = await readKnowledgeText('session.json');
    let session: SessionFile | null = null;
    if (saved) {
      try {
        session = JSON.parse(saved) as SessionFile;
      } catch {
        session = null;
      }
    }
    if (!session) {
      const list = await ipcBridge.assistants.list.invoke();
      const existing = list.find((assistant) => assistant.name === ASSISTANT_NAME);
      const id =
        existing?.id ??
        (
          await ipcBridge.assistants.create.invoke({
            name: ASSISTANT_NAME,
            description: '只把文件归进已经定好的知识库结构，不改底层架构和识页方式。',
            enabled_skills: [SKILL],
          })
        ).id;
      const created = await ipcBridge.conversation.create.invoke({
        name: '构建知识库',
        model: current_model,
        assistant: {
          id,
          locale: 'zh-CN',
          conversation_overrides: {
            model: current_model.use_model,
            permission: 'yolo',
            skill_ids: [SKILL],
          },
        },
        extra: { workspace: WORKSPACE, custom_workspace: true, default_files: [] },
      });
      if (!created?.id) return;
      session = { conversationId: created.id, assistantId: id };
      await writeKnowledgeText('session.json', JSON.stringify(session));
      sessionStorage.setItem(
        `aionrs_initial_message_${created.id}`,
        JSON.stringify({
          input: '请用一句话说明：你只能把文件归进已经定好的五种记录，不能改知识库的结构和识页方式。',
        })
      );
    }
    setAssistantId(session.assistantId);
    const loaded = await ipcBridge.conversation.get.invoke({ id: session.conversationId });
    if (loaded?.type === 'aionrs') setConversation(loaded);
  }, [current_model]);

  useEffect(() => {
    if (started.current || !current_model) return;
    started.current = true;
    void ensureSession();
  }, [current_model, ensureSession]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void readKnowledgeText('workspace/proposals.json').then((text) => {
        setItems((current) => {
          const next = applyProposals(current, text);
          if (!next) return current;
          void writeKnowledgeIndex(next);
          return next;
        });
      });
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

  const ingestPaths = async (paths: string[]) => {
    let next = items;
    for (const filePath of paths) {
      const id = newId();
      const filename = filenameOf(filePath);
      const waiting: KnowledgeItem = {
        id,
        kind: 'manual',
        archived: false,
        status: 'parsing',
        filename,
        source_path: filePath,
        doc_id: '',
        excerpt: '',
        fields: emptyKnowledgeFields(filePath),
        updated_at: new Date().toISOString(),
      };
      next = [waiting, ...next];
      setItems(next);
      try {
        const stored = await ipcBridge.documents.ingest.invoke({ project_id: PROJECT_ID, path: filePath });
        let progress = (await ipcBridge.documents.parse.invoke({ id: stored.doc_id })).progress;
        const settled = (value: { done: number; failed: number }) => value.done + value.failed;
        // Parsing runs in the background, a page at a time. The first page is
        // enough to propose a category, so wait for it rather than the whole file.
        for (
          let attempt = 0;
          attempt < 150 && settled(progress) < 1 && !progress.paused && progress.pending + progress.leased > 0;
          attempt++
        ) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          progress = await ipcBridge.documents.progress.invoke({ doc_id: stored.doc_id });
        }
        if (progress.paused) throw new Error(progress.paused);
        const blocks = await ipcBridge.documents.blocks.invoke({ id: stored.doc_id, page_no: 1 });
        const excerpt = blocks
          .map((block) => block.text)
          .filter(Boolean)
          .join('\n')
          .slice(0, 500);
        const proposed = proposeKnowledgeItem(filename, filePath, excerpt);
        next = next.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'ready' as const,
                doc_id: stored.doc_id,
                excerpt,
                kind: proposed.kind,
                fields: proposed.fields,
              }
            : item
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : t('guid.knowledge.parseFailed');
        next = next.map((item) => (item.id === id ? { ...item, status: 'doubtful' as const, excerpt: message } : item));
        Message.warning(`${filename}：${message}`);
      }
      setItems(next);
    }
    await writeKnowledgeIndex(next);
    if (conversation) {
      const refusal = fenceReply(paths.join('\n'));
      if (refusal) {
        setNotice(refusal);
        return;
      }
      await ipcBridge.conversation.sendMessage.invoke({
        conversation_id: conversation.id,
        input: `用户放入了这些文件，请只按 STRUCTURE.md 的五种记录提出归类，并写入 proposals.json。不要新增种类，不要改识页方式。\n${paths.join('\n')}`,
      });
    }
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const paths = Array.from(event.dataTransfer.files)
      .map((file) => (file as File & { path?: string }).path)
      .filter((filePath): filePath is string => Boolean(filePath));
    if (paths.length === 0) {
      Message.warning(t('guid.knowledge.dropNeedPath'));
      return;
    }
    void ingestPaths(paths);
  };

  return (
    <div className={styles.shell}>
      <div className={styles.homeBar}>
        <Button className={styles.homeButton} onClick={() => void navigate('/guid')}>
          {t('guid.knowledge.back')}
        </Button>
      </div>
      <div className={styles.body}>
        <KnowledgeTree
          root={shown}
          open={open}
          selectedId={selectedId}
          showAll={showAll}
          onShowAll={setShowAll}
          onToggle={(id) => setOpen((current) => ({ ...current, [id]: !(current[id] ?? false) }))}
          onSelect={(node) => {
            if (node.itemId) setSelectedId(node.itemId);
          }}
        />
        <main
          className={dragging ? styles.chatDragging : styles.chat}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <p className={styles.fence}>
            {notice || t('guid.knowledge.fence')}
          </p>
          <div className={styles.chatBody}>
            {conversation && assistantId ? (
              <KnowledgeChat conversation={conversation} assistantId={assistantId} />
            ) : (
              <div className={styles.chatEmpty}>{t('guid.knowledge.preparing')}</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default KnowledgePage;
