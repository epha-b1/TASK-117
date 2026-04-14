import { writable, derived } from 'svelte/store';

function parseHash(): string {
  const h = window.location.hash || '#/';
  return h.slice(1) || '/';
}

export const currentPath = writable<string>(parseHash());

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    currentPath.set(parseHash());
  });
}

export function navigate(path: string): void {
  const normalized = path.startsWith('/') ? path : '/' + path;
  if (window.location.hash !== '#' + normalized) {
    window.location.hash = normalized;
  } else {
    currentPath.set(normalized);
  }
}

export const routeSegments = derived(currentPath, ($p) => {
  const parts = $p.split('?')[0].split('/').filter(Boolean);
  return parts;
});

export const queryParams = derived(currentPath, ($p) => {
  const qIdx = $p.indexOf('?');
  if (qIdx < 0) return new URLSearchParams();
  return new URLSearchParams($p.slice(qIdx + 1));
});
