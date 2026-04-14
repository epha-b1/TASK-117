const HTML_TAG = /<\/?[a-zA-Z][^>]*>/g;
const CONTROL = /[\u0000-\u001F\u007F]/g;

export function sanitizeText(input: unknown): string {
  if (input == null) return '';
  const s = String(input);
  return s.replace(HTML_TAG, '').replace(CONTROL, '').trim();
}

export function validateEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePhone(phone: string): boolean {
  if (typeof phone !== 'string') return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function validateBudget(value: unknown): boolean {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n >= 0;
}

export function requireNonEmpty(value: unknown, label: string): string {
  const s = sanitizeText(value);
  if (!s) throw new Error(`${label} is required`);
  return s;
}
