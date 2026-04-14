import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  validateEmail,
  validatePhone,
  validateBudget
} from '../../src/utils/validation';

describe('validation utilities', () => {
  it('strips HTML tags', () => {
    expect(sanitizeText('<script>alert(1)</script>hello')).toBe('alert(1)hello');
    expect(sanitizeText('<b>bold</b> text')).toBe('bold text');
  });

  it('validates email', () => {
    expect(validateEmail('a@b.co')).toBe(true);
    expect(validateEmail('bad@')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });

  it('validates phone', () => {
    expect(validatePhone('555-123-4567')).toBe(true);
    expect(validatePhone('123')).toBe(false);
  });

  it('validates budget', () => {
    expect(validateBudget(100)).toBe(true);
    expect(validateBudget(-1)).toBe(false);
    expect(validateBudget('abc')).toBe(false);
  });
});
