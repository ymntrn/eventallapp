const TR_MAP: Record<string, string> = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  I: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
  â: 'a',
  Â: 'a',
  î: 'i',
  Î: 'i',
  û: 'u',
  Û: 'u',
};

/**
 * Lowercases and transliterates Turkish characters (ç→c, ğ→g, ı/İ→i, ö→o,
 * ş→s, ü→u) without producing a slug. Useful for accent-insensitive search.
 */
export function foldTurkish(input: string): string {
  return input
    .replace(/[çÇğĞıIİöÖşŞüÜâÂîÎûÛ]/g, (ch) => TR_MAP[ch] ?? ch)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** "Gençlik Parkı" → "genclik-parki" */
export function slugify(input: string): string {
  return foldTurkish(input)
    .replace(/&/g, ' ve ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Returns a slug not present in `taken`, appending -2, -3… if needed. Adds it to `taken`. */
export function uniqueSlug(input: string, taken: Set<string>): string {
  const base = slugify(input) || 'mekan';
  let candidate = base;
  let n = 2;
  while (taken.has(candidate)) candidate = `${base}-${n++}`;
  taken.add(candidate);
  return candidate;
}
