/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { ComponentReview, Stint } from '@/common/types/recordsReview';

const DAY = 86_400_000;
const W = 1000;
const LEFT = 108;
const RIGHT = 16;
const STINT_COLORS = ['#3b82f6', '#14b8a6', '#8b5cf6', '#f59e0b'];

const ms = (d: string) => Date.parse(d);
const days = (a: string, b: string) => Math.round((ms(b) - ms(a)) / DAY);
const fmtN = (n: number) => Math.round(n).toLocaleString('en-US');
const fmtH = (h: number) => {
  const total = Math.round(h * 60);
  return `${Math.floor(total / 60).toLocaleString('en-US')}:${String(Math.abs(total % 60)).padStart(2, '0')}`;
};

const at = (review: ComponentReview, date: string, metric: 'tsn' | 'csn'): number | null => {
  const hit = review.timeline.find((e) => e.date === date && e[metric] != null);
  return hit ? hit[metric] : null;
};

type LifeTrackProps = {
  review: ComponentReview;
  view: 'full' | 'budget' | 'yearly';
};

const LifeTrack: React.FC<LifeTrackProps> = ({ review, view }) => {
  const [metric, setMetric] = useState<'csn' | 'tsn'>('csn');
  const [hover, setHover] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const stints = review.stints;
  const limit = review.life.life_limit_cycles?.value ?? null;
  const recorded = review.life.csn?.value ?? null;
  const remaining = review.life.remaining_cycles;
  const cutoff = review.cutoff_date ?? review.life.csn?.as_of ?? stints[stints.length - 1]?.to;
  const reviewDate = review.review_date;

  const dates = [
    ...review.timeline.map((e) => e.date),
    ...stints.flatMap((s) => [s.from, s.to]),
    cutoff,
    reviewDate,
  ].filter((d): d is string => Boolean(d) && !Number.isNaN(ms(d)));
  if (dates.length === 0) return null;
  const t0 = Math.min(...dates.map(ms)) - 80 * DAY;
  const t1 = Math.max(...dates.map(ms)) + 40 * DAY;
  const x = (d: string | number) =>
    LEFT + (((typeof d === 'number' ? d : ms(d)) - t0) / (t1 - t0)) * (W - LEFT - RIGHT);

  const laneH = 22;
  const laneGap = 6;
  const lanes = ['所有人 / 出租人', '运营商', '飞机 · 位置', '发动机', '维修厂', '部件状态'];
  const laneY = (i: number) => 26 + i * (laneH + laneGap);
  const chartTop = laneY(lanes.length) + 18;
  const chartH = 200;
  const H = chartTop + chartH + 36;
  const yMax =
    metric === 'csn' ? Math.max(limit ?? 0, recorded ?? 0, 1) * 1.08 : Math.max(review.life.tsn?.value ?? 1, 1) * 1.15;
  const y = (v: number) => chartTop + chartH - (v / yMax) * chartH;

  const valueOf = (s: Stint, end: boolean) => {
    const date = end ? s.to : s.from;
    const direct = at(review, date, metric);
    if (direct != null) return direct;
    if (metric === 'csn' && s.used_csn != null && end) {
      const start = at(review, s.from, 'csn') ?? 0;
      return start + s.used_csn;
    }
    if (metric === 'tsn' && s.used_tsn != null && end) {
      const start = at(review, s.from, 'tsn') ?? 0;
      return start + s.used_tsn;
    }
    return end ? null : 0;
  };

  const pts: Array<[string, number]> = [];
  stints.forEach((s) => {
    const a = valueOf(s, false);
    const b = valueOf(s, true);
    if (a == null || b == null) return;
    pts.push([s.from, a], [s.to, b]);
  });
  const path = pts.map(([d, v], i) => `${i === 0 ? 'M' : 'L'}${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  const years: number[] = [];
  for (let yr = new Date(t0).getFullYear(); yr <= new Date(t1).getFullYear(); yr += 2) years.push(yr);

  const dim = (i: number) => (selected != null && selected !== i ? 0.28 : 1);
  const bar = (
    from: string,
    to: string,
    lane: number,
    fill: string,
    key: string,
    opacity = 1,
    onClick?: () => void
  ) => (
    <rect
      key={key}
      x={x(from)}
      y={laneY(lane)}
      width={Math.max(2, x(to) - x(from))}
      height={laneH}
      rx={3}
      fill={fill}
      opacity={opacity}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    />
  );

  const last = stints[stints.length - 1];
  const lastDays = last ? Math.max(1, days(last.from, last.to)) : 1;
  const rate = last?.used_csn != null ? last.used_csn / (lastDays / 365.25) : 0;
  const gapDays = cutoff && reviewDate && ms(reviewDate) > ms(cutoff) ? days(cutoff, reviewDate) : 0;
  const estimated = gapDays > 0 && rate > 0 ? Math.round((rate * gapDays) / 365.25) : 0;

  const hm = hover == null ? null : review.timeline[hover];

  return (
    <div className='flex flex-col gap-8px min-w-0'>
      <div className='flex items-center gap-8px text-12px text-t-secondary'>
        <span>纵轴</span>
        <button
          type='button'
          className={metric === 'csn' ? 'text-t-primary font-600' : ''}
          onClick={() => setMetric('csn')}
        >
          循环 CSN
        </button>
        <button
          type='button'
          className={metric === 'tsn' ? 'text-t-primary font-600' : ''}
          onClick={() => setMetric('tsn')}
        >
          小时 TSN
        </button>
        <span className='text-t-tertiary'>点飞机色条可只看一段在翼期</span>
      </div>
      {view !== 'yearly' && (
        <svg viewBox={`0 0 ${W} ${H}`} width='100%' style={{ display: 'block' }}>
          <defs>
            <pattern id='wb-hatch-red' width='6' height='6' patternUnits='userSpaceOnUse' patternTransform='rotate(45)'>
              <line x1='0' y1='0' x2='0' y2='6' stroke='#e5484d' strokeWidth='1.5' />
            </pattern>
            <pattern
              id='wb-hatch-gray'
              width='6'
              height='6'
              patternUnits='userSpaceOnUse'
              patternTransform='rotate(45)'
            >
              <line x1='0' y1='0' x2='0' y2='6' stroke='var(--color-border-3)' strokeWidth='1.5' />
            </pattern>
          </defs>
          {years.map((yr) => (
            <g key={yr}>
              <line
                x1={x(`${yr}-01-01`)}
                x2={x(`${yr}-01-01`)}
                y1={18}
                y2={chartTop + chartH}
                stroke='var(--color-border-2)'
                strokeWidth={0.5}
              />
              <text
                x={x(`${yr}-01-01`)}
                y={chartTop + chartH + 16}
                fontSize={11}
                fill='var(--color-text-3)'
                textAnchor='middle'
              >
                {yr}
              </text>
            </g>
          ))}
          <text x={W - RIGHT} y={H - 4} fontSize={11} fill='var(--color-text-3)' textAnchor='end'>
            日历时间（年）
          </text>
          {lanes.map((label, i) => (
            <text key={label} x={LEFT - 8} y={laneY(i) + 15} fontSize={11} fill='var(--color-text-2)' textAnchor='end'>
              {label}
            </text>
          ))}
          {cutoff && (
            <g>
              <rect
                x={x(dates[0])}
                y={laneY(0)}
                width={Math.max(2, x(reviewDate) - x(dates[0]))}
                height={laneH}
                rx={3}
                fill='url(#wb-hatch-gray)'
              />
              <text x={x(dates[0]) + 6} y={laneY(0) + 15} fontSize={11} fill='var(--color-text-2)'>
                文件未记载所有人 / 出租人
              </text>
            </g>
          )}
          {stints.map((s, i) => (
            <g key={`${s.from}-${s.to}`} opacity={dim(i)}>
              {bar(s.from, s.to, 1, STINT_COLORS[i % STINT_COLORS.length], `op-${i}`)}
              {x(s.to) - x(s.from) > 70 && (
                <text x={x(s.from) + 6} y={laneY(1) + 15} fontSize={11} fill='#fff'>
                  {s.operator || '运营商未记载'}
                </text>
              )}
              {bar(s.from, s.to, 2, STINT_COLORS[i % STINT_COLORS.length], `ac-${i}`, 1, () =>
                setSelected(selected === i ? null : i)
              )}
              {x(s.to) - x(s.from) > 80 && (
                <text x={x(s.from) + 6} y={laneY(2) + 15} fontSize={11} fill='#fff'>
                  {`${s.host.aircraft || '飞机未记载'}${s.host.position ? ` · ${s.host.position}` : ''}`}
                </text>
              )}
              {bar(s.from, s.to, 5, '#30a46c', `st-${i}`)}
            </g>
          ))}
          {stints[0] && cutoff && bar(stints[0].from, cutoff, 3, 'var(--color-fill-3)', 'esn')}
          {stints[0] && (
            <text x={x(stints[0].from) + 6} y={laneY(3) + 15} fontSize={11} fill='var(--color-text-1)'>
              {review.timeline.find((e) => e.host.esn)?.host.esn || review.component.serial_number}
            </text>
          )}
          {review.timeline
            .filter((e) => e.mro)
            .map((e) => (
              <g key={`mro-${e.id}`}>
                <circle cx={x(e.date)} cy={laneY(4) + laneH / 2} r={5} fill='#f76b15' />
                <text x={x(e.date) + 8} y={laneY(4) + 15} fontSize={11} fill='var(--color-text-2)'>
                  {e.mro}
                </text>
              </g>
            ))}
          {cutoff && reviewDate && ms(reviewDate) > ms(cutoff) && (
            <g>
              <rect
                x={x(cutoff)}
                y={laneY(5)}
                width={x(reviewDate) - x(cutoff)}
                height={laneH}
                rx={3}
                fill='url(#wb-hatch-red)'
                stroke='#e5484d'
              />
              <text
                x={(x(cutoff) + x(reviewDate)) / 2}
                y={laneY(5) + 15}
                fontSize={11}
                fill='#e5484d'
                textAnchor='middle'
              >
                {`无记录 ${days(cutoff, reviewDate)} 天`}
              </text>
              <rect
                x={x(cutoff)}
                y={chartTop}
                width={x(reviewDate) - x(cutoff)}
                height={chartH}
                fill='url(#wb-hatch-red)'
                opacity={0.35}
              />
            </g>
          )}
          <text x={LEFT - 8} y={chartTop - 6} fontSize={11} fill='var(--color-text-2)' textAnchor='end'>
            {metric === 'csn' ? '累计循环' : '累计小时'}
          </text>
          {metric === 'csn' && limit != null && (
            <g>
              <line x1={LEFT} x2={W - RIGHT} y1={y(limit)} y2={y(limit)} stroke='#e5484d' strokeWidth={1.5} />
              <text x={LEFT + 6} y={y(limit) - 6} fontSize={11} fill='#e5484d'>
                {`寿命限制 ${fmtN(limit)} 循环`}
              </text>
              {recorded != null && remaining != null && cutoff && (
                <text x={x(cutoff) + 6} y={(y(recorded) + y(limit)) / 2} fontSize={12} fill='#30a46c' fontWeight={600}>
                  {`剩余 ${fmtN(remaining)} 循环`}
                </text>
              )}
            </g>
          )}
          {path && <path d={path} fill='none' stroke='var(--color-text-1)' strokeWidth={2.4} />}
          {review.timeline.map((e, i) => {
            const v = e[metric];
            if (v == null) return null;
            return (
              <g key={e.id} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <circle
                  cx={x(e.date)}
                  cy={y(v)}
                  r={hover === i ? 8 : 6}
                  fill='var(--color-bg-1)'
                  stroke='#30a46c'
                  strokeWidth={2}
                />
                <text x={x(e.date)} y={y(v) + 3} fontSize={9} textAnchor='middle' fill='#30a46c' fontWeight={600}>
                  {i + 1}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      <div className='min-h-18px text-12px text-t-secondary'>
        {hm
          ? `${hm.date}  ${hm.label}  ·  TSN ${hm.tsn == null ? '—' : fmtH(hm.tsn)}  ·  CSN ${hm.csn == null ? '—' : fmtN(hm.csn)}`
          : '鼠标移到圆点上看该节点的日期和读数。横轴是日历年。'}
      </div>
      {view !== 'yearly' && limit != null && recorded != null && (
        <Budget limit={limit} recorded={recorded} estimated={estimated} stints={stints} />
      )}
      {(view === 'full' || view === 'yearly') && <Yearly review={review} />}
    </div>
  );
};

const Budget: React.FC<{ limit: number; recorded: number; estimated: number; stints: Stint[] }> = ({
  limit,
  recorded,
  estimated,
  stints,
}) => {
  const remain = Math.max(0, limit - recorded - estimated);
  const segs = [
    ...stints.map((s, i) => ({
      key: s.from,
      value: s.used_csn ?? 0,
      fill: STINT_COLORS[i % STINT_COLORS.length],
      label: s.host.aircraft || s.operator,
    })),
    ...(estimated > 0
      ? [
          {
            key: 'est',
            value: estimated,
            fill: 'repeating-linear-gradient(45deg,#e5484d,#e5484d 2px,transparent 2px,transparent 5px)',
            label: `无记录期推算 ${fmtN(estimated)}`,
          },
        ]
      : []),
    { key: 'rem', value: remain, fill: 'var(--color-fill-3)', label: `剩余 ${fmtN(remain)}` },
  ].filter((s) => s.value > 0);
  return (
    <div>
      <div className='flex h-28px overflow-hidden rd-4px'>
        {segs.map((s) => (
          <div key={s.key} style={{ width: `${(s.value / limit) * 100}%`, background: s.fill }} title={s.label} />
        ))}
      </div>
      <div className='mt-4px text-11px text-t-tertiary'>
        {`横轴：累计循环，0 到寿命限制 ${fmtN(limit)}。竖线位置是有据可查的 ${fmtN(recorded)}。无记录期是按最后一段利用率推算的风险，不是记录值。`}
      </div>
    </div>
  );
};

const Yearly: React.FC<{ review: ComponentReview }> = ({ review }) => (
  <div className='overflow-x-auto'>
    <table className='w-full text-12px text-t-secondary border-collapse'>
      <thead>
        <tr className='text-t-tertiary text-left'>
          <th className='py-4px font-500'>在翼段</th>
          <th className='font-500'>运营商</th>
          <th className='font-500'>飞机</th>
          <th className='font-500 text-right'>使用循环</th>
          <th className='font-500 text-right'>使用小时</th>
        </tr>
      </thead>
      <tbody>
        {review.stints.map((s) => (
          <tr key={`${s.from}-${s.to}`} className='border-t border-t-solid border-[var(--color-border-2)]'>
            <td className='py-4px'>{`${s.from} → ${s.to}`}</td>
            <td>{s.operator || '—'}</td>
            <td>{`${s.host.aircraft || '—'}${s.host.position ? ` · ${s.host.position}` : ''}`}</td>
            <td className='text-right'>{s.used_csn == null ? '—' : fmtN(s.used_csn)}</td>
            <td className='text-right'>{s.used_tsn == null ? '—' : fmtH(s.used_tsn)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default LifeTrack;
