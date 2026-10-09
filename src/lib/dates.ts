import type { DateFilter } from '../types';

export const TIMEZONE = 'Europe/Istanbul';
/**
 * Turkey has been on permanent UTC+3 (no DST) since 2016, so day boundaries
 * are computed with a fixed offset. This keeps the logic simple and testable.
 */
const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** A night out "ends" at 06:00 the next morning. */
export const NIGHT_END_HOUR = 6;
/** Events that started up to this long ago still count as upcoming (late arrivals). */
export const ONGOING_GRACE_MS = 1 * HOUR;

export interface TimeRange {
  /** inclusive, epoch ms */
  start: number;
  /** exclusive, epoch ms (Infinity = open-ended) */
  end: number;
}

/** Epoch ms of 00:00 Istanbul time on the Istanbul calendar day containing `ms`. */
function istanbulMidnight(ms: number): number {
  const local = ms + ISTANBUL_OFFSET_MS;
  return local - (((local % DAY) + DAY) % DAY) - ISTANBUL_OFFSET_MS;
}

/** Day of week in Istanbul (0 = Sunday … 6 = Saturday). */
function istanbulWeekday(ms: number): number {
  return new Date(ms + ISTANBUL_OFFSET_MS).getUTCDay();
}

/**
 * Time window for a date filter, evaluated at `now` (Istanbul time).
 *
 * - tonight: from now until 06:00 the next morning. Between 00:00 and 05:59 it
 *   means the night already in progress (ends 06:00 today).
 * - weekend: Saturday 00:00 → Monday 06:00. On Saturday/Sunday (and Monday
 *   before 06:00) it is the current weekend starting now; otherwise the next one.
 * - next7: now → now + 7 days.
 * - all: now → open-ended.
 *
 * "now" always subtracts ONGOING_GRACE_MS so that a show that started a few
 * minutes ago is still listed.
 */
export function getDateRange(filter: DateFilter, now: number): TimeRange {
  const from = now - ONGOING_GRACE_MS;
  switch (filter) {
    case 'tonight': {
      // Shift back by NIGHT_END_HOUR so 00:00–05:59 belongs to the previous evening.
      const logicalDay = istanbulMidnight(now - NIGHT_END_HOUR * HOUR);
      return { start: from, end: logicalDay + DAY + NIGHT_END_HOUR * HOUR };
    }
    case 'weekend': {
      const shifted = now - NIGHT_END_HOUR * HOUR;
      const logicalDay = istanbulMidnight(shifted);
      const dow = istanbulWeekday(shifted);
      // Days from the logical day to the weekend's Saturday.
      const toSaturday = dow === 6 ? 0 : dow === 0 ? -1 : 6 - dow;
      const saturday = logicalDay + toSaturday * DAY;
      const end = saturday + 2 * DAY + NIGHT_END_HOUR * HOUR; // Monday 06:00
      return { start: Math.max(from, saturday), end };
    }
    case 'next7':
      return { start: from, end: now + 7 * DAY };
    case 'all':
      return { start: from, end: Infinity };
  }
}

export function isInRange(ms: number, range: TimeRange): boolean {
  return ms >= range.start && ms < range.end;
}

const dateFmt = new Intl.DateTimeFormat('tr-TR', {
  timeZone: TIMEZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'long',
});
const timeFmt = new Intl.DateTimeFormat('tr-TR', {
  timeZone: TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
});

/** "Cmt 10 Ekim" */
export function formatDate(ms: number): string {
  return dateFmt.format(ms);
}

/** "21:00" */
export function formatTime(ms: number): string {
  return timeFmt.format(ms);
}

const priceFmt = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
});

/** "₺450" */
export function formatPrice(tryAmount: number): string {
  return priceFmt.format(tryAmount);
}
