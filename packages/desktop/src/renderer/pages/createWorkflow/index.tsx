/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Input, Tag } from '@arco-design/web-react';
import yaml from 'js-yaml';
import { ipcBridge } from '@/common';
import type { CreateWorkflowCompileResult, CreateWorkflowStatus } from '@/common/types/createWorkflow';
import type { ElicitStance } from '@/common/types/recordsReview';
import { ElicitBar } from '@renderer/pages/conversation/recordsReview/ElicitBar';

const WORKFLOW_REL = 'component-records-review';
const WORKFLOW_DIR = `/Users/9900macbook/Aviator-workspace/aviator/workflows/${WORKFLOW_REL}`;
const CASE_DIR = `${WORKFLOW_DIR}/cases/p7078`;
const SKILL_NAME = 'review-apu-llp';
const SKILL_DESCRIPTION =
  "Review an APU life-limited part's PN/SN, timeline and remaining life, and flag missing or suspicious records. Draft, not expert-confirmed.";

type Tab = 'walk' | 'stance' | 'variant' | 'inbox' | 'publish';

type DecisionRow = {
  id: string;
  question?: string;
  status?: string;
  expert_must_decide?: string;
  stance?: ElicitStance;
  reason?: string;
};

type VariantRow = {
  id: string;
  question?: string;
  expected?: unknown;
  label_grade?: string;
};

type InboxRow = {
  decision_id: string;
  count: number;
  corrections?: Record<string, number>;
};

const TABS: { id: Tab; label: string }[] = [
  { id: 'walk', label: '走一遍' },
  { id: 'stance', label: '表态' },
  { id: 'variant', label: '改题' },
  { id: 'inbox', label: '待裁决' },
  { id: 'publish', label: '发布' },
];

const CreateWorkflowPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('walk');
  const [status, setStatus] = useState<CreateWorkflowStatus | null>(null);
  const [walkthrough, setWalkthrough] = useState('');
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [inbox, setInbox] = useState<InboxRow[]>([]);
  const [compileResult, setCompileResult] = useState<CreateWorkflowCompileResult | null>(null);
  const [publishLog, setPublishLog] = useState('');
  const [busy, setBusy] = useState(false);

  const refreshStatus = useCallback(() => {
    void ipcBridge.createWorkflow.status.invoke({ workflowDir: WORKFLOW_DIR }).then(setStatus);
  }, []);

  const loadWalk = useCallback(async () => {
    const text = await ipcBridge.createWorkflow.readFile.invoke({
      relativePath: `${WORKFLOW_REL}/cases/p7078/WALKTHROUGH.md`,
    });
    setWalkthrough(text);
  }, []);

  const loadDecisions = useCallback(async () => {
    const text = await ipcBridge.createWorkflow.readFile.invoke({ relativePath: `${WORKFLOW_REL}/decisions.yaml` });
    const doc = yaml.load(text) as { decisions?: DecisionRow[] };
    setDecisions(doc.decisions ?? []);
  }, []);

  const loadVariants = useCallback(async () => {
    const names = ['missing-8130', 'csn-regression', 'host-mismatch', 'hhmm-decimal', 'operator-change-no-ics'];
    const texts = await Promise.all(
      names.map((name) =>
        ipcBridge.createWorkflow.readFile.invoke({
          relativePath: `${WORKFLOW_REL}/cases/p7078/variants/${name}.yaml`,
        })
      )
    );
    setVariants(texts.map((text) => yaml.load(text) as VariantRow));
  }, []);

  const loadInbox = useCallback(async () => {
    try {
      const text = await ipcBridge.createWorkflow.readFile.invoke({ relativePath: `${WORKFLOW_REL}/feedback/summary.yaml` });
      const doc = yaml.load(text) as { by_decision?: InboxRow[] };
      setInbox(doc.by_decision ?? []);
    } catch {
      setInbox([]);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    void loadWalk();
    void loadDecisions();
    void loadVariants();
    void loadInbox();
  }, [refreshStatus, loadWalk, loadDecisions, loadVariants, loadInbox]);

  const saveWalk = async () => {
    await ipcBridge.createWorkflow.writeFile.invoke({
      relativePath: `${WORKFLOW_REL}/cases/p7078/WALKTHROUGH.md`,
      data: walkthrough,
    });
  };

  const saveDecisions = async (next: DecisionRow[]) => {
    const text = await ipcBridge.createWorkflow.readFile.invoke({ relativePath: `${WORKFLOW_REL}/decisions.yaml` });
    const doc = (yaml.load(text) as Record<string, unknown>) ?? {};
    doc.decisions = next;
    await ipcBridge.createWorkflow.writeFile.invoke({
      relativePath: `${WORKFLOW_REL}/decisions.yaml`,
      data: yaml.dump(doc, { lineWidth: 120 }),
    });
    setDecisions(next);
  };

  const handleStance = (id: string, stance: ElicitStance, reason: string) => {
    const next = decisions.map((row) =>
      row.id === id
        ? {
            ...row,
            stance,
            reason,
            status: stance === 'unsure' ? 'escalate_to_human' : 'expert_confirmed',
          }
        : row
    );
    void saveDecisions(next);
  };

  const handleCompile = async () => {
    setBusy(true);
    try {
      const result = await ipcBridge.createWorkflow.compile.invoke({
        workflowDir: WORKFLOW_DIR,
        caseDir: CASE_DIR,
        skillName: SKILL_NAME,
        description: SKILL_DESCRIPTION,
      });
      setCompileResult(result);
      refreshStatus();
    } finally {
      setBusy(false);
    }
  };

  const handleDeploy = async () => {
    if (!compileResult?.ok) return;
    setBusy(true);
    try {
      await ipcBridge.fs.importSkill.invoke({ skill_path: compileResult.skillDir });
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async () => {
    setBusy(true);
    try {
      const result = await ipcBridge.createWorkflow.publish.invoke({
        workflowDir: WORKFLOW_DIR,
        version: 'v0.1',
        allowPendingP0: true,
      });
      setPublishLog(result.log + (result.error ? `\n${result.error}` : ''));
    } finally {
      setBusy(false);
    }
  };

  const handleCreateAssistant = async () => {
    setBusy(true);
    try {
      await ipcBridge.assistants.create.invoke({
        name: `创建工作流 · APU 寿命件审查（测试 ${new Date().toLocaleTimeString('zh-CN')}）`,
        description: `由 create-workflow 编译的 ${SKILL_NAME} skill 自动生成。`,
        enabled_skills: [SKILL_NAME],
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className='h-full overflow-y-auto px-24px py-20px max-w-860px mx-auto'>
      <div className='flex items-center gap-8px mb-4px'>
        <h1 className='text-20px font-700 text-t-primary m-0'>创建工作流</h1>
        <Tag color='orange'>管理团队专用</Tag>
      </div>
      <p className='text-13px text-t-secondary mb-16px'>
        {status?.workflowName ?? WORKFLOW_REL} · 决策点 {status?.decisionCount ?? '—'} · 待专家 {status?.pendingExpertCount ?? '—'}
      </p>
      <div className='flex gap-4px mb-16px'>
        {TABS.map((item) => (
          <button
            key={item.id}
            type='button'
            className='px-10px py-6px text-12px rd-6px border-none cursor-pointer'
            style={{
              background: tab === item.id ? 'var(--bg-3)' : 'transparent',
              color: tab === item.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: tab === item.id ? 600 : 400,
            }}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'walk' && (
        <section>
          <p className='text-12px text-t-secondary mb-8px'>按四个寿命件把审法写下来。这份提纲会写回 WALKTHROUGH.md，不进审件 skill。</p>
          <Input.TextArea autoSize={{ minRows: 16, maxRows: 28 }} value={walkthrough} onChange={setWalkthrough} />
          <Button className='mt-10px' type='primary' onClick={() => void saveWalk()}>
            保存走一遍
          </Button>
        </section>
      )}

      {tab === 'stance' && (
        <section className='flex flex-col gap-10px'>
          {decisions.map((row) => (
            <div key={row.id} className='bg-2 rd-8px px-12px py-10px'>
              <div className='text-12px font-600 text-t-primary'>{row.question}</div>
              <div className='text-11px text-t-tertiary mt-2px'>
                {row.id} · {row.status}
              </div>
              <div className='text-12px text-t-secondary mt-4px'>{row.expert_must_decide}</div>
              <ElicitBar
                current={
                  row.stance
                    ? { target: 'check', id: row.id, stance: row.stance, reason: row.reason ?? '', at: '' }
                    : undefined
                }
                onChoose={(stance, reason) => handleStance(row.id, stance, reason)}
              />
            </div>
          ))}
        </section>
      )}

      {tab === 'variant' && (
        <section className='flex flex-col gap-10px'>
          {variants.map((row) => (
            <div key={row.id} className='bg-2 rd-8px px-12px py-10px'>
              <div className='text-12px font-600 text-t-primary'>{row.question}</div>
              <div className='text-11px text-t-tertiary mt-2px'>
                {row.id} · {row.label_grade}
              </div>
              <pre className='text-11px text-t-secondary mt-6px whitespace-pre-wrap'>{JSON.stringify(row.expected, null, 2)}</pre>
            </div>
          ))}
        </section>
      )}

      {tab === 'inbox' && (
        <section>
          {inbox.length === 0 ? (
            <p className='text-12px text-t-secondary'>还没有用户反馈。普通面板的「确认 / 修改」会写到 records-review.feedback.json，聚合后出现在这里。</p>
          ) : (
            inbox.map((row) => (
              <div key={row.decision_id} className='bg-2 rd-8px px-12px py-10px mb-8px'>
                <div className='text-12px font-600'>{row.decision_id}</div>
                <div className='text-11px text-t-secondary'>被改 {row.count} 次</div>
              </div>
            ))
          )}
        </section>
      )}

      {tab === 'publish' && (
        <section className='flex flex-col gap-10px'>
          <Button type='primary' loading={busy} onClick={() => void handleCompile()}>
            编译 SKILL.md
          </Button>
          {compileResult && (
            <div className='text-12px text-t-secondary bg-2 rd-6px px-12px py-10px'>
              {compileResult.ok
                ? `判断规则 ${compileResult.methodCount} · 误判 ${compileResult.pitfallCount} · 转人工 ${compileResult.escalateCount} · 泄露 0/${compileResult.forbiddenTokenCount}`
                : compileResult.error}
            </div>
          )}
          <Button disabled={!compileResult?.ok} loading={busy} onClick={() => void handleDeploy()}>
            部署到技能库
          </Button>
          <Button loading={busy} onClick={() => void handlePublish()}>
            发布 v0.1
          </Button>
          {publishLog && <pre className='text-11px text-t-secondary whitespace-pre-wrap'>{publishLog}</pre>}
          <Button loading={busy} onClick={() => void handleCreateAssistant()}>
            创建测试助手
          </Button>
        </section>
      )}
    </div>
  );
};

export default CreateWorkflowPage;
