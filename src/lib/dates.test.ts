import { describe, expect, it } from 'vitest';
import { getDateRange, isInRange, ONGOING_GRACE_MS } from './dates';

/** Istanbul wall-clock time → epoch ms. */
const ist = (s: string) => Date.parse(`${s}+03:00`);
const inRange = (filter: Parameters<typeof getDateRange>[0], now: string, event: string) =>
  isInRange(ist(event), getDateRange(filter, ist(now)));

// 2026-10-09 is a Friday, 10th Saturday, 11th Sunday, 12th Monday.

describe('Bu akşam (tonight)', () => {
  it('in the afternoon covers this evening until 06:00 next morning', () => {
    const r = getDateRange('tonight', ist('2026-10-09T16:00:00'));
    expect(r.end).toBe(ist('2026-10-10T06:00:00'));
    expect(inRange('tonight', '2026-10-09T16:00:00', '2026-10-09T21:00:00')).toBe(true);
    expect(inRange('tonight', '2026-10-09T16:00:00', '2026-10-10T01:30:00')).toBe(true);
    expect(inRange('tonight', '2026-10-09T16:00:00', '2026-10-10T06:00:00')).toBe(false);
    expect(inRange('tonight', '2026-10-09T16:00:00', '2026-10-10T20:00:00')).toBe(false);
  });

  it('just before midnight still includes after-midnight shows', () => {
    expect(inRange('tonight', '2026-10-09T23:59:00', '2026-10-10T00:30:00')).toBe(true);
    expect(inRange('tonight', '2026-10-09T23:59:00', '2026-10-10T20:00:00')).toBe(false);
  });

  it('just after midnight refers to the night in progress, not the next evening', () => {
    const r = getDateRange('tonight', ist('2026-10-10T00:30:00'));
    expect(r.end).toBe(ist('2026-10-10T06:00:00'));
    expect(inRange('tonight', '2026-10-10T00:30:00', '2026-10-10T02:00:00')).toBe(true);
    expect(inRange('tonight', '2026-10-10T00:30:00', '2026-10-10T21:00:00')).toBe(false);
  });

  it('at 06:00 switches to the coming evening', () => {
    const r = getDateRange('tonight', ist('2026-10-10T06:00:00'));
    expect(r.end).toBe(ist('2026-10-11T06:00:00'));
  });

  it('excludes events that started more than the grace period ago', () => {
    const now = ist('2026-10-09T21:00:00');
    const r = getDateRange('tonight', now);
    expect(r.start).toBe(now - ONGOING_GRACE_MS);
    expect(inRange('tonight', '2026-10-09T21:00:00', '2026-10-09T20:30:00')).toBe(true);
    expect(inRange('tonight', '2026-10-09T21:00:00', '2026-10-09T19:00:00')).toBe(false);
  });

  it('is independent of the machine time zone (uses Istanbul time)', () => {
    // 22:00 UTC on Oct 9 is 01:00 Istanbul on Oct 10 → still "that night".
    const now = Date.parse('2026-10-09T22:00:00Z');
    expect(getDateRange('tonight', now).end).toBe(ist('2026-10-10T06:00:00'));
  });
});

describe('Bu hafta sonu (weekend)', () => {
  const satStart = ist('2026-10-10T00:00:00');
  const monEnd = ist('2026-10-12T06:00:00');

  it('on a weekday is the coming Saturday 00:00 → Monday 06:00', () => {
    expect(getDateRange('weekend', ist('2026-10-07T12:00:00'))).toEqual({ start: satStart, end: monEnd }); // Wed
    expect(getDateRange('weekend', ist('2026-10-09T23:00:00'))).toEqual({ start: satStart, end: monEnd }); // Fri night
    expect(inRange('weekend', '2026-10-09T12:00:00', '2026-10-09T21:00:00')).toBe(false); // Friday show
  });

  it('on Saturday starts now', () => {
    const now = ist('2026-10-10T15:00:00');
    expect(getDateRange('weekend', now)).toEqual({ start: now - ONGOING_GRACE_MS, end: monEnd });
  });

  it('on Sunday evening still means the current weekend', () => {
    const now = ist('2026-10-11T22:00:00');
    expect(getDateRange('weekend', now).end).toBe(monEnd);
    expect(inRange('weekend', '2026-10-11T22:00:00', '2026-10-11T23:30:00')).toBe(true);
    expect(inRange('weekend', '2026-10-11T22:00:00', '2026-10-12T01:00:00')).toBe(true); // Sun night, after midnight
    expect(inRange('weekend', '2026-10-11T22:00:00', '2026-10-17T20:00:00')).toBe(false); // next Saturday
  });

  it('just before Sunday midnight and just after it stay on the same weekend', () => {
    expect(getDateRange('weekend', ist('2026-10-11T23:59:00')).end).toBe(monEnd);
    expect(getDateRange('weekend', ist('2026-10-12T00:30:00')).end).toBe(monEnd);
  });

  it('from Monday 06:00 it rolls over to the next weekend', () => {
    expect(getDateRange('weekend', ist('2026-10-12T06:00:00'))).toEqual({
      start: ist('2026-10-17T00:00:00'),
      end: ist('2026-10-19T06:00:00'),
    });
  });
});

describe('Önümüzdeki 7 gün / Tüm etkinlikler', () => {
  it('next7 spans exactly 7 days from now', () => {
    expect(inRange('next7', '2026-10-09T12:00:00', '2026-10-16T11:59:00')).toBe(true);
    expect(inRange('next7', '2026-10-09T12:00:00', '2026-10-16T12:00:00')).toBe(false);
  });

  it('all is open-ended but excludes past events', () => {
    expect(inRange('all', '2026-10-09T12:00:00', '2027-06-01T20:00:00')).toBe(true);
    expect(inRange('all', '2026-10-09T12:00:00', '2026-10-08T20:00:00')).toBe(false);
  });
});
