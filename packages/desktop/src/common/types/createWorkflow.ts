/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * "创建工作流" — management-only workflow distillation surface.
 *
 * Compiles a workflow draft (workflow.md + decisions.yaml + rubric.yaml)
 * into a deployable SKILL.md: method and rules only, no case-bound gold
 * values. Dev-local paths default to this machine's Aviator-workspace
 * checkout; see createWorkflowService.ts for the fallback.
 */

export interface CreateWorkflowStatusRequest {
  workflowDir: string;
}

export interface CreateWorkflowStatus {
  workflowDir: string;
  workflowName: string;
  decisionCount: number;
  caseBoundCount: number;
  pendingExpertCount: number;
  engineVerifiedCount: number;
  skillCompiledAt: string | null;
}

export interface CreateWorkflowCompileRequest {
  workflowDir: string;
  caseDir?: string;
  skillName: string;
  description: string;
}

export interface CreateWorkflowCompileResult {
  ok: boolean;
  skillDir: string;
  skillPath: string;
  methodCount: number;
  pitfallCount: number;
  escalateCount: number;
  excludedCaseBoundCount: number;
  forbiddenTokenCount: number;
  leakedTokens: string[];
  error?: string;
}

export interface CreateWorkflowFileRequest {
  relativePath: string;
}

export interface CreateWorkflowWriteRequest {
  relativePath: string;
  data: string;
}

export interface CreateWorkflowPublishRequest {
  workflowDir: string;
  version: string;
  allowPendingP0?: boolean;
}

export interface CreateWorkflowPublishResult {
  ok: boolean;
  snapshotDir: string;
  log: string;
  error?: string;
}

export type WorkflowDraftStage = 'job' | 'goal' | 'method' | 'confirm' | 'evidence' | 'run' | 'review' | 'deliver';

export type WorkflowStepAuto = 'assistant' | 'assistant_with_review' | 'human';

export interface WorkflowDraftStep {
  id: string;
  title: string;
  kind?: 'do' | 'check' | 'output';
  /** Role (never a personal name) that does this step. */
  actor?: string;
  look_at?: string[];
  result?: string;
  branches?: { when: string; goto?: string }[];
  /** Mistake people commonly make at this step. */
  pitfall?: string;
  /** When to stop and ask someone instead of guessing. */
  escalate?: string;
  /** Who can carry the step out once deployed. */
  auto?: WorkflowStepAuto;
  from?: 'expert' | 'suggested';
}

export interface WorkflowDraftRunItem {
  id: string;
  step?: string;
  claim: string;
  evidence?: string;
  verdict?: 'pending' | 'right' | 'wrong';
  correction?: string;
}

/** Written by the 工作流师傅 agent into its workspace each turn. */
export interface WorkflowDraft {
  schema?: string;
  stage?: WorkflowDraftStage;
  say?: string;
  job?: { name?: string; who?: string; deliver_to?: string; frequency?: string; trigger?: string };
  goal?: { problem?: string; deliverable?: string; done_when?: string[]; wrong_when?: string[] };
  steps?: WorkflowDraftStep[];
  feedback?: { missing?: string[]; extra?: string[]; duplicate?: string[]; unclear?: string[] };
  questions?: { id: string; text: string; status?: 'open' | 'answered' }[];
  /** Where the work hurts today: time sinks, frequent errors, skipped checks. */
  pain_points?: { text: string; step?: string }[];
  files?: { id: string; name: string; why?: string; status?: 'needed' | 'received' }[];
  run?: WorkflowDraftRunItem[];
  changes?: string[];
}

/** Pointer to the teaching session the page resumes. */
export interface WorkflowTeachSession {
  sessionDir: string;
  relativeDir: string;
  conversationId: string;
  assistantId: string;
  title: string;
  createdAt: number;
}
