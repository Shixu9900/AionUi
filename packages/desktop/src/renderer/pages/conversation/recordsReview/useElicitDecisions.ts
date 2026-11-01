/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { ipcBridge } from '@/common';
import { projectFileRef } from '@/common/types/chatFile';
import {
  RECORDS_REVIEW_DECISIONS_FILE,
  type ElicitFile,
  type ElicitItem,
  type ElicitStance,
} from '@/common/types/recordsReview';

const emptyFile = (): ElicitFile => ({
  schema: 'aviator.records-review.decisions/v1',
  items: [],
});

export const useElicitDecisions = (peId: string | null) => {
  const [file, setFile] = useState<ElicitFile>(emptyFile());

  useEffect(() => {
    if (!peId) return;
    const ref = projectFileRef(peId, RECORDS_REVIEW_DECISIONS_FILE);
    void ipcBridge.fs.readContent
      .invoke({ file: ref, encoding: 'utf8' })
      .then((text) => {
        const parsed = JSON.parse(text) as ElicitFile;
        if (parsed.schema === 'aviator.records-review.decisions/v1' && Array.isArray(parsed.items)) {
          setFile(parsed);
        }
      })
      .catch(() => {
        setFile(emptyFile());
      });
  }, [peId]);

  const save = useCallback(
    async (next: ElicitFile) => {
      if (!peId) return;
      setFile(next);
      await ipcBridge.fs.writeContent.invoke({
        file: projectFileRef(peId, RECORDS_REVIEW_DECISIONS_FILE),
        data: JSON.stringify(next, null, 2),
      });
    },
    [peId]
  );

  const setStance = useCallback(
    (target: ElicitItem['target'], id: string, stance: ElicitStance, reason: string) => {
      const item: ElicitItem = { target, id, stance, reason, at: new Date().toISOString() };
      const items = file.items.filter((i) => !(i.target === target && i.id === id));
      void save({ schema: 'aviator.records-review.decisions/v1', items: [...items, item] });
    },
    [file.items, save]
  );

  const lookup = useCallback(
    (target: ElicitItem['target'], id: string) => file.items.find((i) => i.target === target && i.id === id),
    [file.items]
  );

  return { items: file.items, setStance, lookup };
};
