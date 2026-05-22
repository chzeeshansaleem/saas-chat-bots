export function normalizeDomain(value: string) {
  return value.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
}
