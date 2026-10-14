import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE, parseState } from './store';

const USER = { id: '6f1c2a3b-0000-4000-8000-000000000001', email: 'ada@example.com', name: 'Ada', city: 'Ankara', joinedAt: 1 };

describe('parseState', () => {
  it('falls back to defaults for missing or broken data', () => {
    expect(parseState(null)).toEqual(DEFAULT_STATE);
    expect(parseState('{not json')).toEqual(DEFAULT_STATE);
  });

  it('keeps valid values and drops invalid ones', () => {
    const s = parseState(
      JSON.stringify({
        user: USER,
        savedEvents: ['e1', 42],
        followedVenues: ['ank-x'],
        prefs: { date: 'weekend', categories: ['rock', 'polka'], showAllVenues: true, city: 'İstanbul', tonightFrom: '21:30' },
        settings: { theme: 'neon' },
        onboarded: true,
      }),
    );
    expect(s.user).toEqual(USER);
    expect(s.savedEvents).toEqual(['e1']);
    expect(s.followedVenues).toEqual(['ank-x']);
    expect(s.prefs).toEqual({ date: 'weekend', categories: ['rock'], showAllVenues: true, city: 'İstanbul', tonightFrom: '21:30' });
    expect(s.settings.theme).toBe('system');
    expect(s.onboarded).toBe(true);
  });

  it('falls back to Ankara for an unknown city and ignores a bad tonight time', () => {
    const s = parseState(JSON.stringify({ prefs: { city: 'İzmir', tonightFrom: '25:00' } }));
    expect(s.prefs.city).toBe('Ankara');
    expect(s.prefs.tonightFrom).toBeNull();
  });

  it('drops the old demo user (no Supabase id) and account data without a user', () => {
    const s = parseState(
      JSON.stringify({ user: { name: 'Demo', email: 'demo@eventall.app', joinedAt: 1 }, savedEvents: ['e1'], favoriteEvents: ['e2'] }),
    );
    expect(s.user).toBeNull();
    expect(s.savedEvents).toEqual([]);
  });
});
