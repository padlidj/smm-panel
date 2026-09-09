export function orderTarget(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function positiveInt(value: unknown): number {
  if (typeof value !== 'string' && typeof value !== 'number') return NaN;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 && number <= 2147483647 ? number : NaN;
}
