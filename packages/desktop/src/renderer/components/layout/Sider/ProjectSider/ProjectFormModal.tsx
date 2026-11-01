/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AutoComplete, Button, Form, Input, Modal, Select } from '@arco-design/web-react';
import { FolderOpen } from '@icon-park/react';
import { ipcBridge } from '@/common';
import { AIRCRAFT_PROJECT_KINDS, type AircraftProject, type AircraftProjectLine } from '@/common/types/aircraftProject';
import type { AircraftProjectDraft } from '@renderer/hooks/config/useAircraftProjects';

const AIRCRAFT_TYPES = [
  'A319',
  'A320',
  'A320neo',
  'A321',
  'A321neo',
  'A330-200',
  'A330-300',
  'A350-900',
  'B737-800',
  'B737 MAX 8',
  'B777-300ER',
  'B787-9',
  'E190',
  'ATR 72-600',
];

type ProjectFormModalProps = {
  visible: boolean;
  project?: AircraftProject | null;
  onCancel: () => void;
  onSubmit: (draft: AircraftProjectDraft) => Promise<void>;
};

const ProjectFormModal: React.FC<ProjectFormModalProps> = ({ visible, project, onCancel, onSubmit }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<AircraftProjectDraft>();
  const [submitting, setSubmitting] = useState(false);
  const [choosingLine, setChoosingLine] = useState(false);
  const workspace = Form.useWatch('workspace', form) as string | undefined;
  const line = (Form.useWatch('line', form) as AircraftProjectLine | undefined) ?? 'transition';

  useEffect(() => {
    if (!visible) return;
    form.resetFields();
    setChoosingLine(!project);
    form.setFieldsValue(
      project
        ? {
            name: project.name,
            msn: project.msn,
            aircraftType: project.aircraftType,
            registration: project.registration,
            kind: project.kind,
            line: project.line ?? 'transition',
            workspace: project.workspace,
          }
        : { kind: 'redelivery', line: 'transition' }
    );
  }, [form, project, visible]);

  const chooseLine = (next: AircraftProjectLine) => {
    form.setFieldValue('line', next);
    if (next === 'component') form.setFieldValue('kind', 'other');
    setChoosingLine(false);
  };

  const pickFolder = async () => {
    const paths = await ipcBridge.dialog.showOpen.invoke({ properties: ['openDirectory', 'createDirectory'] });
    if (paths?.[0]) form.setFieldValue('workspace', paths[0]);
  };

  const handleOk = async () => {
    const values = await form.validate();
    setSubmitting(true);
    try {
      await onSubmit({
        name: values.name.trim(),
        msn: values.msn.trim(),
        aircraftType: values.aircraftType?.trim() || undefined,
        registration: values.registration?.trim().toUpperCase() || undefined,
        line: values.line ?? 'transition',
        kind: values.kind,
        workspace: values.workspace || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={project ? t('conversation.aircraftProject.editTitle') : t('conversation.aircraftProject.createTitle')}
      visible={visible}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={submitting}
      footer={choosingLine ? null : undefined}
      okText={project ? t('conversation.aircraftProject.save') : t('conversation.aircraftProject.create')}
      autoFocus={false}
      unmountOnExit
    >
      {choosingLine ? (
        <div className='flex flex-col gap-8px'>
          {(['transition', 'component'] as const).map((item) => (
            <button
              key={item}
              type='button'
              className='text-left rd-8px border border-solid border-[var(--color-border-2)] px-12px py-10px bg-transparent cursor-pointer hover:bg-fill-2'
              onClick={() => chooseLine(item)}
            >
              <div className='text-14px font-600 text-t-primary'>{t(`conversation.aircraftProject.lines.${item}`)}</div>
              <div className='text-12px text-t-secondary'>{t(`conversation.aircraftProject.lines.${item}Hint`)}</div>
            </button>
          ))}
          <button
            type='button'
            className='text-left rd-8px border border-dashed border-[var(--color-border-3)] px-12px py-10px bg-transparent cursor-pointer'
            onClick={() =>
              Modal.info({
                title: t('conversation.aircraftProject.fleetLocked'),
                content: t('conversation.aircraftProject.fleetLockedBody'),
              })
            }
          >
            <div className='text-14px font-600 text-t-tertiary'>{t('conversation.aircraftProject.lines.fleet')}</div>
            <div className='text-12px text-t-tertiary'>{t('conversation.aircraftProject.fleetLocked')}</div>
          </button>
        </div>
      ) : null}
      <Form form={form} layout='vertical' autoComplete='off' style={{ display: choosingLine ? 'none' : undefined }}>
        <Form.Item field='line' hidden>
          <Input />
        </Form.Item>
        <Form.Item
          label={t('conversation.aircraftProject.msn')}
          field='msn'
          rules={[{ required: line !== 'component', message: t('conversation.aircraftProject.msnRequired') }]}
        >
          <Input placeholder='1100' autoFocus />
        </Form.Item>
        <Form.Item
          label={t('conversation.aircraftProject.name')}
          field='name'
          rules={[{ required: true, message: t('conversation.aircraftProject.nameRequired') }]}
        >
          <Input placeholder={t('conversation.aircraftProject.namePlaceholder')} />
        </Form.Item>
        <div className='flex gap-12px'>
          <Form.Item label={t('conversation.aircraftProject.aircraftType')} field='aircraftType' className='flex-1'>
            <AutoComplete data={AIRCRAFT_TYPES} placeholder='A330-200' />
          </Form.Item>
          <Form.Item label={t('conversation.aircraftProject.registration')} field='registration' className='flex-1'>
            <Input placeholder='N285AY' />
          </Form.Item>
        </div>
        {line === 'transition' && (
          <Form.Item label={t('conversation.aircraftProject.kind')} field='kind'>
            <Select
              options={AIRCRAFT_PROJECT_KINDS.map((kind) => ({
                value: kind,
                label: t(`conversation.aircraftProject.kinds.${kind}`),
              }))}
            />
          </Form.Item>
        )}
        <Form.Item field='workspace' noStyle>
          <Input hidden />
        </Form.Item>
        <Form.Item
          label={t('conversation.aircraftProject.folder')}
          extra={t('conversation.aircraftProject.folderHint')}
        >
          <div className='flex items-center gap-8px min-w-0'>
            <Button icon={<FolderOpen theme='outline' size='14' />} onClick={() => void pickFolder()}>
              {workspace
                ? t('conversation.aircraftProject.changeFolder')
                : t('conversation.aircraftProject.pickFolder')}
            </Button>
            {workspace && (
              <span className='text-12px text-t-secondary truncate' title={workspace}>
                {workspace}
              </span>
            )}
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ProjectFormModal;
