/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { KnowledgeItem } from '@/common/types/knowledgeBase';

export type KnowledgeTreeNode = {
  id: string;
  label: string;
  /** Stable i18n key. Display text comes from the active locale; `label` stays the fallback. */
  labelKey?: string;
  group: 'root' | 'manual' | 'part' | 'family';
  filled: boolean;
  itemId?: string;
  children: KnowledgeTreeNode[];
};

const ATA_TITLE: Record<string, string> = {
  '05': '时限',
  '06': '尺寸',
  '07': '顶升',
  '08': '调平',
  '09': '牵引',
  '10': '停放',
  '11': '标牌',
  '12': '勤务',
  '20': '标准施工',
  '21': '空调',
  '22': '自动飞行',
  '23': '通信',
  '24': '电源',
  '25': '设备',
  '26': '防火',
  '27': '飞控',
  '28': '燃油',
  '29': '液压',
  '30': '防冰',
  '31': '指示记录',
  '32': '起落架',
  '33': '灯光',
  '34': '导航',
  '35': '氧气',
  '36': '气源',
  '38': '水废水',
  '44': '客舱系统',
  '47': '氮气',
  '49': 'APU',
  '51': '结构',
  '52': '门',
  '53': '机身',
  '54': '吊舱',
  '55': '安定面',
  '56': '窗',
  '57': '机翼',
  '70': '标准施工',
  '71': '动力装置',
  '72': '发动机',
  '73': '发动机燃油',
  '74': '点火',
  '75': '引气',
  '76': '发动机操纵',
  '77': '发动机指示',
  '78': '排气',
  '79': '滑油',
  '80': '起动',
};

const ATA = Object.keys(ATA_TITLE);
const SDS = new Set('21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,38,44,47,49,51,52,53,54,55,56,57,71,72,73,74,75,76,77,78,79,80'.split(','));
const PP = new Set('05,06,07,08,09,10,11,12,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,38,44,47,49,51,52,53,54,55,56,57,70,71,72,73,74,75,76,77,78,79,80'.split(','));
const AMM_BOEING = new Set('05,06,07,08,09,10,11,12,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,38,49,51,52,53,54,55,56,57,70,71,72,73,74,75,76,77,78,79,80'.split(','));
const NG = new Set(['737-600', '737-700', '737-800', '737-900', '737-900ER']);
const B757 = new Set(['757-200', '757-200F', '757-300']);
const B767 = new Set(['767-300', '767-300ER', '767-300F', '767-400ER']);
const B777 = new Set(['777-200', '777-200ER', '777-200LR', '777-300', '777-300ER', '777F', '777-8', '777-9']);

const node = (
  id: string,
  label: string,
  group: KnowledgeTreeNode['group'],
  filled: boolean,
  children: KnowledgeTreeNode[] = [],
  labelKey?: string
): KnowledgeTreeNode => ({ id, label, group, filled, children, ...(labelKey ? { labelKey } : {}) });

const ataFork = (id: string, present: Set<string> | null): KnowledgeTreeNode[] =>
  ATA.map((code) =>
    node(
      `${id}:${code}`,
      `ATA ${code} ${ATA_TITLE[code]}`,
      'manual',
      present?.has(code) ?? false,
      [],
      `guid.knowledge.ata.${code}`
    )
  );

const chapterSet = (variant: string, manual: string): Set<string> | null => {
  if (NG.has(variant) && manual === 'sds') return SDS;
  if (NG.has(variant) && manual === 'ipc') return PP;
  if ((B757.has(variant) || B767.has(variant)) && manual === 'amm') return AMM_BOEING;
  return null;
};

const manualFilled = (variant: string, manual: string): boolean => {
  if (chapterSet(variant, manual)) return true;
  if (B777.has(variant) && ['afm', 'mmel', 'ddg', 'cmps'].includes(manual)) return true;
  if ((variant === 'A320-200' || variant === 'A320neo') && manual === 'amm') return true;
  if ((variant === 'A340-300' || variant === 'A340-600') && manual === 'amm') return true;
  return false;
};

const BOEING_MANUALS: [string, string, boolean][] = [
  ['afm', '飞行手册 AFM', false],
  ['fcom', '机组操作手册 FCOM', false],
  ['qrh', '快速检查单 QRH', false],
  ['mmel', '主最低设备清单 MMEL', true],
  ['ddg', '签派偏离指南 DDG', false],
  ['cmps', '构型维护 CMPS', false],
  ['amm', '飞机维修手册 AMM', true],
  ['ipc', '图解零件目录 IPC', true],
  ['sds', '系统说明 SDS', true],
  ['wdm', '线路手册 WDM', true],
  ['srm', '结构修理手册 SRM', true],
  ['ndt', '无损检测手册', false],
  ['mpd', '维修计划文件 MPD', false],
  ['fim', '故障隔离手册 FIM', false],
  ['swpm', '标准线路施工 SWPM', false],
  ['sopm', '标准施工 SOPM', false],
];

const AIRBUS_MANUALS: [string, string, boolean][] = [
  ['afm', '飞行手册 AFM', false],
  ['fcom', '机组操作手册 FCOM', false],
  ['qrh', '快速检查单 QRH', false],
  ['mmel', '主最低设备清单 MMEL', true],
  ['cdl', '构型偏离 CDL', false],
  ['amm', '飞机维修手册 AMM', true],
  ['ipc', '图解零件目录 IPC', true],
  ['asm', '系统说明 ASM', true],
  ['tsm', '故障排除 TSM', true],
  ['srm', '结构修理手册 SRM', true],
  ['ntm', '无损检测 NTM', false],
  ['mpd', '维修计划文件 MPD', false],
  ['espm', '电气标准施工 ESPM', false],
];

const manualsOf = (variant: string, specs: [string, string, boolean][]): KnowledgeTreeNode[] =>
  specs.map(([id, label, withAta]) => {
    const present = withAta ? chapterSet(variant, id) : null;
    return node(
      `${variant}:${id}`,
      label,
      'manual',
      manualFilled(variant, id),
      withAta ? ataFork(`${variant}:${id}`, present) : [],
      `guid.knowledge.manual.${id}`
    );
  });

const knowledgeOf = (variant: string): KnowledgeTreeNode[] => {
  if (NG.has(variant)) {
    return [
      node(`${variant}:cfm`, 'CFM56-7B 寿命件', 'part', true, [], 'guid.knowledge.part.cfm'),
      node(`${variant}:apu`, 'GTCP131-9B 寿命件', 'part', true, [], 'guid.knowledge.part.gtcp'),
      node(`${variant}:gear`, '起落架寿命件', 'part', true, [], 'guid.knowledge.part.gear'),
    ];
  }
  if (variant === 'A320-200' || variant === 'A320neo') {
    return [
      node(`${variant}:gear`, '起落架寿命件', 'part', true, [], 'guid.knowledge.part.gear'),
      node(`${variant}:engine`, '发动机寿命件', 'part', false, [], 'guid.knowledge.part.engine'),
      node(`${variant}:apu`, 'APU 寿命件', 'part', false, [], 'guid.knowledge.part.apu'),
    ];
  }
  return [node(`${variant}:llp`, '部件寿命件', 'part', false, [], 'guid.knowledge.part.llp')];
};

const variantNode = (name: string, specs: [string, string, boolean][]): KnowledgeTreeNode =>
  node(`var:${name}`, name, 'family', false, [...manualsOf(name, specs), ...knowledgeOf(name)]);

const family = (
  id: string,
  label: string,
  names: string[],
  specs: [string, string, boolean][],
  labelKey?: string
): KnowledgeTreeNode => node(id, label, 'family', false, names.map((name) => variantNode(name, specs)), labelKey);

const BOEING: [string, string, string[]][] = [
  ['b737', '737', ['737-300', '737-400', '737-500', '737-600', '737-700', '737-800', '737-900', '737-900ER', '737-7', '737-8', '737-8-200', '737-9', '737-10']],
  ['b747', '747', ['747-400', '747-400F', '747-8', '747-8F']],
  ['b757', '757', ['757-200', '757-200F', '757-300']],
  ['b767', '767', ['767-300', '767-300ER', '767-300F', '767-400ER']],
  ['b777', '777', ['777-200', '777-200ER', '777-200LR', '777-300', '777-300ER', '777F', '777-8', '777-9']],
  ['b787', '787', ['787-8', '787-9', '787-10']],
];

const AIRBUS: [string, string, string[]][] = [
  ['a220', 'A220', ['A220-100', 'A220-300']],
  ['a320fam', 'A320 系列', ['A318', 'A319', 'A319neo', 'A320-200', 'A320neo', 'A321', 'A321neo', 'A321LR', 'A321XLR']],
  ['a330', 'A330', ['A330-200', 'A330-200F', 'A330-300', 'A330-800', 'A330-900']],
  ['a340', 'A340', ['A340-300', 'A340-500', 'A340-600']],
  ['a350', 'A350', ['A350-900', 'A350-1000']],
  ['a380', 'A380', ['A380-800']],
];

const REGIONAL: [string, string, string[]][] = [
  ['ejet', 'E-Jet', ['E170', 'E175', 'E190', 'E195', 'E175-E2', 'E190-E2', 'E195-E2']],
  ['atr', 'ATR', ['ATR 42-600', 'ATR 72-600']],
  ['comac', 'COMAC', ['ARJ21-700', 'C919']],
  ['dhc', 'DHC-8', ['DHC-8-400']],
];

const bubble = (entry: KnowledgeTreeNode): boolean => {
  const childFilled = entry.children.some(bubble);
  entry.filled = entry.filled || childFilled;
  return entry.filled;
};

const leaf = (item: KnowledgeItem): KnowledgeTreeNode => ({
  id: `item:${item.id}`,
  label: item.filename,
  group: 'part',
  filled: true,
  itemId: item.id,
  children: [],
});

const hostFor = (item: KnowledgeItem, variants: Map<string, KnowledgeTreeNode>): KnowledgeTreeNode | null => {
  const text = `${item.fields.asset_model} ${item.filename}`.toUpperCase();
  const found = [...variants.keys()].find((name) => text.includes(name.toUpperCase()));
  return found ? variants.get(found) ?? null : null;
};

export const buildKnowledgeTree = (items: KnowledgeItem[]): KnowledgeTreeNode => {
  const boeing = node(
    'brand:boeing',
    '波音',
    'family',
    false,
    BOEING.map(([id, label, names]) => family(id, label, names, BOEING_MANUALS)),
    'guid.knowledge.brand.boeing'
  );
  const airbus = node(
    'brand:airbus',
    '空客',
    'family',
    false,
    AIRBUS.map(([id, label, names]) =>
      family(id, label, names, AIRBUS_MANUALS, id === 'a320fam' ? 'guid.knowledge.family.a320' : undefined)
    ),
    'guid.knowledge.brand.airbus'
  );
  const regional = node(
    'brand:regional',
    '支线与其他现役客机',
    'family',
    false,
    REGIONAL.map(([id, label, names]) => family(id, label, names, AIRBUS_MANUALS)),
    'guid.knowledge.brand.regional'
  );
  const variants = new Map<string, KnowledgeTreeNode>();
  const collect = (entry: KnowledgeTreeNode) => {
    if (entry.id.startsWith('var:')) variants.set(entry.label, entry);
    entry.children.forEach(collect);
  };
  [boeing, airbus, regional].forEach(collect);

  const parked: KnowledgeItem[] = [];
  for (const item of items.filter((entry) => entry.status !== 'waiting')) {
    const host = hostFor(item, variants);
    if (host) host.children.push(leaf(item));
    else parked.push(item);
  }

  const root = node('root', '民航客机', 'root', false, [boeing, airbus, regional], 'guid.knowledge.root');
  if (parked.length > 0) {
    root.children.push(node('type:inbox', '尚未归到机型', 'family', true, parked.map(leaf), 'guid.knowledge.inbox'));
  }
  bubble(root);
  return root;
};

export const pruneUnfilled = (entry: KnowledgeTreeNode): KnowledgeTreeNode | null => {
  const children = entry.children.map(pruneUnfilled).filter((child): child is KnowledgeTreeNode => child !== null);
  if (!entry.filled && children.length === 0) return null;
  return { ...entry, children };
};
