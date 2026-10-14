import { useEffect, useMemo, useState } from 'react';
import { track } from '../lib/analytics';
import type { AppData } from '../lib/data';
import { buildDiscover, tonightList, type Reason, type ScoredEvent } from '../lib/discover';
import { actions, useAppState } from '../lib/store';
import { paths } from '../lib/router';
import { CITIES, type EventWithVenue } from '../types';
import { t } from '../i18n/tr';
import { Link } from '../components/Link';
import { PageHeader } from '../components/PageHeader';
import { EventRow } from '../components/VenueSheet';
import { TonightTime } from '../components/TonightTime';

const REASON_LABEL: Record<Reason, string> = {
  performer: t.reasonPerformer,
  venue: t.reasonVenue,
  category: t.reasonCategory,
};

/** Discover tab: "Sana özel", "Bu hafta sonu", "Yeni keşifler", or tonight's list. */
export function DiscoverPage({ data, now }: { data: AppData; now: number }) {
  const state = useAppState();
  const { city, tonightFrom } = state.prefs;
  const [tonight, setTonight] = useState(false);
  useEffect(() => track('discover_opened'), []);
  const ctx = useMemo(
    () => ({
      city,
      followedPerformers: state.followedPerformers,
      followedVenues: state.followedVenues,
      savedEvents: state.savedEvents,
    }),
    [city, state.followedPerformers, state.followedVenues, state.savedEvents],
  );
  const sections = useMemo(() => buildDiscover(data.events, ctx, now), [data.events, ctx, now]);
  const tonightEvents = useMemo(
    () => (tonight ? tonightList(data.events, ctx, now, tonightFrom) : []),
    [tonight, data.events, ctx, now, tonightFrom],
  );

  return (
    <div className="page">
      <PageHeader title={t.discoverTitle} back={false} />
      <div className="page__body discover">
        <div className="discover__controls">
          <div className="seg city-seg" role="radiogroup" aria-label={t.cityPickerLabel}>
            {CITIES.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={city === c}
                className="seg__opt"
                onClick={() => actions.setCity(c)}
              >
                {t.cities[c]}
              </button>
            ))}
          </div>
          <button type="button" className={`chip${tonight ? ' is-on' : ''}`} aria-pressed={tonight} onClick={() => setTonight(!tonight)}>
            {t.tonightChip}
          </button>
          {tonight && <TonightTime compact value={tonightFrom} onChange={actions.setTonightFrom} />}
        </div>

        {tonight ? (
          <Section title={t.tonightTitle}>
            <ScoredList items={tonightEvents} empty={t.tonightEmpty(t.cities[city])} />
          </Section>
        ) : (
          <>
            <Section title={t.forYouTitle}>
              {state.user ? (
                <ScoredList items={sections.forYou} empty={t.forYouEmpty} />
              ) : (
                <div className="discover__guest">
                  <p className="muted">{t.forYouGuest}</p>
                  <Link className="btn btn--primary btn--small" href={paths.login(paths.discover())}>
                    {t.signInCta}
                  </Link>
                </div>
              )}
            </Section>
            <Section title={t.weekendTitle}>
              <PlainList items={sections.weekend} empty={t.weekendEmpty(t.cities[city])} />
            </Section>
            <Section title={t.newDiscoveriesTitle}>
              <PlainList items={sections.discoveries} empty={t.discoveriesEmpty} />
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="block discover__section">
      <h2 className="section-title">{title}</h2>
      {children}
    </section>
  );
}

function ScoredList({ items, empty }: { items: ScoredEvent[]; empty: string }) {
  if (items.length === 0) return <p className="muted">{empty}</p>;
  return (
    <ol className="event-rows">
      {items.map(({ event, reasons }) => (
        <li key={event.id}>
          <EventRow event={event} note={reasons[0] ? REASON_LABEL[reasons[0]] : undefined} />
        </li>
      ))}
    </ol>
  );
}

function PlainList({ items, empty }: { items: EventWithVenue[]; empty: string }) {
  if (items.length === 0) return <p className="muted">{empty}</p>;
  return (
    <ol className="event-rows">
      {items.map((e) => (
        <li key={e.id}>
          <EventRow event={e} />
        </li>
      ))}
    </ol>
  );
}
