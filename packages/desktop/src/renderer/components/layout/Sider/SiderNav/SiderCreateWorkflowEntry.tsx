/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

// Management-only. Deliberately not `currentColor` like the other nav
// entries: the yellow marks this as the special "创建工作流" surface, not a
// regular feature. Only rendered when `ui.createWorkflow` is on.
import React from 'react';
import { Tooltip } from '@arco-design/web-react';
import { Branch } from '@icon-park/react';
import classNames from 'classnames';
import type { SiderTooltipProps } from '@renderer/utils/ui/siderTooltip';

const CREATE_WORKFLOW_YELLOW = '#E6A817';

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
  const label = '创建工作流';

  if (collapsed) {
    return (
      <Tooltip {...siderTooltipProps} content={label} position='right'>
        <div
          className={classNames(
            'w-full h-34px flex items-center justify-center cursor-pointer transition-colors rd-8px',
            isActive ? 'bg-fill-3' : 'hover:bg-fill-3 active:bg-fill-4'
          )}
          onClick={onClick}
        >
          <Branch theme='outline' size='20' fill={CREATE_WORKFLOW_YELLOW} className='block leading-none shrink-0' style={{ lineHeight: 0 }} />
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip {...siderTooltipProps} content={label} position='right'>
      <div
        className={classNames(
          'box-border group h-34px w-full flex items-center justify-start gap-8px ps-10px pe-8px rd-0.5rem cursor-pointer shrink-0 transition-all',
          isMobile && 'sider-action-btn-mobile',
          isActive ? 'bg-fill-3' : 'hover:bg-fill-3 active:bg-fill-4'
        )}
        onClick={onClick}
      >
        <span className='size-22px flex items-center justify-center shrink-0'>
          <Branch theme='outline' size='16' fill={CREATE_WORKFLOW_YELLOW} className='block leading-none' style={{ lineHeight: 0 }} />
        </span>
        <span className='collapsed-hidden text-14px font-[500] leading-24px' style={{ color: CREATE_WORKFLOW_YELLOW }}>
          {label}
        </span>
      </div>
    </Tooltip>
  );
};

export default SiderCreateWorkflowEntry;
