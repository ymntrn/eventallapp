import { useEffect, useRef } from 'react';
import type { EventWithVenue, Venue } from '../types';
import { t } from '../i18n/tr';
import { CATEGORY_COLORS } from '../lib/categories';
import { formatDate, formatPrice, formatTime } from '../lib/dates';

interface Props {
  venue: Venue;
  events: EventWithVenue[];
  onClose(): void;
}

/** Bottom sheet on mobile, side panel on desktop (see CSS). */
export function VenueSheet({ venue, events, onClose }: Props) {
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
            {venue.address ? ` · ${venue.address}` : ''}
          </p>
          {!venue.verified && <p className="sheet__unverified">{t.unverifiedLocation}</p>}
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label={t.close}>
          <span aria-hidden="true">✕</span>
        </button>
      </header>

      {events.length === 0 ? (
        <p className="sheet__empty">{t.noEventsAtVenue}</p>
      ) : (
        <section aria-label={t.upcomingEvents}>
          <ol className="event-list">
            {events.map((e) => {
              const platform = e.ticketPlatform === 'Other' ? t.otherPlatform : e.ticketPlatform;
              return (
                <li key={e.id} className="event">
                  <div className="event__when">
                    <time dateTime={e.startsAt}>
                      <span className="event__date">{formatDate(e.startsAtMs)}</span>
                      <span className="event__time">{formatTime(e.startsAtMs)}</span>
                    </time>
                  </div>
                  <div className="event__body">
                    <h3 className="event__title">{e.title}</h3>
                    <p className="event__meta">
                      <span className="tag" style={{ '--tag-color': CATEGORY_COLORS[e.category] } as React.CSSProperties}>
                        {t.categories[e.category]}
                      </span>
                      {e.priceFrom !== undefined && (
                        <span className="event__price">{t.priceFrom(formatPrice(e.priceFrom))}</span>
                      )}
                    </p>
                    <a
                      className="btn btn--primary"
                      href={e.ticketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t.buyTicketLabel(e.title, platform)}
                    >
                      {t.buyTicket}
                    </a>
                    <p className="event__note">{t.purchaseNote(platform)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </aside>
  );
}
