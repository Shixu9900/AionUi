/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Component records review (部件履历审查) wire types. Mirrors the aioncore
 * `aionui-records-review` crate: the package (`aviator.records-review/v1`) is
 * what extraction writes into the project, the result is what
 * `POST /api/records-review/compute` returns.
 */

export const RECORDS_REVIEW_PACKAGE_FILE = 'records-review.json';
export const RECORDS_REVIEW_DECISIONS_FILE = 'records-review.decisions.json';
export const RECORDS_REVIEW_FEEDBACK_FILE = 'records-review.feedback.json';

export type ElicitStance = 'agree' | 'disagree' | 'unsure';

export type ElicitItem = {
  target: 'open_item' | 'check';
  id: string;
  stance: ElicitStance;
  reason: string;
  at: string;
};

export type ElicitFile = {
  schema: 'aviator.records-review.decisions/v1';
  items: ElicitItem[];
};

export type Bbox = [number, number, number, number];

export type ComponentIdentity = {
  part_number: string;
  serial_number: string;
  description: string;
  ata: string;
  asset_model: string;
  thrust_rating: string;
};

export type HostInfo = {
  esn: string;
  aircraft: string;
  registration: string;
  position: string;
};

export type DocumentEntry = {
  id: string;
  title: string;
  doc_type: string;
  file: string;
  pages: number[];
  party: string;
  date: string;
  signed: boolean | null;
  parse_quality: string;
};

/** Package as written to disk; the backend validates and fills defaults. */
export type RecordsReviewPackage = {
  schema?: string;
  component: Partial<ComponentIdentity> & Pick<ComponentIdentity, 'part_number' | 'serial_number'>;
  [key: string]: unknown;
};

export type Verdict = 'pass' | 'conditional' | 'fail';
export type Severity = 'high' | 'medium' | 'low';
export type CheckResult = 'pass' | 'warn' | 'fail' | 'unknown';
export type Consensus = 'single' | 'consistent' | 'rounding' | 'conflict';
export type LinkKind = 'sequence' | 'corroborates' | 'conflicts' | 'same_page';
export type OpenItemKind = 'missing' | 'suspicious';
export type ChainMetric = 'tsn' | 'csn';

export type MetricValue = {
  value: number;
  display: string;
  as_of: string;
  observations: string[];
};

export type LimitValue = {
  value: number;
  source: 'documents' | 'knowledge_base';
  detail: string;
  observations: string[];
};

export type LifeSummary = {
  tsn: MetricValue | null;
  csn: MetricValue | null;
  life_limit_cycles: LimitValue | null;
  life_limit_hours: LimitValue | null;
  remaining_cycles: number | null;
  remaining_hours: number | null;
  used_ratio: number | null;
  formulas: string[];
};

export type TimelineEntry = {
  id: string;
  date: string;
  kind: string;
  label: string;
  host: HostInfo;
  operator: string;
  mro: string;
  tsn: number | null;
  csn: number | null;
  documents: string[];
  observations: string[];
  flags: string[];
};

export type Stint = {
  install_event: string;
  removal_event: string;
  from: string;
  to: string;
  host: HostInfo;
  operator: string;
  used_tsn: number | null;
  used_csn: number | null;
};

export type OpenItem = {
  id: string;
  kind: OpenItemKind;
  severity: Severity;
  title: string;
  detail: string;
  request_from: string;
  documents: string[];
  observations: string[];
  rule: string;
};

export type Check = {
  rule: string;
  result: CheckResult;
  detail: string;
  decision_id?: string;
  evidence_ids?: string[];
};

export type FieldProvenance = {
  field: string;
  decision_id: string;
  rule_id: string;
  evidence_ids: string[];
};

export type FeedbackAction = 'accepted' | 'corrected';

export type FeedbackItem = {
  decision_id: string;
  field: string;
  before: unknown;
  after: unknown;
  action: FeedbackAction;
  evidence_ids: string[];
  at: string;
};

export type FeedbackFile = {
  schema: 'aviator.review-feedback/v1';
  items: FeedbackItem[];
};

export type ChainPoint = {
  id: string;
  date: string;
  event: string | null;
  value: number;
  display: string;
  consensus: Consensus;
  observations: string[];
};

export type EvidenceChain = {
  metric: ChainMetric;
  points: ChainPoint[];
};

export type EvidenceCard = {
  id: string;
  metric: string;
  point: string | null;
  doc: string;
  doc_title: string;
  doc_type: string;
  file: string;
  page: number;
  bbox: Bbox | null;
  raw: string;
  value: number | null;
  date: string;
  signed: boolean | null;
  parse_quality: string;
};

export type EvidenceLink = {
  id: string;
  source: string;
  target: string;
  kind: LinkKind;
  label: string;
};

export type EvidenceGraph = {
  chains: EvidenceChain[];
  cards: EvidenceCard[];
  links: EvidenceLink[];
};

export type PartNode = {
  id: string;
  level: number;
  label: string;
  part_number: string;
  serial_number: string;
  children_count: number;
  life_limit_cycles: number | null;
  focus: boolean;
  children: PartNode[];
};

export type PartTree = {
  source: 'knowledge_base' | 'documents' | 'none';
  asset_model: string;
  root: PartNode | null;
};

export type ComponentReview = {
  schema: string;
  component: ComponentIdentity;
  cutoff_date: string | null;
  review_date: string;
  verdict: Verdict;
  life: LifeSummary;
  timeline: TimelineEntry[];
  stints: Stint[];
  open_items: OpenItem[];
  checks: Check[];
  evidence: EvidenceGraph;
  part_tree: PartTree;
  documents: DocumentEntry[];
  field_provenance?: FieldProvenance[];
};

export type StoredDocument = {
  doc_id: string;
  project_id: string;
  sha256: string;
  path: string;
  filename: string;
  page_count: number;
  bytes: number;
  added_at: string;
  deleted_at: string | null;
  superseded_by: string | null;
};

export type StoredPage = {
  sha256: string;
  page_no: number;
  kind: string;
  rotation: number;
  skew_degrees: number | null;
  text_chars: number;
  image_coverage: number;
  garbled_ratio: number;
  status: string;
  confidence: number | null;
  provider: string | null;
};

export type StoredIssue = {
  issue_id: string;
  sha256: string;
  page_no: number;
  bbox: Bbox | null;
  code: string;
  severity: string;
  detail: string;
};

export type DocumentReport = {
  doc_id: string;
  sha256: string;
  filename: string;
  page_count: number;
  passed: number;
  doubtful: number;
  failed: number;
  issues: StoredIssue[];
  engine: string;
};

export type AnnotateRequest = {
  project_id: string;
  sha256: string;
  page_no: number;
  bbox?: Bbox | null;
  metric: string;
  raw: string;
  value?: number | null;
};

export type StoredBlock = {
  block_id: string;
  sha256: string;
  page_no: number;
  label: string | null;
  bbox: Bbox | null;
  text: string;
  html: string | null;
  confidence: number | null;
  reading_order: number | null;
  provider: string;
};

export type DocumentSearchHit = {
  project_id: string;
  doc_id: string;
  sha256: string;
  filename: string;
  page_no: number;
  block_id: string;
  snippet: string;
};
