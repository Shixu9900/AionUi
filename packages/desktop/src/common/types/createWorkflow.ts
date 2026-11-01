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
