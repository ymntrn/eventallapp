import type { Category, DateFilter, VenueType } from '../types';

/**
 * All user-facing strings. To add English later, create `en.ts` with the same
 * shape (type `Strings`) and pick one at runtime.
 */
export const tr = {
  locale: 'tr-TR',
  appName: 'Eventall',
  tagline: 'Ankara canlı etkinlik haritası',
  mapLabel: 'Etkinlik haritası',

  loadingData: 'Etkinlikler yükleniyor…',
  loadingMap: 'Harita yükleniyor…',
  mapError: 'Harita yüklenemedi. İnternet bağlantınızı kontrol edip sayfayı yenileyin.',
  dataError: 'Etkinlik verisi yüklenemedi. Lütfen sayfayı yenileyin.',
  retry: 'Yeniden dene',

  filtersLabel: 'Filtreler',
  dateFilterLabel: 'Tarih',
  categoryFilterLabel: 'Kategori',
  dateFilters: {
    tonight: 'Bu akşam',
    weekend: 'Bu hafta sonu',
    next7: 'Önümüzdeki 7 gün',
    all: 'Tüm etkinlikler',
  } satisfies Record<DateFilter, string>,
  allCategories: 'Tümü',
  categories: {
    rock: 'Rock',
    pop: 'Pop',
    electronic: 'Elektronik',
    jazz_classical: 'Caz & Klasik',
    theater: 'Tiyatro',
    comedy: 'Komedi',
    other: 'Diğer',
  } satisfies Record<Category, string>,
  venueTypes: {
    concert_hall: 'Konser salonu',
    live_music: 'Canlı müzik',
    electronic: 'Elektronik müzik',
    open_air: 'Açık hava',
    festival_ground: 'Festival alanı',
    theater: 'Tiyatro',
    opera: 'Opera',
    classical: 'Klasik müzik',
    arena: 'Arena',
    performance_space: 'Sahne / sanat merkezi',
  } satisfies Record<VenueType, string>,

  showAllVenues: 'Tüm mekanları göster',
  legendTitle: 'Renkler',
  legendToggle: 'Renk açıklamasını göster/gizle',
  clusterLabel: (n: number) => `${n} mekan. Yakınlaştırmak için dokunun.`,
  venuePinLabel: (name: string, n: number) =>
    n > 0 ? `${name}, ${n} etkinlik` : `${name}, seçili filtrelerde etkinlik yok`,

  eventsFound: (events: number, venues: number) =>
    `${venues} mekanda ${events} etkinlik`,
  emptyTitle: 'Bu filtrelerle etkinlik bulunamadı',
  emptyHint: 'Tarih aralığını genişletmeyi ya da kategori seçimini kaldırmayı deneyin.',
  resetFilters: 'Filtreleri sıfırla',

  close: 'Kapat',
  upcomingEvents: 'Yaklaşan etkinlikler',
  noEventsAtVenue: 'Bu mekanda seçili filtrelere uygun yaklaşan etkinlik yok.',
  buyTicket: 'Bilet al',
  buyTicketLabel: (title: string, platform: string) =>
    `${title} için bilet al (${platform}, yeni sekmede açılır)`,
  purchaseNote: (platform: string) =>
    `Satın alma işlemini ${platform} üzerinde tamamlayacaksınız.`,
  priceFrom: (formatted: string) => `${formatted}'den başlayan fiyatlarla`,
  unverifiedLocation: 'Konum henüz doğrulanmadı',
  otherPlatform: 'resmi satış sitesi',

  nearMe: 'Yakınımda',
  locating: 'Konumunuz bulunuyor…',
  geoUnsupported: 'Tarayıcınız konum özelliğini desteklemiyor.',
  geoDenied: 'Konum izni verilmedi. Tarayıcı ayarlarından izin verebilirsiniz.',
  geoUnavailable: 'Konumunuz alınamadı. Lütfen daha sonra tekrar deneyin.',
  geoOutside: "Ankara dışında görünüyorsunuz. Harita Ankara'yı göstermeye devam ediyor.",
  youAreHere: 'Buradasınız',

  searchPlaceholder: 'Mekan veya etkinlik ara',
  searchLabel: 'Mekan veya etkinlik ara',
  searchNoResults: 'Sonuç bulunamadı',
  searchVenue: 'Mekan',
  searchEvent: 'Etkinlik',
  clearSearch: 'Aramayı temizle',

  sampleDataBanner: 'Örnek veri: etkinlikler ve konumlar gerçek değildir.',
  dismiss: 'Kapat',
  osmAttribution: '© OpenStreetMap katkıcıları',
} as const;

export type Strings = typeof tr;
export const t: Strings = tr;
