/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import useSWR from 'swr';
import { ipcBridge } from '@/common';
import { projectFileRef } from '@/common/types/chatFile';
import type { ChatFileRef } from '@/common/types/chatFile';
import { RECORDS_REVIEW_PACKAGE_FILE } from '@/common/types/recordsReview';
import type { ComponentReview, RecordsReviewPackage } from '@/common/types/recordsReview';
import { buildFileStreamUrl } from '@/renderer/utils/file/fileUrls';

export type RecordsReviewState =
  | { status: 'empty' }
  | {
      status: 'ready';
      peId: string;
      review: ComponentReview;
      fileUrl: (relativePath: string) => string;
      ref: ChatFileRef;
    };

/**
 * Locate `records-review.json` at a project root (workspace first, then
 * attached folders) and have aioncore compute the review from it.
 */
export const useRecordsReview = (projectId: string | null) => {
  const { data: detail } = useSWR(projectId ? `explorer-project/${projectId}` : null, (key: string) =>
    ipcBridge.project.get.invoke({ project_id: key.slice('explorer-project/'.length) })
  );
  const entries = detail && detail.project_id === projectId ? detail.explorer.entries : [];
  const roots = entries.toSorted((a, b) => Number(b.role === 'workspace') - Number(a.role === 'workspace'));
  const key =
    projectId && roots.length > 0 ? `records-review/${projectId}/${roots.map((r) => r.pe_id).join(',')}` : null;

  const swr = useSWR<RecordsReviewState>(
    key,
    async () => {
      const refs = roots.map((root) => projectFileRef(root.pe_id, RECORDS_REVIEW_PACKAGE_FILE));
      const reads = await Promise.allSettled(
        refs.map((file) => ipcBridge.fs.readContent.invoke({ file, encoding: 'utf8' }))
      );
      const hit = reads.findIndex((r) => r.status === 'fulfilled');
      const read = reads[hit];
      if (!read || read.status !== 'fulfilled') return { status: 'empty' };
      const pkg = JSON.parse(read.value) as RecordsReviewPackage;
      const review = await ipcBridge.recordsReview.compute.invoke(pkg);
      const peId = roots[hit].pe_id;
      return {
        status: 'ready',
        peId,
        review,
        ref: refs[hit],
        fileUrl: (relativePath: string) => buildFileStreamUrl(projectFileRef(peId, relativePath)),
      };
    },
    { revalidateOnFocus: false }
  );
  return swr;
};
