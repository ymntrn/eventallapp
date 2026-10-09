import { describe, expect, it } from 'vitest';
import { guessCategory, normalizeName, parsePrice, toIstanbulIso } from './normalize.ts';

describe('normalizeName', () => {
  it('folds Turkish letters, case and punctuation', () => {
    expect(normalizeName('CSO Ada Ankara – Ana Salon')).toBe('cso ada ankara ana salon');
    expect(normalizeName('  ŞİNASİ   Sahnesi ')).toBe('sinasi sahnesi');
    expect(normalizeName('Rock & Roll')).toBe('rock ve roll');
  });
});

describe('parsePrice', () => {
  it('reads Turkish price formats', () => {
    expect(parsePrice('1.250,50 TL')).toBe(1250.5);
    expect(parsePrice('1.250 TL')).toBe(1250);
    expect(parsePrice('₺450')).toBe(450);
    expect(parsePrice('300,00 TL')).toBe(300);
    expect(parsePrice(980)).toBe(980);
    expect(parsePrice('Ücretsiz')).toBe(0);
  });

  it('returns undefined for missing, text-only or negative prices', () => {
    expect(parsePrice(undefined)).toBeUndefined();
    expect(parsePrice('Fiyat yakında')).toBeUndefined();
    expect(parsePrice('-50 TL')).toBeUndefined();
    expect(parsePrice(-5)).toBeUndefined();
  });
});

describe('toIstanbulIso', () => {
  it('accepts dotted, slashed and ISO dates', () => {
    expect(toIstanbulIso('17.10.2026', '20:00')).toBe('2026-10-17T20:00:00+03:00');
    expect(toIstanbulIso('7/3/2026', '9.30')).toBe('2026-03-07T09:30:00+03:00');
    expect(toIstanbulIso('2026-10-17', '21:30')).toBe('2026-10-17T21:30:00+03:00');
  });

  it('rejects impossible dates and times', () => {
    expect(toIstanbulIso('31.02.2026', '20:00')).toBeUndefined();
    expect(toIstanbulIso('17.10.2026', '25:00')).toBeUndefined();
    expect(toIstanbulIso('yarın', '20:00')).toBeUndefined();
  });
});

describe('guessCategory', () => {
  it('maps genre words to categories', () => {
    expect(guessCategory('Stand Up')).toBe('comedy');
    expect(guessCategory('Tiyatro')).toBe('theater');
    expect(guessCategory('Klasik Müzik')).toBe('jazz_classical');
    expect(guessCategory('Konser', 'Punk Rock Gecesi')).toBe('rock');
    expect(guessCategory('Konser')).toBe('other');
  });
});
