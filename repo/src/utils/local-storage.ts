const PREFIX = 'forgeops:';

export function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function lsSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota exceeded / storage disabled */
  }
}

export function lsRemove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* noop */
  }
}

export const LS_KEYS = {
  SESSION: 'session',
  FAILED_LOGINS: 'failed_logins',
  ROUND_ROBIN: 'round_robin_state',
  UI_PREFS: 'ui_prefs',
  FIRST_RUN_BANNER_DISMISSED: 'first_run_banner_dismissed'
} as const;
