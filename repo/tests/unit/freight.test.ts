import { describe, it, expect } from 'vitest';
import { calculateFreight } from '../../src/utils/freight';

describe('freight calculation', () => {
  it('base fee only for distances at or under 20 miles', () => {
    const r = calculateFreight(20, [{ length: 4, quantity: 1 }]);
    expect(r.baseCost).toBe(4500);
    expect(r.perMileCost).toBe(0);
    expect(r.oversizeSurcharge).toBe(0);
    expect(r.totalCost).toBe(4500);
  });

  it('adds $1.25/mile after 20 miles', () => {
    const r = calculateFreight(30, [{ length: 4, quantity: 1 }]);
    expect(r.perMileCost).toBe(1250); // 10 miles * 125
    expect(r.totalCost).toBe(4500 + 1250);
  });

  it('applies oversize surcharge once for any item > 8 ft', () => {
    const r = calculateFreight(10, [
      { length: 9, quantity: 1 },
      { length: 10, quantity: 1 }
    ]);
    expect(r.hasOversizeItem).toBe(true);
    expect(r.oversizeSurcharge).toBe(7500);
    expect(r.totalCost).toBe(4500 + 7500);
  });

  it('does not apply surcharge at exactly 8 ft', () => {
    const r = calculateFreight(10, [{ length: 8, quantity: 1 }]);
    expect(r.hasOversizeItem).toBe(false);
    expect(r.oversizeSurcharge).toBe(0);
  });

  it('combines all components', () => {
    const r = calculateFreight(100, [{ length: 12, quantity: 1 }]);
    expect(r.totalCost).toBe(4500 + 80 * 125 + 7500);
  });
});
