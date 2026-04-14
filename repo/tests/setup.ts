import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

// Polyfill crypto.randomUUID in jsdom if missing
if (typeof crypto !== 'undefined' && !('randomUUID' in crypto)) {
  (crypto as Crypto & { randomUUID: () => string }).randomUUID = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
}
