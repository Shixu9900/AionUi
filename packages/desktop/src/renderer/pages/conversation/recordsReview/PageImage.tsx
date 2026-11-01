/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import type { Bbox } from '@/common/types/recordsReview';
import { renderPage, type PageImage } from './pdfPages';

const usePage = (url: string | null, page: number, width: number): PageImage | null | 'error' => {
  const [image, setImage] = useState<PageImage | null | 'error'>(null);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    setImage(null);
    renderPage(url, page, width).then(
      (img) => alive && setImage(img),
      () => alive && setImage('error')
    );
    return () => {
      alive = false;
    };
  }, [url, page, width]);
  return image;
};

const Placeholder: React.FC<{ height: number; failed?: boolean }> = ({ height, failed }) => (
  <div
    className='flex items-center justify-center text-11px text-t-tertiary bg-fill-2'
    style={{ height, borderRadius: 4 }}
  >
    {failed ? '页面无法渲染' : '…'}
  </div>
);

/** Whole page, red box over the extracted value. */
export const PageThumb: React.FC<{ url: string | null; page: number; bbox: Bbox | null; width: number }> = ({
  url,
  page,
  bbox,
  width,
}) => {
  const image = usePage(url, page, width);
  if (image === null || image === 'error') return <Placeholder height={width * 0.75} failed={image === 'error'} />;
  const [x0, y0, x1, y1] = bbox ?? [0, 0, 0, 0];
  return (
    <div className='relative overflow-hidden bg-white' style={{ width, borderRadius: 4 }}>
      <img src={image.src} alt='' draggable={false} style={{ width: '100%', display: 'block' }} />
      {bbox && (
        <div
          className='absolute pointer-events-none'
          style={{
            left: `${x0 * 100}%`,
            top: `${y0 * 100}%`,
            width: `${(x1 - x0) * 100}%`,
            height: `${(y1 - y0) * 100}%`,
            outline: '2px solid #e5484d',
            outlineOffset: 2,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.04)',
          }}
        />
      )}
    </div>
  );
};

export type PageOverlay = { bbox: Bbox; color: string };

/** Full page with issue/block overlays and optional click-drag annotation. */
export const PageCanvas: React.FC<{
  url: string | null;
  page: number;
  width: number;
  overlays: PageOverlay[];
  draft: Bbox | null;
  onDraft: (bbox: Bbox | null) => void;
}> = ({ url, page, width, overlays, draft, onDraft }) => {
  const image = usePage(url, page, width);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  if (image === null || image === 'error') return <Placeholder height={width * 1.3} failed={image === 'error'} />;

  const toNorm = (el: HTMLDivElement, clientX: number, clientY: number): [number, number] => {
    const rect = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    return [x, y];
  };

  return (
    <div
      className='relative overflow-hidden bg-white'
      style={{ width, borderRadius: 4, cursor: 'crosshair' }}
      onMouseDown={(e) => {
        const [x, y] = toNorm(e.currentTarget, e.clientX, e.clientY);
        setOrigin({ x, y });
        onDraft([x, y, x, y]);
      }}
      onMouseMove={(e) => {
        if (!origin) return;
        const [x, y] = toNorm(e.currentTarget, e.clientX, e.clientY);
        onDraft([Math.min(origin.x, x), Math.min(origin.y, y), Math.max(origin.x, x), Math.max(origin.y, y)]);
      }}
      onMouseUp={() => setOrigin(null)}
      onMouseLeave={() => setOrigin(null)}
    >
      <img src={image.src} alt='' draggable={false} style={{ width: '100%', display: 'block' }} />
      {overlays.map((overlay, i) => (
        <Box key={`${overlay.color}-${i}`} bbox={overlay.bbox} color={overlay.color} />
      ))}
      {draft && <Box bbox={draft} color='#3b82f6' />}
    </div>
  );
};

const Box: React.FC<{ bbox: Bbox; color: string }> = ({ bbox, color }) => {
  const [x0, y0, x1, y1] = bbox;
  return (
    <div
      className='absolute pointer-events-none'
      style={{
        left: `${x0 * 100}%`,
        top: `${y0 * 100}%`,
        width: `${Math.max(x1 - x0, 0.004) * 100}%`,
        height: `${Math.max(y1 - y0, 0.004) * 100}%`,
        outline: `2px solid ${color}`,
        background: `${color}22`,
      }}
    />
  );
};

/** Magnified crop centred on the value, so the number is legible on a small card. */
export const PageLens: React.FC<{ url: string | null; page: number; bbox: Bbox; width: number; height: number }> = ({
  url,
  page,
  bbox,
  width,
  height,
}) => {
  const image = usePage(url, page, 1400);
  if (image === null || image === 'error') return <Placeholder height={height} failed={image === 'error'} />;
  const [x0, y0, x1, y1] = bbox;
  const regionW = Math.max((x1 - x0) / 0.35, 0.14);
  const imgW = width / regionW;
  const imgH = imgW * (image.height / image.width);
  const left = width / 2 - ((x0 + x1) / 2) * imgW;
  const top = height / 2 - ((y0 + y1) / 2) * imgH;
  return (
    <div className='relative overflow-hidden bg-white' style={{ width, height, borderRadius: 4 }}>
      <img
        src={image.src}
        alt=''
        draggable={false}
        style={{ position: 'absolute', left, top, width: imgW, height: imgH, maxWidth: 'none' }}
      />
      <div
        className='absolute pointer-events-none'
        style={{
          left: left + x0 * imgW - 3,
          top: top + y0 * imgH - 3,
          width: (x1 - x0) * imgW + 6,
          height: (y1 - y0) * imgH + 6,
          border: '2px solid #e5484d',
          borderRadius: 3,
        }}
      />
    </div>
  );
};
