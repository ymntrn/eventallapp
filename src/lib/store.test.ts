import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE, parseState } from './store';

describe('parseState', () => {
  it('falls back to defaults for missing or broken data', () => {
    expect(parseState(null)).toEqual(DEFAULT_STATE);
    expect(parseState('{not json')).toEqual(DEFAULT_STATE);
  });

  it('keeps valid values and drops invalid ones', () => {
    const s = parseState(
      JSON.stringify({
        user: { name: 'Ada', email: 'ada@example.com', joinedAt: 1 },
        favoriteEvents: ['e1', 42],
        prefs: { date: 'weekend', categories: ['rock', 'polka'], showAllVenues: true },
        settings: { theme: 'neon', notifications: false },
        onboarded: true,
      }),
    );
    expect(s.user).toEqual({ name: 'Ada', email: 'ada@example.com', joinedAt: 1 });
    expect(s.favoriteEvents).toEqual(['e1']);
    expect(s.prefs).toEqual({ date: 'weekend', categories: ['rock'], showAllVenues: true });
    expect(s.settings.theme).toBe('system');
    expect(s.settings.notifications).toBe(false);
    expect(s.onboarded).toBe(true);
  });
});
