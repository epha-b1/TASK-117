import { describe, it, expect } from 'vitest';
import { isInDndWindow } from '../../src/services/notification.service';

function dnd(startH: number, startM: number, endH: number, endM: number, enabled = true) {
  return { userId: 'u', startHour: startH, startMinute: startM, endHour: endH, endMinute: endM, enabled };
}

function at(h: number, m: number): Date {
  const d = new Date(2026, 0, 1);
  d.setHours(h, m, 0, 0);
  return d;
}

describe('DND window detection', () => {
  it('returns false when disabled', () => {
    expect(isInDndWindow(at(22, 0), dnd(21, 0, 7, 0, false))).toBe(false);
  });

  it('same-day window 13:00–14:00', () => {
    expect(isInDndWindow(at(13, 30), dnd(13, 0, 14, 0))).toBe(true);
    expect(isInDndWindow(at(14, 0), dnd(13, 0, 14, 0))).toBe(false);
    expect(isInDndWindow(at(12, 59), dnd(13, 0, 14, 0))).toBe(false);
  });

  it('overnight window 21:00–07:00', () => {
    expect(isInDndWindow(at(22, 0), dnd(21, 0, 7, 0))).toBe(true);
    expect(isInDndWindow(at(2, 0), dnd(21, 0, 7, 0))).toBe(true);
    expect(isInDndWindow(at(7, 0), dnd(21, 0, 7, 0))).toBe(false);
    expect(isInDndWindow(at(20, 59), dnd(21, 0, 7, 0))).toBe(false);
  });
});
