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

/**
 * Venue ids are real rows of the OSM venue database (src/data/venues.json),
 * each picked to match the kind of event. Spread over Ankara and İstanbul.
 */
const TEMPLATES: Template[] = [
  // Ankara
  [0, '20:00', 'ank-cso-ada-ankara', 'Senfonik Akşam: Beethoven 7', 'jazz_classical', 'Biletinial', 300, ['baskent-oda-orkestrasi']],
  [0, '21:30', 'ank-route-ankara', 'Akustik Rock Gecesi', 'rock', 'Biletix', 450, ['kuzey-ruzgari']],
  [0, '20:30', 'ank-akun-sahnesi', 'Komedi Oyunu: Kiracı', 'theater', 'Biletinial', 150, ['sahne-atolyesi']],
  [1, '20:00', 'ank-ankara-devlet-opera-ve-balesi-opera-sahnesi', 'Opera: La Traviata', 'jazz_classical', 'Biletinial', 250],
  [1, '22:00', 'ank-if-performance-hall-ankara', 'Indie Pop Gecesi', 'pop', 'Biletix', 500, ['deniz-aral']],
  [2, '19:00', 'ank-congresium-ankara-ato', 'Stand-up Akşamı', 'comedy', 'Passo', 600, ['ece-tunali']],
  [2, '21:00', 'ank-if-sokak-tunus', 'Elektronik Set: Gece Yarısı', 'electronic', 'Bubilet', 400, ['dj-gece-yarisi']],
  [3, '20:00', 'ank-sinasi-sahnesi', 'Dram: Bir Ankara Hikayesi', 'theater', 'Biletinial', 120, ['sahne-atolyesi']],
  [3, '20:30', 'ank-bilkent-konser-salonu-bso', 'Oda Müziği Konseri', 'jazz_classical', 'Biletix', 200, ['baskent-oda-orkestrasi']],
  [4, '21:00', 'ank-jolly-joker-ankara', 'Alternatif Rock Konseri', 'rock', 'Biletix', 550, ['beton-cicekleri']],
  [5, '20:00', 'ank-cso-ada-ankara-tarihi-salon', 'Caz Orkestrası Konseri', 'jazz_classical', 'Biletinial', 350, ['lale-caz-uclusu']],
  [5, '23:00', 'ank-cermodern', 'Elektronik Müzik Gecesi', 'electronic', 'Bubilet', 700, ['frekans-kolektif', 'dj-gece-yarisi']],
  [6, '15:00', 'ank-genclik-parki', 'Açık Hava Halk Müziği Konseri', 'other', 'Mobilet'],
  [6, '20:00', 'ank-dogan-tasdelen-cagdas-sanatlar-merkezi', 'Tek Kişilik Oyun: Ses', 'theater', 'Biletinial', 100],
  [7, '21:00', 'ank-ankara-spor-salonu', 'Pop Konseri', 'pop', 'Passo', 900, ['selin-ayaz']],
  [8, '20:00', 'ank-meb-sura-salonu', 'Türk Sanat Müziği Konseri', 'other', 'Biletix', 300],
  [9, '20:30', 'ank-ankara-sanat-tiyatrosu-ast', 'Müzikal: Ankara Rüyası', 'theater', 'Biletinial', 200, ['sahne-atolyesi']],
  [10, '21:00', 'ank-nefes-bar', 'Punk Rock Gecesi', 'rock', 'Biletix', 350, ['gri-sokak']],
  [11, '19:30', 'ank-odtu-kultur-ve-kongre-merkezi', 'Gençlik Korosu Konseri', 'jazz_classical', 'Bubilet', 150],
  [12, '20:00', 'ank-nazim-hikmet-kongre-ve-sanat-merkezi', 'Komedi Festivali Özel Gösterim', 'comedy', 'Passo', 650, ['ece-tunali', 'kaan-yilmazer']],
  [13, '13:00', 'ank-altinpark-expo-center', 'Sonbahar Müzik Festivali – 1. Gün', 'pop', 'Passo', 800, ['selin-ayaz', 'deniz-aral']],
  [14, '13:00', 'ank-altinpark-expo-center', 'Sonbahar Müzik Festivali – 2. Gün', 'rock', 'Passo', 800, ['beton-cicekleri', 'kuzey-ruzgari', 'gri-sokak']],
  [18, '19:00', 'ank-bilkent-odeon', 'Açık Hava Rock Konseri', 'rock', 'Biletix', 950, ['beton-cicekleri']],
  [22, '20:00', 'ank-ahmet-adnan-saygun-merkezi', 'Piyano Resitali', 'jazz_classical', 'Biletix', 250, ['aylin-erdem']],
  [26, '20:00', 'ank-prof-dr-ahmet-taner-kislali-spor-salonu', 'Rap Konseri', 'pop', 'Passo', 850, ['mert-kalkan']],
  [28, '20:30', 'ank-leman-kultur-tunali', 'Doğaçlama Komedi', 'comedy', 'Bubilet', 180, ['dogaclama-ankara']],
  // İstanbul
  [0, '20:00', 'ist-cemal-resit-rey-konser-salonu', 'Senfoni Gecesi: Brahms', 'jazz_classical', 'Biletix', 350, ['baskent-oda-orkestrasi']],
  [0, '22:00', 'ist-babylon-bomonti', 'Indie Rock Konseri', 'rock', 'Biletix', 600, ['kuzey-ruzgari']],
  [1, '20:30', 'ist-moda-sahnesi', 'Çağdaş Oyun: Kayıp Mektup', 'theater', 'Biletinial', 250, ['sahne-atolyesi']],
  [1, '23:30', 'ist-gizli-bahce', 'Elektronik Gece', 'electronic', 'Bubilet', 450, ['dj-gece-yarisi']],
  [2, '20:00', 'ist-ataturk-kultur-merkezi-akm', 'Opera: Carmen', 'jazz_classical', 'Biletix', 400],
  [2, '21:00', 'ist-nardis-jazz-club', 'Caz Üçlüsü', 'jazz_classical', 'Mobilet', 500, ['lale-caz-uclusu']],
  [3, '21:00', 'ist-zorlu-psm', 'Pop Konseri', 'pop', 'Passo', 1200, ['selin-ayaz']],
  [4, '20:30', 'ist-bkm-mutfak-cikmaz-sahne', 'Stand-up: Hafta Ortası', 'comedy', 'Passo', 550, ['kaan-yilmazer']],
  [4, '21:30', 'ist-dorock-xl-kadikoy', 'Punk Rock Gecesi', 'rock', 'Bubilet', 400, ['gri-sokak']],
  [5, '20:00', 'ist-harbiye-muhsin-ertugrul-sahnesi', 'Klasik Komedi: Cimri', 'theater', 'Biletinial', 150],
  [6, '21:00', 'ist-volkswagen-arena', 'Rap Konseri', 'pop', 'Passo', 1100, ['mert-kalkan']],
  [7, '20:00', 'ist-borusan-muzik-evi', 'Piyano Resitali', 'jazz_classical', 'Biletix', 300, ['aylin-erdem']],
  [8, '22:00', 'ist-arkaoda', 'Deneysel Elektronik Performans', 'electronic', 'Mobilet', 350, ['frekans-kolektif']],
  [9, '19:00', 'ist-harbiye-cemil-topuzlu-acikhava-tiyatrosu', 'Açık Hava Rock Konseri', 'rock', 'Biletix', 900, ['beton-cicekleri']],
  [11, '20:30', 'ist-kadikoy-haldun-taner-sahnesi', 'Dram: Sessiz Ev', 'theater', 'Biletinial', 180],
  [13, '13:00', 'ist-parkorman-etkinlik-alani', 'Şehir Müzik Festivali', 'pop', 'Passo', 1000, ['deniz-aral', 'selin-ayaz']],
  [16, '20:00', 'ist-caddebostan-kultur-merkezi-ckm', 'Doğaçlama Tiyatro Gecesi', 'comedy', 'Bubilet', 220, ['dogaclama-ankara']],
  [20, '20:00', 'ist-ulker-spor-ve-etkinlik-salonu', 'Komedi Şov', 'comedy', 'Passo', 750, ['ece-tunali']],
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
