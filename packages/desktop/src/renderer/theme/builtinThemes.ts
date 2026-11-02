/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Theme } from '@/common/theme/types';
import { LIGHT_THEME_ID, DARK_THEME_ID } from '@/common/theme/constants';
import { defaultThemeCover } from '@renderer/pages/settings/AppearanceSettings/themeCovers';
import { AVIATOR_BUILTIN_THEMES } from './aviatorBuiltinThemes';

const T0 = 0;

// Official baselines stay first: Light, Dark, then Aviator builtins.
// "Follow system" is not listed here — resolveActiveTheme maps that sentinel to Light/Dark.
// Removed community skins still fall back to Light when a persisted activeId names one.
export const BUILTIN_THEMES: Theme[] = [
  {
    id: LIGHT_THEME_ID,
    name: 'Light',
    appearance: 'light',
    cover: defaultThemeCover,
    builtin: true,
    created_at: T0,
    updated_at: T0,
  },
  { id: DARK_THEME_ID, name: 'Dark', appearance: 'dark', builtin: true, created_at: T0, updated_at: T0 },
  ...AVIATOR_BUILTIN_THEMES,
];

export const BUILTIN_THEME_IDS = new Set(BUILTIN_THEMES.map((t) => t.id));
