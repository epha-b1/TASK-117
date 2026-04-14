export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto & { randomUUID(): string }).randomUUID();
  }
  const rnd = (n: number) => Math.floor(Math.random() * n).toString(16);
  return `${Date.now().toString(16)}-${rnd(0xffff)}${rnd(0xffff)}-${rnd(0xffff)}`;
}
