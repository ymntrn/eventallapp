import { describe, expect, it } from 'vitest';
import { foldTurkish, slugify, uniqueSlug } from './slug';

describe('slugify', () => {
  it('transliterates Turkish characters', () => {
    expect(slugify('Gençlik Parkı')).toBe('genclik-parki');
    expect(slugify('Çağdaş Sanatlar Merkezi')).toBe('cagdas-sanatlar-merkezi');
    expect(slugify('ODTÜ Kültür ve Kongre Merkezi')).toBe('odtu-kultur-ve-kongre-merkezi');
    expect(slugify('Şinasi Sahnesi')).toBe('sinasi-sahnesi');
    expect(slugify('Altınpark')).toBe('altinpark');
    expect(slugify('Göz Önü')).toBe('goz-onu');
  });

  it('handles dotted capital İ and dotless capital I', () => {
    expect(slugify('İSTANBUL')).toBe('istanbul');
    expect(slugify('ISIK')).toBe('isik');
    expect(slugify('IŞIK')).toBe('isik');
  });

  it('collapses punctuation and whitespace', () => {
    expect(slugify('  6:45 KK  Ankara! ')).toBe('6-45-kk-ankara');
    expect(slugify('Rock & Roll')).toBe('rock-ve-roll');
    expect(slugify('Ankara Devlet Opera ve Balesi – Opera Sahnesi')).toBe(
      'ankara-devlet-opera-ve-balesi-opera-sahnesi',
    );
  });

  it('returns empty string when nothing is left', () => {
    expect(slugify('!!!')).toBe('');
  });
});

describe('uniqueSlug', () => {
  it('appends a counter on collisions', () => {
    const taken = new Set<string>();
    expect(uniqueSlug('Sahne', taken)).toBe('sahne');
    expect(uniqueSlug('Sahne', taken)).toBe('sahne-2');
    expect(uniqueSlug('sahne', taken)).toBe('sahne-3');
    expect(uniqueSlug('???', taken)).toBe('mekan');
  });
});

describe('foldTurkish', () => {
  it('lowercases and strips Turkish diacritics for search', () => {
    expect(foldTurkish('CerModern Şölen')).toBe('cermodern solen');
  });
});
