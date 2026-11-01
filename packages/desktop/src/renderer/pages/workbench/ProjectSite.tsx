/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Spin, Tag } from '@arco-design/web-react';
import { useTranslation } from 'react-i18next';
import type { ComponentReview, Verdict } from '@/common/types/recordsReview';
import { useConversationHistoryContext } from '@renderer/hooks/context/ConversationHistoryContext';
import { useAircraftProjects } from '@renderer/hooks/config/useAircraftProjects';
import { useCurrentProject } from '@renderer/pages/conversation/explorer/currentProjectStore';
import ProjectFormModal from '@renderer/components/layout/Sider/ProjectSider/ProjectFormModal';
import { useRecordsReview } from '@renderer/pages/conversation/recordsReview/useRecordsReview';
import AircraftMark from './AircraftMark';
import LifeTrack from './LifeTrack';
import LlpPane from './LlpPane';
import RecordsPane from './RecordsPane';
import { patchWorkbench, useWorkbenchState, type WorkbenchPage, type WorkbenchSubject } from './workbenchStore';

const PAGES: WorkbenchPage[] = ['overview', 'llp', 'records', 'report'];

const fmtN = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('en-US'));
const fmtH = (n: number | null | undefined) => {
  if (n == null) return '—';
  const total = Math.round(n * 60);
  return `${Math.floor(total / 60).toLocaleString('en-US')}:${String(Math.abs(total % 60)).padStart(2, '0')}`;
};

const verdictTone = (v: Verdict): 'green' | 'orange' | 'red' => {
  switch (v) {
    case 'pass':
      return 'green';
    case 'conditional':
      return 'orange';
    case 'fail':
      return 'red';
    default: {
      const exhaustive: never = v;
      return exhaustive;
    }
  }
};

const useReviewProjectId = (): string | null => {
  const current = useCurrentProject();
  const { conversations } = useConversationHistoryContext();
  return useMemo(() => {
    if (current) return current;
    const blade = conversations.find((c) => c.project_id && /RGF34904|叶片/.test(c.name));
    return blade?.project_id ?? conversations.find((c) => c.project_id)?.project_id ?? null;
  }, [conversations, current]);
};

const Pill: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => (
  <button
    type='button'
    onClick={onClick}
    className={`h-26px px-10px rd-6px text-12px border border-solid cursor-pointer ${
      active
        ? 'border-[rgb(var(--primary-6))] bg-[rgba(var(--primary-6),0.10)] text-t-primary font-600'
        : 'border-[var(--color-border-2)] bg-transparent text-t-secondary hover:bg-fill-2'
    }`}
  >
    {children}
  </button>
);

const StatBox: React.FC<{ label: string; value: string; onClick?: () => void }> = ({ label, value, onClick }) => (
  <button
    type='button'
    onClick={onClick}
    className='text-left rd-8px border border-solid border-[var(--color-border-2)] px-12px py-8px bg-fill-1 hover:bg-fill-2'
  >
    <div className='text-18px font-600 text-t-primary'>{value}</div>
    <div className='text-12px text-t-tertiary'>{label}</div>
  </button>
);

const ProjectSite: React.FC = () => {
  const { t } = useTranslation();
  const wb = useWorkbenchState();
  const { projects, updateProject } = useAircraftProjects();
  const [editing, setEditing] = React.useState(false);
  const aircraft = projects.find((p) => p.id === wb.aircraftId) ?? projects[0];
  const reviewId = useReviewProjectId();
  const swr = useRecordsReview(reviewId);
  const ready = swr.data?.status === 'ready' ? swr.data : null;
  const review = ready?.review ?? null;

  const open = (page: WorkbenchPage, subject?: WorkbenchSubject) => {
    patchWorkbench({ page, ...(subject ? { subject } : {}), driveId: `nav-${page}` });
  };

  return (
    <div className='flex-1 min-w-0 h-full overflow-y-auto bg-1'>
      <div className='flex flex-col gap-12px px-16px py-14px min-w-0'>
        <div className='flex items-center gap-12px'>
          <AircraftMark type={aircraft?.aircraftType} size={64} />
          <div className='min-w-0 flex-1'>
            <div className='text-18px font-600 text-t-primary'>
              {aircraft ? `MSN ${aircraft.msn}` : t('conversation.workbench.aircraft')}
            </div>
            <div className='text-13px text-t-primary truncate'>{aircraft?.name}</div>
            <div className='text-12px text-t-secondary truncate'>
              {[aircraft?.aircraftType, aircraft?.registration].filter(Boolean).join(' · ')}
            </div>
          </div>
          {aircraft && (
            <button
              type='button'
              className='text-12px text-t-secondary bg-transparent border-0 cursor-pointer'
              onClick={() => setEditing(true)}
            >
              {t('conversation.aircraftProject.edit')}
            </button>
          )}
        </div>
        <ProjectFormModal
          visible={editing}
          project={aircraft}
          onCancel={() => setEditing(false)}
          onSubmit={async (draft) => {
            if (!aircraft) return;
            await updateProject(aircraft.id, draft);
            setEditing(false);
          }}
        />
        <div className='flex items-center gap-6px flex-wrap'>
          {PAGES.map((page) => (
            <Pill key={page} active={wb.page === page} onClick={() => open(page)}>
              {t(`conversation.workbench.pages.${page}`)}
            </Pill>
          ))}
        </div>
        {swr.isLoading && !review ? (
          <div className='py-40px flex justify-center'>
            <Spin />
          </div>
        ) : (
          <SiteBody
            page={wb.page}
            review={review}
            fileUrl={ready?.fileUrl ?? null}
            lifeView={wb.lifeView}
          />
        )}
      </div>
    </div>
  );
};

const SiteBody: React.FC<{
  page: WorkbenchPage;
  review: ComponentReview | null;
  fileUrl: ((path: string) => string) | null;
  lifeView: 'full' | 'budget' | 'yearly';
}> = ({ page, review, fileUrl, lifeView }) => {
  const { t } = useTranslation();
  if (!review && page !== 'report' && page !== 'records' && page !== 'llp') {
    return (
      <div className='rd-8px border border-dashed border-[var(--color-border-3)] p-16px text-13px text-t-secondary'>
        {t('conversation.workbench.empty')}
      </div>
    );
  }
  switch (page) {
    case 'overview':
      return review ? <Overview review={review} lifeView={lifeView} /> : null;
    case 'llp':
      return <LlpPane review={review} />;
    case 'records':
      return <RecordsPane documents={review?.documents ?? []} fileUrl={fileUrl} />;
    case 'report':
      return (
        <div className='flex flex-col gap-8px text-13px text-t-secondary'>
          <div className='text-16px font-600 text-t-primary'>{t('conversation.workbench.reportTitle')}</div>
          {(['s1', 's2', 's3', 's4', 's5'] as const).map((key) => (
            <div key={key}>{t(`conversation.workbench.report.${key}`)}</div>
          ))}
          <div className='text-12px text-t-tertiary'>{t('conversation.workbench.reportNote')}</div>
        </div>
      );
    default: {
      const exhaustive: never = page;
      return exhaustive;
    }
  }
};

const Overview: React.FC<{
  review: ComponentReview;
  lifeView: 'full' | 'budget' | 'yearly';
}> = ({ review, lifeView }) => {
  const { t } = useTranslation();
  const ratio = review.life.used_ratio;
  return (
    <div className='flex flex-col gap-12px'>
      <div className='flex items-center gap-8px'>
        <Tag color={verdictTone(review.verdict)}>{t(`conversation.recordsReview.verdict.${review.verdict}`)}</Tag>
        <span className='text-14px text-t-primary'>
          {t('conversation.workbench.remaining', { n: fmtN(review.life.remaining_cycles) })}
          {ratio != null ? ` · ${Math.round(ratio * 1000) / 10}%` : ''}
        </span>
      </div>
      <div className='grid grid-cols-4 gap-8px'>
        <StatBox
          label='TSN'
          value={review.life.tsn?.display ?? fmtH(review.life.tsn?.value)}
          onClick={() => patchWorkbench({ page: 'llp', focus: 'evidence' })}
        />
        <StatBox
          label='CSN'
          value={review.life.csn?.display ?? fmtN(review.life.csn?.value)}
          onClick={() => patchWorkbench({ page: 'llp', focus: 'evidence' })}
        />
        <StatBox label={t('conversation.workbench.limit')} value={fmtN(review.life.life_limit_cycles?.value)} />
        <StatBox label={t('conversation.workbench.remainingLabel')} value={fmtN(review.life.remaining_cycles)} />
      </div>
      <div className='text-13px text-t-secondary'>
        {review.component.description} · {review.component.part_number} · {review.component.serial_number}
      </div>
      <LifeTrack review={review} view={lifeView} />
    </div>
  );
};

export default ProjectSite;
