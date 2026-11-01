/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/renderer/services/i18n';

/**
 * The three mainstream languages, laid out as a website-style segmented switch.
 * The full 13-locale list stays in Settings → System.
 */
const QUICK_LANGUAGES = [
  { code: 'en-US', label: 'EN' },
  { code: 'zh-CN', label: '中文' },
  { code: 'es-ES', label: 'ES' },
] as const;

type QuickLanguageCode = (typeof QUICK_LANGUAGES)[number]['code'];

const matchQuickLanguage = (lng: string): QuickLanguageCode | null => {
  if (lng.startsWith('en')) return 'en-US';
  if (lng === 'zh-CN') return 'zh-CN';
  if (lng.startsWith('es')) return 'es-ES';
  return null;
};

const LanguageQuickSwitcher: React.FC = () => {
  const { t, i18n } = useTranslation();
  const active = matchQuickLanguage(i18n.language);

  const select = (code: QuickLanguageCode) => {
    if (code === active) return;
    changeLanguage(code).catch((error: Error) => {
      console.error('Failed to change language:', error);
    });
  };

  return (
    <div
      role='radiogroup'
      aria-label={t('settings.language')}
      className='flex items-center h-24px p-2px rd-6px bg-fill-2 me-4px'
    >
      {QUICK_LANGUAGES.map((lang) => {
        const selected = lang.code === active;
        return (
          <button
            key={lang.code}
            type='button'
            role='radio'
            aria-checked={selected}
            onClick={() => select(lang.code)}
            className={`h-20px min-w-30px px-6px rd-4px border-0 text-11px leading-20px cursor-pointer transition-colors ${
              selected
                ? 'bg-1 text-t-primary font-600 shadow-sm'
                : 'bg-transparent text-t-tertiary hover:text-t-primary'
            }`}
          >
            {lang.label}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageQuickSwitcher;
