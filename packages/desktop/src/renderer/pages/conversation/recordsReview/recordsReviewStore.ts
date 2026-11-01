/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'records-review-panel-open';
const listeners = new Set<() => void>();

let open = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
})();

const emit = () => listeners.forEach((l) => l());

export const setRecordsReviewOpen = (next: boolean): void => {
  if (next === open) return;
  open = next;
  try {
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
  } catch {
    // storage unavailable: keep the in-memory state only
  }
  emit();
};

export const toggleRecordsReview = (): void => setRecordsReviewOpen(!open);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useRecordsReviewOpen = (): boolean => useSyncExternalStore(subscribe, () => open);
