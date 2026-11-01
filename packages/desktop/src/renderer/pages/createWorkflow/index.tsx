/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Tag } from '@arco-design/web-react';
import classNames from 'classnames';
import yaml from 'js-yaml';
import { ipcBridge } from '@/common';
import type { CreateWorkflowCompileResult, CreateWorkflowStatus } from '@/common/types/createWorkflow';
import type { ElicitStance } from '@/common/types/recordsReview';
import styles from './index.module.css';

const WORKFLOW_REL = 'component-records-review';
const WORKFLOW_DIR = `/Users/9900macbook/Aviator-workspace/aviator/workflows/${WORKFLOW_REL}`;
const CASE_DIR = `${WORKFLOW_DIR}/cases/p7078`;
const SKILL_NAME = 'review-apu-llp';
const SKILL_DESCRIPTION =
  "Review an APU life-limited part's PN/SN, timeline and remaining life, and flag missing or suspicious records. Draft, not expert-confirmed.";
const VARIANT_NAMES = ['missing-8130', 'csn-regression', 'host-mismatch', 'hhmm-decimal', 'operator-change-no-ics'];

type StepId = 'case' | 'walk' | 'stance' | 'variant' | 'feedback' | 'deliver';

type DecisionRow = {
  id: string;
  question?: string;
  status?: string;
  expert_must_decide?: string;
  distractor?: string;
  gap?: string;
  stance?: ElicitStance;
  reason?: string;
};

type VariantRow = {
  id: string;
  question?: string;
  part?: string;
  expected?: Record<string, unknown>;
  note?: string;
};

type FeedbackRow = {
  decision_id: string;
  count: number;
  corrections?: Record<string, number>;
};

type PartRow = {
  id: string;
  part_number?: string;
  serial_number?: string;
  description?: string;
  total_csn?: number;
  total_tsn_hours?: number;
  remaining_cycles?: number;
  host_transfer?: boolean;
  operator_change?: boolean;
};

type CaseDoc = {
  cutoff_date?: string;
  life_limit_cycles?: number;
  parts?: PartRow[];
};

const STEPS: { id: StepId; title: string; hint: string }[] = [
  { id: 'case', title: '认识这个案例', hint: '先看清楚要审哪架飞机、哪几个件' },
  { id: 'walk', title: '讲一遍你的审法', hint: '像带徒弟一样，按顺序说你怎么审' },
  { id: 'stance', title: '逐条判断', hint: '对每个关键判断点说「对 / 不对 / 说不准」' },
  { id: 'variant', title: '换个情况考考它', hint: '把文件改一点，看结论该怎么变' },
  { id: 'feedback', title: '看看用户改了什么', hint: '一线用户在审件时修正过的地方' },
  { id: 'deliver', title: '生成并交付', hint: '把你的审法变成助手能用的工作方法' },
];

const PART_NAMES: Record<string, string> = {
  compressor: '压气机转子',
  stage1: '一级涡轮盘',
  stage2: '二级涡轮盘',
  shaft: '涡轮轴',
};

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  pending_expert: { text: '等你判断', color: 'orange' },
  expert_confirmed: { text: '你已确认', color: 'green' },
  escalate_to_human: { text: '交给人判断', color: 'purple' },
  documented_in_methodology: { text: '方法论里已有写法', color: 'arcoblue' },
  engine_verified: { text: '系统已核对一致', color: 'cyan' },
};

const STANCE_OPTIONS: { stance: ElicitStance; text: string; hint: string }[] = [
  { stance: 'agree', text: '对', hint: '就按这个判' },
  { stance: 'disagree', text: '不对', hint: '请写下正确判法' },
  { stance: 'unsure', text: '说不准', hint: '遇到要交给人看' },
];

const VALUE_LABELS: Record<string, string> = {
  true: '是',
  false: '否',
  pass: '通过',
  fail: '不通过',
  conditional: '有条件通过',
  same: '是同一个读数',
  missing_doc: '缺文件',
  required: '必须有',
};

const formatValue = (value: unknown): string => {
  const key = String(value);
  return VALUE_LABELS[key] ?? key;
};

const isDecided = (row: DecisionRow) => row.status !== 'pending_expert';

const CreateWorkflowPage: React.FC = () => {
  const [step, setStep] = useState<StepId>('case');
  const [visited, setVisited] = useState<Set<StepId>>(() => new Set(['case']));
  const [status, setStatus] = useState<CreateWorkflowStatus | null>(null);
  const [caseDoc, setCaseDoc] = useState<CaseDoc>({});
  const [walkthrough, setWalkthrough] = useState('');
  const [walkSaved, setWalkSaved] = useState(true);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [decisionIndex, setDecisionIndex] = useState(0);
  const [reasonDraft, setReasonDraft] = useState('');
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [compileResult, setCompileResult] = useState<CreateWorkflowCompileResult | null>(null);
  const [deployed, setDeployed] = useState(false);
  const [published, setPublished] = useState<boolean | null>(null);
  const [publishLog, setPublishLog] = useState('');
  const [assistantCreated, setAssistantCreated] = useState(false);
  const [busy, setBusy] = useState(false);

  const refreshStatus = useCallback(() => {
    void ipcBridge.createWorkflow.status.invoke({ workflowDir: WORKFLOW_DIR }).then(setStatus);
  }, []);

  const readYaml = useCallback(async <T,>(relativePath: string): Promise<T> => {
    const text = await ipcBridge.createWorkflow.readFile.invoke({ relativePath: `${WORKFLOW_REL}/${relativePath}` });
    return yaml.load(text) as T;
  }, []);

  useEffect(() => {
    refreshStatus();
    void readYaml<CaseDoc>('cases/p7078/expected.yaml').then(setCaseDoc);
    void ipcBridge.createWorkflow.readFile
      .invoke({ relativePath: `${WORKFLOW_REL}/cases/p7078/WALKTHROUGH.md` })
      .then(setWalkthrough);
    void readYaml<{ decisions?: DecisionRow[] }>('decisions.yaml').then((doc) => setDecisions(doc.decisions ?? []));
    void Promise.all(VARIANT_NAMES.map((name) => readYaml<VariantRow>(`cases/p7078/variants/${name}.yaml`))).then(
      setVariants
    );
    readYaml<{ by_decision?: FeedbackRow[] }>('feedback/summary.yaml')
      .then((doc) => setFeedback(doc.by_decision ?? []))
      .catch(() => setFeedback([]));
  }, [refreshStatus, readYaml]);

  const questionOf = useMemo(() => {
    const map = new Map(decisions.map((row) => [row.id, row.question ?? row.id]));
    return (id: string) => map.get(id) ?? id;
  }, [decisions]);

  const currentDecision = decisions[decisionIndex];
  useEffect(() => {
    setReasonDraft(currentDecision?.reason ?? '');
  }, [currentDecision?.id, currentDecision?.reason]);

  const decidedCount = decisions.filter(isDecided).length;
  const stepIndex = STEPS.findIndex((item) => item.id === step);

  const goTo = (next: StepId) => {
    setStep(next);
    setVisited((prev) => new Set(prev).add(next));
  };

  const isStepDone = (id: StepId): boolean => {
    switch (id) {
      case 'case':
      case 'variant':
      case 'feedback':
        return visited.has(id) && id !== step;
      case 'walk':
        return visited.has('walk') && walkSaved && walkthrough.trim().length > 0;
      case 'stance':
        return decisions.length > 0 && decidedCount === decisions.length;
      case 'deliver':
        return assistantCreated;
      default: {
        const exhaustive: never = id;
        return exhaustive;
      }
    }
  };

  const saveWalk = async () => {
    await ipcBridge.createWorkflow.writeFile.invoke({
      relativePath: `${WORKFLOW_REL}/cases/p7078/WALKTHROUGH.md`,
      data: walkthrough,
    });
    setWalkSaved(true);
  };

  const saveDecisions = async (next: DecisionRow[]) => {
    const doc = (await readYaml<Record<string, unknown>>('decisions.yaml')) ?? {};
    doc.decisions = next;
    await ipcBridge.createWorkflow.writeFile.invoke({
      relativePath: `${WORKFLOW_REL}/decisions.yaml`,
      data: yaml.dump(doc, { lineWidth: 120 }),
    });
    setDecisions(next);
    refreshStatus();
  };

  const handleStance = async (stance: ElicitStance) => {
    if (!currentDecision) return;
    const next = decisions.map((row) =>
      row.id === currentDecision.id
        ? {
            ...row,
            stance,
            reason: reasonDraft,
            status: stance === 'unsure' ? 'escalate_to_human' : 'expert_confirmed',
          }
        : row
    );
    await saveDecisions(next);
    if (stance !== 'disagree' && decisionIndex < decisions.length - 1) setDecisionIndex(decisionIndex + 1);
  };

  const runBusy = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } finally {
      setBusy(false);
    }
  };

  const handleCompile = () =>
    runBusy(async () => {
      const result = await ipcBridge.createWorkflow.compile.invoke({
        workflowDir: WORKFLOW_DIR,
        caseDir: CASE_DIR,
        skillName: SKILL_NAME,
        description: SKILL_DESCRIPTION,
      });
      setCompileResult(result);
      setDeployed(false);
      refreshStatus();
    });

  const handleDeploy = () =>
    runBusy(async () => {
      if (!compileResult?.ok) return;
      await ipcBridge.fs.importSkill.invoke({ skill_path: compileResult.skillDir });
      setDeployed(true);
    });

  const handlePublish = () =>
    runBusy(async () => {
      const result = await ipcBridge.createWorkflow.publish.invoke({
        workflowDir: WORKFLOW_DIR,
        version: 'v0.1',
        allowPendingP0: true,
      });
      setPublished(result.ok);
      setPublishLog(result.log + (result.error ? `\n${result.error}` : ''));
    });

  const handleCreateAssistant = () =>
    runBusy(async () => {
      await ipcBridge.assistants.create.invoke({
        name: `创建工作流 · APU 寿命件审查（测试 ${new Date().toLocaleTimeString('zh-CN')}）`,
        description: `由「创建工作流」生成的 APU 寿命件审查方法。`,
        enabled_skills: [SKILL_NAME],
      });
      setAssistantCreated(true);
    });

  const renderCase = () => (
    <>
      <p className={styles.lead}>
        这次要整理的是 <b>APU 寿命件履历审查</b>。我们拿一架真实飞机 <b>P-7078</b> 的 APU 做样板：
        它装着 4 个有循环寿命限制的件，每个件的履历情况都不一样，正好覆盖常见的几种审法。
      </p>
      <div className={styles.factRow}>
        <div className={styles.fact}>
          <div className={styles.factLabel}>审查截止日期</div>
          <div className={styles.factValue}>{caseDoc.cutoff_date ?? '—'}</div>
        </div>
        <div className={styles.fact}>
          <div className={styles.factLabel}>循环寿命限制</div>
          <div className={styles.factValue}>{caseDoc.life_limit_cycles?.toLocaleString() ?? '—'} 循环</div>
        </div>
        <div className={styles.fact}>
          <div className={styles.factLabel}>寿命件数量</div>
          <div className={styles.factValue}>{caseDoc.parts?.length ?? '—'} 个</div>
        </div>
      </div>
      <div className={styles.partGrid}>
        {(caseDoc.parts ?? []).map((part) => (
          <div key={part.id} className={styles.partCard}>
            <div className={styles.partTitle}>{PART_NAMES[part.id] ?? part.description}</div>
            <div className={styles.partMeta}>
              件号 {part.part_number} · 序号 {part.serial_number}
            </div>
            <div className={styles.partNumbers}>
              <span>
                总循环 <b>{part.total_csn?.toLocaleString()}</b>
              </span>
              <span>
                总小时 <b>{part.total_tsn_hours?.toLocaleString()}</b>
              </span>
              <span>
                剩余 <b>{part.remaining_cycles?.toLocaleString()}</b>
              </span>
            </div>
            <div className={styles.partTags}>
              {part.host_transfer ? <Tag color='orange'>换过飞机</Tag> : <Tag>一直在本机</Tag>}
              {part.operator_change ? <Tag color='red'>换过运营商</Tag> : null}
            </div>
          </div>
        ))}
      </div>
      <p className={styles.note}>
        上面的数字是按方法论算出的参考答案。接下来你要做的，是把「为什么是这个数、怎么判出来的」讲清楚，
        让助手以后遇到别的飞机也能照着审。
      </p>
    </>
  );

  const renderWalk = () => (
    <>
      <p className={styles.lead}>
        假设你在带一位新来的工程师。请按你实际的顺序，一步一步写下你会先看哪份文件、看哪个数、怎么算、哪里容易看错。
      </p>
      <ul className={styles.tips}>
        <li>先从最复杂的件说起（例如换过飞机的二级涡轮盘），再说简单的。</li>
        <li>遇到「这里很多人会看错」的地方，一定写出来，这是最有价值的部分。</li>
        <li>不用写得工整，口语就行。这份提纲只留作你的审法记录，不会原样发给用户。</li>
      </ul>
      <Input.TextArea
        className={styles.bigText}
        autoSize={{ minRows: 14, maxRows: 30 }}
        value={walkthrough}
        onChange={(value) => {
          setWalkthrough(value);
          setWalkSaved(false);
        }}
      />
      <div className='flex items-center gap-12px mt-12px'>
        <Button type='primary' size='large' disabled={walkSaved} onClick={() => void saveWalk()}>
          保存审法
        </Button>
        <span className={styles.note}>{walkSaved ? '已保存' : '有改动还没保存'}</span>
      </div>
    </>
  );

  const renderStance = () => {
    if (!currentDecision) return <p className={styles.lead}>正在读取判断点…</p>;
    const label = STATUS_LABELS[currentDecision.status ?? ''] ?? { text: currentDecision.status ?? '', color: 'gray' };
    return (
      <>
        <p className={styles.lead}>
          审一个寿命件，需要做 {decisions.length} 个关键判断。请逐条告诉系统你的判法。已完成{' '}
          <b>
            {decidedCount} / {decisions.length}
          </b>
          。
        </p>
        <div className={styles.dotRow}>
          {decisions.map((row, index) => (
            <button
              key={row.id}
              type='button'
              title={row.question}
              className={classNames(styles.dot, {
                [styles.dotDone]: isDecided(row),
                [styles.dotCurrent]: index === decisionIndex,
              })}
              onClick={() => setDecisionIndex(index)}
            >
              {index + 1}
            </button>
          ))}
        </div>
        <div className={styles.questionCard}>
          <div className='flex items-center gap-8px'>
            <span className={styles.questionIndex}>第 {decisionIndex + 1} 题</span>
            <Tag color={label.color}>{label.text}</Tag>
          </div>
          <div className={styles.questionText}>{currentDecision.question}</div>
          {currentDecision.expert_must_decide && (
            <div className={styles.questionBlock}>
              <div className={styles.blockLabel}>需要你拍板的是</div>
              <div>{currentDecision.expert_must_decide}</div>
            </div>
          )}
          {currentDecision.distractor && (
            <div className={styles.questionBlock}>
              <div className={styles.blockLabel}>常见的错误看法</div>
              <div>{currentDecision.distractor}</div>
            </div>
          )}
          {currentDecision.gap && (
            <div className={styles.questionBlock}>
              <div className={styles.blockLabel}>系统目前的做法和规则不一致</div>
              <div>{currentDecision.gap}</div>
            </div>
          )}
          <Input.TextArea
            className='mt-16px'
            autoSize={{ minRows: 2, maxRows: 6 }}
            placeholder='写一句理由：为什么对、哪里不对，或什么情况下说不准'
            value={reasonDraft}
            onChange={setReasonDraft}
          />
          <div className={styles.stanceRow}>
            {STANCE_OPTIONS.map((option) => (
              <button
                key={option.stance}
                type='button'
                className={classNames(styles.stanceButton, {
                  [styles.stanceActive]: currentDecision.stance === option.stance,
                })}
                onClick={() => void handleStance(option.stance)}
              >
                <span className={styles.stanceText}>{option.text}</span>
                <span className={styles.stanceHint}>{option.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <div className='flex justify-between mt-12px'>
          <Button disabled={decisionIndex === 0} onClick={() => setDecisionIndex(decisionIndex - 1)}>
            上一题
          </Button>
          <Button
            disabled={decisionIndex >= decisions.length - 1}
            onClick={() => setDecisionIndex(decisionIndex + 1)}
          >
            下一题
          </Button>
        </div>
      </>
    );
  };

  const renderVariant = () => (
    <>
      <p className={styles.lead}>
        只会审一种情况不够。下面每一条都是把 P-7078 的文件「改动一点」后的情形，请确认每种情形下的正确结论。
        助手以后会被这些题目反复考核。
      </p>
      <div className='flex flex-col gap-12px'>
        {variants.map((row, index) => (
          <div key={row.id} className={styles.variantCard}>
            <div className={styles.variantHead}>
              <span className={styles.questionIndex}>情形 {index + 1}</span>
              {row.part ? <Tag>{PART_NAMES[row.part] ?? row.part}</Tag> : null}
            </div>
            <div className={styles.questionText}>{row.question}</div>
            <div className={styles.answerList}>
              {Object.entries(row.expected ?? {}).map(([key, value]) => (
                <div key={key} className={styles.answerRow}>
                  <span className={styles.answerKey}>
                    {key === 'verdict' ? '最终结论' : key === 'escalate_to_human' ? '是否交给人判断' : questionOf(key)}
                  </span>
                  <span className={styles.answerValue}>{formatValue(value)}</span>
                </div>
              ))}
            </div>
            {row.note && <div className={styles.note}>依据：{row.note}</div>}
          </div>
        ))}
      </div>
    </>
  );

  const renderFeedback = () => (
    <>
      <p className={styles.lead}>
        一线用户在审件面板里点「确认」或「修改」，系统只记录「哪个判断点被改成了什么」，不带走任何用户文件。
        被改得多的地方，说明审法需要你再看一眼。
      </p>
      {feedback.length === 0 ? (
        <div className={styles.empty}>目前还没有用户修改记录。</div>
      ) : (
        <div className='flex flex-col gap-12px'>
          {feedback.map((row) => (
            <div key={row.decision_id} className={styles.variantCard}>
              <div className={styles.questionText}>{questionOf(row.decision_id)}</div>
              <div className={styles.note}>用户修改了 {row.count} 次</div>
              <div className={styles.answerList}>
                {Object.entries(row.corrections ?? {}).map(([change, times]) => {
                  const [from, to] = change.split('->');
                  return (
                    <div key={change} className={styles.answerRow}>
                      <span className={styles.answerKey}>
                        系统给的 {from} → 用户改成 {to}
                      </span>
                      <span className={styles.answerValue}>{times} 次</span>
                    </div>
                  );
                })}
              </div>
              <Button
                className='mt-10px'
                onClick={() => {
                  const index = decisions.findIndex((d) => d.id === row.decision_id);
                  if (index >= 0) setDecisionIndex(index);
                  goTo('stance');
                }}
              >
                回到这条判断点重新表态
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const deliverItems: {
    title: string;
    desc: string;
    action: string;
    done: boolean;
    disabled?: boolean;
    onClick: () => void;
    result?: React.ReactNode;
  }[] = [
    {
      title: '整理成助手的工作方法',
      desc: '把你的审法和判断整理成一份说明，只保留方法和规则，自动去掉这架飞机的件号、序号等具体信息。',
      action: '开始整理',
      done: Boolean(compileResult?.ok),
      onClick: () => void handleCompile(),
      result: compileResult ? (
        compileResult.ok ? (
          <span>
            整理出 {compileResult.methodCount} 条判断方法、{compileResult.pitfallCount} 条易错提醒、
            {compileResult.escalateCount} 条需交人判断的情形；已检查 {compileResult.forbiddenTokenCount}{' '}
            项具体飞机信息，没有一项被带进去。
          </span>
        ) : (
          <span className={styles.error}>没有整理成功：{compileResult.error}</span>
        )
      ) : undefined,
    },
    {
      title: '放进技能库',
      desc: '放进去之后，任何助手都可以选用这套审法。',
      action: '放进技能库',
      done: deployed,
      disabled: !compileResult?.ok,
      onClick: () => void handleDeploy(),
    },
    {
      title: '存档一个版本给研究员',
      desc: '把这次的审法、参考答案和考题打包存档为 v0.1，研究员可以拿去做评测。',
      action: '存档 v0.1',
      done: published === true,
      onClick: () => void handlePublish(),
      result:
        published === false ? <span className={styles.error}>存档没有成功，请把下方记录发给技术同事。</span> : undefined,
    },
    {
      title: '建一个测试助手试试看',
      desc: '新建一个只装了这套审法的助手，用它审一遍，看是不是和你审的一样。',
      action: '新建测试助手',
      done: assistantCreated,
      disabled: !deployed,
      onClick: () => void handleCreateAssistant(),
      result: assistantCreated ? <span>已建好，可以在左侧「助手」里找到它。</span> : undefined,
    },
  ];

  const renderDeliver = () => (
    <>
      <p className={styles.lead}>最后四步，按顺序点就可以。每一步完成后会打勾。</p>
      <div className='flex flex-col gap-12px'>
        {deliverItems.map((item, index) => (
          <div key={item.title} className={styles.deliverCard}>
            <div className={classNames(styles.deliverNo, { [styles.deliverNoDone]: item.done })}>
              {item.done ? '✓' : index + 1}
            </div>
            <div className='flex-1 min-w-0'>
              <div className={styles.questionText}>{item.title}</div>
              <div className={styles.note}>{item.desc}</div>
              {item.result && <div className={styles.deliverResult}>{item.result}</div>}
            </div>
            <Button
              type={item.done ? 'secondary' : 'primary'}
              size='large'
              loading={busy}
              disabled={item.disabled}
              onClick={item.onClick}
            >
              {item.done ? '再做一次' : item.action}
            </Button>
          </div>
        ))}
      </div>
      {publishLog && (
        <details className='mt-16px'>
          <summary className={styles.note}>技术记录（给技术同事看）</summary>
          <pre className={styles.log}>{publishLog}</pre>
        </details>
      )}
    </>
  );

  const renderStep = () => {
    switch (step) {
      case 'case':
        return renderCase();
      case 'walk':
        return renderWalk();
      case 'stance':
        return renderStance();
      case 'variant':
        return renderVariant();
      case 'feedback':
        return renderFeedback();
      case 'deliver':
        return renderDeliver();
      default: {
        const exhaustive: never = step;
        return exhaustive;
      }
    }
  };

  const current = STEPS[stepIndex];

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className='flex items-center gap-10px'>
            <h1 className={styles.title}>创建工作流</h1>
            <Tag color='orange'>管理团队专用</Tag>
          </div>
          <p className={styles.subtitle}>
            把资深专家的审件经验，一步步整理成助手可以照着做的工作方法。当前工作流：APU 寿命件履历审查
            {status ? ` · 还有 ${status.pendingExpertCount} 个判断点等你表态` : ''}
          </p>
        </header>

        <div className={styles.body}>
          <nav className={styles.stepper}>
            {STEPS.map((item, index) => {
              const done = isStepDone(item.id);
              return (
                <button
                  key={item.id}
                  type='button'
                  className={classNames(styles.stepItem, { [styles.stepActive]: item.id === step })}
                  onClick={() => goTo(item.id)}
                >
                  <span className={classNames(styles.stepNo, { [styles.stepNoDone]: done })}>
                    {done ? '✓' : index + 1}
                  </span>
                  <span className='flex flex-col min-w-0 text-left'>
                    <span className={styles.stepTitle}>{item.title}</span>
                    <span className={styles.stepHint}>{item.hint}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <main className={styles.main}>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressBar}
                style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
              />
            </div>
            <div className={styles.stepLabel}>
              第 {stepIndex + 1} 步，共 {STEPS.length} 步
            </div>
            <h2 className={styles.stepHeading}>{current.title}</h2>
            <div className={styles.content}>{renderStep()}</div>
            <footer className={styles.footer}>
              <Button size='large' disabled={stepIndex === 0} onClick={() => goTo(STEPS[stepIndex - 1].id)}>
                上一步
              </Button>
              {stepIndex < STEPS.length - 1 && (
                <Button type='primary' size='large' onClick={() => goTo(STEPS[stepIndex + 1].id)}>
                  下一步：{STEPS[stepIndex + 1].title}
                </Button>
              )}
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
};

export default CreateWorkflowPage;
