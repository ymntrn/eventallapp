/**
 * Regenerates src/data/events.json with SAMPLE events dated relative to today
 * (Istanbul time), so the demo never goes stale. Never fetches anything.
 *
 *   npm run seed:events
 *
 * Delete this script once real event data is wired in.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Category, EventItem, EventsFile, Offer, TicketPlatform } from '../src/types.ts';

/** Platform homepages only. Never invent event-specific URLs. */
const HOMEPAGES: Record<Exclude<TicketPlatform, 'Other'>, string> = {
  Biletix: 'https://www.biletix.com/',
  Passo: 'https://www.passo.com.tr/',
  Biletinial: 'https://biletinial.com/',
  Bubilet: 'https://www.bubilet.com.tr/',
  Mobilet: 'https://mobilet.com/',
};

type Template = [
  dayOffset: number,
  time: string,
  venueId: string,
  title: string,
  category: Category,
  platform: Exclude<TicketPlatform, 'Other'>,
  priceFrom?: number,
  performerIds?: string[],
];

const TEMPLATES: Template[] = [
  [0, '20:00', 'cso-ada-ankara', 'Senfonik Akşam: Beethoven 7', 'jazz_classical', 'Biletinial', 300, ['baskent-oda-orkestrasi']],
  [0, '21:30', '6-45-kk-ankara', 'Akustik Rock Gecesi', 'rock', 'Biletix', 450, ['kuzey-ruzgari']],
  [0, '20:30', 'akun-sahnesi', 'Komedi Oyunu: Kiracı', 'theater', 'Biletinial', 150, ['sahne-atolyesi']],
  [1, '20:00', 'ankara-opera-sahnesi', 'Opera: La Traviata', 'jazz_classical', 'Biletinial', 250],
  [1, '22:00', 'if-performance-hall-ankara', 'Indie Pop Gecesi', 'pop', 'Biletix', 500, ['deniz-aral']],
  [2, '19:00', 'congresium-ankara', 'Stand-up Akşamı', 'comedy', 'Passo', 600, ['ece-tunali']],
  [2, '21:00', '6-45-kk-ankara', 'Elektronik Set: Gece Yarısı', 'electronic', 'Bubilet', 400, ['dj-gece-yarisi']],
  [3, '20:00', 'sinasi-sahnesi', 'Dram: Bir Ankara Hikayesi', 'theater', 'Biletinial', 120, ['sahne-atolyesi']],
  [3, '20:30', 'bilkent-konser-salonu', 'Oda Müziği Konseri', 'jazz_classical', 'Biletix', 200, ['baskent-oda-orkestrasi']],
  [4, '21:00', 'if-performance-hall-ankara', 'Alternatif Rock Konseri', 'rock', 'Biletix', 550, ['beton-cicekleri']],
  [5, '20:00', 'cso-ada-ankara', 'Caz Orkestrası Konseri', 'jazz_classical', 'Biletinial', 350, ['lale-caz-uclusu']],
  [5, '23:00', 'cermodern', 'Elektronik Müzik Gecesi', 'electronic', 'Bubilet', 700, ['frekans-kolektif', 'dj-gece-yarisi']],
  [6, '15:00', 'genclik-parki', 'Açık Hava Halk Müziği Konseri', 'other', 'Mobilet'],
  [6, '20:00', 'cagdas-sanatlar-merkezi', 'Tek Kişilik Oyun: Ses', 'theater', 'Biletinial', 100],
  [7, '21:00', 'ankara-arena', 'Pop Konseri', 'pop', 'Passo', 900, ['selin-ayaz']],
  [8, '20:00', 'meb-sura-salonu', 'Türk Sanat Müziği Konseri', 'other', 'Biletix', 300],
  [9, '20:30', 'akun-sahnesi', 'Müzikal: Ankara Rüyası', 'theater', 'Biletinial', 200, ['sahne-atolyesi']],
  [10, '21:00', '6-45-kk-ankara', 'Punk Rock Gecesi', 'rock', 'Biletix', 350, ['gri-sokak']],
  [11, '19:30', 'odtu-kultur-ve-kongre-merkezi', 'Gençlik Korosu Konseri', 'jazz_classical', 'Bubilet', 150],
  [12, '20:00', 'congresium-ankara', 'Komedi Festivali Özel Gösterim', 'comedy', 'Passo', 650, ['ece-tunali', 'kaan-yilmazer']],
  [13, '13:00', 'altinpark', 'Sonbahar Müzik Festivali – 1. Gün', 'pop', 'Passo', 800, ['selin-ayaz', 'deniz-aral']],
  [14, '13:00', 'altinpark', 'Sonbahar Müzik Festivali – 2. Gün', 'rock', 'Passo', 800, ['beton-cicekleri', 'kuzey-ruzgari', 'gri-sokak']],
  [15, '20:00', 'ankara-opera-sahnesi', 'Bale: Kuğu Gölü', 'jazz_classical', 'Biletinial', 250],
  [17, '21:00', 'if-performance-hall-ankara', 'Elektro-Pop Konseri', 'electronic', 'Biletix', 600, ['deniz-aral', 'frekans-kolektif']],
  [18, '19:00', 'bilkent-odeon', 'Açık Hava Rock Konseri', 'rock', 'Biletix', 950, ['beton-cicekleri']],
  [20, '20:30', 'sinasi-sahnesi', 'Klasik Komedi: Cimri', 'theater', 'Biletinial', 120, ['sahne-atolyesi']],
  [22, '20:00', 'bilkent-konser-salonu', 'Piyano Resitali', 'jazz_classical', 'Biletix', 250, ['aylin-erdem']],
  [24, '21:00', 'cermodern', 'Deneysel Elektronik Performans', 'electronic', 'Mobilet', 400, ['frekans-kolektif']],
  [26, '20:00', 'ankara-arena', 'Rap Konseri', 'pop', 'Passo', 850, ['mert-kalkan']],
  [28, '20:30', 'cagdas-sanatlar-merkezi', 'Doğaçlama Komedi', 'comedy', 'Bubilet', 180, ['dogaclama-ankara']],
];

/** Today's date in Istanbul as YYYY-MM-DD. */
function istanbulToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const PLATFORMS = Object.keys(HOMEPAGES) as Exclude<TicketPlatform, 'Other'>[];

/**
 * Builds 1–4 seller offers around the template's base price. Deterministic per
 * event index so re-running the script gives stable prices. Sample only.
 */
function sampleOffers(i: number, primary: Exclude<TicketPlatform, 'Other'>, base?: number): Offer[] {
  const others = PLATFORMS.filter((p) => p !== primary);
  const extra = i % 4; // 0..3 additional sellers
  const sellers = [primary, ...others.slice(i % others.length), ...others].filter(
    (p, idx, arr) => arr.indexOf(p) === idx,
  ).slice(0, 1 + extra);
  // Price multipliers per seller position: primary at base, others ±.
  const factors = [1, 1.08, 0.94, 1.15];
  return sellers.map((platform, k) => {
    const offer: Offer = { platform, url: HOMEPAGES[platform], label: k === 2 ? 'Öğrenci' : 'Genel giriş' };
    if (base !== undefined) offer.price = Math.round((base * factors[k]) / 10) * 10;
    if (k === 3 && i % 3 === 0) offer.available = false;
    return offer;
  });
}

const today = istanbulToday();
const events: EventItem[] = TEMPLATES.map(
  ([dayOffset, time, venueId, title, category, platform, priceFrom, performerIds], i) => {
    const event: EventItem = {
      id: `ornek-${String(i + 1).padStart(3, '0')}`,
      venueId,
      title: `[Örnek] ${title}`,
      category,
      startsAt: `${addDays(today, dayOffset)}T${time}:00+03:00`,
      offers: sampleOffers(i, platform, priceFrom),
    };
    if (performerIds?.length) event.performerIds = performerIds;
    return event;
  },
);

const file: EventsFile = {
  _note: `SAMPLE DATA, not real events. Generated by scripts/generate-sample-events.ts on ${today}. Offers and prices are invented; links point to platform homepages only.`,
  events,
};

const out = resolve(import.meta.dirname, '../src/data/events.json');
writeFileSync(out, JSON.stringify(file, null, 2) + '\n');
console.log(`Wrote ${events.length} sample events to ${out}`);
