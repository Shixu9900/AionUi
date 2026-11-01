/**
 * Records the knowledge-base page confirms. Original files stay where they are;
 * this index only stores the path and the fields the user accepted.
 */

export const KNOWLEDGE_KINDS = ['part', 'ad', 'sb', 'manual', 'lease'] as const;

export type KnowledgeKind = (typeof KNOWLEDGE_KINDS)[number];

export type IntakeStatus = 'waiting' | 'parsing' | 'doubtful' | 'ready';

export type KnowledgeFields = {
  asset_model: string;
  part_number: string;
  life_limit: string;
  authority: string;
  number: string;
  title: string;
  make: string;
  models: string;
  effective_date: string;
  source_path: string;
  citing_ad: string;
  manual_kind: string;
  ata: string;
  section: string;
  page: string;
  contract: string;
  clause: string;
};

export type KnowledgeItem = {
  id: string;
  kind: KnowledgeKind;
  archived: boolean;
  status: IntakeStatus;
  filename: string;
  source_path: string;
  doc_id: string;
  excerpt: string;
  fields: KnowledgeFields;
  updated_at: string;
};

export type KnowledgeIndex = {
  schema: 'aviator.knowledge-index/v1';
  items: KnowledgeItem[];
};

export const emptyKnowledgeFields = (sourcePath: string): KnowledgeFields => ({
  asset_model: '',
  part_number: '',
  life_limit: '',
  authority: '',
  number: '',
  title: '',
  make: '',
  models: '',
  effective_date: '',
  source_path: sourcePath,
  citing_ad: '',
  manual_kind: '',
  ata: '',
  section: '',
  page: '',
  contract: '',
  clause: '',
});

const AD_NUMBER = /\b(\d{4}-\d{2}-\d{2}(?:R\d+)?)\b/i;

/** Fill only fields that are written on the file name or the first page. Leave the rest blank. */
export const proposeKnowledgeItem = (
  filename: string,
  sourcePath: string,
  excerpt: string
): { kind: KnowledgeKind; fields: KnowledgeFields } => {
  const fields = emptyKnowledgeFields(sourcePath);
  const stem = filename.replace(/\.[^.]+$/, '');
  const fromName = stem.match(AD_NUMBER);
  const fromText = excerpt.match(AD_NUMBER);
  const number = fromName?.[1] ?? fromText?.[1] ?? '';
  const lowerPath = sourcePath.toLowerCase();
  if (number) {
    fields.number = number;
    fields.authority = lowerPath.includes('/easa/') ? 'EASA' : lowerPath.includes('/faa/') ? 'FAA' : '';
    return { kind: 'ad', fields };
  }
  fields.title = stem;
  return { kind: 'manual', fields };
};
