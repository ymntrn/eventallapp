import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analyticsEnabled, configureAnalytics, DEDUPE_MS, installAnalytics, track, type AnalyticsRow } from './analytics';
import { actions } from './store';

const env = { VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'anon' };

describe('analyticsEnabled', () => {
  it('is on with a Supabase project unless the flag turns it off', () => {
    expect(analyticsEnabled(env)).toBe(true);
    expect(analyticsEnabled({ ...env, VITE_ANALYTICS_ENABLED: 'true' })).toBe(true);
    for (const off of ['false', 'FALSE', '0', ' off ']) expect(analyticsEnabled({ ...env, VITE_ANALYTICS_ENABLED: off })).toBe(false);
  });

  it('is off without a Supabase project', () => {
    expect(analyticsEnabled({})).toBe(false);
  });
});

describe('track', () => {
  let sent: AnalyticsRow[];
  beforeEach(() => {
    sent = [];
    configureAnalytics({ enabled: true, send: async (r) => void sent.push(r) });
  });

  it('sends only the event name and event id', () => {
    track('event_detail_opened', 'e1', 10_000);
    track('discover_opened', null, 20_000);
    expect(sent).toEqual([
      { event_name: 'event_detail_opened', event_id: 'e1' },
      { event_name: 'discover_opened', event_id: null },
    ]);
  });

  it('counts the same action on the same event once within the dedupe window', () => {
    track('buy_link_tapped', 'e1', 100_000);
    track('buy_link_tapped', 'e1', 100_000 + DEDUPE_MS - 1);
    track('buy_link_tapped', 'e2', 100_000 + DEDUPE_MS - 1);
    track('buy_link_tapped', 'e2', 100_000 + 3 * DEDUPE_MS);
    expect(sent.map((r) => r.event_id)).toEqual(['e1', 'e2', 'e2']);
  });

  it('sends nothing when disabled', () => {
    configureAnalytics({ enabled: false });
    track('event_detail_opened', 'e9', 200_000);
    expect(sent).toEqual([]);
  });

  it('never throws when sending fails', async () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    configureAnalytics({ enabled: true, send: () => Promise.reject(new Error('offline')) });
    expect(() => track('event_detail_opened', 'e3', 300_000)).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    expect(debug).toHaveBeenCalled();
  });

  it('records saving an event and adding a follow from the store, not removing them', () => {
    installAnalytics();
    actions.setAccount({
      user: { id: '6f1c2a3b-0000-4000-8000-000000000001', email: 'a@b.co', name: 'A', city: null, joinedAt: 1 },
      savedEvents: [],
      followedPerformers: [],
      followedVenues: [],
      attended: [],
    });
    actions.toggleSavedEvent('e5');
    actions.toggleSavedEvent('e5');
    actions.toggleFollow('venue', 'ank-x');
    actions.toggleFollow('venue', 'ank-x');
    expect(sent).toEqual([
      { event_name: 'event_saved', event_id: 'e5' },
      { event_name: 'follow_added', event_id: null },
    ]);
  });
});
