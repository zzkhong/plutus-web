/**
 * Money and date formatting. Pure — plutus-ai returns integer cents and ISO
 * strings, and every label on the page is built here, matching the bot:
 * S$4.50, RM45.00, $10.00, and "RM45.00 (S$14.02)" when it wasn't in SGD.
 */

export type Currency = 'SGD' | 'MYR' | 'USD';

/** The app's day and month boundaries are Singapore's (plutus-ai's APP_TIMEZONE). */
export const APP_TIMEZONE = 'Asia/Singapore';

const PREFIX: Record<Currency, string> = { SGD: 'S$', MYR: 'RM', USD: '$' };

export function formatMoney(cents: number, currency: Currency = 'SGD'): string {
  const sign = cents < 0 ? '-' : '';
  const amount = (Math.abs(cents) / 100).toLocaleString('en-SG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${PREFIX[currency]}${amount}`;
}

/** The original amount, with its SGD value alongside when it was in another currency. */
export function formatAmountWithSgd(amount: number, currency: Currency, amountSgd: number): string {
  return currency === 'SGD' ? formatMoney(amount) : `${formatMoney(amount, currency)} (${formatMoney(amountSgd)})`;
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/** "2026-09" for the month containing `date`, in Singapore time. */
export function monthKeyOf(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return `${year}-${month}`;
}

/** "2026-09" moved by `offset` months. */
export function shiftMonth(key: string, offset: number): string {
  const [year, month] = key.split('-').map(Number);
  const index = year * 12 + (month - 1) + offset;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** "September 2026". */
export function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 15)).toLocaleDateString('en-SG', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** "Sun, 20 Sep" in Singapore time. */
export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-SG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: APP_TIMEZONE,
  });
}

/** "2026-09-20" in Singapore time, for grouping a list by day. */
export function dayKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE }).format(new Date(iso));
}
