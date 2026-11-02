/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IWorkspaceFlatFile } from '@/common/adapter/ipcBridge';

/**
 * Redelivery records package, IATA Aircraft Leases 4th ed. (2017) Annex II.
 * Titles are short labels; the requirement text stays in the guideline.
 */
type GroupSource = { code: string; title: string; items: Array<[string, string]> };

const GROUP_SOURCE: GroupSource[] = [
  {
    code: 'A',
    title: 'Current certificates',
    items: [
      ['A001', 'Certificate of Airworthiness'],
      ['A002', 'Certificate of Registration'],
      ['A003', 'Export certificate of airworthiness'],
      ['A004', 'Noise certificate'],
      ['A005', 'Radio station licence'],
      ['A006', 'Deregistration confirmation'],
      ['A007', 'Burn certification'],
    ],
  },
  {
    code: 'B',
    title: 'Maintenance status summaries',
    items: [
      ['B001', 'Airframe check and inspection history'],
      ['B002', 'Total time in service'],
      ['B003', 'Flight time report or log book'],
      ['B004', 'Airframe and appliance AD status'],
      ['B005', 'Manufacturer service bulletin status'],
      ['B006', 'Non-manufacturer modifications and STCs'],
      ['B007', 'Maintenance program compliance and last-done next-due'],
      ['B008', 'Supplemental structural inspections'],
      ['B009', 'CPCP and ISIP tasks'],
      ['B010', 'Certification maintenance requirements'],
      ['B011', 'Airworthiness limitation items'],
      ['B012', 'Deferred maintenance'],
      ['B013', 'Hard-time components'],
      ['B014', 'Airframe life-limited parts'],
      ['B015', 'Operator-tracked components'],
      ['B016', 'Incident and accident clearance'],
      ['B017', 'Structural repairs and dent-and-buckle map'],
      ['B018', 'Oil and fluid types'],
      ['B019', 'Operator loadable software'],
      ['B020', 'Operational capability evidence'],
      ['B021', 'Flight data recorder readout'],
      ['B022', 'Maintenance program summary'],
      ['B023', 'Cockpit voice recorder readout'],
    ],
  },
  {
    code: 'C',
    title: 'Maintenance records',
    items: [
      ['C001', 'Technical logs'],
      ['C002', 'Last complete A-check cycle'],
      ['C003', 'Last complete C-check cycle'],
      ['C004', 'Major structural check packages'],
      ['C005', 'CPCP and ISIP task cards'],
      ['C006', 'On-wing AD dirty fingerprints'],
      ['C007', 'On-wing manufacturer SB task cards'],
      ['C008', 'Non-OEM modifications and STCs'],
      ['C009', 'Structural repair data'],
      ['C010', 'Current weight report'],
      ['C011', 'Flight-control balance'],
      ['C012', 'Demonstration flight'],
      ['C013', 'Compass deviation'],
      ['C014', 'Hard-copy records inventory'],
    ],
  },
  {
    code: 'D',
    title: 'Configuration',
    items: [
      ['D001', 'LOPA'],
      ['D002', 'Galley drawings'],
      ['D003', 'Emergency equipment drawing'],
      ['D004', 'Loose and galley equipment'],
      ['D005', 'Avionics inventory'],
      ['D006', 'Electrical load analysis'],
    ],
  },
  {
    code: 'E',
    title: 'Manufacturer records',
    items: [
      ['E001', 'Certificate of airworthiness at manufacture'],
      ['E002', 'Manufacturer AD report'],
      ['E003', 'Original fitted-component listing'],
      ['E004', 'Manufacturer repair and alteration report'],
      ['E005', 'Manufacturer modification report'],
      ['E006', 'Service difficulty or delivery inspection report'],
      ['E007', 'Production test completion'],
      ['E008', 'Manufacturer flight logs'],
      ['E009', 'Historical log'],
      ['E010', 'Landing-gear life-limited parts at manufacture'],
      ['E011', 'Eligible type-certification statement'],
      ['E012', 'Weighing report at manufacture'],
      ['E013', 'Certificate of conformance'],
      ['E014', 'Production flight certificate'],
      ['E015', 'Final inspection report'],
      ['E016', 'Rigging brochure'],
      ['E017', 'Certificate of sanitary construction'],
      ['E018', 'Detailed specification'],
      ['E019', 'Interior finish specification'],
      ['E020', 'Customer checklist'],
    ],
  },
  {
    code: 'F',
    title: 'Engine records',
    items: [
      ['F001', 'Manufacturer delivery documents'],
      ['F002', 'Export certificate of airworthiness at manufacture'],
      ['F003', 'Total time in service'],
      ['F004', 'AD status'],
      ['F005', 'Manufacturer service bulletin status'],
      ['F006', 'Non-manufacturer modifications'],
      ['F007', 'Life-limited parts listing'],
      ['F008', 'Life-limited part substantiation back to birth'],
      ['F009', 'Shop-visit reports'],
      ['F010', 'Condition monitoring'],
      ['F011', 'Log book and installation-removal record'],
      ['F012', 'Last borescope'],
      ['F013', 'Last test-cell run'],
      ['F014', 'Last on-wing power-assurance run'],
      ['F015', 'Incident and accident clearance'],
      ['F016', 'Power-rating operation statement'],
      ['F017', 'Field repairs since last shop visit'],
      ['F018', 'Fan-blade distribution'],
      ['F019', 'Engine-mount inspection'],
      ['F020', 'High-pressure turbine blade listing'],
      ['F021', 'Current OEM concessions'],
      ['F022', 'Serialized line-replaceable units'],
    ],
  },
  {
    code: 'G',
    title: 'APU',
    items: [
      ['G001', 'Total time in service'],
      ['G002', 'AD status'],
      ['G003', 'Manufacturer service bulletin status'],
      ['G004', 'Log book and installation-removal record'],
      ['G005', 'Shop-visit reports'],
      ['G006', 'Life-limited parts'],
      ['G007', 'On-wing performance test'],
      ['G008', 'Last borescope'],
    ],
  },
  {
    code: 'H',
    title: 'Component records',
    items: [
      ['H001', 'Release certificates for hard-time components'],
      ['H002', 'Release certificates for operator-tracked components'],
    ],
  },
  {
    code: 'I',
    title: 'Landing gear',
    items: [
      ['I001', 'Life-limited parts installed at manufacture'],
      ['I002', 'Release certificate from last overhaul'],
      ['I003', 'Life-limited part status'],
      ['I004', 'Last overhaul shop report'],
      ['I005', 'Life-limited part substantiation back to birth'],
    ],
  },
  {
    code: 'J',
    title: 'Manuals',
    items: [
      ['J001', 'Airplane flight manual'],
      ['J002', 'Wiring diagram manual'],
      ['J003', 'Illustrated parts catalogue'],
      ['J004', 'Maintenance manual'],
      ['J005', 'System schematics'],
      ['J006', 'Wire list and hookup charts'],
      ['J007', 'Aircraft operating manual'],
      ['J008', 'Quick reference handbook'],
      ['J009', 'Weight and balance manual'],
      ['J010', 'Power plant buildup manual'],
      ['J011', 'Structural repair manual'],
      ['J012', 'Engine maintenance manual'],
      ['J013', 'Engine illustrated parts'],
      ['J014', 'Master minimum equipment list'],
      ['J015', 'Maintenance planning document'],
      ['J016', 'Dispatch deviation guide'],
      ['J017', 'Cabin crew operating manual'],
      ['J018', 'Passenger seat manuals'],
      ['J019', 'Galley component maintenance manual'],
    ],
  },
  {
    code: 'K',
    title: 'Propellers',
    items: [
      ['K001', 'Total time in service'],
      ['K002', 'AD status'],
      ['K003', 'Manufacturer service bulletin status'],
      ['K004', 'Non-manufacturer modifications'],
      ['K005', 'Log book and installation-removal record'],
      ['K006', 'Time-controlled and life-limited parts'],
      ['K007', 'Last overhaul shop report'],
      ['K008', 'Release certificate or life substantiation'],
      ['K009', 'Incident and accident clearance'],
    ],
  },
];

export type PackageItem = { code: string; title: string; group: string };
export type PackageGroup = { code: string; title: string; items: PackageItem[] };

export const PACKAGE_GROUPS: PackageGroup[] = GROUP_SOURCE.map((g) => ({
  code: g.code,
  title: g.title,
  items: g.items.map(([code, title]) => ({ code, title, group: g.code })),
}));

const ITEM_BY_CODE = new Map(PACKAGE_GROUPS.flatMap((g) => g.items.map((item) => [item.code, item] as const)));

export const packageItem = (code: string): PackageItem | undefined => ITEM_BY_CODE.get(code);

/** Review workflows a package item feeds. One item can feed several. */
export type PackageWorkflow = 'completeness' | 'status' | 'llp' | 'history';

/** Major assembly whose LLP review an item belongs to; matches the LLP pane row ids. */
export type LlpTarget = 'engine' | 'apu' | 'gear';

const range = (group: string, from: number, to: number): string[] =>
  Array.from({ length: to - from + 1 }, (_, i) => `${group}${String(from + i).padStart(3, '0')}`);

const WORKFLOW_ITEMS: Record<Exclude<PackageWorkflow, 'completeness'>, string[]> = {
  status: [...range('B', 1, 23), ...range('C', 2, 9), 'H001', 'H002'],
  llp: [
    'B013',
    'B014',
    'B016',
    'F007',
    'F008',
    'F009',
    'F011',
    'F015',
    'G004',
    'G005',
    'G006',
    'H001',
    'I001',
    ...range('I', 3, 5),
  ],
  history: [...range('E', 1, 20), 'B003'],
};

export const itemWorkflows = (code: string): PackageWorkflow[] => {
  const hits = (Object.keys(WORKFLOW_ITEMS) as Array<keyof typeof WORKFLOW_ITEMS>).filter((wf) =>
    WORKFLOW_ITEMS[wf].includes(code)
  );
  return hits.length > 0 ? hits : ['completeness'];
};

/** Items whose files are the LLP status or back-to-birth of a major assembly. */
const LLP_TARGET: Record<string, LlpTarget> = {
  F007: 'engine',
  F008: 'engine',
  F009: 'engine',
  F011: 'engine',
  F015: 'engine',
  G004: 'apu',
  G005: 'apu',
  G006: 'apu',
  I001: 'gear',
  I003: 'gear',
  I004: 'gear',
  I005: 'gear',
};

export const llpTargetOf = (code: string): LlpTarget | undefined => LLP_TARGET[code];

/** Where the LLP pane's "files" link lands for each major assembly. */
export const LLP_PACKAGE_ITEM: Record<LlpTarget, string> = {
  engine: 'F007',
  apu: 'G006',
  gear: 'I003',
};

/** Item a document cited by the component review belongs to; the review covers an engine part today. */
const REVIEW_DOC_ITEM: Record<string, string> = {
  status_screen: 'F003',
  llp_sheet: 'F007',
  release_certificate: 'F008',
  shop_report: 'F009',
  work_order: 'F009',
  movement_sheet: 'F011',
  logbook: 'F011',
  statement: 'F015',
};

export const reviewDocItem = (docType: string): string | undefined => REVIEW_DOC_ITEM[docType];

export type PackageFile = {
  name: string;
  fullPath: string;
  relativePath: string;
  /** Folder segment between the group and the item, e.g. one engine's folder. */
  instance: string | null;
  /** The consultant's own folder name for the item, kept because numbering varies by consultant. */
  folder: string | null;
};

export type PackageStyle = 'iata-items' | 'letter-only' | 'other-numbering' | 'work-type' | 'empty';

export type PackageScan = {
  style: PackageStyle;
  byItem: Map<string, PackageFile[]>;
  /** Files under a letter group but not under any item folder. */
  byGroup: Map<string, PackageFile[]>;
  inherited: PackageFile[];
  unfiled: PackageFile[];
  total: number;
};

const ITEM_RE = /^\(?([A-K])\s*0*(\d{1,3})(?!\d)/i;
const GROUP_RE = /^\(?([A-K])(?:\s*[.)\]]|\s)/i;
const NUMBERED_RE = /^\(?\d{2}\)?\s/;
const INHERITED_RE = /previous\b.*\bbibles?\b/i;

const itemCodeOf = (segment: string): string | null => {
  const match = ITEM_RE.exec(segment.trim());
  if (!match) return null;
  const code = `${match[1].toUpperCase()}${match[2].padStart(3, '0')}`;
  return ITEM_BY_CODE.has(code) ? code : null;
};

const groupCodeOf = (segment: string): string | null => {
  const match = GROUP_RE.exec(segment.trim());
  return match ? match[1].toUpperCase() : null;
};

const push = <T>(map: Map<string, T[]>, key: string, value: T) => {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
};

const styleOf = (tops: string[], byItem: number): PackageStyle => {
  if (tops.length === 0) return 'empty';
  const groups = tops.filter((s) => groupCodeOf(s) && !itemCodeOf(s)).length;
  const numbered = tops.filter((s) => NUMBERED_RE.test(s)).length;
  if (groups >= 4 && byItem > 0) return 'iata-items';
  if (groups >= 4) return 'letter-only';
  if (numbered >= 4 || tops.filter((s) => itemCodeOf(s)).length >= 4) return 'other-numbering';
  return 'work-type';
};

/**
 * File every listed path under an Annex II item by its folder names. Reads names only;
 * a folder whose number doesn't match Annex II stays under its group, not guessed.
 * Jet projects reuse K for miscellany, so without propellers K files stay at group level.
 */
export const scanPackage = (files: IWorkspaceFlatFile[], hasPropellers: boolean): PackageScan => {
  const byItem = new Map<string, PackageFile[]>();
  const byGroup = new Map<string, PackageFile[]>();
  const inherited: PackageFile[] = [];
  const unfiled: PackageFile[] = [];
  const tops = new Set<string>();

  for (const file of files) {
    if (file.name.startsWith('.') || file.name.startsWith('~$')) continue;
    const segments = file.relativePath.split(/[\\/]/).slice(0, -1);
    if (segments[0]) tops.add(segments[0]);
    if (segments.some((s) => INHERITED_RE.test(s))) {
      inherited.push({ ...file, instance: null, folder: null });
      continue;
    }
    const groupIndex = segments.findIndex((s) => groupCodeOf(s) && !itemCodeOf(s));
    const group = groupIndex >= 0 ? groupCodeOf(segments[groupIndex]) : null;
    const itemIndex = segments.findIndex((s, i) => i > groupIndex && itemCodeOf(s));
    const code = itemIndex >= 0 ? itemCodeOf(segments[itemIndex]) : null;
    const filed = code && (!group || code.startsWith(group)) && (hasPropellers || !code.startsWith('K'));
    if (code && filed) {
      const between = segments.slice(groupIndex + 1, itemIndex);
      push(byItem, code, {
        ...file,
        instance: between[0] ?? null,
        folder: segments[itemIndex],
      });
    } else if (group) {
      const instance = segments[groupIndex + 1] ?? null;
      push(byGroup, group, { ...file, instance, folder: null });
    } else {
      unfiled.push({ ...file, instance: null, folder: null });
    }
  }

  return {
    style: styleOf([...tops], byItem.size),
    byItem,
    byGroup,
    inherited,
    unfiled,
    total: files.length,
  };
};

export type ItemStatus = 'present' | 'missing' | 'na';

/** Propellers don't apply to jets; everything else is missing until a file is filed under it. */
export const itemStatus = (scan: PackageScan, item: PackageItem, hasPropellers: boolean): ItemStatus => {
  if ((scan.byItem.get(item.code)?.length ?? 0) > 0) return 'present';
  if (item.group === 'K' && !hasPropellers) return 'na';
  return 'missing';
};
