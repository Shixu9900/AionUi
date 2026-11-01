/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import classNames from 'classnames';
import { Dropdown, Menu, Message, Modal, Tooltip } from '@arco-design/web-react';
import { Down, More, Plus, Right } from '@icon-park/react';
import AircraftMark from '@renderer/pages/workbench/AircraftMark';
import { ipcBridge } from '@/common';
import type { TChatConversation } from '@/common/config/storage';
import type { AircraftProject } from '@/common/types/aircraftProject';
import { useConversationHistoryContext } from '@renderer/hooks/context/ConversationHistoryContext';
import { useAircraftProjects, type AircraftProjectDraft } from '@renderer/hooks/config/useAircraftProjects';
import { setWorkbenchAircraft } from '@renderer/pages/workbench/workbenchStore';
import { getActivityTime } from '@renderer/utils/chat/timeline';
import { cleanupSiderTooltips, type SiderTooltipProps } from '@renderer/utils/ui/siderTooltip';
import { blurActiveElement } from '@renderer/utils/ui/focus';
import ProjectFormModal from './ProjectFormModal';

const ACTIVE_PROJECT_KEY = 'aviator.activeProjectId';
const OTHERS_COLLAPSED_KEY = 'aviator.otherConversationsCollapsed';
const CARD_CONVERSATION_LIMIT = 6;

const normalizePath = (value: string) => value.replace(/[\\/]+$/, '');

const readLocal = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeLocal = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // ignore
  }
};

const isTeamConversation = (conversation: TChatConversation): boolean => {
  const extra = conversation.extra as { team_id?: string; teamId?: string } | undefined;
  return Boolean(extra?.team_id || extra?.teamId);
};

function useRelativeTime() {
  const { i18n } = useTranslation();
  return useMemo(() => {
    const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' });
    return (time: number) => {
      const minutes = Math.round((time - Date.now()) / 60000);
      if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
      const hours = Math.round(minutes / 60);
      if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
      const days = Math.round(hours / 24);
      if (Math.abs(days) < 30) return rtf.format(days, 'day');
      return new Date(time).toLocaleDateString(i18n.language);
    };
  }, [i18n.language]);
}

type ProjectSiderProps = {
  collapsed: boolean;
  siderTooltipProps: SiderTooltipProps;
  creating: boolean;
  onCreatingChange: (creating: boolean) => void;
  onSessionClick?: () => void;
};

const ProjectSider: React.FC<ProjectSiderProps> = ({
  collapsed,
  siderTooltipProps,
  creating,
  onCreatingChange,
  onSessionClick,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { conversations } = useConversationHistoryContext();
  const { projects, createProject, updateProject, removeProject } = useAircraftProjects();
  const relativeTime = useRelativeTime();
  const [selectedId, setSelectedId] = useState<string | null>(() => readLocal(ACTIVE_PROJECT_KEY));
  const [editing, setEditing] = useState<AircraftProject | null>(null);
  const [othersCollapsed, setOthersCollapsed] = useState(() => readLocal(OTHERS_COLLAPSED_KEY) === '1');

  const activeConversationId = pathname.startsWith('/conversation/') ? pathname.split('/')[2] : undefined;

  const { byProject, others } = useMemo(() => {
    const index = new Map<string, string>();
    projects.forEach((p) => {
      if (p.workspace) index.set(normalizePath(p.workspace), p.id);
    });
    const grouped = new Map<string, TChatConversation[]>();
    const rest: TChatConversation[] = [];
    conversations
      .filter((c) => !isTeamConversation(c))
      .toSorted((a, b) => getActivityTime(b) - getActivityTime(a))
      .forEach((c) => {
        const workspace = c.extra?.custom_workspace ? c.extra?.workspace : undefined;
        const projectId = workspace ? index.get(normalizePath(workspace)) : undefined;
        if (projectId) grouped.set(projectId, [...(grouped.get(projectId) ?? []), c]);
        else rest.push(c);
      });
    return { byProject: grouped, others: rest };
  }, [conversations, projects]);

  const routeProjectId = useMemo(() => {
    if (!activeConversationId) return undefined;
    for (const [projectId, list] of byProject) {
      if (list.some((c) => c.id === activeConversationId)) return projectId;
    }
    return undefined;
  }, [activeConversationId, byProject]);

  const activeProjectId = routeProjectId ?? selectedId;

  const leaveSider = () => {
    cleanupSiderTooltips();
    blurActiveElement();
    onSessionClick?.();
  };

  const select = (id: string | null) => {
    setSelectedId(id);
    writeLocal(ACTIVE_PROJECT_KEY, id);
    if (id) setWorkbenchAircraft(id);
  };

  const askInProject = (project: AircraftProject) => {
    select(project.id);
    leaveSider();
    void navigate('/guid', { state: project.workspace ? { workspace: project.workspace } : { resetAssistant: true } });
  };

  const openProject = (project: AircraftProject) => {
    if (activeProjectId === project.id && !routeProjectId) {
      select(null);
      return;
    }
    select(project.id);
    const latest = byProject.get(project.id)?.[0];
    leaveSider();
    if (latest) void navigate(`/conversation/${latest.id}`);
    else
      void navigate('/guid', {
        state: project.workspace ? { workspace: project.workspace } : { resetAssistant: true },
      });
  };

  const openConversation = (conversation: TChatConversation) => {
    leaveSider();
    void navigate(`/conversation/${conversation.id}`);
  };

  const confirmRemove = (project: AircraftProject) => {
    Modal.confirm({
      title: t('conversation.aircraftProject.removeTitle', { name: project.name }),
      content: t('conversation.aircraftProject.removeContent'),
      okButtonProps: { status: 'danger' },
      okText: t('conversation.aircraftProject.remove'),
      onOk: async () => {
        await removeProject(project.id);
        if (selectedId === project.id) select(null);
      },
    });
  };

  const handleSubmit = async (draft: AircraftProjectDraft) => {
    if (editing) {
      await updateProject(editing.id, draft);
      setEditing(null);
      Message.success(t('conversation.aircraftProject.saved'));
      return;
    }
    const project = await createProject(draft);
    onCreatingChange(false);
    askInProject(project);
  };

  const toggleOthers = () => {
    setOthersCollapsed((prev) => {
      writeLocal(OTHERS_COLLAPSED_KEY, prev ? '0' : '1');
      return !prev;
    });
  };

  const modal = (
    <ProjectFormModal
      visible={creating || editing !== null}
      project={editing}
      onCancel={() => {
        setEditing(null);
        onCreatingChange(false);
      }}
      onSubmit={handleSubmit}
    />
  );

  if (collapsed) {
    return (
      <div className='flex flex-col items-center gap-6px py-4px'>
        {projects.map((project) => (
          <Tooltip
            key={project.id}
            {...siderTooltipProps}
            position='right'
            content={`MSN ${project.msn} · ${project.name}`}
          >
            <div
              className={classNames(
                'w-36px h-36px rd-8px flex flex-col items-center justify-center cursor-pointer border border-solid transition-colors',
                activeProjectId === project.id
                  ? 'border-[rgb(var(--primary-6))] bg-[rgba(var(--primary-6),0.10)] text-primary'
                  : 'border-[var(--color-border-2)] text-t-secondary hover:bg-fill-3'
              )}
              onClick={() => openProject(project)}
            >
              <AircraftMark type={project.aircraftType} size={18} />
              <span className='text-9px leading-11px font-600 max-w-32px truncate'>{project.msn}</span>
            </div>
          </Tooltip>
        ))}
        {modal}
      </div>
    );
  }

  const renderConversationRow = (conversation: TChatConversation, nested: boolean) => (
    <div
      key={conversation.id}
      id={`c-${conversation.id}`}
      className={classNames(
        'h-30px flex items-center gap-6px rd-6px cursor-pointer text-13px transition-colors min-w-0',
        nested ? 'ps-12px pe-8px' : 'px-10px',
        activeConversationId === conversation.id
          ? 'bg-[rgba(var(--primary-6),0.10)] text-t-primary font-500'
          : 'text-t-secondary hover:bg-fill-3 hover:text-t-primary'
      )}
      onClick={() => openConversation(conversation)}
    >
      <span className='flex-1 truncate'>{conversation.name || t('conversation.aircraftProject.untitled')}</span>
      <span className='shrink-0 text-11px text-t-tertiary'>{relativeTime(getActivityTime(conversation))}</span>
    </div>
  );

  const renderCard = (project: AircraftProject) => {
    const list = byProject.get(project.id) ?? [];
    const active = activeProjectId === project.id;
    const lastTime = Math.max(project.updatedAt, list[0] ? getActivityTime(list[0]) : 0);
    const subtitle = [project.aircraftType, project.registration].filter(Boolean).join(' · ');
    return (
      <div
        key={project.id}
        className={classNames(
          'rd-10px border border-solid transition-colors overflow-hidden',
          active
            ? 'border-[rgb(var(--primary-6))] bg-[rgba(var(--primary-6),0.06)]'
            : 'border-[var(--color-border-2)] bg-aou-1 hover:border-[var(--color-border-3)] hover:bg-fill-2'
        )}
      >
        <div
          className='group relative flex flex-col gap-4px p-10px cursor-pointer'
          onClick={() => openProject(project)}
        >
          <div className='flex items-center gap-8px min-w-0 pe-20px'>
            <span className='shrink-0 text-t-secondary'>
              <AircraftMark type={project.aircraftType} size={36} />
            </span>
            <span className='min-w-0 text-16px leading-22px font-600 text-t-primary whitespace-nowrap overflow-hidden text-ellipsis'>
              <span className='text-11px font-500 text-t-tertiary me-4px'>MSN</span>
              {project.msn}
            </span>
          </div>
          <span className='text-13px leading-18px text-t-primary line-clamp-2 break-all' title={project.name}>
            {project.name}
          </span>
          {subtitle && <span className='text-12px leading-16px text-t-secondary truncate'>{subtitle}</span>}
          <div className='flex items-center gap-6px min-w-0 text-11px leading-16px text-t-tertiary'>
            <span className='shrink-0 px-6px h-18px leading-18px rd-4px bg-fill-3 text-t-secondary'>
              {t(
                project.line === 'component'
                  ? 'conversation.aircraftProject.lines.component'
                  : `conversation.aircraftProject.kinds.${project.kind}`
              )}
            </span>
            <span className='truncate'>
              {t('conversation.aircraftProject.conversationCount', { count: list.length })} · {relativeTime(lastTime)}
            </span>
          </div>
          <div className='absolute top-8px end-6px' onClick={(e) => e.stopPropagation()}>
            <Dropdown
              trigger='click'
              position='br'
              droplist={
                <Menu
                  onClickMenuItem={(key) => {
                    if (key === 'edit') setEditing(project);
                    if (key === 'folder' && project.workspace) void ipcBridge.shell.openFile.invoke(project.workspace);
                    if (key === 'remove') confirmRemove(project);
                  }}
                >
                  <Menu.Item key='edit'>{t('conversation.aircraftProject.edit')}</Menu.Item>
                  {project.workspace && (
                    <Menu.Item key='folder'>{t('conversation.aircraftProject.openFolder')}</Menu.Item>
                  )}
                  <Menu.Item key='remove'>{t('conversation.aircraftProject.remove')}</Menu.Item>
                </Menu>
              }
            >
              <span
                className={classNames(
                  'size-22px rd-6px flex items-center justify-center text-t-tertiary hover:bg-fill-3 hover:text-t-primary transition-opacity',
                  active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                )}
              >
                <More theme='outline' size='14' />
              </span>
            </Dropdown>
          </div>
        </div>
        {active && (
          <div className='px-6px pb-8px flex flex-col gap-1px'>
            {list.slice(0, CARD_CONVERSATION_LIMIT).map((c) => renderConversationRow(c, true))}
            <div
              className='h-30px ps-12px flex items-center gap-6px rd-6px cursor-pointer text-13px text-primary hover:bg-fill-3'
              onClick={() => askInProject(project)}
            >
              <Plus theme='outline' size='12' />
              <span>{t('conversation.aircraftProject.askInProject')}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className='flex flex-col gap-8px px-2px pb-12px'>
      <div className='flex items-center justify-between px-8px pt-4px'>
        <span className='text-12px font-500 text-t-tertiary'>{t('conversation.aircraftProject.sectionTitle')}</span>
        {projects.length > 0 && <span className='text-12px text-t-tertiary'>{projects.length}</span>}
      </div>

      {projects.length === 0 ? (
        <div
          className='mx-2px rd-10px border border-dashed border-[var(--color-border-3)] p-14px flex flex-col items-center gap-6px text-center cursor-pointer hover:bg-fill-2'
          onClick={() => onCreatingChange(true)}
        >
          <AircraftMark size={28} />
          <span className='text-13px font-500 text-t-primary'>{t('conversation.aircraftProject.emptyTitle')}</span>
          <span className='text-12px text-t-secondary'>{t('conversation.aircraftProject.emptyDesc')}</span>
        </div>
      ) : (
        <div className='flex flex-col gap-6px'>{projects.map(renderCard)}</div>
      )}

      {others.length > 0 && (
        <div className='flex flex-col gap-1px pt-6px'>
          <div
            className='h-24px px-8px flex items-center gap-4px cursor-pointer text-12px font-500 text-t-tertiary hover:text-t-secondary'
            onClick={toggleOthers}
          >
            {othersCollapsed ? <Right theme='outline' size='10' /> : <Down theme='outline' size='10' />}
            <span>{t('conversation.aircraftProject.otherConversations')}</span>
            <span className='ms-auto'>{others.length}</span>
          </div>
          {!othersCollapsed && others.map((c) => renderConversationRow(c, false))}
        </div>
      )}
      {modal}
    </div>
  );
};

export default ProjectSider;
