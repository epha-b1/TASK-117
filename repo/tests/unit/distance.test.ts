import { describe, it, expect } from 'vitest';
import { haversineDistance, zipInRange, zipToCoords } from '../../src/utils/distance';

describe('distance utilities', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistance(40, -74, 40, -74)).toBeCloseTo(0);
  });

  it('approximates a known distance (NYC to Newark ~8 mi)', () => {
    const d = haversineDistance(40.7128, -74.006, 40.7357, -74.1724);
    expect(d).toBeGreaterThan(6);
    expect(d).toBeLessThan(12);
  });

  it('evaluates ZIP ranges', () => {
    expect(zipInRange('10050', '10001-10099')).toBe(true);
    expect(zipInRange('10150', '10001-10099')).toBe(false);
    expect(zipInRange('10200', '10200')).toBe(true);
  });

  it('looks up coords or returns null', () => {
    expect(zipToCoords('10001')).not.toBeNull();
    expect(zipToCoords('99999')).toBeNull();
  });
});
