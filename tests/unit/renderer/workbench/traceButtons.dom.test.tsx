/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ReviewAction } from '@/common/types/aircraftProject';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TraceButtons, { CHOICE_COLOR } from '@/renderer/pages/workbench/TraceButtons';
import styles from '@/renderer/pages/workbench/TraceButtons/TraceButtons.module.css';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en-US' },
  }),
}));

const LABELS = [
  '✓ conversation.workbench.trace.correct',
  '✕ conversation.workbench.trace.wrong',
  '+ conversation.workbench.trace.supplement',
];

const action = (choice: ReviewAction['choice'], note?: string): ReviewAction => ({
  id: 'a1',
  projectId: 'p1',
  at: 1,
  target: 'tsn',
  label: 'TSN',
  systemValue: '100',
  choice,
  note,
});

const traceCss = () =>
  readFileSync(
    path.resolve('packages/desktop/src/renderer/pages/workbench/TraceButtons/TraceButtons.module.css'),
    'utf8'
  );

describe('TraceButtons cabin chips', () => {
  afterEach(() => {
    cleanup();
  });

  it('keeps correct, wrong, then supplement with their glyphs', () => {
    render(<TraceButtons label='TSN' systemValue='100' onRecord={vi.fn().mockResolvedValue(undefined)} />);
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(LABELS);
  });

  it('records a correct judgement immediately and leaves the other chips idle', async () => {
    const onRecord = vi.fn().mockResolvedValue(undefined);
    render(<TraceButtons label='TSN' systemValue='100' onRecord={onRecord} />);
    await userEvent.click(screen.getByRole('button', { name: LABELS[0] }));
    expect(onRecord).toHaveBeenCalledWith('correct');
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]?.classList.contains(styles.correct)).toBe(true);
    expect(buttons[0]?.classList.contains(styles.correctActive)).toBe(false);
  });

  it('fills the latest choice and ignores a readiness mark', () => {
    const { rerender } = render(
      <TraceButtons label='TSN' systemValue='100' latest={action('wrong', 'page 4')} onRecord={vi.fn()} />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual(LABELS);
    expect(buttons[1]?.classList.contains(styles.wrongActive)).toBe(true);
    expect(buttons[0]?.classList.contains(styles.correctActive)).toBe(false);
    expect(buttons[2]?.classList.contains(styles.supplementActive)).toBe(false);
    expect(screen.getByText('page 4')).toBeTruthy();

    rerender(
      <TraceButtons
        label='TSN'
        systemValue='100'
        latest={action('readiness')}
        onRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );
    for (const button of screen.getAllByRole('button')) {
      expect(button.classList.contains(styles.correctActive)).toBe(false);
      expect(button.classList.contains(styles.wrongActive)).toBe(false);
      expect(button.classList.contains(styles.supplementActive)).toBe(false);
    }
  });

  it('does not record when the chips are disabled', async () => {
    const onRecord = vi.fn().mockResolvedValue(undefined);
    render(<TraceButtons label='TSN' systemValue='100' disabled onRecord={onRecord} />);
    await userEvent.click(screen.getByRole('button', { name: LABELS[0] }));
    expect(onRecord).not.toHaveBeenCalled();
  });

  it('asks for a note before recording a wrong judgement', async () => {
    const onRecord = vi.fn().mockResolvedValue(undefined);
    render(<TraceButtons label='TSN' systemValue='100' onRecord={onRecord} />);
    await userEvent.click(screen.getByRole('button', { name: LABELS[1] }));
    expect(onRecord).not.toHaveBeenCalled();
    expect(screen.getByText('conversation.workbench.trace.systemValue')).toBeTruthy();
  });

  it('paints status chips from success, danger, and primary tokens', () => {
    const css = traceCss();
    expect(CHOICE_COLOR.correct).toContain('var(--success)');
    expect(CHOICE_COLOR.wrong).toContain('var(--danger)');
    expect(CHOICE_COLOR.supplement).toBe('var(--primary)');
    expect(CHOICE_COLOR.supplement).not.toContain('#3b82f6');
    expect(css).toContain('-webkit-appearance: none');
    expect(css).toContain('appearance: none');
    expect(css).toContain('border-radius: 999px');
    expect(css).toContain('color-mix(in srgb, var(--success) 16%, transparent)');
    expect(css).toContain('color-mix(in srgb, var(--danger) 16%, transparent)');
    expect(css).toContain('color-mix(in srgb, var(--primary) 14%, transparent)');
    expect(css).toContain('background-color: var(--success)');
    expect(css).toContain('background-color: var(--danger)');
    expect(css).toContain('background-color: var(--primary)');
    expect(css).toContain('color: var(--inverse)');
    expect(css).toContain('color: var(--text-white)');
    expect(css).not.toContain('#3b82f6');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});
