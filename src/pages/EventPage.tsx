import type { TicketPlatform } from '../types';
import type { AppData } from '../lib/data';
import { isAvailable, isSampleEvent, sortOffers } from '../lib/data';
import { formatDate, formatPrice, formatTime } from '../lib/dates';
import { navigate, paths } from '../lib/router';
import { actions, useAppState } from '../lib/store';
import { showToast } from '../lib/toast';
import { t } from '../i18n/tr';
import { FavoriteButton } from '../components/FavoriteButton';
import { Link } from '../components/Link';
import { PageHeader } from '../components/PageHeader';
import { IconCheck, IconExternal } from '../components/icons';

export function EventPage({ data, id }: { data: AppData; id: string }) {
  const state = useAppState();
  const event = data.events.find((e) => e.id === id);

  if (!event) {
    return (
      <div className="page">
        <PageHeader title="" />
        <div className="page__body empty-state">
          <p>{t.eventNotFound}</p>
          <Link className="btn btn--primary" href={paths.map()}>
            {t.backToMap}
          </Link>
        </div>
      </div>
    );
  }

  const offers = sortOffers(event.offers);
  const cheapest = event.minPrice;
  const attended = state.attended.includes(event.id);
  const isPast = event.startsAtMs < Date.now();

  const toggleAttended = () => {
    if (!state.user) {
      showToast(t.loginRequired);
      navigate(paths.login(window.location.hash));
      return;
    }
    actions.toggleAttended(event.id);
  };

  return (
    <div className="page">
      <PageHeader title="" actions={<FavoriteButton kind="event" id={event.id} name={event.title} />} />
      <article className="page__body event-page">
        <p className="event-page__cat">{t.categories[event.category]}</p>
        <h1 className="event-page__title">{event.title}</h1>
        <p className="event-page__when">
          <time dateTime={event.startsAt}>
            {formatDate(event.startsAtMs)}, {formatTime(event.startsAtMs)}
          </time>
        </p>

        <div className="event-page__venue">
          <div>
            <p className="label">{t.venueTitle}</p>
            <p className="event-page__venue-name">{event.venue.name}</p>
          </div>
          <Link className="btn btn--secondary btn--small" href={paths.venue(event.venue.id)}>
            {t.showOnMap}
          </Link>
        </div>

        {event.performers.length > 0 && (
          <section className="block">
            <h2 className="label">{t.performersTitle}</h2>
            <ul className="people">
              {event.performers.map((p) => (
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
          </section>
        )}

        <section className="block compare" aria-labelledby="compare-title">
          <h2 id="compare-title" className="compare__title">
            {t.compareTitle}
          </h2>
          <p className="compare__intro">{t.compareIntro(offers.length)}</p>
          <ol className="offers">
            {offers.map((o, i) => {
              const available = isAvailable(o);
              const isCheapest = available && o.price !== undefined && o.price === cheapest;
              const platform = o.platform === 'Other' ? t.otherPlatform : o.platform;
              const price = o.price !== undefined ? formatPrice(o.price) : t.priceUnknown;
              return (
                <li
                  key={`${o.platform}-${i}`}
                  className={`offer${isCheapest ? ' offer--best' : ''}${available ? '' : ' offer--out'}`}
                >
                  <span className="offer__logo" aria-hidden="true">
                    {PLATFORM_MARKS[o.platform]}
                  </span>
                  <span className="offer__who">
                    <span className="offer__platform">{platform}</span>
                    <span className="offer__label">
                      {isCheapest && <span className="badge">{t.cheapest}</span>}
                      {o.label}
                    </span>
                  </span>
                  <span className="offer__price">{available ? price : t.soldOut}</span>
                  {available ? (
                    <a
                      className={`btn btn--small ${isCheapest ? 'btn--primary' : 'btn--secondary'}`}
                      href={o.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t.goToSellerLabel(platform, price)}
                    >
                      {t.goToSeller}
                      <IconExternal size={14} />
                    </a>
                  ) : (
                    <span className="offer__spacer" />
                  )}
                </li>
              );
            })}
          </ol>
          <p className="fineprint">{t.compareNote}</p>
          {isSampleEvent(event) && <p className="fineprint">{t.sampleOffersNote}</p>}
        </section>

        <section className="block">
          <button
            type="button"
            className={`pill-btn${attended ? ' is-on' : ''}`}
            aria-pressed={attended}
            onClick={toggleAttended}
            title={t.attendedLabel}
          >
            <IconCheck size={18} />
            {attended ? t.attendedDone : t.markAttended}
          </button>
          {isPast && <span className="muted"> {t.past}</span>}
        </section>
      </article>
    </div>
  );
}

/** Placeholder seller marks until real (licensed) logos are available. */
const PLATFORM_MARKS: Record<TicketPlatform, string> = {
  Biletix: 'BX',
  Passo: 'PS',
  Biletinial: 'BN',
  Bubilet: 'BB',
  Mobilet: 'MB',
  Other: '•',
};

export function initials(name: string): string {
  return name
    .replace(/^\[.*?\]\s*/, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase('tr-TR'))
    .join('');
}
