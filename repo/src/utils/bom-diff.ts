import type { BomItem, BomDiff } from '../types/plan.types';

export function diffBom(a: BomItem[], b: BomItem[]): BomDiff {
  const aMap = new Map(a.map((i) => [i.partNumber, i]));
  const bMap = new Map(b.map((i) => [i.partNumber, i]));

  const added: BomItem[] = [];
  const removed: BomItem[] = [];
  const modified: BomDiff['modified'] = [];

  for (const [pn, itemB] of bMap) {
    if (!aMap.has(pn)) added.push(itemB);
  }
  for (const [pn, itemA] of aMap) {
    const itemB = bMap.get(pn);
    if (!itemB) {
      removed.push(itemA);
      continue;
    }
    const changed: string[] = [];
    if (itemA.quantity !== itemB.quantity) changed.push('quantity');
    if (itemA.unitCost !== itemB.unitCost) changed.push('unitCost');
    if (itemA.description !== itemB.description) changed.push('description');
    if (itemA.unit !== itemB.unit) changed.push('unit');
    if ((itemA.length ?? null) !== (itemB.length ?? null)) changed.push('length');
    if (changed.length > 0) {
      modified.push({ before: itemA, after: itemB, changedFields: changed });
    }
  }
  return { added, removed, modified };
}
