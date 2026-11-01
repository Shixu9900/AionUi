/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

export type PageImage = {
  src: string;
  width: number;
  height: number;
};

const documents = new Map<string, Promise<PDFDocumentProxy>>();
const images = new Map<string, Promise<PageImage>>();

const loadDocument = (url: string): Promise<PDFDocumentProxy> => {
  let doc = documents.get(url);
  if (!doc) {
    doc = getDocument({ url }).promise;
    doc.catch(() => documents.delete(url));
    documents.set(url, doc);
  }
  return doc;
};

/**
 * Render one page (1-based) at `width` CSS px to an object URL. Rotation
 * flags are applied, so normalized boxes from the records package — which are
 * in displayed-page space — overlay the image directly.
 */
export const renderPage = (url: string, pageNumber: number, width: number): Promise<PageImage> => {
  const bucket = width <= 240 ? 240 : width <= 640 ? 640 : 1400;
  const key = `${url}#${pageNumber}@${bucket}`;
  let image = images.get(key);
  if (!image) {
    image = (async () => {
      const doc = await loadDocument(url);
      const page = await doc.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: (bucket * window.devicePixelRatio) / base.width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('page render failed'))), 'image/jpeg', 0.88)
      );
      return { src: URL.createObjectURL(blob), width: viewport.width, height: viewport.height };
    })();
    image.catch(() => images.delete(key));
    images.set(key, image);
  }
  return image;
};
