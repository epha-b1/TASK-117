import { describe, it, expect } from 'vitest';
import { formatCurrency, maskBankRef } from '../../src/utils/format';

describe('format utilities', () => {
  it('formats cents as currency', () => {
    expect(formatCurrency(4500)).toBe('$45.00');
    expect(formatCurrency(12075)).toBe('$120.75');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(-500)).toBe('-$5.00');
  });

  it('masks bank references to last 4 digits', () => {
    expect(maskBankRef('1234567890')).toBe('****7890');
    expect(maskBankRef('9999')).toBe('****9999');
    expect(maskBankRef('')).toBe('');
  });
});
