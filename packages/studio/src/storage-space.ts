const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'] as const;

export function formatStorageSpace(
  bytes: unknown,
  locale: string,
): string | null {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0)
    return null;
  let amount = bytes;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit++;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: unit === 0 ? 0 : 1 }).format(amount)} ${units[unit]}`;
}
