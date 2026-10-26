import { describe, expect, it } from 'vitest';
import { accountFromRows, authErrorMessage } from './auth';
import { authRedirectUrl } from './supabase-client';
import { t } from '../i18n/tr';

describe('accountFromRows', () => {
  const authUser = { id: 'u1', email: 'ada@example.com', created_at: '2026-10-01T10:00:00Z' };

  it('maps the profile and the user rows', () => {
    const a = accountFromRows(authUser, {
      profile: { display_name: 'Ada', city: 'İstanbul', created_at: '2026-10-02T10:00:00Z' },
      savedEvents: [{ event_id: 'e1' }],
      attended: [{ event_id: 'e0' }],
      followedPerformers: [{ performer_id: 'p1' }],
      followedVenues: [{ venue_id: 'v1' }],
    });
    expect(a.user).toEqual({ id: 'u1', email: 'ada@example.com', name: 'Ada', city: 'İstanbul', joinedAt: Date.parse('2026-10-02T10:00:00Z') });
    expect(a.savedEvents).toEqual(['e1']);
    expect(a.attended).toEqual(['e0']);
    expect(a.followedPerformers).toEqual(['p1']);
    expect(a.followedVenues).toEqual(['v1']);
  });

  it('falls back to the e-mail name when the profile row is missing', () => {
    const a = accountFromRows(authUser, { profile: null, savedEvents: [], attended: [], followedPerformers: [], followedVenues: [] });
    expect(a.user.name).toBe('ada');
    expect(a.user.city).toBeNull();
    expect(a.user.joinedAt).toBe(Date.parse('2026-10-01T10:00:00Z'));
  });
});

describe('authErrorMessage', () => {
  it('maps Supabase Auth error codes to Turkish messages', () => {
    expect(authErrorMessage({ code: 'invalid_credentials' })).toBe(t.authInvalidCredentials);
    expect(authErrorMessage({ code: 'email_not_confirmed' })).toBe(t.authEmailNotConfirmed);
    expect(authErrorMessage({ code: 'user_already_exists' })).toBe(t.authUserExists);
    expect(authErrorMessage({ status: 429 })).toBe(t.authRateLimited);
    expect(authErrorMessage({ code: 'something_new', message: 'English text' })).toBe(t.authGenericError);
    expect(authErrorMessage(null)).toBe(t.authGenericError);
  });
});

describe('authRedirectUrl', () => {
  it('is the app URL without hash or query, so it works under /eventallapp/ and at a domain root', () => {
    expect(authRedirectUrl({ origin: 'https://ymntrn.github.io', pathname: '/eventallapp/' })).toBe(
      'https://ymntrn.github.io/eventallapp/',
    );
    expect(authRedirectUrl({ origin: 'http://localhost:5173', pathname: '/' })).toBe('http://localhost:5173/');
  });
});
