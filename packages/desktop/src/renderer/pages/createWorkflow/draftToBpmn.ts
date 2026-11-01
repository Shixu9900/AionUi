/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { WorkflowDraftStep } from '@/common/types/createWorkflow';

/** A laid-out task box is 100×80 and fits about 20 CJK characters. */
const TITLE_LIMIT = 20;

const escapeXml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const shorten = (text: string) => (text.length > TITLE_LIMIT ? `${text.slice(0, TITLE_LIMIT - 1)}…` : text);

/** BPMN element id for a draft step; draft ids are free-form, BPMN ids must be NCNames. */
export const taskIdOf = (index: number) => `Task_${index + 1}`;

type Node = { id: string; tag: 'startEvent' | 'endEvent' | 'task' | 'exclusiveGateway'; name?: string };
type Flow = { id: string; from: string; to: string; name?: string };

/**
 * Turns the agent's plain step list into a BPMN process (no diagram info).
 * Layout is left to bpmn-auto-layout so the agent never has to emit XML;
 * the layouter walks explicit <incoming>/<outgoing> refs, so every node lists them.
 */
export const draftToBpmn = (
  steps: WorkflowDraftStep[],
  chrome: { start: string; end: string; otherwise: string } = { start: '开始', end: '完成', otherwise: '其余情况' }
): string => {
  const indexOf = new Map(steps.map((step, index) => [step.id, index]));
  const nodes: Node[] = [{ id: 'Start', tag: 'startEvent', name: chrome.start }];
  const flows: Flow[] = [];
  const flow = (from: string, to: string, name?: string) => {
    flows.push({ id: `Flow_${flows.length + 1}`, from, to, name });
  };
  const targetOf = (index: number) => (index < steps.length ? taskIdOf(index) : 'End');

  flow('Start', targetOf(0));
  steps.forEach((step, index) => {
    const id = taskIdOf(index);
    const actor = step.actor ? `\n（${step.actor}）` : '';
    nodes.push({ id, tag: 'task', name: `${index + 1}. ${shorten(step.title)}${actor}` });
    const branches = step.branches ?? [];
    if (branches.length === 0) {
      flow(id, targetOf(index + 1));
      return;
    }
    const gateway = `Gateway_${index + 1}`;
    nodes.push({ id: gateway, tag: 'exclusiveGateway' });
    flow(id, gateway);
    let reachesNext = false;
    const seen = new Set<string>();
    branches.forEach((branch) => {
      const gotoIndex = branch.goto ? indexOf.get(branch.goto) : undefined;
      const target = gotoIndex === undefined ? targetOf(index + 1) : taskIdOf(gotoIndex);
      if (target === targetOf(index + 1)) reachesNext = true;
      const key = `${target}|${branch.when}`;
      if (seen.has(key)) return;
      seen.add(key);
      flow(gateway, target, shorten(branch.when));
    });
    if (!reachesNext) flow(gateway, targetOf(index + 1), chrome.otherwise);
  });
  nodes.push({ id: 'End', tag: 'endEvent', name: chrome.end });

  const nodeXml = nodes.map((node) => {
    const name = node.name ? ` name="${escapeXml(node.name)}"` : '';
    const refs = [
      ...flows.filter((f) => f.to === node.id).map((f) => `<incoming>${f.id}</incoming>`),
      ...flows.filter((f) => f.from === node.id).map((f) => `<outgoing>${f.id}</outgoing>`),
    ].join('');
    return `<${node.tag} id="${node.id}"${name}>${refs}</${node.tag}>`;
  });
  const flowXml = flows.map((f) => {
    const name = f.name ? ` name="${escapeXml(f.name)}"` : '';
    return `<sequenceFlow id="${f.id}" sourceRef="${f.from}" targetRef="${f.to}"${name} />`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_1" targetNamespace="https://aviator.local/workflow">',
    '<process id="Process_1" isExecutable="false">',
    ...nodeXml,
    ...flowXml,
    '</process>',
    '</definitions>',
  ].join('\n');
};
