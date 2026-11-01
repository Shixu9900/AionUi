import { useCallback, useMemo } from 'react';
import { uuid } from '@/common/utils';
import type { AircraftProject } from '@/common/types/aircraftProject';
import { useConfig } from './useConfig';

export type AircraftProjectDraft = Omit<AircraftProject, 'id' | 'createdAt' | 'updatedAt'>;

const EMPTY: AircraftProject[] = [];

export function useAircraftProjects() {
  const [stored, setStored] = useConfig('aviator.projects');
  const projects = stored ?? EMPTY;

  const sorted = useMemo(() => projects.toSorted((a, b) => b.updatedAt - a.updatedAt), [projects]);

  const createProject = useCallback(
    async (draft: AircraftProjectDraft): Promise<AircraftProject> => {
      const now = Date.now();
      const project: AircraftProject = { ...draft, id: uuid(), createdAt: now, updatedAt: now };
      await setStored([project, ...projects]);
      return project;
    },
    [projects, setStored]
  );

  const updateProject = useCallback(
    async (id: string, draft: AircraftProjectDraft) => {
      await setStored(projects.map((p) => (p.id === id ? { ...p, ...draft, updatedAt: Date.now() } : p)));
    },
    [projects, setStored]
  );

  const patchProject = useCallback(
    async (id: string, patch: Partial<AircraftProjectDraft>) => {
      await setStored(projects.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)));
    },
    [projects, setStored]
  );

  const removeProject = useCallback(
    async (id: string) => {
      await setStored(projects.filter((p) => p.id !== id));
    },
    [projects, setStored]
  );

  return { projects: sorted, createProject, updateProject, patchProject, removeProject };
}
