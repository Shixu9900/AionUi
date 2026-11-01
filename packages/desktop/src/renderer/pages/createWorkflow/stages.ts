/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { WorkflowDraftStage } from '@/common/types/createWorkflow';
import type { I18nKey } from '@/renderer/services/i18n';

export const stageTitleKey = (id: WorkflowDraftStage): I18nKey =>
  `guid.createWorkflow.stage.${id}.title` as I18nKey;

export const stageHintKey = (id: WorkflowDraftStage): I18nKey =>
  `guid.createWorkflow.stage.${id}.hint` as I18nKey;

export const STAGES: { id: WorkflowDraftStage; title: string; hint: string }[] = [
  { id: 'job', title: '这是什么工作', hint: '名称、谁来做、交给谁' },
  { id: 'goal', title: '要达到什么', hint: '需求、交付物、合格标准' },
  { id: 'method', title: '你怎么做', hint: '像教新人一样讲，说或打字都行' },
  { id: 'confirm', title: '看图确认', hint: '它指出缺了、多了、重复的地方' },
  { id: 'evidence', title: '拿一套资料讲一遍', hint: '用真实资料佐证，交齐所需文件' },
  { id: 'run', title: '它照着做一遍', hint: '按学会的流程跑出结果' },
  { id: 'review', title: '你来批改', hint: '逐条点对或不对，它回头改流程' },
  { id: 'deliver', title: '生成并交付', hint: '变成助手能用的工作方法' },
];

export const stageIndex = (stage: WorkflowDraftStage | undefined): number => {
  const index = STAGES.findIndex((item) => item.id === stage);
  return index < 0 ? 0 : index;
};
