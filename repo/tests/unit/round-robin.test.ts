import { describe, it, expect } from 'vitest';
import { getNextAssignee } from '../../src/utils/round-robin';
import type { User } from '../../src/types/auth.types';

function makeUser(id: string, isActive = true, createdAt = 0): User {
  return {
    id,
    username: id,
    passwordHash: '',
    salt: '',
    role: 'sales_coordinator',
    isActive,
    createdAt,
    updatedAt: 0
  };
}

describe('round-robin assignment', () => {
  it('returns null when no eligible users', () => {
    expect(getNextAssignee([], {})).toBeNull();
    expect(getNextAssignee([makeUser('a', false)], {})).toBeNull();
  });

  it('picks user with oldest last-assignment timestamp', () => {
    const users = [makeUser('a'), makeUser('b'), makeUser('c')];
    const last = { a: 100, b: 50, c: 200 };
    expect(getNextAssignee(users, last)).toBe('b');
  });

  it('treats unassigned users as earliest (0)', () => {
    const users = [makeUser('a', true, 2), makeUser('b', true, 1)];
    expect(getNextAssignee(users, { a: 100 })).toBe('b');
  });

  it('skips inactive users', () => {
    const users = [makeUser('a', false), makeUser('b', true)];
    expect(getNextAssignee(users, {})).toBe('b');
  });
});
