export function formatCurrency(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = (abs % 100).toString().padStart(2, '0');
  return `${sign}$${dollars.toLocaleString()}.${remainder}`;
}

export function formatDate(epochMs: number): string {
  if (!epochMs) return '';
  const d = new Date(epochMs);
  return d.toLocaleString();
}

export function formatDateOnly(epochMs: number): string {
  if (!epochMs) return '';
  const d = new Date(epochMs);
  return d.toLocaleDateString();
}

export function maskBankRef(ref: string): string {
  if (!ref) return '';
  const last4 = ref.slice(-4);
  return `****${last4}`;
}
