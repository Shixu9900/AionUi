/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Evidence graph: every TSN / CSN reading is a card (page thumbnail + magnified
 * value with its red box). Cards sit on two time-ordered lanes — TSN above,
 * CSN below — and are tied together by sequence (next point in time),
 * corroboration / conflict (same point, other document) and same-page links.
 * A d3-force simulation keeps the time order as a soft target and lets the
 * graph breathe when a card is dragged, Obsidian-style.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  Controls,
  applyNodeChanges,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force';
import type { Simulation, SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';
import type { ComponentReview, EvidenceCard, LinkKind } from '@/common/types/recordsReview';
import { PageLens, PageThumb } from './PageImage';

const CARD_W = 224;
const CARD_H = 176;
const COL_GAP = 270;
const LANE_GAP = 250;
const STACK_GAP = 196;

export const CHAIN_COLOR = { tsn: '#3b82f6', csn: '#f97316' } as const;

type MetricFilter = 'all' | 'tsn' | 'csn';

type CardData = {
  card: EvidenceCard;
  url: string | null;
  refs: string[];
  dimmed: boolean;
  primary: boolean;
  onOpen: (card: EvidenceCard) => void;
};

type AnchorData = {
  title: string;
  value: string;
  sub: string;
  color: string;
  refs: string[];
  dimmed: boolean;
};

type CardNode = Node<CardData, 'evidence'>;
type AnchorNode = Node<AnchorData, 'anchor'>;
type GraphNode = CardNode | AnchorNode;

type SimNode = SimulationNodeDatum & { id: string; tx: number; ty: number; w: number; h: number };
type SimLink = SimulationLinkDatum<SimNode> & { kind: LinkKind | 'anchor' };

const centerHandles = (
  <>
    <Handle
      type='target'
      position={Position.Left}
      className='!opacity-0 !pointer-events-none'
      style={{ left: '50%', top: '50%' }}
    />
    <Handle
      type='source'
      position={Position.Right}
      className='!opacity-0 !pointer-events-none'
      style={{ left: '50%', top: '50%' }}
    />
  </>
);

const qualityLabel = (q: string): string | null => {
  switch (q) {
    case 'failed':
      return '解析失败';
    case 'weak':
      return '解析存疑';
    default:
      return null;
  }
};

const EvidenceCardNode: React.FC<NodeProps<CardNode>> = ({ data }) => {
  const { card, url, dimmed, primary, onOpen } = data;
  const color = card.metric === 'tsn' ? CHAIN_COLOR.tsn : card.metric === 'csn' ? CHAIN_COLOR.csn : '#8b5cf6';
  const quality = qualityLabel(card.parse_quality);
  return (
    <div
      className='bg-1 text-t-primary cursor-pointer select-none'
      style={{
        width: CARD_W,
        border: `1.5px solid ${primary ? color : 'var(--bg-4)'}`,
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        opacity: dimmed ? 0.22 : 1,
        transition: 'opacity 160ms',
      }}
      onDoubleClick={() => onOpen(card)}
    >
      {centerHandles}
      <div className='flex items-center gap-6px px-8px pt-6px pb-4px text-11px'>
        <span className='px-5px rd-3px text-white font-600' style={{ background: color }}>
          {card.metric === 'life_limit_cycles' ? 'LIMIT' : card.metric.toUpperCase()}
        </span>
        <span className='font-600'>{card.raw}</span>
        <span className='ml-auto text-t-tertiary'>{card.date}</span>
      </div>
      <div className='px-6px'>
        {card.bbox ? (
          <PageLens url={url} page={card.page} bbox={card.bbox} width={CARD_W - 12} height={54} />
        ) : (
          <div className='text-11px text-t-tertiary'>无坐标</div>
        )}
      </div>
      <div className='flex gap-6px p-6px'>
        <PageThumb url={url} page={card.page} bbox={card.bbox} width={70} />
        <div className='min-w-0 flex-1 text-11px leading-16px'>
          <div className='font-600 truncate' title={card.doc_title}>
            {card.doc} · p.{card.page}
          </div>
          <div className='text-t-secondary line-clamp-2' title={card.doc_title}>
            {card.doc_title}
          </div>
          <div className='flex flex-wrap gap-4px mt-2px'>
            <span className={card.signed ? 'text-green-6' : 'text-t-tertiary'}>
              {card.signed ? '已签署' : '未签署'}
            </span>
            {quality && <span className='text-orange-6'>{quality}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

const AnchorNodeView: React.FC<NodeProps<AnchorNode>> = ({ data }) => (
  <div
    className='bg-1 text-t-primary select-none'
    style={{
      width: 168,
      padding: '10px 12px',
      borderRadius: 10,
      border: `2px solid ${data.color}`,
      opacity: data.dimmed ? 0.3 : 1,
    }}
  >
    {centerHandles}
    <div className='text-11px text-t-secondary'>{data.title}</div>
    <div className='text-18px font-700' style={{ color: data.color }}>
      {data.value}
    </div>
    <div className='text-11px text-t-tertiary'>{data.sub}</div>
  </div>
);

const nodeTypes = { evidence: EvidenceCardNode, anchor: AnchorNodeView };

const edgeStyle = (kind: LinkKind | 'anchor', color: string): Partial<Edge> => {
  switch (kind) {
    case 'sequence':
      return { style: { stroke: color, strokeWidth: 2.4 }, markerEnd: { type: MarkerType.ArrowClosed, color } };
    case 'corroborates':
      return { style: { stroke: '#30a46c', strokeWidth: 1.4, strokeDasharray: '5 4' } };
    case 'conflicts':
      return { style: { stroke: '#e5484d', strokeWidth: 2, strokeDasharray: '6 3' }, animated: true };
    case 'same_page':
      return { style: { stroke: '#8f8f8f', strokeWidth: 1, strokeDasharray: '2 4' } };
    case 'anchor':
      return { style: { stroke: color, strokeWidth: 1.6, opacity: 0.6 } };
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
};

type Built = { nodes: GraphNode[]; edges: Edge[]; sim: SimNode[]; simLinks: SimLink[] };

const buildGraph = (
  review: ComponentReview,
  fileUrl: (rel: string) => string,
  filter: MetricFilter,
  onOpen: (card: EvidenceCard) => void
): Built => {
  const { chains, cards, links } = review.evidence;
  const byId = new Map(cards.map((c) => [c.id, c]));
  const visible = (metric: string) =>
    filter === 'all' || metric === filter || (metric.startsWith('life') && filter === 'csn');
  const dates = [...new Set(chains.flatMap((c) => c.points.map((p) => p.date)))].toSorted();
  const col = (date: string) => Math.max(0, dates.indexOf(date));
  const lastX = dates.length * COL_GAP;

  const nodes: GraphNode[] = [];
  const sim: SimNode[] = [];
  const edges: Edge[] = [];
  const simLinks: SimLink[] = [];

  const addCard = (card: EvidenceCard, tx: number, ty: number, primary: boolean) => {
    nodes.push({
      id: card.id,
      type: 'evidence',
      position: { x: tx - CARD_W / 2, y: ty - CARD_H / 2 },
      data: { card, url: card.file ? fileUrl(card.file) : null, refs: [card.id], dimmed: false, primary, onOpen },
    });
    sim.push({ id: card.id, tx, ty, x: tx, y: ty, w: CARD_W, h: CARD_H });
  };
  const addAnchor = (id: string, data: AnchorData, tx: number, ty: number) => {
    nodes.push({ id, type: 'anchor', position: { x: tx - 84, y: ty - 40 }, data, draggable: true });
    sim.push({ id, tx, ty, x: tx, y: ty, w: 168, h: 80 });
  };
  const addEdge = (
    id: string,
    source: string,
    target: string,
    kind: LinkKind | 'anchor',
    color: string,
    label = ''
  ) => {
    edges.push({ id, source, target, type: 'straight', label: label || undefined, ...edgeStyle(kind, color) });
    simLinks.push({ source, target, kind });
  };

  for (const chain of chains) {
    if (!visible(chain.metric)) continue;
    const color = CHAIN_COLOR[chain.metric];
    const laneY = chain.metric === 'tsn' ? -LANE_GAP / 2 : LANE_GAP / 2;
    const dir = chain.metric === 'tsn' ? -1 : 1;
    chain.points.forEach((point) => {
      point.observations.forEach((obsId, i) => {
        const card = byId.get(obsId);
        if (!card) return;
        addCard(card, col(point.date) * COL_GAP, laneY + dir * i * STACK_GAP, i === 0);
      });
    });
    const first = chain.points[0];
    const last = chain.points[chain.points.length - 1];
    if (!first || !last) continue;
    const label = chain.metric.toUpperCase();
    const current = chain.metric === 'tsn' ? review.life.tsn : review.life.csn;
    addAnchor(
      `start-${chain.metric}`,
      {
        title: `${label} 证据链`,
        value: first.display,
        sub: `起点 ${first.date}`,
        color,
        refs: first.observations,
        dimmed: false,
      },
      -COL_GAP,
      laneY
    );
    addAnchor(
      `end-${chain.metric}`,
      {
        title: `当前 ${label}`,
        value: current?.display ?? last.display,
        sub: `截至 ${current?.as_of ?? last.date}`,
        color,
        refs: current?.observations ?? last.observations,
        dimmed: false,
      },
      lastX,
      laneY
    );
    addEdge(`a-start-${chain.metric}`, `start-${chain.metric}`, first.observations[0], 'anchor', color);
    addEdge(`a-end-${chain.metric}`, last.observations[0], `end-${chain.metric}`, 'anchor', color);
  }

  const limitCards = cards.filter((c) => c.metric === 'life_limit_cycles');
  if (visible('csn') && review.life.life_limit_cycles) {
    const limit = review.life.life_limit_cycles;
    const remaining = review.life.remaining_cycles;
    const ty = LANE_GAP / 2 + STACK_GAP * 1.4;
    addAnchor(
      'limit',
      {
        title: '寿命限制 → 剩余',
        value: remaining != null ? remaining.toLocaleString('en-US') : '—',
        sub: `限制 ${limit.value.toLocaleString('en-US')} 循环`,
        color: '#8b5cf6',
        refs: limit.observations,
        dimmed: false,
      },
      lastX,
      ty
    );
    if (chains.some((c) => c.metric === 'csn' && c.points.length > 0)) {
      addEdge('a-limit', 'end-csn', 'limit', 'anchor', '#8b5cf6');
    }
    limitCards.forEach((card, i) => {
      addCard(card, lastX + COL_GAP * (0.9 + (i % 2) * 0.9), ty + Math.floor(i / 2) * STACK_GAP + STACK_GAP, false);
      addEdge(`a-lim-${card.id}`, card.id, 'limit', 'anchor', '#8b5cf6');
    });
  }

  const present = new Set(nodes.map((n) => n.id));
  for (const link of links) {
    if (!present.has(link.source) || !present.has(link.target)) continue;
    const metric = byId.get(link.source)?.metric;
    const color = metric === 'tsn' ? CHAIN_COLOR.tsn : CHAIN_COLOR.csn;
    addEdge(
      link.id,
      link.source,
      link.target,
      link.kind,
      color,
      link.kind === 'sequence' || link.kind === 'conflicts' ? link.label : ''
    );
  }
  return { nodes, edges, sim, simLinks };
};

const linkDistance = (kind: LinkKind | 'anchor'): number => {
  switch (kind) {
    case 'sequence':
      return COL_GAP;
    case 'corroborates':
    case 'conflicts':
      return STACK_GAP;
    case 'same_page':
      return LANE_GAP;
    case 'anchor':
      return COL_GAP * 0.9;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
};

type Props = {
  review: ComponentReview;
  fileUrl: (rel: string) => string;
  focus: Set<string>;
  onOpenCard: (card: EvidenceCard) => void;
  height: number | string;
};

const GraphCanvas: React.FC<Props> = ({ review, fileUrl, focus, onOpenCard, height }) => {
  const [filter, setFilter] = useState<MetricFilter>('all');
  const built = useMemo(() => buildGraph(review, fileUrl, filter, onOpenCard), [review, fileUrl, filter, onOpenCard]);
  const [nodes, setNodes] = useState<GraphNode[]>(built.nodes);
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const simNodesRef = useRef<Map<string, SimNode>>(new Map());
  const { fitView } = useReactFlow();

  const syncPositions = useCallback(() => {
    const byId = simNodesRef.current;
    setNodes((prev) =>
      prev.map((n) => {
        const s = byId.get(n.id);
        return s && s.x != null && s.y != null ? { ...n, position: { x: s.x - s.w / 2, y: s.y - s.h / 2 } } : n;
      })
    );
  }, []);

  useEffect(() => {
    const simNodes = built.sim.map((n) => ({ ...n }));
    simNodesRef.current = new Map(simNodes.map((n) => [n.id, n]));
    const sim = forceSimulation<SimNode, SimLink>(simNodes)
      .force('x', forceX<SimNode>((d) => d.tx).strength(0.22))
      .force('y', forceY<SimNode>((d) => d.ty).strength(0.3))
      .force('collide', forceCollide<SimNode>((d) => Math.hypot(d.w, d.h) / 2 + 6).strength(0.9))
      .force(
        'link',
        forceLink<SimNode, SimLink>(built.simLinks.map((l) => ({ ...l })))
          .id((d) => d.id)
          .distance((l) => linkDistance(l.kind))
          .strength(0.04)
      )
      .force('charge', forceManyBody<SimNode>().strength(-160))
      .stop();
    sim.tick(320);
    sim.on('tick', syncPositions);
    simRef.current = sim;
    setNodes(built.nodes);
    syncPositions();
    requestAnimationFrame(() => void fitView({ padding: 0.12, duration: 0 }));
    return () => {
      sim.stop();
    };
  }, [built, syncPositions, fitView]);

  const onNodeDragStart = useCallback<OnNodeDrag<GraphNode>>((_, node) => {
    const s = simNodesRef.current.get(node.id);
    if (!s) return;
    s.fx = node.position.x + s.w / 2;
    s.fy = node.position.y + s.h / 2;
    simRef.current?.alphaTarget(0.25).restart();
  }, []);

  const onNodeDrag = useCallback<OnNodeDrag<GraphNode>>((_, node) => {
    const s = simNodesRef.current.get(node.id);
    if (!s) return;
    s.fx = node.position.x + s.w / 2;
    s.fy = node.position.y + s.h / 2;
  }, []);

  const onNodeDragStop = useCallback<OnNodeDrag<GraphNode>>((_, node) => {
    const s = simNodesRef.current.get(node.id);
    if (!s) return;
    s.tx = node.position.x + s.w / 2;
    s.ty = node.position.y + s.h / 2;
    s.fx = null;
    s.fy = null;
    simRef.current?.alphaTarget(0);
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange<GraphNode>[]) => setNodes((prev) => applyNodeChanges(changes, prev)),
    []
  );

  const displayNodes = useMemo(
    () =>
      focus.size === 0
        ? nodes
        : nodes.map(
            (n) => ({ ...n, data: { ...n.data, dimmed: !n.data.refs.some((id) => focus.has(id)) } }) as GraphNode
          ),
    [nodes, focus]
  );

  const filterButton = (value: MetricFilter, label: string) => (
    <button
      type='button'
      key={value}
      onClick={() => setFilter(value)}
      className='px-8px py-2px text-12px rd-4px border-none cursor-pointer'
      style={{
        background: filter === value ? 'var(--color-primary-light-1, #e8f3ff)' : 'transparent',
        color: filter === value ? 'rgb(var(--primary-6))' : 'var(--text-secondary)',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ height, position: 'relative' }} className='bg-2 rd-8px overflow-hidden'>
      <div className='absolute top-8px left-8px z-10 flex items-center gap-2px bg-1 rd-6px p-2px shadow-sm'>
        {filterButton('all', '双链')}
        {filterButton('tsn', 'TSN')}
        {filterButton('csn', 'CSN')}
      </div>
      <div className='absolute top-10px right-10px z-10 flex gap-10px text-11px text-t-secondary bg-1 rd-6px px-8px py-4px shadow-sm'>
        <span style={{ color: CHAIN_COLOR.tsn }}>━ TSN 时间链</span>
        <span style={{ color: CHAIN_COLOR.csn }}>━ CSN 时间链</span>
        <span style={{ color: '#30a46c' }}>┄ 多源印证</span>
        <span style={{ color: '#e5484d' }}>┄ 冲突</span>
        <span>┈ 同页</span>
      </div>
      <ReactFlow
        nodes={displayNodes}
        edges={built.edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={(_, node) => node.type === 'evidence' && onOpenCard((node as CardNode).data.card)}
        nodesConnectable={false}
        minZoom={0.1}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        fitView
      >
        <Background gap={24} size={1} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => {
            const card = (n as CardNode).data?.card;
            if (!card) return '#8b5cf6';
            return card.metric === 'tsn' ? CHAIN_COLOR.tsn : card.metric === 'csn' ? CHAIN_COLOR.csn : '#8b5cf6';
          }}
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
};

export const EvidenceGraph: React.FC<Props> = (props) => (
  <ReactFlowProvider>
    <GraphCanvas {...props} />
  </ReactFlowProvider>
);
