/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

// Management-only boxed entry. Uses a warm gray/amber plate so it reads as a
// special button on both light and dark sider backgrounds — a yellow glyph
// alone disappears on white.
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '@arco-design/web-react';
import { Branch } from '@icon-park/react';
import classNames from 'classnames';
import type { SiderTooltipProps } from '@renderer/utils/ui/siderTooltip';
import styles from './SiderCreateWorkflowEntry.module.css';

interface SiderCreateWorkflowEntryProps {
  isMobile: boolean;
  isActive: boolean;
  collapsed: boolean;
  siderTooltipProps: SiderTooltipProps;
  onClick: () => void;
}

const SiderCreateWorkflowEntry: React.FC<SiderCreateWorkflowEntryProps> = ({
  isMobile,
  isActive,
  collapsed,
  siderTooltipProps,
  onClick,
}) => {
  const { t } = useTranslation();
  const label = t('guid.createWorkflow.nav');
  const plate = classNames(
    styles.entry,
    isActive && styles.entryActive,
    collapsed
      ? 'mx-4px w-[calc(100%-8px)] h-34px flex items-center justify-center cursor-pointer transition-colors rd-8px'
      : classNames(
          'box-border group mx-6px h-34px w-[calc(100%-12px)] flex items-center justify-start gap-8px ps-10px pe-8px rd-0.5rem cursor-pointer shrink-0 transition-all',
          isMobile && 'sider-action-btn-mobile'
        )
  );

  const icon = (
    <Branch
      theme='outline'
      size={collapsed ? '20' : '16'}
      fill='currentColor'
      className='block leading-none shrink-0'
      style={{ lineHeight: 0 }}
    />
  );

  const inner = collapsed ? (
    icon
  ) : (
    <>
      <span className='size-22px flex items-center justify-center shrink-0'>{icon}</span>
      <span className='collapsed-hidden text-14px font-[600] leading-24px'>{label}</span>
    </>
  );

  return (
    <Tooltip {...siderTooltipProps} content={label} position='right'>
      <div className={plate} onClick={onClick}>
        {inner}
      </div>
    </Tooltip>
  );
};

export default SiderCreateWorkflowEntry;
