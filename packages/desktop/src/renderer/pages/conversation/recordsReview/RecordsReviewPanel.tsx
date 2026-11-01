/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Button, Empty, Modal, Progress, Spin, Tag, Tooltip } from '@arco-design/web-react';
import { Close, FullScreen, Refresh, Right, Down } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import type {
  CheckResult,
  ComponentReview,
  EvidenceCard,
  FeedbackAction,
  FeedbackItem,
  OpenItem,
  OpenItemKind,
  PartNode,
  Severity,
  TimelineEntry,
  Verdict,
} from '@/common/types/recordsReview';
import { ParseTab } from './ParseTab';
import { ConfirmBar } from './ConfirmBar';
import { CHAIN_COLOR, EvidenceGraph } from './EvidenceGraph';
import { PageThumb } from './PageImage';
import { setRecordsReviewOpen } from './recordsReviewStore';
import { useRecordsReview } from './useRecordsReview';
import { useReviewFeedback } from './useReviewFeedback';

const fmtCycles = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('en-US'));
const fmtHours = (n: number | null | undefined) => {
  if (n == null) return '—';
  const total = Math.round(n * 60);
  return `${Math.floor(total / 60).toLocaleString('en-US')}:${String(Math.abs(total % 60)).padStart(2, '0')}`;
};

const verdictTag = (v: Verdict, t: (k: string) => string) => {
  switch (v) {
    case 'pass':
      return <Tag color='green'>{t('conversation.recordsReview.verdict.pass')}</Tag>;
    case 'conditional':
      return <Tag color='orange'>{t('conversation.recordsReview.verdict.conditional')}</Tag>;
    case 'fail':
      return <Tag color='red'>{t('conversation.recordsReview.verdict.fail')}</Tag>;
    default: {
      const exhaustive: never = v;
      return exhaustive;
    }
  }
};

const severityColor = (s: Severity): string => {
  switch (s) {
    case 'high':
      return 'red';
    case 'medium':
      return 'orange';
    case 'low':
      return 'gray';
    default: {
      const exhaustive: never = s;
      return exhaustive;
    }
  }
};

const checkIcon = (r: CheckResult): { mark: string; color: string } => {
  switch (r) {
    case 'pass':
      return { mark: '✓', color: '#30a46c' };
    case 'warn':
      return { mark: '!', color: '#f76b15' };
    case 'fail':
      return { mark: '✕', color: '#e5484d' };
    case 'unknown':
      return { mark: '?', color: '#8f8f8f' };
    default: {
      const exhaustive: never = r;
      return exhaustive;
    }
  }
};

const EVENT_KIND: Record<string, { label: string; color: string }> = {
  birth: { label: '出生', color: '#8b5cf6' },
  release: { label: '出厂放行', color: '#8b5cf6' },
  install: { label: '装机', color: '#30a46c' },
  removal: { label: '拆下', color: '#e5484d' },
  shop_visit: { label: '车间送修', color: '#0090ff' },
  current: { label: '当前状态', color: '#f76b15' },
};

const Section: React.FC<{
  title: string;
  extra?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, extra, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className='border-b border-b-solid border-[var(--bg-3)]'>
      <div
        className='flex items-center gap-6px px-14px py-10px cursor-pointer select-none'
        onClick={() => setOpen(!open)}
      >
        {open ? <Down size={14} /> : <Right size={14} />}
        <span className='text-13px font-600 text-t-primary'>{title}</span>
        <div className='ml-auto' onClick={(e) => e.stopPropagation()}>
          {extra}
        </div>
      </div>
      {open && <div className='px-14px pb-14px'>{children}</div>}
    </section>
  );
};

const Stat: React.FC<{ label: string; value: string; sub?: string; color?: string; onClick?: () => void }> = ({
  label,
  value,
  sub,
  color,
  onClick,
}) => (
  <div className='flex-1 min-w-0 bg-2 rd-8px px-10px py-8px cursor-pointer hover:bg-3' onClick={onClick}>
    <div className='text-11px text-t-secondary'>{label}</div>
    <div className='text-20px font-700 leading-28px' style={{ color }}>
      {value}
    </div>
    {sub && <div className='text-11px text-t-tertiary truncate'>{sub}</div>}
  </div>
);

const LifeSection: React.FC<{ review: ComponentReview; onFocus: (ids: string[]) => void }> = ({ review, onFocus }) => {
  const { life } = review;
  const ratio = life.used_ratio != null ? Math.min(1, Math.max(0, life.used_ratio)) : null;
  const limit = life.life_limit_cycles;
  return (
    <div className='flex flex-col gap-8px'>
      <div className='flex gap-8px'>
        <Stat
          label='TSN 自新件小时'
          value={life.tsn?.display ?? '—'}
          sub={life.tsn ? `截至 ${life.tsn.as_of} · ${life.tsn.observations.length} 处来源` : undefined}
          color={CHAIN_COLOR.tsn}
          onClick={() => onFocus(life.tsn?.observations ?? [])}
        />
        <Stat
          label='CSN 自新件循环'
          value={life.csn?.display ?? '—'}
          sub={life.csn ? `截至 ${life.csn.as_of} · ${life.csn.observations.length} 处来源` : undefined}
          color={CHAIN_COLOR.csn}
          onClick={() => onFocus(life.csn?.observations ?? [])}
        />
      </div>
      <div className='flex gap-8px'>
        <Stat
          label='循环寿命限制'
          value={fmtCycles(limit?.value)}
          sub={limit ? (limit.source === 'documents' ? limit.detail : `知识库 · ${limit.detail}`) : '无来源'}
          onClick={() => onFocus(limit?.observations ?? [])}
        />
        <Stat
          label='剩余循环'
          value={fmtCycles(life.remaining_cycles)}
          sub={life.remaining_hours != null ? `剩余小时 ${fmtHours(life.remaining_hours)}` : undefined}
          color={life.remaining_cycles != null && life.remaining_cycles < 0 ? '#e5484d' : '#30a46c'}
        />
      </div>
      {ratio != null && (
        <div>
          <div className='flex justify-between text-11px text-t-secondary mb-2px'>
            <span>已用 {(ratio * 100).toFixed(1)}%</span>
            <span>{life.formulas[0]}</span>
          </div>
          <Progress
            percent={ratio * 100}
            showText={false}
            color={ratio > 0.9 ? '#e5484d' : ratio > 0.7 ? '#f76b15' : '#30a46c'}
          />
        </div>
      )}
    </div>
  );
};

const hasFocus = (n: PartNode): boolean => n.focus || n.children.some(hasFocus);

const TreeNode: React.FC<{ node: PartNode; depth: number }> = ({ node, depth }) => {
  const [open, setOpen] = useState(depth === 0 || hasFocus(node));
  const shown = open ? node.children.filter((c) => c.focus || hasFocus(c) || node.children.length <= 8) : [];
  const hidden = open ? node.children.length - shown.length : 0;
  return (
    <div>
      <div
        className='flex items-center gap-6px py-3px rd-4px px-4px cursor-pointer hover:bg-2'
        style={{ paddingLeft: depth * 16 + 4, background: node.focus ? 'rgba(247,107,21,0.12)' : undefined }}
        onClick={() => setOpen(!open)}
      >
        {node.children.length > 0 ? open ? <Down size={12} /> : <Right size={12} /> : <span className='w-12px' />}
        <span className='text-10px px-4px rd-3px bg-3 text-t-secondary'>L{node.level}</span>
        <span className={`text-12px truncate ${node.focus ? 'font-700 text-t-primary' : 'text-t-primary'}`}>
          {node.label || node.part_number}
        </span>
        {node.serial_number && <span className='text-11px text-t-tertiary'>S/N {node.serial_number}</span>}
        {node.focus && (
          <Tag size='small' color='orange'>
            本次审查
          </Tag>
        )}
        <span className='ml-auto text-11px text-t-tertiary whitespace-nowrap'>
          {node.part_number && node.level > 1 ? `${node.part_number} · ` : ''}
          {node.children_count > 0
            ? `${node.children_count} 个下级`
            : node.life_limit_cycles
              ? `${fmtCycles(node.life_limit_cycles)} CYC`
              : ''}
        </span>
      </div>
      {shown.map((c) => (
        <TreeNode key={c.id} node={c} depth={depth + 1} />
      ))}
      {hidden > 0 && (
        <div className='text-11px text-t-tertiary py-2px' style={{ paddingLeft: (depth + 1) * 16 + 22 }}>
          另有 {hidden} 个同级部件
        </div>
      )}
    </div>
  );
};

const TimelineSection: React.FC<{ review: ComponentReview; onFocus: (ids: string[]) => void }> = ({
  review,
  onFocus,
}) => {
  const stintAfter = new Map(review.stints.map((s) => [s.install_event, s]));
  return (
    <div className='relative'>
      {review.timeline.map((e: TimelineEntry, i) => {
        const kind = EVENT_KIND[e.kind] ?? { label: e.kind, color: '#8f8f8f' };
        const stint = stintAfter.get(e.id);
        const host = [e.host.esn && `ESN ${e.host.esn}`, e.host.aircraft && `A/C ${e.host.aircraft}`, e.host.position]
          .filter(Boolean)
          .join(' / ');
        const party = [e.operator && `运营商 ${e.operator}`, e.mro && `维修商 ${e.mro}`].filter(Boolean).join(' · ');
        return (
          <div key={e.id} className='flex gap-10px'>
            <div className='flex flex-col items-center' style={{ width: 14 }}>
              <span className='block rd-full mt-6px' style={{ width: 10, height: 10, background: kind.color }} />
              {i < review.timeline.length - 1 && <span className='block flex-1 w-2px bg-3' />}
            </div>
            <div className='flex-1 min-w-0 pb-10px'>
              <div
                className='rd-6px px-8px py-6px cursor-pointer hover:bg-2'
                style={{ outline: e.flags.length ? '1px solid #e5484d' : undefined }}
                onClick={() => onFocus(e.observations)}
              >
                <div className='flex items-center gap-6px text-12px'>
                  <span className='font-600 text-t-primary'>{e.date}</span>
                  <span className='px-5px rd-3px text-white text-11px' style={{ background: kind.color }}>
                    {kind.label}
                  </span>
                  <span className='text-t-secondary truncate'>{e.label}</span>
                </div>
                {(host || party) && (
                  <div className='text-11px text-t-tertiary mt-2px'>{[host, party].filter(Boolean).join(' · ')}</div>
                )}
                {(e.tsn != null || e.csn != null) && (
                  <div className='text-11px mt-2px'>
                    <span style={{ color: CHAIN_COLOR.tsn }}>TSN {fmtHours(e.tsn)}</span>
                    <span className='mx-6px text-t-tertiary'>/</span>
                    <span style={{ color: CHAIN_COLOR.csn }}>CSN {fmtCycles(e.csn)}</span>
                    <span className='ml-8px text-t-tertiary'>{e.documents.join('、')}</span>
                  </div>
                )}
              </div>
              {stint && (
                <div
                  className='ml-8px mt-4px text-11px text-t-secondary border-l-2 border-l-solid pl-8px'
                  style={{ borderColor: '#30a46c' }}
                >
                  在翼 {stint.from} → {stint.to}：{fmtCycles(stint.used_csn)} 循环 / {fmtHours(stint.used_tsn)} 小时
                  {stint.operator ? ` · ${stint.operator}` : ''}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const OpenItemsSection: React.FC<{
  review: ComponentReview;
  onFocus: (item: OpenItem) => void;
  lookup: (decisionId: string, field: string) => FeedbackItem | undefined;
  onFeedback: (decisionId: string, field: string, before: unknown, action: FeedbackAction, after: string) => void;
}> = ({ review, onFocus, lookup, onFeedback }) => {
  const [kind, setKind] = useState<OpenItemKind>('missing');
  const docTitle = new Map(review.documents.map((d) => [d.id, d.title]));
  const counts = { missing: 0, suspicious: 0 };
  review.open_items.forEach((i) => (counts[i.kind] += 1));
  const tab = (k: OpenItemKind, label: string) => (
    <button
      type='button'
      onClick={() => setKind(k)}
      className='flex-1 py-4px text-12px rd-5px border-none cursor-pointer'
      style={{
        background: kind === k ? 'var(--bg-1)' : 'transparent',
        color: kind === k ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: kind === k ? 600 : 400,
      }}
    >
      {label} {counts[k]}
    </button>
  );
  return (
    <div>
      <div className='flex gap-2px p-2px bg-2 rd-6px mb-8px'>
        {tab('missing', '缺失资料')}
        {tab('suspicious', '可疑文件 / 读数')}
      </div>
      <div className='flex flex-col gap-6px'>
        {review.open_items
          .filter((i) => i.kind === kind)
          .map((item) => (
            <div
              key={item.id}
              className='bg-2 rd-6px px-10px py-8px cursor-pointer hover:bg-3'
              onClick={() => onFocus(item)}
            >
              <div className='flex items-center gap-6px'>
                <Tag size='small' color={severityColor(item.severity)}>
                  {item.severity === 'high' ? '高' : item.severity === 'medium' ? '中' : '低'}
                </Tag>
                <span className='text-12px font-600 text-t-primary'>{item.title}</span>
                <span className='ml-auto text-10px text-t-tertiary'>{item.id}</span>
              </div>
              <div className='text-11px text-t-secondary mt-4px leading-17px'>{item.detail}</div>
              <div className='flex flex-wrap gap-4px mt-4px text-11px text-t-tertiary'>
                {item.request_from && <span>向 {item.request_from} 索取</span>}
                {item.documents.map((d) => (
                  <Tooltip key={d} content={docTitle.get(d) ?? d}>
                    <span className='px-4px rd-3px bg-3'>{d}</span>
                  </Tooltip>
                ))}
              </div>
              <ConfirmBar
                current={lookup(item.rule || item.id, item.id)}
                onChoose={(action, after) => onFeedback(item.rule || item.id, item.id, item.title, action, after)}
              />
            </div>
          ))}
      </div>
    </div>
  );
};

const CardViewer: React.FC<{
  card: EvidenceCard | null;
  review: ComponentReview;
  fileUrl: (rel: string) => string;
  onClose: () => void;
}> = ({ card, review, fileUrl, onClose }) => {
  const related = card
    ? review.evidence.links
        .filter((l) => l.source === card.id || l.target === card.id)
        .map((l) => ({
          link: l,
          other: review.evidence.cards.find((c) => c.id === (l.source === card.id ? l.target : l.source)),
        }))
    : [];
  return (
    <Modal
      visible={Boolean(card)}
      onCancel={onClose}
      footer={null}
      style={{ width: 1180 }}
      title={card ? `${card.doc} · ${card.doc_title} · p.${card.page}` : ''}
    >
      {card && (
        <div className='flex gap-16px'>
          <div className='overflow-auto' style={{ maxHeight: '74vh' }}>
            <PageThumb url={card.file ? fileUrl(card.file) : null} page={card.page} bbox={card.bbox} width={820} />
          </div>
          <div className='flex-1 min-w-0 text-12px flex flex-col gap-6px'>
            <div>
              <span className='text-t-secondary'>读数：</span>
              <b>{card.raw}</b>（{card.metric.toUpperCase()}，换算{' '}
              {card.metric === 'tsn' ? fmtHours(card.value) : fmtCycles(card.value)}）
            </div>
            <div>
              <span className='text-t-secondary'>节点日期：</span>
              {card.date || '—'}
            </div>
            <div>
              <span className='text-t-secondary'>文件类型：</span>
              {card.doc_type} · {card.signed ? '已签署' : '未签署'} · 解析 {card.parse_quality || '—'}
            </div>
            <div className='font-600 mt-6px'>关联</div>
            {related.map(({ link, other }) => (
              <div key={link.id} className='bg-2 rd-4px px-6px py-4px'>
                {link.kind === 'sequence'
                  ? '时间链'
                  : link.kind === 'corroborates'
                    ? '印证'
                    : link.kind === 'conflicts'
                      ? '冲突'
                      : '同页'}
                {link.label ? ` ${link.label}` : ''} →{' '}
                {other ? `${other.doc} p.${other.page} ${other.raw}（${other.date}）` : link.target}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
};

export const RecordsReviewPanel: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { t } = useTranslation();
  const { data, error, isLoading, isValidating, mutate } = useRecordsReview(projectId);
  const peId = data?.status === 'ready' ? data.peId : null;
  const feedback = useReviewFeedback(peId);
  const [focus, setFocus] = useState<Set<string>>(new Set());
  const [card, setCard] = useState<EvidenceCard | null>(null);
  const [fullGraph, setFullGraph] = useState(false);
  const [tab, setTab] = useState<'review' | 'parse'>('review');

  const review = data?.status === 'ready' ? data.review : null;
  const fileUrl = useMemo(() => (data?.status === 'ready' ? data.fileUrl : () => ''), [data]);
  const focusIds = useCallback(
    (ids: string[]) => setFocus((prev) => (ids.length && ids.join() !== [...prev].join() ? new Set(ids) : new Set())),
    []
  );
  const focusItem = useCallback(
    (item: OpenItem) => {
      if (!review) return;
      const ids = item.observations.length
        ? item.observations
        : review.evidence.cards.filter((c) => item.documents.includes(c.doc)).map((c) => c.id);
      focusIds(ids);
    },
    [review, focusIds]
  );

  const header = (
    <div className='flex items-center gap-8px px-14px h-44px border-b border-b-solid border-[var(--bg-3)] flex-shrink-0'>
      <span className='text-14px font-700 text-t-primary'>{t('conversation.recordsReview.title')}</span>
      <button
        type='button'
        className='text-12px border-none cursor-pointer rd-4px px-8px py-2px'
        style={{ background: tab === 'review' ? 'var(--bg-2)' : 'transparent', color: 'var(--text-primary)' }}
        onClick={() => setTab('review')}
      >
        {t('conversation.recordsReview.reviewTab')}
      </button>
      <button
        type='button'
        className='text-12px border-none cursor-pointer rd-4px px-8px py-2px'
        style={{ background: tab === 'parse' ? 'var(--bg-2)' : 'transparent', color: 'var(--text-primary)' }}
        onClick={() => setTab('parse')}
      >
        {t('conversation.recordsReview.parseTab')}
      </button>
      {review && verdictTag(review.verdict, t)}
      <div className='ml-auto flex items-center gap-4px'>
        <Tooltip content={t('conversation.recordsReview.refresh')}>
          <Button size='mini' type='text' icon={<Refresh />} loading={isValidating} onClick={() => void mutate()} />
        </Tooltip>
        <Tooltip content={t('common.close')}>
          <Button size='mini' type='text' icon={<Close />} onClick={() => setRecordsReviewOpen(false)} />
        </Tooltip>
      </div>
    </div>
  );

  if (tab === 'parse') {
    return (
      <div className='h-full flex flex-col min-h-0'>
        {header}
        <ParseTab projectId={projectId} fileUrl={fileUrl} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='h-full flex flex-col'>
        {header}
        <div className='flex-1 flex items-center justify-center'>
          <Spin />
        </div>
      </div>
    );
  }
  if (error || !review) {
    return (
      <div className='h-full flex flex-col'>
        {header}
        <div className='flex-1 flex items-center justify-center px-24px'>
          <Empty
            description={
              <div className='text-12px text-t-secondary leading-20px'>
                {error
                  ? `${t('conversation.recordsReview.loadFailed')}：${String((error as Error).message ?? error)}`
                  : t('conversation.recordsReview.empty')}
              </div>
            }
          />
        </div>
      </div>
    );
  }

  const c = review.component;
  return (
    <div className='h-full flex flex-col min-h-0'>
      {header}
      <div className='flex-1 overflow-y-auto min-h-0'>
        <div className='px-14px py-10px border-b border-b-solid border-[var(--bg-3)]'>
          <div className='text-13px font-700 text-t-primary'>{c.description || c.part_number}</div>
          <div className='text-12px text-t-secondary mt-2px'>
            P/N {c.part_number} · S/N {c.serial_number}
            {c.ata ? ` · ATA ${c.ata}` : ''}
          </div>
          <div className='text-11px text-t-tertiary mt-2px'>
            {c.asset_model && `${c.asset_model} · `}截止日 {review.cutoff_date ?? '—'} · 审查日 {review.review_date}
            {focus.size > 0 && (
              <span
                className='ml-8px cursor-pointer'
                style={{ color: 'rgb(var(--primary-6))' }}
                onClick={() => setFocus(new Set())}
              >
                清除高亮（{focus.size}）
              </span>
            )}
          </div>
        </div>
        <Section title='① TSN / CSN 与剩余寿命'>
          <LifeSection review={review} onFocus={focusIds} />
        </Section>
        <Section
          title='部件结构'
          extra={
            <span className='text-11px text-t-tertiary'>
              {review.part_tree.source === 'knowledge_base'
                ? '机型知识库'
                : review.part_tree.source === 'documents'
                  ? '文件记载'
                  : '未识别'}
            </span>
          }
        >
          {review.part_tree.root ? (
            <TreeNode node={review.part_tree.root} depth={0} />
          ) : (
            <div className='text-12px text-t-tertiary'>知识库中没有该件号，文件也未写明上级装配</div>
          )}
        </Section>
        <Section title={`② 拆装履历时间轴（${review.timeline.length}）`}>
          <TimelineSection review={review} onFocus={focusIds} />
        </Section>
        <Section title={`③ Open Items（${review.open_items.length}）`}>
          <OpenItemsSection
            review={review}
            onFocus={focusItem}
            lookup={feedback.lookup}
            onFeedback={(decisionId, field, before, action, after) =>
              feedback.record({
                decision_id: decisionId,
                field,
                before,
                after: action === 'corrected' ? after : before,
                action,
                evidence_ids: [],
              })
            }
          />
        </Section>
        <Section
          title={`④ 证据链追溯（${review.evidence.cards.length} 张卡片）`}
          extra={
            <Button size='mini' type='text' icon={<FullScreen />} onClick={() => setFullGraph(true)}>
              全屏
            </Button>
          }
        >
          <EvidenceGraph review={review} fileUrl={fileUrl} focus={focus} onOpenCard={setCard} height={460} />
          <div className='text-11px text-t-tertiary mt-6px'>
            单击卡片查看原页，拖动卡片整张图会联动；时间轴或 Open Item 可高亮相关证据。
          </div>
        </Section>
        <Section title='规则检查' defaultOpen={false}>
          <div className='flex flex-col gap-4px'>
            {review.checks.map((ch) => {
              const icon = checkIcon(ch.result);
              return (
                <div key={ch.rule} className='text-12px'>
                  <div className='flex gap-8px'>
                    <span className='font-700 w-14px text-center' style={{ color: icon.color }}>
                      {icon.mark}
                    </span>
                    <span className='text-t-primary w-110px flex-shrink-0'>{ch.rule}</span>
                    <span className='text-t-secondary'>{ch.detail}</span>
                  </div>
                  <ConfirmBar
                    current={feedback.lookup(ch.decision_id || ch.rule, ch.rule)}
                    onChoose={(action, after) =>
                      feedback.record({
                        decision_id: ch.decision_id || ch.rule,
                        field: ch.rule,
                        before: ch.result,
                        after: action === 'corrected' ? after : ch.result,
                        action,
                        evidence_ids: ch.evidence_ids ?? [],
                      })
                    }
                  />
                </div>
              );
            })}
          </div>
        </Section>
      </div>
      <Modal
        visible={fullGraph}
        onCancel={() => setFullGraph(false)}
        footer={null}
        title={`证据链追溯 · ${c.part_number} / ${c.serial_number}`}
        style={{ width: '96vw', top: 20 }}
        unmountOnExit
      >
        <EvidenceGraph review={review} fileUrl={fileUrl} focus={focus} onOpenCard={setCard} height='82vh' />
      </Modal>
      <CardViewer card={card} review={review} fileUrl={fileUrl} onClose={() => setCard(null)} />
    </div>
  );
};
