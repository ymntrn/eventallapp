import { describe, expect, it } from 'vitest';
import { parseRoute, paths } from './router';

describe('parseRoute', () => {
  it('maps hashes to routes', () => {
    expect(parseRoute('')).toEqual({ name: 'map' });
    expect(parseRoute('#/')).toEqual({ name: 'map' });
    expect(parseRoute('#/venue/cso-ada-ankara')).toEqual({ name: 'map', venueId: 'cso-ada-ankara' });
    expect(parseRoute('#/event/ornek-001')).toEqual({ name: 'event', id: 'ornek-001' });
    expect(parseRoute('#/performer/selin-ayaz')).toEqual({ name: 'performer', id: 'selin-ayaz' });
    expect(parseRoute('#/profile/people')).toEqual({ name: 'profile', tab: 'people' });
    expect(parseRoute('#/settings')).toEqual({ name: 'settings' });
    expect(parseRoute('#/nope')).toEqual({ name: 'map' });
    expect(parseRoute('#/discover')).toEqual({ name: 'discover' });
    expect(parseRoute('#/calendar')).toEqual({ name: 'calendar' });
    expect(parseRoute('#/notifications')).toEqual({ name: 'notifications' });
  });

  it('treats a Supabase token fragment (implicit flow, not used) as the map instead of breaking', () => {
    expect(parseRoute('#access_token=abc&type=signup')).toEqual({ name: 'map' });
  });

  it('round-trips the login return path', () => {
    const next = paths.event('ornek-002');
    expect(parseRoute(paths.login(next))).toEqual({ name: 'login', next });
  });
});
