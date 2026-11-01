/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawnSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const KNOWLEDGE_ROOT = path.resolve(
  process.env.AVIATOR_WORKSPACE || '/Users/9900macbook/Aviator-workspace/aviator',
  'knowledge'
);

function resolveKnowledgePath(relativePath: string): string {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new Error('knowledge file path must be relative');
  }
  const abs = path.resolve(KNOWLEDGE_ROOT, relativePath);
  const rel = path.relative(KNOWLEDGE_ROOT, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('knowledge file path is outside knowledge/');
  }
  return abs;
}

function projectIndex(indexPath: string): void {
  const corpusRoot = path.resolve(KNOWLEDGE_ROOT, '../../corpus');
  const dbPath = path.join(corpusRoot, 'var', 'corpus.sqlite');
  const result = spawnSync(
    process.env.CORPUS_PYTHON || 'python3',
    ['-m', 'corpus_kb', 'project-index', indexPath, '--db', dbPath],
    { cwd: corpusRoot, encoding: 'utf8' }
  );
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || '知识库投影失败').trim());
  }
}

export function createKnowledgeFileService() {
  return {
    async readFile({ relativePath }: { relativePath: string }): Promise<string> {
      try {
        return await fs.readFile(resolveKnowledgePath(relativePath), 'utf8');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
        throw error;
      }
    },

    async writeFile({ relativePath, data }: { relativePath: string; data: string }): Promise<boolean> {
      const abs = resolveKnowledgePath(relativePath);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, data, 'utf8');
      if (relativePath === 'index.json') projectIndex(abs);
      return true;
    },
  };
}
