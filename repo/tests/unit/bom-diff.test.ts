import { describe, it, expect } from 'vitest';
import { diffBom } from '../../src/utils/bom-diff';
import type { BomItem } from '../../src/types/plan.types';

function item(partial: Partial<BomItem>): BomItem {
  return {
    id: 'i',
    planId: 'p',
    partNumber: 'X',
    description: 'd',
    quantity: 1,
    unit: 'ea',
    unitCost: 1,
    sortOrder: 0,
    ...partial
  };
}

describe('BOM diff', () => {
  it('detects added items', () => {
    const a: BomItem[] = [];
    const b = [item({ partNumber: 'A' })];
    const d = diffBom(a, b);
    expect(d.added.length).toBe(1);
    expect(d.removed).toEqual([]);
    expect(d.modified).toEqual([]);
  });

  it('detects removed items', () => {
    const a = [item({ partNumber: 'A' })];
    const b: BomItem[] = [];
    const d = diffBom(a, b);
    expect(d.removed.length).toBe(1);
    expect(d.added).toEqual([]);
  });

  it('detects quantity/cost/description/unit/length changes', () => {
    const a = [item({ partNumber: 'A', quantity: 1, unitCost: 10, description: 'x', unit: 'ea', length: 2 })];
    const b = [item({ partNumber: 'A', quantity: 2, unitCost: 12, description: 'y', unit: 'kg', length: 3 })];
    const d = diffBom(a, b);
    expect(d.modified).toHaveLength(1);
    expect(d.modified[0].changedFields.sort()).toEqual(
      ['description', 'length', 'quantity', 'unit', 'unitCost'].sort()
    );
  });

  it('treats unchanged items as unchanged', () => {
    const a = [item({ partNumber: 'A' })];
    const b = [item({ partNumber: 'A' })];
    const d = diffBom(a, b);
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([]);
    expect(d.modified).toEqual([]);
  });
});
