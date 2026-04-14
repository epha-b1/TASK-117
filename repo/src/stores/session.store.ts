import { writable, derived } from 'svelte/store';
import type { Session, UserRole } from '../types/auth.types';
import { lsGet, lsSet, lsRemove, LS_KEYS } from '../utils/local-storage';

const IDLE_MS = 15 * 60 * 1000;

function load(): Session | null {
  const s = lsGet<Session>(LS_KEYS.SESSION);
  if (!s) return null;
  if (s.expiresAt <= Date.now()) {
    lsRemove(LS_KEYS.SESSION);
    return null;
  }
  return s;
}

export const session = writable<Session | null>(load());

export const currentRole = derived(session, ($s) => $s?.role ?? null);
export const isAuthenticated = derived(session, ($s) => $s !== null);

export function setSession(partial: { userId: string; username: string; role: UserRole }): void {
  const s: Session = {
    userId: partial.userId,
    username: partial.username,
    role: partial.role,
    expiresAt: Date.now() + IDLE_MS
  };
  lsSet(LS_KEYS.SESSION, s);
  session.set(s);
}

export function clearSession(): void {
  lsRemove(LS_KEYS.SESSION);
  session.set(null);
}

export function refreshSession(): void {
  const s = lsGet<Session>(LS_KEYS.SESSION);
  if (!s) return;
  s.expiresAt = Date.now() + IDLE_MS;
  lsSet(LS_KEYS.SESSION, s);
  session.set(s);
}

export function getCurrentSession(): Session | null {
  const s = lsGet<Session>(LS_KEYS.SESSION);
  if (!s) {
    session.set(null);
    return null;
  }
  if (s.expiresAt <= Date.now()) {
    clearSession();
    return null;
  }
  return s;
}

export const IDLE_TIMEOUT_MS = IDLE_MS;
