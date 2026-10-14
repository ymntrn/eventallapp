import { useEffect, useRef } from 'react';
import type { EventWithVenue, Venue } from '../types';
import { t } from '../i18n/tr';
import { formatDate, formatPrice, formatTime } from '../lib/dates';
import { paths } from '../lib/router';
import { Link } from './Link';
import { FavoriteButton } from './FavoriteButton';
import { FollowButton } from './FollowButton';
import { IconClose } from './icons';

interface Props {
  venue: Venue;
  events: EventWithVenue[];
  onClose(): void;
  /** Shown when the venue has no events in the current filter. */
  onShowAllDates(): void;
}

/** Bottom sheet on mobile, side panel on desktop (see CSS). */
export function VenueSheet({ venue, events, onClose, onShowAllDates }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [venue.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <aside className="sheet" aria-labelledby="sheet-title">
      <div className="sheet__handle" aria-hidden="true" />
      <header className="sheet__header">
        <div>
          <h2 id="sheet-title" ref={headingRef} tabIndex={-1}>
            {venue.name}
          </h2>
          <p className="sheet__meta">
            {t.venueTypes[venue.type]}
            {venue.address ? `, ${venue.address}` : ''}
          </p>
          {!venue.verified && (
            <p className="sheet__unverified">
              {venue.precision === 'complex_centroid' ? t.approxLocation : t.unverifiedLocation}
            </p>
          )}
          <div className="sheet__follow">
            <FollowButton kind="venue" id={venue.id} name={venue.name} />
          </div>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label={t.close}>
          <IconClose />
        </button>
      </header>

      {events.length === 0 ? (
        <div className="sheet__empty">
          <p>{t.noEventsAtVenue}</p>
          <button type="button" className="btn btn--secondary" onClick={onShowAllDates}>
            {t.showAllDates}
          </button>
        </div>
      ) : (
        <ol className="event-rows" aria-label={t.upcomingEvents}>
          {events.map((e) => (
            <li key={e.id}>
              <EventRow event={e} showVenue={false} />
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

/** One tappable event line: date, title, price summary, favorite. Reused on profile and performer pages. */
export function EventRow({ event: e, showVenue = true }: { event: EventWithVenue; showVenue?: boolean }) {
  return (
    <div className="event-row">
      <Link className="event-row__link" href={paths.event(e.id)}>
        <time className="event-row__when" dateTime={e.startsAt}>
          <span>{formatDate(e.startsAtMs)}</span>
          <strong>{formatTime(e.startsAtMs)}</strong>
        </time>
        <span className="event-row__body">
          <span className="event-row__title">{e.title}</span>
          <span className="event-row__meta">
            {t.categories[e.category]}
            {showVenue ? `, ${e.venue.name}` : ''}
          </span>
          <span className="event-row__price">
            {e.minPrice !== null ? <strong>{t.fromPrice(formatPrice(e.minPrice))}</strong> : t.noPrice}
            <span className="event-row__sellers">{t.sellers(e.offers.length)}</span>
          </span>
        </span>
      </Link>
      <FavoriteButton id={e.id} name={e.title} />
    </div>
  );
}
