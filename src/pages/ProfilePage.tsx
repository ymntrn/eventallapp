import type { AppData } from '../lib/data';
import { useAppState } from '../lib/store';
import { navigate, paths } from '../lib/router';
import { t } from '../i18n/tr';
import { Link } from '../components/Link';
import { PageHeader } from '../components/PageHeader';
import { EventRow } from '../components/VenueSheet';
import { FavoriteButton } from '../components/FavoriteButton';
import { IconGear } from '../components/icons';
import { initials } from './EventPage';

const TABS = ['events', 'following', 'attended'] as const;
type Tab = (typeof TABS)[number];

const joinedFmt = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' });

export function ProfilePage({ data, tab: rawTab }: { data: AppData; tab?: string }) {
  const state = useAppState();
  const tab: Tab = (TABS as readonly string[]).includes(rawTab ?? '') ? (rawTab as Tab) : 'events';
  const settingsLink = (
    <Link className="icon-btn" href={paths.settings()} aria-label={t.navSettings}>
      <IconGear />
    </Link>
  );

  if (!state.user) {
    return (
      <div className="page">
        <PageHeader title={t.profileTitle} back={false} actions={settingsLink} />
        <div className="page__body empty-state">
          <span className="avatar avatar--xl" aria-hidden="true">
            ?
          </span>
          <h2>{t.profileGuestTitle}</h2>
          <p className="muted">{t.profileGuestText}</p>
          <Link className="btn btn--primary" href={paths.login(paths.profile())}>
            {t.signInCta}
          </Link>
        </div>
      </div>
    );
  }

  const savedEvents = data.events.filter((e) => state.savedEvents.includes(e.id));
  const followedPeople = data.performers.filter((p) => state.followedPerformers.includes(p.id));
  const followedVenues = data.venues.filter((v) => state.followedVenues.includes(v.id));
  const attended = data.events
    .filter((e) => state.attended.includes(e.id))
    .sort((a, b) => b.startsAtMs - a.startsAtMs);

  const stats: [Tab, number, string][] = [
    ['events', savedEvents.length, t.statSaved],
    ['following', followedPeople.length + followedVenues.length, t.statFollowing],
    ['attended', attended.length, t.statAttended],
  ];
  const tabLabel: Record<Tab, string> = { events: t.tabEvents, following: t.tabFollowing, attended: t.tabAttended };

  return (
    <div className="page">
      <PageHeader title={t.profileTitle} back={false} actions={settingsLink} />
      <div className="page__body">
        <div className="hero-person">
          <span className="avatar avatar--xl" aria-hidden="true">
            {initials(state.user.name)}
          </span>
          <div>
            <h2 className="hero-person__name">{state.user.name}</h2>
            <p className="muted">
              {state.user.email}
              {state.user.city ? `, ${t.cities[state.user.city]}` : ''}
            </p>
            <p className="muted small">{t.memberSince(joinedFmt.format(state.user.joinedAt))}</p>
          </div>
        </div>
        <Link className="btn btn--secondary btn--small" href={`${paths.settings()}`}>
          {t.editProfile}
        </Link>

        <div className="stats">
          {stats.map(([k, n, label]) => (
            <button key={k} type="button" className="stat" onClick={() => navigate(paths.profile(k), { replace: true })}>
              <strong>{n}</strong>
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="tabs" role="tablist" aria-label={t.profileTitle}>
          {TABS.map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              id={`tab-${k}`}
              aria-selected={tab === k}
              aria-controls={`panel-${k}`}
              className="tab"
              onClick={() => navigate(paths.profile(k), { replace: true })}
            >
              {tabLabel[k]}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="tabpanel">
          {tab === 'events' &&
            (savedEvents.length === 0 ? (
              <p className="muted">{t.emptySaved}</p>
            ) : (
              <ol className="event-rows">
                {savedEvents.map((e) => (
                  <li key={e.id}>
                    <EventRow event={e} />
                  </li>
                ))}
              </ol>
            ))}
          {tab === 'following' &&
            (followedPeople.length + followedVenues.length === 0 ? (
              <p className="muted">{t.emptyFollowing}</p>
            ) : (
              <>
                {followedPeople.length > 0 && (
                  <>
                    <h3 className="label">{t.followedPerformersTitle}</h3>
                    <ul className="people">
                      {followedPeople.map((p) => (
                        <li key={p.id} className="person">
                          <Link className="person__link" href={paths.performer(p.id)}>
                            <span className="avatar" aria-hidden="true">
                              {initials(p.name)}
                            </span>
                            <span>
                              <span className="person__name">{p.name}</span>
                              <span className="person__kind">{p.genre ?? t.performerKinds[p.kind]}</span>
                            </span>
                          </Link>
                          <FavoriteButton kind="performer" id={p.id} name={p.name} />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {followedVenues.length > 0 && (
                  <>
                    <h3 className="label">{t.followedVenuesTitle}</h3>
                    <ul className="people">
                      {followedVenues.map((v) => (
                        <li key={v.id} className="person">
                          <Link className="person__link" href={paths.venue(v.id)}>
                            <span className="avatar" aria-hidden="true">
                              {initials(v.name)}
                            </span>
                            <span>
                              <span className="person__name">{v.name}</span>
                              <span className="person__kind">
                                {t.venueTypes[v.type]}, {t.cities[v.city]}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            ))}
          {tab === 'attended' &&
            (attended.length === 0 ? (
              <p className="muted">{t.emptyAttended}</p>
            ) : (
              <ol className="event-rows">
                {attended.map((e) => (
                  <li key={e.id}>
                    <EventRow event={e} />
                  </li>
                ))}
              </ol>
            ))}
        </div>
      </div>
    </div>
  );
}
