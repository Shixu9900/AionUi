/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { I18nKey } from '@/renderer/services/i18n';
import type { KnowledgeTreeNode } from './treeModel';
import styles from './index.module.css';

export const KnowledgeTree: React.FC<{
  root: KnowledgeTreeNode;
  open: Record<string, boolean>;
  selectedId: string | null;
  showAll: boolean;
  onShowAll: (showAll: boolean) => void;
  onToggle: (id: string) => void;
  onSelect: (node: KnowledgeTreeNode) => void;
}> = ({ root, open, selectedId, showAll, onShowAll, onToggle, onSelect }) => {
  const { t } = useTranslation();
  const labelOf = (node: KnowledgeTreeNode) => (node.labelKey ? t(node.labelKey as I18nKey) : node.label);
  const renderNode = (node: KnowledgeTreeNode, depth: number) => {
    const expandable = node.children.length > 0;
    const expanded = open[node.id] ?? depth < 1;
    return (
      <li key={node.id}>
        <button
          type='button'
          className={node.itemId && node.itemId === selectedId ? styles.treeRowActive : styles.treeRow}
          style={{ paddingLeft: 8 + depth * 14 }}
          onClick={() => {
            if (expandable) onToggle(node.id);
            onSelect(node);
          }}
        >
          <span className={styles.twisty}>{expandable ? (expanded ? '▾' : '▸') : ''}</span>
          <span className={node.filled ? styles.dotOn : styles.dotOff} aria-hidden='true' />
          <span className={styles.treeLabel}>{labelOf(node)}</span>
        </button>
        {expandable && expanded ? <ul className={styles.treeList}>{node.children.map((child) => renderNode(child, depth + 1))}</ul> : null}
      </li>
    );
  };

  return (
    <aside className={styles.tree}>
      <div className={styles.treeHead}>
        <h2 className={styles.paneTitle}>{t('guid.knowledge.treeTitle')}</h2>
        <div className={styles.filters}>
          <button type='button' className={showAll ? styles.filterOn : styles.filterOff} onClick={() => onShowAll(true)}>
            {t('guid.knowledge.showAll')}
          </button>
          <button type='button' className={!showAll ? styles.filterOn : styles.filterOff} onClick={() => onShowAll(false)}>
            {t('guid.knowledge.showFilled')}
          </button>
        </div>
      </div>
      <div className={styles.treeScroll}>
        <ul className={styles.treeList}>{renderNode(root, 0)}</ul>
      </div>
    </aside>
  );
};
