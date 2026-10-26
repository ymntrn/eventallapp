import { useMemo } from 'react';
import type { AppData } from '../lib/data';
import { calendarEntries, groupByMonth, type CalendarReason } from '../lib/calendar';
import { useAppState } from '../lib/store';
import { paths } from '../lib/router';
import { t } from '../i18n/tr';
import { Link } from '../components/Link';
import { PageHeader } from '../components/PageHeader';
import { EventRow } from '../components/VenueSheet';

const REASON_LABEL: Record<CalendarReason, string> = {
  saved: t.reasonSaved,
  performer: t.reasonPerformer,
  venue: t.reasonVenue,
};

/** "Takvimim": saved events and events of followed artists and venues, by month. No export in Stage 1. */
export function CalendarPage({ data, now }: { data: AppData; now: number }) {
  const state = useAppState();
  const months = useMemo(
    () =>
      groupByMonth(
        calendarEntries(
          data.events,
          {
            savedEvents: state.savedEvents,
            followedPerformers: state.followedPerformers,
            followedVenues: state.followedVenues,
          },
          now,
        ),
      ),
    [data.events, state.savedEvents, state.followedPerformers, state.followedVenues, now],
  );

  if (!state.user) {
    return (
      <div className="page">
        <PageHeader title={t.calendarTitle} />
        <div className="page__body empty-state">
          <p className="muted">{t.calendarGuest}</p>
          <Link className="btn btn--primary" href={paths.login(paths.calendar())}>
            {t.signInCta}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader title={t.calendarTitle} />
      <div className="page__body">
        <p className="muted">{t.calendarIntro}</p>
        {months.length === 0 ? (
          <p className="muted block">{t.calendarEmpty}</p>
        ) : (
          months.map((m) => (
            <section key={m.key} className="block" aria-labelledby={`month-${m.key}`}>
              <h2 id={`month-${m.key}`} className="section-title">
                {m.label}
              </h2>
              <ol className="event-rows">
                {m.entries.map(({ event, reasons }) => (
                  <li key={event.id}>
                    <EventRow event={event} note={REASON_LABEL[reasons[0]]} />
                  </li>
                ))}
              </ol>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
