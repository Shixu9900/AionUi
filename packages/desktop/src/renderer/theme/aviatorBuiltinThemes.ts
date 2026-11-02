/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Theme, ThemeAppearance, TokenMap } from '@/common/theme/types';
import {
  AVIATOR_ALLOY_THEME_ID,
  AVIATOR_BLUE_THEME_ID,
  AVIATOR_HC_DARK_THEME_ID,
  AVIATOR_HC_LIGHT_THEME_ID,
  AVIATOR_NIGHT_CRUISE_THEME_ID,
  AVIATOR_PARCHMENT_THEME_ID,
} from '@/common/theme/constants';

const T0 = 0;

/**
 * Single-appearance builtins put every override on the matching
 * `tokens.light` / `tokens.dark` layer. A flat `:root` map is specificity
 * (0,1,0) and loses to the dark baseline
 * `[data-color-scheme='default'][data-theme='dark']` (0,2,0). The appearance
 * layer emits `:root[data-theme]` (0,2,0), which wins because `#theme-tokens`
 * is appended last.
 */
function aviatorTheme(id: string, name: string, appearance: ThemeAppearance, tokens: TokenMap): Theme {
  return {
    id,
    name,
    appearance,
    tokens: appearance === 'dark' ? { dark: tokens } : { light: tokens },
    builtin: true,
    created_at: T0,
    updated_at: T0,
  };
}

/** Night Cruise — dark. Pale amber flood, near-black / warm charcoal panels. */
const NIGHT_CRUISE_TOKENS: TokenMap = {
  '--bg-base': '#0B0C0E',
  '--bg-1': '#161310',
  '--bg-2': '#1C1916',
  '--bg-3': '#24201C',
  '--bg-6': '#A89880',
  '--bg-hover': '#2A261F',
  '--bg-active': '#322C26',
  '--text-primary': '#EDE6D8',
  '--text-secondary': '#A89880',
  '--text-disabled': '#6A6054',
  '--text-white': '#EDE6D8',
  '--border-base': '#3A342E',
  '--border-light': '#2A261F',
  '--border-special': '#4A423A',
  '--primary': '#C4A574',
  '--success': '#2E7D32',
  '--warning': '#E0A020',
  '--danger': '#D32F2F',
  '--info': '#C4A574',
  '--limit': '#A878C8',
  '--brand': '#C4A574',
  '--brand-light': '#2A2418',
  '--brand-hover': '#D4B888',
  '--message-user-bg': '#1C1916',
  '--message-tips-bg': '#141210',
  '--workspace-btn-bg': '#24201C',
  '--thought-gradient': 'linear-gradient(90deg, #2A2418 0%, #1C1916 100%)',
  '--fill': '#1C1916',
  '--fill-0': '#161310',
  '--dialog-fill-0': '#161310',
  '--inverse': '#0B0C0E',
};

/** Aviator Blue — light. ASI brand blue on cool paper. */
const AVIATOR_BLUE_TOKENS: TokenMap = {
  '--bg-base': '#F7F9FC',
  '--bg-1': '#F1F5F9',
  '--bg-2': '#EAF2FC',
  '--bg-3': '#D7E0EB',
  '--bg-6': '#718097',
  '--bg-hover': '#EAF2FC',
  '--bg-active': '#DCE6F0',
  '--text-primary': '#0B1F4D',
  '--text-secondary': '#465875',
  '--text-disabled': '#718097',
  '--text-white': '#FFFFFF',
  '--border-base': '#D0DBE8',
  '--border-light': '#E8EEF5',
  '--border-special': '#C5D2E0',
  '--primary': '#1E6BFF',
  '--success': '#2E7D32',
  '--warning': '#E0A020',
  '--danger': '#D32F2F',
  '--info': '#1E6BFF',
  '--limit': '#9B4DCA',
  '--brand': '#1E6BFF',
  '--brand-light': '#EAF2FC',
  '--brand-hover': '#1554D6',
  '--message-user-bg': '#F7F9FC',
  '--message-tips-bg': '#EAF2FC',
  '--workspace-btn-bg': '#EAF2FC',
  '--thought-gradient': 'linear-gradient(90deg, #EAF2FC 0%, #F7F9FC 100%)',
  '--fill': '#F3F6FA',
  '--fill-0': '#FFFFFF',
  '--dialog-fill-0': '#FFFFFF',
  '--inverse': '#FFFFFF',
};

/** Parchment — light. Warm paper, ink blue-gray accent. */
const PARCHMENT_TOKENS: TokenMap = {
  '--bg-base': '#F8F2E6',
  '--bg-1': '#F2E9DA',
  '--bg-2': '#FBF7EE',
  '--bg-3': '#EADFC9',
  '--bg-6': '#9A9080',
  '--bg-hover': '#F0E8D8',
  '--bg-active': '#EADFC9',
  '--text-primary': '#2C2418',
  '--text-secondary': '#5C5346',
  '--text-disabled': '#A89880',
  '--text-white': '#FDF9F0',
  '--border-base': '#DCCFB8',
  '--border-light': '#EADFC9',
  '--border-special': '#C4B69A',
  '--primary': '#3D5A73',
  '--success': '#2E7D32',
  '--warning': '#E0A020',
  '--danger': '#D32F2F',
  '--info': '#3D5A73',
  '--limit': '#9B4DCA',
  '--brand': '#3D5A73',
  '--brand-light': '#DCE4EC',
  '--brand-hover': '#4A6D8C',
  '--message-user-bg': '#F5EDDF',
  '--message-tips-bg': '#F0E6D4',
  '--workspace-btn-bg': '#EADFC9',
  '--thought-gradient': 'linear-gradient(90deg, #F2E9DA 0%, #F8F2E6 100%)',
  '--fill': '#FBF7EE',
  '--fill-0': '#FDF9F0',
  '--dialog-fill-0': '#FDF9F0',
  '--inverse': '#FFFFFF',
};

/** Alloy — light. Cold silver / gunmetal. */
const ALLOY_TOKENS: TokenMap = {
  '--bg-base': '#F4F5F7',
  '--bg-1': '#ECEEF1',
  '--bg-2': '#E2E5E9',
  '--bg-3': '#D0D5DB',
  '--bg-6': '#7A8490',
  '--bg-hover': '#E6E9ED',
  '--bg-active': '#DCE0E5',
  '--text-primary': '#2C3238',
  '--text-secondary': '#5A636C',
  '--text-disabled': '#9AA3AD',
  '--text-white': '#FFFFFF',
  '--border-base': '#D0D5DB',
  '--border-light': '#E2E5E9',
  '--border-special': '#C0C6CE',
  '--primary': '#5A6B7D',
  '--success': '#2E7D32',
  '--warning': '#E0A020',
  '--danger': '#D32F2F',
  '--info': '#5A6B7D',
  '--limit': '#9B3D9B',
  '--brand': '#5A6B7D',
  '--brand-light': '#E8ECF0',
  '--brand-hover': '#6B7C8F',
  '--message-user-bg': '#E4E7EB',
  '--message-tips-bg': '#EEF0F3',
  '--workspace-btn-bg': '#E8EAEE',
  '--thought-gradient': 'linear-gradient(90deg, #E8ECF0 0%, #ECEEF1 100%)',
  '--fill': '#EEF0F3',
  '--fill-0': '#FFFFFF',
  '--dialog-fill-0': '#FFFFFF',
  '--inverse': '#FFFFFF',
};

/** Light HC — light high contrast. Near-white ground, Okabe blue accent. */
const HC_LIGHT_TOKENS: TokenMap = {
  '--bg-base': '#FFFFFF',
  '--bg-1': '#F2F2F2',
  '--bg-2': '#FAFAFA',
  '--bg-3': '#E8E8E8',
  '--bg-6': '#555555',
  '--bg-hover': '#EEEEEE',
  '--bg-active': '#E0E0E0',
  '--text-primary': '#111111',
  '--text-secondary': '#333333',
  '--text-disabled': '#777777',
  '--text-white': '#FFFFFF',
  '--border-base': '#111111',
  '--border-light': '#444444',
  '--border-special': '#222222',
  '--primary': '#0072B2',
  '--success': '#2E7D32',
  '--warning': '#E0A020',
  '--danger': '#D32F2F',
  '--info': '#0072B2',
  '--limit': '#CC79A7',
  '--brand': '#0072B2',
  '--brand-light': '#D6EAF5',
  '--brand-hover': '#005A8C',
  '--message-user-bg': '#F5F5F5',
  '--message-tips-bg': '#EEEEEE',
  '--workspace-btn-bg': '#E8E8E8',
  '--thought-gradient': 'linear-gradient(90deg, #D6EAF5 0%, #F2F2F2 100%)',
  '--fill': '#FAFAFA',
  '--fill-0': '#FFFFFF',
  '--dialog-fill-0': '#FFFFFF',
  '--inverse': '#FFFFFF',
};

/** Dark HC — dark high contrast. Near-black ground, sky-blue accent, bright status. */
const HC_DARK_TOKENS: TokenMap = {
  '--bg-base': '#0A0A0A',
  '--bg-1': '#141414',
  '--bg-2': '#1A1A1A',
  '--bg-3': '#2A2A2A',
  '--bg-6': '#BBBBBB',
  '--bg-hover': '#222222',
  '--bg-active': '#2E2E2E',
  '--text-primary': '#F5F5F5',
  '--text-secondary': '#DDDDDD',
  '--text-disabled': '#888888',
  '--text-white': '#FFFFFF',
  '--border-base': '#EEEEEE',
  '--border-light': '#AAAAAA',
  '--border-special': '#FFFFFF',
  '--primary': '#56B4E9',
  '--success': '#66BB6A',
  '--warning': '#F0C000',
  '--danger': '#FF5252',
  '--info': '#56B4E9',
  '--limit': '#FFB3D9',
  '--brand': '#56B4E9',
  '--brand-light': '#1A3344',
  '--brand-hover': '#7EC8F0',
  '--message-user-bg': '#222222',
  '--message-tips-bg': '#181818',
  '--workspace-btn-bg': '#2A2A2A',
  '--thought-gradient': 'linear-gradient(90deg, #1A3344 0%, #141414 100%)',
  '--fill': '#1A1A1A',
  '--fill-0': '#141414',
  '--dialog-fill-0': '#141414',
  '--inverse': '#0A0A0A',
};

/**
 * Selectable Aviator builtins. Light / Dark baselines stay in `builtinThemes.ts`
 * and are not part of this list. Display names are product strings (same pattern
 * as "Light" / "Dark"); Night Cruise must stay that English name.
 */
export const AVIATOR_BUILTIN_THEMES: Theme[] = [
  aviatorTheme(AVIATOR_NIGHT_CRUISE_THEME_ID, 'Night Cruise', 'dark', NIGHT_CRUISE_TOKENS),
  aviatorTheme(AVIATOR_BLUE_THEME_ID, 'Aviator Blue', 'light', AVIATOR_BLUE_TOKENS),
  aviatorTheme(AVIATOR_PARCHMENT_THEME_ID, 'Parchment', 'light', PARCHMENT_TOKENS),
  aviatorTheme(AVIATOR_ALLOY_THEME_ID, 'Alloy', 'light', ALLOY_TOKENS),
  aviatorTheme(AVIATOR_HC_LIGHT_THEME_ID, 'Light HC', 'light', HC_LIGHT_TOKENS),
  aviatorTheme(AVIATOR_HC_DARK_THEME_ID, 'Dark HC', 'dark', HC_DARK_TOKENS),
];
