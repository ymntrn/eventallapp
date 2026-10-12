/**
 * Biletinial adapter: FIXTURE ONLY.
 *
 * TODO(access): Biletinial's robots.txt and terms of use could not be checked
 * yet (see docs/ticketing-sources.md), and no public API or affiliate feed is
 * known. Until Biletinial permits automated access in writing, or provides a
 * feed, this adapter only reads a saved fixture file and must not fetch
 * biletinial.com. When access is granted, implement fetch() against the
 * official feed/API and adapt BiletinialRaw to its real response shape. The
 * shape below is our own assumption, not Biletinial's format.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { City } from '../../../src/types.ts';
import { guessCategory, parsePrice, toIstanbulIso } from '../normalize.ts';
import type { NormalizedListing, SourceAdapter } from '../types.ts';

export interface BiletinialRaw {
  id: string;
  name: string;
  venue: string;
  city: string;
  /** "17.10.2026" or "2026-10-17" */
  date: string;
  /** "20:00" */
  time: string;
  genre?: string;
  /** "350,00 TL", "Ücretsiz", … */
  priceText?: string;
  soldOut?: boolean;
  url: string;
}

const DEFAULT_FIXTURE = resolve(import.meta.dirname, '../fixtures/biletinial-ankara.sample.json');

const CITY_NAMES: Record<string, City> = { ankara: 'Ankara', istanbul: 'İstanbul', 'i̇stanbul': 'İstanbul' };

export const biletinial: SourceAdapter<BiletinialRaw> = {
  id: 'biletinial',
  platform: 'Biletinial',

  async fetch({ city, fixturePath }) {
    const file = JSON.parse(readFileSync(fixturePath ?? DEFAULT_FIXTURE, 'utf8')) as { listings: BiletinialRaw[] };
    return file.listings.filter((l) => CITY_NAMES[l.city.toLocaleLowerCase('tr-TR')] === city);
  },

  normalize(raw): NormalizedListing | null {
    const city = CITY_NAMES[raw.city.toLocaleLowerCase('tr-TR')];
    const startsAt = toIstanbulIso(raw.date, raw.time);
    if (!city || !startsAt || !raw.name?.trim() || !raw.venue?.trim()) return null;
    let url: URL;
    try {
      url = new URL(raw.url);
    } catch {
      return null;
    }
    if (url.protocol !== 'https:' || !/(^|\.)biletinial\.com$/.test(url.hostname)) return null;
    const listing: NormalizedListing = {
      platform: 'Biletinial',
      sourceId: raw.id,
      title: raw.name.trim(),
      venueName: raw.venue.trim(),
      city,
      startsAt,
      url: url.toString(),
      category: guessCategory(raw.genre, raw.name),
    };
    const price = parsePrice(raw.priceText);
    if (price !== undefined) listing.price = price;
    if (raw.soldOut) listing.available = false;
    return listing;
  },
};
