import type { FreightResult } from '../types/delivery.types';

const BASE_CENTS = 4500;
const PER_MILE_CENTS = 125;
const FREE_MILES = 20;
const OVERSIZE_FT = 8;
const OVERSIZE_SURCHARGE_CENTS = 7500;

export interface FreightItem {
  length?: number;
  quantity?: number;
}

export function calculateFreight(distanceMiles: number, items: FreightItem[]): FreightResult {
  const miles = Math.max(0, distanceMiles);
  const perMile = miles > FREE_MILES
    ? Math.round((miles - FREE_MILES) * PER_MILE_CENTS)
    : 0;
  const hasOversize = items.some((i) => (i.length ?? 0) > OVERSIZE_FT);
  const oversize = hasOversize ? OVERSIZE_SURCHARGE_CENTS : 0;
  const total = BASE_CENTS + perMile + oversize;
  return {
    baseCost: BASE_CENTS,
    perMileCost: perMile,
    oversizeSurcharge: oversize,
    totalCost: total,
    distanceMiles: miles,
    hasOversizeItem: hasOversize
  };
}
