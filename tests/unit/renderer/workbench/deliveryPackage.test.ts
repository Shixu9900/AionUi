/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import type { IWorkspaceFlatFile } from '@/common/adapter/ipcBridge';
import {
  PACKAGE_GROUPS,
  itemStatus,
  itemWorkflows,
  llpTargetOf,
  packageItem,
  scanPackage,
} from '@/renderer/pages/workbench/deliveryPackage';

const files = (...paths: string[]): IWorkspaceFlatFile[] =>
  paths.map((relativePath) => ({
    relativePath,
    fullPath: `/bible/${relativePath}`,
    name: relativePath.split('/').pop() ?? relativePath,
  }));

describe('delivery package template', () => {
  it('holds the 135 Annex II items in groups A to K', () => {
    expect(PACKAGE_GROUPS.map((g) => g.code)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']);
    expect(PACKAGE_GROUPS.flatMap((g) => g.items)).toHaveLength(135);
  });

  it('maps items to one or more workflows', () => {
    expect(itemWorkflows('A001')).toEqual(['completeness']);
    expect(itemWorkflows('B013')).toEqual(['status', 'llp']);
    expect(itemWorkflows('E004')).toEqual(['history']);
    expect(llpTargetOf('F008')).toBe('engine');
    expect(llpTargetOf('G006')).toBe('apu');
    expect(llpTargetOf('I005')).toBe('gear');
    expect(llpTargetOf('A001')).toBeUndefined();
  });
});

describe('scanPackage', () => {
  it('files IATA-numbered folders and keeps the engine folder as the instance', () => {
    const scan = scanPackage(
      files(
        'A. Certificates/A001 Certificate of Airworthiness/MSN 1 CofA.pdf',
        'B. Status/B013 Hard time components/list.xlsx',
        'C. Maintenance/C001 Programme/amp.pdf',
        'D. Repairs/D001 Structural repairs/srm.pdf',
        'F. Engine Records/# 1 Engine 111111/F007 LLP listing/llp.pdf',
        'F. Engine Records/# 2 Engine 222222/F007 LLP listing/llp.pdf',
        'F. Engine Records/# 2 Engine 222222/loose.pdf'
      ),
      false
    );
    expect(scan.style).toBe('iata-items');
    expect(scan.byItem.get('A001')).toHaveLength(1);
    expect(scan.byItem.get('F007')?.map((f) => f.instance)).toEqual(['# 1 Engine 111111', '# 2 Engine 222222']);
    expect(scan.byItem.get('F007')?.[0].folder).toBe('F007 LLP listing');
    expect(scan.byGroup.get('F')?.map((f) => f.name)).toEqual(['loose.pdf']);
  });

  it('keeps an inherited bible whole and lists unrecognised folders', () => {
    const scan = scanPackage(
      files(
        'K. Miscellaneous/K002 Previous Bibles/old/A001 CofA/x.pdf',
        'Previous delivery bible/F007/y.pdf',
        'Scans to sort/z.pdf',
        '.DS_Store'
      ),
      false
    );
    expect(scan.inherited).toHaveLength(2);
    expect(scan.byItem.size).toBe(0);
    expect(scan.unfiled.map((f) => f.name)).toEqual(['z.pdf']);
  });

  it('does not guess numbers outside Annex II', () => {
    const scan = scanPackage(files('A100 - Certificates/c.pdf', '(01) Certificates/d.pdf'), false);
    expect(scan.byItem.size).toBe(0);
    expect(scan.unfiled).toHaveLength(2);
  });

  it('treats K as miscellany on jets and as propellers on turboprops', () => {
    const paths = files('K. Propeller/K001 Total time/t.pdf');
    const jet = scanPackage(paths, false);
    const prop = scanPackage(paths, true);
    const k001 = packageItem('K001');
    if (!k001) throw new Error('K001 missing from template');
    expect(jet.byGroup.get('K')).toHaveLength(1);
    expect(itemStatus(jet, k001, false)).toBe('na');
    expect(prop.byItem.get('K001')).toHaveLength(1);
    expect(itemStatus(prop, k001, true)).toBe('present');
  });
});
