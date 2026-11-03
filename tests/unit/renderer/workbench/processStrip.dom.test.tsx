/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProcessStrip from '@/renderer/pages/workbench/ProcessStrip';
import styles from '@/renderer/pages/workbench/ProcessStrip/ProcessStrip.module.css';
import { getWorkbenchState, patchWorkbench } from '@/renderer/pages/workbench/workbenchStore';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en-US' },
  }),
}));

const DRIVE_KEYS = [
  'conversation.workbench.drives.verdict',
  'conversation.workbench.drives.llp',
  'conversation.workbench.drives.remain',
  'conversation.workbench.drives.source',
  'conversation.workbench.drives.gap',
  'conversation.workbench.drives.files',
  'conversation.workbench.drives.report',
];

const resetWorkbench = () => {
  patchWorkbench({
    driveId: 'verdict',
    page: 'overview',
    subject: 'aircraft',
    focus: 'summary',
    lifeView: 'full',
    evMetric: 'all',
  });
};

const driveCss = () =>
  readFileSync(
    path.resolve('packages/desktop/src/renderer/pages/workbench/ProcessStrip/ProcessStrip.module.css'),
    'utf8'
  );

describe('ProcessStrip cabin chips', () => {
  beforeEach(() => {
    resetWorkbench();
  });

  afterEach(() => {
    cleanup();
    resetWorkbench();
  });

  it('keeps the seven drives in order and marks only the active one', () => {
    render(<ProcessStrip />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual(DRIVE_KEYS);
    expect(buttons[0]?.classList.contains(styles.driveActive)).toBe(true);
    expect(buttons.slice(1).every((button) => !button.classList.contains(styles.driveActive))).toBe(true);
  });

  it('does not glow a drive when the stored id matches none of them', () => {
    patchWorkbench({ driveId: 'missing' });
    render(<ProcessStrip />);
    for (const button of screen.getAllByRole('button')) {
      expect(button.classList.contains(styles.driveActive)).toBe(false);
      expect(button.classList.contains(styles.drive)).toBe(true);
    }
  });

  it('patches the workbench from the clicked drive without reordering the strip', async () => {
    render(<ProcessStrip />);
    await userEvent.click(screen.getByRole('button', { name: 'conversation.workbench.drives.llp' }));
    expect(getWorkbenchState()).toMatchObject({
      driveId: 'llp',
      page: 'llp',
      subject: 'aircraft',
      focus: 'summary',
      lifeView: 'full',
      evMetric: 'all',
    });
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(DRIVE_KEYS);
    expect(
      screen.getByRole('button', { name: 'conversation.workbench.drives.llp' }).classList.contains(styles.driveActive)
    ).toBe(true);
  });

  it('resets native button chrome onto workspace capsules and an amber selected glow', () => {
    const css = driveCss();
    expect(css).toContain('-webkit-appearance: none');
    expect(css).toContain('appearance: none');
    expect(css).toContain('background-color: var(--workspace-btn-bg)');
    expect(css).toContain('border-radius: 999px');
    expect(css).toContain('color: var(--text-secondary)');
    expect(css).toContain('background-color: var(--bg-hover)');
    expect(css).toContain('color: var(--text-primary)');
    expect(css).toContain('background-color: var(--brand-light)');
    expect(css).toContain('border-color: var(--primary)');
    expect(css).toContain('color: var(--brand-hover)');
    expect(css).toContain('color-mix(in srgb, var(--primary) 35%, transparent)');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});
