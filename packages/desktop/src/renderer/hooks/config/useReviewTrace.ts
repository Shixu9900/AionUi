import { useCallback, useMemo } from 'react';
import { configService } from '@/common/config/configService';
import { uuid } from '@/common/utils';
import type { ReviewAction } from '@/common/types/aircraftProject';
import { useConfig } from './useConfig';

export type ReviewActionDraft = Omit<ReviewAction, 'id' | 'projectId' | 'at'>;

export type ReviewRubric = { correct: number; wrong: number; supplement: number; judged: number };

const EMPTY: ReviewAction[] = [];

export function useReviewTrace(projectId: string | undefined) {
  const [stored, setStored] = useConfig('aviator.reviewActions');
  const all = stored ?? EMPTY;

  const actions = useMemo(
    () => all.filter((a) => a.projectId === projectId).toSorted((a, b) => b.at - a.at),
    [all, projectId]
  );

  const latest = useMemo(() => {
    const map = new Map<string, ReviewAction>();
    for (const action of actions) {
      if (action.choice !== 'readiness' && !map.has(action.target)) map.set(action.target, action);
    }
    return map;
  }, [actions]);

  const rubric = useMemo<ReviewRubric>(() => {
    const out: ReviewRubric = { correct: 0, wrong: 0, supplement: 0, judged: 0 };
    for (const action of latest.values()) {
      if (action.choice === 'readiness') continue;
      out[action.choice] += 1;
      out.judged += 1;
    }
    return out;
  }, [latest]);

  const record = useCallback(
    async (draft: ReviewActionDraft) => {
      if (!projectId) return;
      // Read the live value: two records in one handler must not overwrite each other.
      const current = configService.get('aviator.reviewActions') ?? EMPTY;
      await setStored([...current, { ...draft, id: uuid(), projectId, at: Date.now() }]);
    },
    [projectId, setStored]
  );

  return { actions, latest, rubric, record };
}
