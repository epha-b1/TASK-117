import { writable } from 'svelte/store';
import { uid } from '../utils/uid';

export type ToastLevel = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  level: ToastLevel;
  message: string;
  timeout: number;
}

export const toasts = writable<Toast[]>([]);

export function pushToast(message: string, level: ToastLevel = 'info', timeout = 4000): string {
  const t: Toast = { id: uid(), level, message, timeout };
  toasts.update((list) => [...list, t]);
  if (timeout > 0) {
    setTimeout(() => dismissToast(t.id), timeout);
  }
  return t.id;
}

export function dismissToast(id: string): void {
  toasts.update((list) => list.filter((t) => t.id !== id));
}
