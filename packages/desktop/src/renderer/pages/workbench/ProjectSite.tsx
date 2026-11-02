/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Button, Spin, Tag } from '@arco-design/web-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { RedeliveryReadiness, ReviewAction, ReviewChoice } from '@/common/types/aircraftProject';
import type { ComponentReview, Verdict } from '@/common/types/recordsReview';
import { useConversationHistoryContext } from '@renderer/hooks/context/ConversationHistoryContext';
import { useAircraftProjects } from '@renderer/hooks/config/useAircraftProjects';
import { useReviewTrace, type ReviewRubric } from '@renderer/hooks/config/useReviewTrace';
import { useCurrentProject } from '@renderer/pages/conversation/explorer/currentProjectStore';
import ProjectFormModal from '@renderer/components/layout/Sider/ProjectSider/ProjectFormModal';
import { useRecordsReview } from '@renderer/pages/conversation/recordsReview/useRecordsReview';
import LifeTrack from './LifeTrack';
import LlpPane from './LlpPane';
import ReadinessBadge from './ReadinessBadge';
import PackagePane from './PackagePane';
import TraceButtons, { CHOICE_COLOR } from './TraceButtons';
import { patchWorkbench, useWorkbenchState, type WorkbenchPage } from './workbenchStore';

const PAGES: WorkbenchPage[] = ['overview', 'llp', 'records', 'report'];

/** Judging and the readiness gate stay hidden until the scoring UI is redesigned; recorded judgements are kept. */
const SHOW_JUDGING = false;

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

type Checkpoint = { target: string; label: string; value: string; onOpen?: () => void };

/** The conclusions a user must judge before the project can be marked ready. */
const buildCheckpoints = (review: ComponentReview, t: TFunction): Checkpoint[] => {
  const openEvidence = () => patchWorkbench({ page: 'llp', focus: 'evidence' });
  return [
    {
      target: 'verdict',
      label: t('conversation.workbench.trace.items.verdict'),
      value: t(`conversation.recordsReview.verdict.${review.verdict}`),
    },
    {
      target: 'tsn',
      label: 'TSN',
      value: review.life.tsn?.display ?? fmtH(review.life.tsn?.value),
      onOpen: openEvidence,
    },
    {
      target: 'csn',
      label: 'CSN',
      value: review.life.csn?.display ?? fmtN(review.life.csn?.value),
      onOpen: openEvidence,
    },
    {
      target: 'limit',
      label: t('conversation.workbench.limit'),
      value: fmtN(review.life.life_limit_cycles?.value),
    },
    {
      target: 'remaining',
      label: t('conversation.workbench.remainingLabel'),
      value: fmtN(review.life.remaining_cycles),
    },
  ];
};

const isConfirmed = (action?: ReviewAction) =>
  action != null && (action.choice === 'correct' || action.choice === 'supplement');

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

const ProjectSite: React.FC = () => {
  const { t } = useTranslation();
  const wb = useWorkbenchState();
  const { projects, updateProject, patchProject } = useAircraftProjects();
  const [editing, setEditing] = React.useState(false);
  const aircraft = projects.find((p) => p.id === wb.aircraftId) ?? projects[0];
  const reviewId = useReviewProjectId();
  const swr = useRecordsReview(reviewId);
  const ready = swr.data?.status === 'ready' ? swr.data : null;
  const review = ready?.review ?? null;
  const trace = useReviewTrace(aircraft?.id);
  const readiness: RedeliveryReadiness = aircraft?.readiness ?? 'not_ready';

  const checkpoints = useMemo(() => (review ? buildCheckpoints(review, t) : []), [review, t]);
  const confirmed = checkpoints.filter((c) => isConfirmed(trace.latest.get(c.target))).length;
  const allConfirmed = checkpoints.length > 0 && confirmed === checkpoints.length;

  const setReadiness = async (next: RedeliveryReadiness) => {
    if (!aircraft || next === readiness) return;
    await patchProject(aircraft.id, { readiness: next });
    await trace.record({
      target: 'readiness',
      label: t('conversation.workbench.readiness.title'),
      systemValue: t(`conversation.workbench.readiness.${readiness}`),
      choice: 'readiness',
      readiness: next,
    });
  };

  const judge = (checkpoint: Checkpoint) => async (choice: ReviewChoice, note?: string) => {
    await trace.record({
      target: checkpoint.target,
      label: checkpoint.label,
      systemValue: checkpoint.value,
      choice,
      note,
    });
    // A conclusion marked wrong is no longer confirmed, so the project can't stay ready.
    if (choice === 'wrong' && readiness === 'ready') await setReadiness('not_ready');
  };

  const open = (page: WorkbenchPage) => patchWorkbench({ page, driveId: `nav-${page}` });

  return (
    <div className='flex-1 min-w-0 h-full overflow-y-auto bg-1'>
      <div className='flex flex-col gap-12px px-16px py-14px min-w-0'>
        <div className='flex items-start gap-12px'>
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-8px'>
              <span className='text-18px font-600 text-t-primary'>
                {aircraft ? `MSN ${aircraft.msn}` : t('conversation.workbench.aircraft')}
              </span>
              {aircraft && <ReadinessBadge readiness={readiness} />}
            </div>
            <div className='text-13px text-t-primary truncate'>{aircraft?.name}</div>
            <div className='text-12px text-t-secondary truncate'>
              {[aircraft?.aircraftType, aircraft?.registration].filter(Boolean).join(' · ')}
            </div>
          </div>
          {aircraft && (
            <div className='flex flex-col items-end gap-6px shrink-0'>
              {SHOW_JUDGING && (
                <ReadinessControl
                  readiness={readiness}
                  confirmed={confirmed}
                  total={checkpoints.length}
                  allConfirmed={allConfirmed}
                  onChange={setReadiness}
                />
              )}
              <button
                type='button'
                className='text-12px text-t-secondary bg-transparent border-0 cursor-pointer p-0'
                onClick={() => setEditing(true)}
              >
                {t('conversation.aircraftProject.edit')}
              </button>
            </div>
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
            checkpoints={checkpoints}
            latest={trace.latest}
            canJudge={Boolean(aircraft)}
            onJudge={judge}
            actions={trace.actions}
            rubric={trace.rubric}
            workspace={aircraft?.workspace}
            aircraftType={aircraft?.aircraftType}
            onEditWorkspace={() => setEditing(true)}
          />
        )}
      </div>
    </div>
  );
};

const ReadinessControl: React.FC<{
  readiness: RedeliveryReadiness;
  confirmed: number;
  total: number;
  allConfirmed: boolean;
  onChange: (next: RedeliveryReadiness) => Promise<void>;
}> = ({ readiness, confirmed, total, allConfirmed, onChange }) => {
  const { t } = useTranslation();
  switch (readiness) {
    case 'not_ready':
      return (
        <div className='flex items-center gap-8px'>
          <span className='text-12px text-t-tertiary'>
            {t('conversation.workbench.trace.progress', { done: confirmed, total })}
          </span>
          <Button
            size='mini'
            type='primary'
            status='success'
            disabled={!allConfirmed}
            title={allConfirmed ? undefined : t('conversation.workbench.readiness.needConfirm')}
            onClick={() => void onChange('ready')}
          >
            {t('conversation.workbench.readiness.confirmReady')}
          </Button>
        </div>
      );
    case 'ready':
      return (
        <div className='flex items-center gap-6px'>
          <Button size='mini' onClick={() => void onChange('not_ready')}>
            {t('conversation.workbench.readiness.reopen')}
          </Button>
          <Button size='mini' type='primary' onClick={() => void onChange('delivered')}>
            {t('conversation.workbench.readiness.markDelivered')}
          </Button>
        </div>
      );
    case 'delivered':
      return (
        <Button size='mini' onClick={() => void onChange('ready')}>
          {t('conversation.workbench.readiness.undoDelivered')}
        </Button>
      );
    default: {
      const exhaustive: never = readiness;
      return exhaustive;
    }
  }
};

type SiteBodyProps = {
  page: WorkbenchPage;
  review: ComponentReview | null;
  fileUrl: ((path: string) => string) | null;
  lifeView: 'full' | 'budget' | 'yearly';
  checkpoints: Checkpoint[];
  latest: Map<string, ReviewAction>;
  canJudge: boolean;
  onJudge: (checkpoint: Checkpoint) => (choice: ReviewChoice, note?: string) => Promise<void>;
  actions: ReviewAction[];
  rubric: ReviewRubric;
  workspace?: string;
  aircraftType?: string;
  onEditWorkspace: () => void;
};

const SiteBody: React.FC<SiteBodyProps> = (props) => {
  const { t } = useTranslation();
  const { page, review } = props;
  if (!review && page === 'overview') {
    return (
      <div className='rd-8px border border-dashed border-[var(--color-border-3)] p-16px text-13px text-t-secondary'>
        {t('conversation.workbench.empty')}
      </div>
    );
  }
  switch (page) {
    case 'overview':
      return review ? <Overview {...props} review={review} /> : null;
    case 'llp':
      return <LlpPane review={review} />;
    case 'records':
      return (
        <PackagePane
          workspace={props.workspace}
          aircraftType={props.aircraftType}
          documents={review?.documents ?? []}
          reviewFileUrl={props.fileUrl}
          esn={review?.timeline.find((e) => e.host.esn)?.host.esn ?? undefined}
          onEditWorkspace={props.onEditWorkspace}
        />
      );
    case 'report':
      return <ReportPane actions={props.actions} rubric={props.rubric} />;
    default: {
      const exhaustive: never = page;
      return exhaustive;
    }
  }
};

const Overview: React.FC<SiteBodyProps & { review: ComponentReview }> = ({
  review,
  lifeView,
  checkpoints,
  latest,
  canJudge,
  onJudge,
}) => {
  const { t } = useTranslation();
  const ratio = review.life.used_ratio;
  const [verdict, ...figures] = checkpoints;
  return (
    <div className='flex flex-col gap-12px'>
      <div className='flex items-center gap-8px flex-wrap'>
        <Tag color={verdictTone(review.verdict)}>{verdict.value}</Tag>
        <span className='text-14px text-t-primary'>
          {t('conversation.workbench.remaining', { n: fmtN(review.life.remaining_cycles) })}
          {ratio != null ? ` · ${Math.round(ratio * 1000) / 10}%` : ''}
        </span>
        {SHOW_JUDGING && (
          <span className='ms-auto'>
            <TraceButtons
              label={verdict.label}
              systemValue={verdict.value}
              latest={latest.get(verdict.target)}
              disabled={!canJudge}
              onRecord={onJudge(verdict)}
            />
          </span>
        )}
      </div>
      <div className='grid grid-cols-4 gap-8px'>
        {figures.map((cp) => (
          <div
            key={cp.target}
            className='flex flex-col gap-6px rd-8px border border-solid border-[var(--color-border-2)] px-12px py-8px bg-fill-1 min-w-0'
          >
            <button
              type='button'
              onClick={cp.onOpen}
              className={`text-left bg-transparent border-0 p-0 ${cp.onOpen ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className='text-18px font-600 text-t-primary'>{cp.value}</div>
              <div className='text-12px text-t-tertiary'>{cp.label}</div>
            </button>
            {SHOW_JUDGING && (
              <TraceButtons
                label={cp.label}
                systemValue={cp.value}
                latest={latest.get(cp.target)}
                disabled={!canJudge}
                onRecord={onJudge(cp)}
              />
            )}
          </div>
        ))}
      </div>
      <div className='text-13px text-t-secondary'>
        {review.component.description} · {review.component.part_number} · {review.component.serial_number}
      </div>
      <LifeTrack review={review} view={lifeView} />
    </div>
  );
};

const ReportPane: React.FC<{ actions: ReviewAction[]; rubric: ReviewRubric }> = ({ actions, rubric }) => {
  const { t, i18n } = useTranslation();
  const accuracy = rubric.judged > 0 ? Math.round((rubric.correct / rubric.judged) * 100) : null;
  return (
    <div className='flex flex-col gap-12px text-13px text-t-secondary'>
      <div className='text-16px font-600 text-t-primary'>{t('conversation.workbench.reportTitle')}</div>
      <div className='flex flex-col gap-4px'>
        {(['s1', 's2', 's3', 's4', 's5', 's6'] as const).map((key) => (
          <div key={key}>{t(`conversation.workbench.report.${key}`)}</div>
        ))}
      </div>
      <div className='text-12px text-t-tertiary'>{t('conversation.workbench.reportNote')}</div>

      <div className='flex items-center gap-12px flex-wrap pt-8px border-t border-t-solid border-[var(--color-border-2)]'>
        <span className='text-14px font-600 text-t-primary'>{t('conversation.workbench.trace.logTitle')}</span>
        {(['correct', 'wrong', 'supplement'] as const).map((choice) => (
          <span key={choice} className='text-12px' style={{ color: CHOICE_COLOR[choice] }}>
            {`${t(`conversation.workbench.trace.${choice}`)} ${rubric[choice]}`}
          </span>
        ))}
        {accuracy != null && (
          <span className='text-12px text-t-secondary'>
            {t('conversation.workbench.trace.accuracy', { pct: accuracy })}
          </span>
        )}
      </div>
      <div className='text-12px text-t-tertiary'>{t('conversation.workbench.trace.logHint')}</div>
      {actions.length === 0 ? (
        <div className='text-12px text-t-tertiary'>{t('conversation.workbench.trace.logEmpty')}</div>
      ) : (
        <table className='w-full text-12px border-collapse'>
          <thead>
            <tr className='text-t-tertiary text-left'>
              <th className='py-4px font-500'>{t('conversation.workbench.trace.colTime')}</th>
              <th className='font-500'>{t('conversation.workbench.trace.colItem')}</th>
              <th className='font-500'>{t('conversation.workbench.trace.colSystem')}</th>
              <th className='font-500'>{t('conversation.workbench.trace.colChoice')}</th>
              <th className='font-500'>{t('conversation.workbench.trace.colNote')}</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id} className='border-t border-t-solid border-[var(--color-border-2)] align-top'>
                <td className='py-4px pe-8px whitespace-nowrap'>{new Date(a.at).toLocaleString(i18n.language)}</td>
                <td className='pe-8px text-t-primary'>{a.label}</td>
                <td className='pe-8px'>{a.systemValue}</td>
                <td className='pe-8px whitespace-nowrap'>
                  {a.choice === 'readiness' ? (
                    <ReadinessBadge readiness={a.readiness} />
                  ) : (
                    <span style={{ color: CHOICE_COLOR[a.choice] }}>
                      {t(`conversation.workbench.trace.${a.choice}`)}
                    </span>
                  )}
                </td>
                <td className='break-all'>{a.note ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ProjectSite;
