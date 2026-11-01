/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * "创建工作流" compiler, run in the main process so it can read/write the
 * Aviator-workspace workflow drafts directly by absolute path (they live
 * outside any project sandbox, in the private `aviator` repo).
 *
 * This is a TypeScript port of `aviator/scripts/workflow/compile_skill.py`,
 * kept deliberately small and independent of Python so the desktop app
 * never has to locate or invoke a Python interpreter. The two stay in sync
 * by hand for now; the CLI script remains the reference implementation and
 * is what batch/CI runs should use.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import type {
  CreateWorkflowCompileRequest,
  CreateWorkflowCompileResult,
  CreateWorkflowFileRequest,
  CreateWorkflowPublishRequest,
  CreateWorkflowPublishResult,
  CreateWorkflowStatus,
  CreateWorkflowWriteRequest,
} from '@/common/types/createWorkflow';

const execFileAsync = promisify(execFile);

const WORKFLOWS_ROOT = path.resolve(
  process.env.AVIATOR_WORKSPACE || '/Users/9900macbook/Aviator-workspace/aviator',
  'workflows'
);
const SCRIPTS_DIR = path.resolve(
  process.env.AVIATOR_WORKSPACE || '/Users/9900macbook/Aviator-workspace/aviator',
  'scripts/workflow'
);

function resolveWorkflowPath(relativePath: string): string {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new Error('workflow file path must be relative');
  }
  const abs = path.resolve(WORKFLOWS_ROOT, relativePath);
  const rel = path.relative(WORKFLOWS_ROOT, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('workflow file path is outside workflows/');
  }
  return abs;
}

// Case-bound decisions (ones carrying a literal `expected` or `engine_result`)
// are case validation entries, not general method — they are compiled out of
// the skill body and their literal values feed the leak check instead.
const CASE_BOUND_MARKERS = ['expected', 'engine_result'];

// Only these keys may contribute a forbidden token for the leak check.
// Structural fields (page, bbox, criticality, id, status, question text)
// are not identity and would otherwise flag generic method numbers that
// happen to coincide with an unrelated page number or bbox coordinate.
const IDENTITY_KEYS = new Set([
  'part_number',
  'serial_number',
  'host_serial',
  'esn',
  'file',
  'workbook',
  'title',
  'description',
  'raw',
  'normalized',
  'expected_csn',
  'expected_tsn_hours',
  'distractor_csn',
  'distractor',
  'expected',
  'csn',
  'tsn',
  'remaining_cycles',
  'stints',
]);

type JsonLike = string | number | boolean | null | JsonLike[] | { [key: string]: JsonLike };

type Decision = Record<string, JsonLike> & { id?: string; question?: string; expert_must_decide?: string; gap?: string; distractor?: JsonLike; status?: string };

interface DecisionsDoc {
  decisions?: Decision[];
}

interface RubricDoc {
  escalate_to_human?: { when?: JsonLike[] };
}

async function readYaml<T>(filePath: string): Promise<T | undefined> {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    return yaml.load(text) as T;
  } catch {
    return undefined;
  }
}

function isCaseBound(decision: Decision): boolean {
  return CASE_BOUND_MARKERS.some((key) => key in decision);
}

function workflowSections(workflowMd: string): { scope: string; steps: string[] } {
  const scopeLines: string[] = [];
  const steps: string[] = [];
  let section: 'scope' | 'steps' | null = null;
  for (const rawLine of workflowMd.split('\n')) {
    const line = rawLine.trimEnd();
    if (line.startsWith('## 输入的文件族')) {
      section = 'scope';
      continue;
    }
    if (line.startsWith('## 步骤')) {
      section = 'steps';
      continue;
    }
    if (line.startsWith('## ') && (section === 'scope' || section === 'steps')) {
      section = null;
      continue;
    }
    if (section === 'scope' && line.trim()) {
      scopeLines.push(line.trim());
    }
    if (section === 'steps') {
      const match = /^\d+\.\s+(.*)/.exec(line.trim());
      if (match) steps.push(match[1]);
    }
  }
  return { scope: scopeLines.join('\n'), steps };
}

function methodLines(decisions: Decision[]): string[] {
  const lines: string[] = [];
  for (const decision of decisions) {
    if (isCaseBound(decision)) continue;
    const rule = decision.expert_must_decide;
    if (!rule) continue;
    let line = `- **${decision.question}** -- ${rule}`;
    if (decision.gap) line += `（已知偏差：${decision.gap}）`;
    lines.push(line);
  }
  return lines;
}

function pitfallLines(decisions: Decision[]): string[] {
  const lines: string[] = [];
  for (const decision of decisions) {
    if (isCaseBound(decision)) continue;
    if (typeof decision.distractor === 'string') {
      lines.push(`- ${decision.question} 的常见误判：${decision.distractor}`);
    }
  }
  return lines;
}

function escalateLines(rubric: RubricDoc | undefined): string[] {
  const when = rubric?.escalate_to_human?.when ?? [];
  const labels: Record<string, string> = {
    weak_parse: '页面解析质量差，读不清楚的字段',
    expert_adjudication: '评分方式标为 expert_adjudication 的决策点，没有把握时',
  };
  const lines: string[] = [];
  for (const item of when) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const answer = (item as Record<string, JsonLike>).answer;
      lines.push(`- 你自己对这一项${typeof answer === 'string' ? answer : '说不准'}`);
      continue;
    }
    const key = String(item);
    lines.push(`- ${labels[key] ?? key}`);
  }
  return lines;
}

function collectForbiddenTokens(node: JsonLike, tokens: Set<string>, key: string | null = null): void {
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    for (const [childKey, value] of Object.entries(node)) {
      collectForbiddenTokens(value, tokens, childKey);
    }
    return;
  }
  if (Array.isArray(node)) {
    for (const value of node) collectForbiddenTokens(value, tokens, key);
    return;
  }
  if (!key || !IDENTITY_KEYS.has(key)) return;
  if (typeof node === 'string' && node.length >= 3 && !node.startsWith('http')) {
    tokens.add(node);
  } else if (typeof node === 'number' && node !== 0) {
    tokens.add(String(node));
    if (Number.isInteger(node)) tokens.add(node.toLocaleString('en-US'));
  }
}

function buildSkillText(params: { skillName: string; description: string; scope: string; steps: string[]; methods: string[]; pitfalls: string[]; escalate: string[] }): string {
  const { skillName, description, scope, steps, methods, pitfalls, escalate } = params;
  const frontmatter = `---\nname: ${skillName}\ndescription: ${description}\n---\n`;
  const body: string[] = [`# ${skillName}`, ''];
  body.push('## 适用范围', scope || '（workflow.md 未写明范围）', '');
  body.push('## 步骤', ...steps.map((step, i) => `${i + 1}. ${step}`), '');
  body.push('## 判断规则', '每条规则只写方法，不写具体案例的数值。', ...(methods.length ? methods : ['（尚无已编译的判断规则）']), '');
  body.push('## 停下来问人', ...(escalate.length ? escalate : ['（rubric.yaml 未定义转人工条件）']), '');
  body.push('## 常见误判', ...(pitfalls.length ? pitfalls : ['（尚无已编译的误判清单）']), '');
  return `${frontmatter}\n${body.join('\n')}\n`;
}

export function createCreateWorkflowService() {
  return {
    async status({ workflowDir }: { workflowDir: string }): Promise<CreateWorkflowStatus> {
      const decisionsDoc = (await readYaml<DecisionsDoc>(path.join(workflowDir, 'decisions.yaml'))) ?? {};
      const decisions = decisionsDoc.decisions ?? [];
      let skillCompiledAt: string | null = null;
      try {
        const stat = await fs.stat(path.join(workflowDir, 'skill', 'SKILL.md'));
        skillCompiledAt = stat.mtime.toISOString();
      } catch {
        skillCompiledAt = null;
      }
      return {
        workflowDir,
        workflowName: path.basename(workflowDir),
        decisionCount: decisions.length,
        caseBoundCount: decisions.filter(isCaseBound).length,
        pendingExpertCount: decisions.filter((d) => d.status === 'pending_expert').length,
        engineVerifiedCount: decisions.filter((d) => d.status === 'engine_verified').length,
        skillCompiledAt,
      };
    },

    async compile(req: CreateWorkflowCompileRequest): Promise<CreateWorkflowCompileResult> {
      const { workflowDir, caseDir, skillName, description } = req;
      const workflowMd = await fs.readFile(path.join(workflowDir, 'workflow.md'), 'utf8');
      const decisionsDoc = (await readYaml<DecisionsDoc>(path.join(workflowDir, 'decisions.yaml'))) ?? {};
      const rubricDoc = await readYaml<RubricDoc>(path.join(workflowDir, 'rubric.yaml'));
      const decisions = decisionsDoc.decisions ?? [];

      const { scope, steps } = workflowSections(workflowMd);
      const methods = methodLines(decisions);
      const pitfalls = pitfallLines(decisions);
      const escalate = escalateLines(rubricDoc);

      const text = buildSkillText({ skillName, description, scope, steps, methods, pitfalls, escalate });

      const forbidden = new Set<string>();
      for (const decision of decisions) {
        if (isCaseBound(decision)) collectForbiddenTokens(decision, forbidden);
      }
      if (caseDir) {
        collectForbiddenTokens((await readYaml<JsonLike>(path.join(caseDir, 'case.yaml'))) ?? null, forbidden);
        collectForbiddenTokens((await readYaml<JsonLike>(path.join(caseDir, 'assertions.yaml'))) ?? null, forbidden);
      }

      const leaked = [...forbidden].filter((token) => text.includes(token)).toSorted();
      const skillDir = path.join(workflowDir, 'skill');
      const skillPath = path.join(skillDir, 'SKILL.md');

      if (leaked.length) {
        return {
          ok: false,
          skillDir,
          skillPath,
          methodCount: methods.length,
          pitfallCount: pitfalls.length,
          escalateCount: escalate.length,
          excludedCaseBoundCount: decisions.filter(isCaseBound).length,
          forbiddenTokenCount: forbidden.size,
          leakedTokens: leaked,
          error: 'compile_skill: refusing to write, found case identity in skill text',
        };
      }

      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(skillPath, text, 'utf8');

      return {
        ok: true,
        skillDir,
        skillPath,
        methodCount: methods.length,
        pitfallCount: pitfalls.length,
        escalateCount: escalate.length,
        excludedCaseBoundCount: decisions.filter(isCaseBound).length,
        forbiddenTokenCount: forbidden.size,
        leakedTokens: [],
      };
    },

    /** Missing files read as ''; a thrown error would leave the bridge invoke unresolved forever. */
    async readFile({ relativePath }: CreateWorkflowFileRequest): Promise<string> {
      try {
        return await fs.readFile(resolveWorkflowPath(relativePath), 'utf8');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
        throw error;
      }
    },

    async writeFile({ relativePath, data }: CreateWorkflowWriteRequest): Promise<boolean> {
      const abs = resolveWorkflowPath(relativePath);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, data, 'utf8');
      return true;
    },

    async publish({ workflowDir, version, allowPendingP0 }: CreateWorkflowPublishRequest): Promise<CreateWorkflowPublishResult> {
      const args = [path.join(SCRIPTS_DIR, 'publish.py'), '--workflow-dir', workflowDir, '--version', version];
      if (allowPendingP0) args.push('--allow-pending-p0');
      try {
        const { stdout, stderr } = await execFileAsync('python3', args, { timeout: 60_000 });
        return {
          ok: true,
          snapshotDir: path.join(workflowDir, 'versions', version),
          log: `${stdout}${stderr}`,
        };
      } catch (error) {
        const err = error as { stdout?: string; stderr?: string; message?: string };
        return {
          ok: false,
          snapshotDir: path.join(workflowDir, 'versions', version),
          log: `${err.stdout ?? ''}${err.stderr ?? ''}`,
          error: err.message,
        };
      }
    },
  };
}
