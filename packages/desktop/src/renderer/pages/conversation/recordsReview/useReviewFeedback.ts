/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { ipcBridge } from '@/common';
import { projectFileRef } from '@/common/types/chatFile';
import {
  RECORDS_REVIEW_FEEDBACK_FILE,
  type FeedbackAction,
  type FeedbackFile,
  type FeedbackItem,
} from '@/common/types/recordsReview';

const emptyFile = (): FeedbackFile => ({
  schema: 'aviator.review-feedback/v1',
  items: [],
});

export const useReviewFeedback = (peId: string | null) => {
  const [file, setFile] = useState<FeedbackFile>(emptyFile());

  useEffect(() => {
    if (!peId) return;
    const ref = projectFileRef(peId, RECORDS_REVIEW_FEEDBACK_FILE);
    void ipcBridge.fs.readContent
      .invoke({ file: ref, encoding: 'utf8' })
      .then((text) => {
        const parsed = JSON.parse(text) as FeedbackFile;
        if (parsed.schema === 'aviator.review-feedback/v1' && Array.isArray(parsed.items)) {
          setFile(parsed);
        }
      })
      .catch(() => {
        setFile(emptyFile());
      });
  }, [peId]);

  const save = useCallback(
    async (next: FeedbackFile) => {
      if (!peId) return;
      setFile(next);
      await ipcBridge.fs.writeContent.invoke({
        file: projectFileRef(peId, RECORDS_REVIEW_FEEDBACK_FILE),
        data: JSON.stringify(next, null, 2),
      });
    },
    [peId]
  );

  const record = useCallback(
    (item: Omit<FeedbackItem, 'at'>) => {
      const nextItem: FeedbackItem = { ...item, at: new Date().toISOString() };
      const items = file.items.filter((row) => !(row.decision_id === item.decision_id && row.field === item.field));
      void save({ schema: 'aviator.review-feedback/v1', items: [...items, nextItem] });
    },
    [file.items, save]
  );

  const lookup = useCallback(
    (decisionId: string, field: string) => file.items.find((row) => row.decision_id === decisionId && row.field === field),
    [file.items]
  );

  return { items: file.items, record, lookup, accept: (item: Omit<FeedbackItem, 'at' | 'action'>) => record({ ...item, action: 'accepted' as FeedbackAction }) };
};
