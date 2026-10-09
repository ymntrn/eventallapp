/** Helpers adapters use to turn platform text into our types. */
import type { Category } from '../../src/types.ts';
import { foldTurkish } from '../../src/lib/slug.ts';

/**
 * Comparable form of a name: Turkish letters folded, lowercase, punctuation
 * removed, "&" read as "ve", whitespace collapsed.
 * "CSO Ada Ankara – Ana Salon" → "cso ada ankara ana salon"
 */
export function normalizeName(input: string): string {
  return foldTurkish(input)
    .replace(/&/g, ' ve ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Turkish price text to a number of lira. Accepts "1.250,50 TL", "₺450",
 * "450 TL", "1250", 1250. "Ücretsiz" (free) gives 0. Returns undefined for
 * text without a number and for negative values.
 */
export function parsePrice(input: string | number | null | undefined): number | undefined {
  if (input === null || input === undefined) return undefined;
  if (typeof input === 'number') return Number.isFinite(input) && input >= 0 ? input : undefined;
  const text = input.trim();
  if (/^ücretsiz$/i.test(text)) return 0;
  if (/-\s*\d/.test(text)) return undefined;
  const m = text.replace(/\s/g, '').match(/\d[\d.,]*/);
  if (!m) return undefined;
  let num = m[0];
  if (num.includes(',')) num = num.replace(/\./g, '').replace(',', '.'); // 1.250,50
  else if (/^\d{1,3}(\.\d{3})+$/.test(num)) num = num.replace(/\./g, ''); // 1.250
  const value = Number(num);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

/**
 * Date and time (Europe/Istanbul wall clock) to ISO 8601 with +03:00.
 * date: "2026-10-17", "17.10.2026" or "17/10/2026"; time: "20:00" or "20.00".
 * Returns undefined when either part cannot be parsed.
 */
export function toIstanbulIso(date: string, time: string): string | undefined {
  const d = date.trim();
  let y: string, mo: string, da: string;
  let m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) [, y, mo, da] = m;
  else if ((m = d.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/))) {
    [, da, mo, y] = m;
    da = da.padStart(2, '0');
    mo = mo.padStart(2, '0');
  } else return undefined;
  const t = time.trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!t) return undefined;
  const hh = t[1].padStart(2, '0');
  if (+hh > 23 || +t[2] > 59 || +mo < 1 || +mo > 12 || +da < 1 || +da > 31) return undefined;
  const iso = `${y}-${mo}-${da}T${hh}:${t[2]}:00+03:00`;
  // Reject impossible dates such as 31.02.
  const check = new Date(iso);
  if (Number.isNaN(check.getTime())) return undefined;
  const local = new Date(check.getTime() + 3 * 3600_000).toISOString().slice(0, 10);
  return local === `${y}-${mo}-${da}` ? iso : undefined;
}

/** Keyword → category, checked in order against the folded genre/title text. */
const CATEGORY_RULES: [RegExp, Category][] = [
  [/stand ?up|komedi|comedy|dogaclama/, 'comedy'],
  [/tiyatro|oyun|muzikal|theat/, 'theater'],
  [/elektronik|techno|house|dj\b|electronic/, 'electronic'],
  [/caz|jazz|klasik|senfoni|opera|bale|resital|orkestra|classical/, 'jazz_classical'],
  [/rock|metal|punk|grunge/, 'rock'],
  [/pop|rap|hip ?hop/, 'pop'],
];

/** Best-effort category from a platform's genre label and the title. */
export function guessCategory(...texts: (string | undefined)[]): Category {
  const hay = normalizeName(texts.filter(Boolean).join(' '));
  for (const [re, cat] of CATEGORY_RULES) if (re.test(hay)) return cat;
  return 'other';
}
