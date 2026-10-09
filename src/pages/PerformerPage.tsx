import type { AppData } from '../lib/data';
import { paths } from '../lib/router';
import { t } from '../i18n/tr';
import { FavoriteButton } from '../components/FavoriteButton';
import { Link } from '../components/Link';
import { PageHeader } from '../components/PageHeader';
import { EventRow } from '../components/VenueSheet';
import { initials } from './EventPage';

export function PerformerPage({ data, id, now }: { data: AppData; id: string; now: number }) {
  const performer = data.performers.find((p) => p.id === id);
  if (!performer) {
    return (
      <div className="page">
        <PageHeader title="" />
        <div className="page__body empty-state">
          <p>{t.performerNotFound}</p>
          <Link className="btn btn--primary" href={paths.map()}>
            {t.backToMap}
          </Link>
        </div>
      </div>
    );
  }
  const upcoming = data.events.filter((e) => e.performerIds?.includes(id) && e.startsAtMs >= now - 3600_000);

  return (
    <div className="page">
      <PageHeader title="" />
      <div className="page__body">
        <div className="hero-person">
          <span className="avatar avatar--xl" aria-hidden="true">
            {initials(performer.name)}
          </span>
          <div>
            <h1 className="hero-person__name">{performer.name}</h1>
            <p className="muted">
              {t.performerKinds[performer.kind]}
              {performer.genre ? `, ${performer.genre}` : ''}
            </p>
          </div>
        </div>
        <FavoriteButton kind="performer" id={performer.id} name={performer.name} variant="pill" />

        <section className="block">
          <h2 className="section-title">{t.performerUpcoming}</h2>
          {upcoming.length === 0 ? (
            <p className="muted">{t.performerNoEvents}</p>
          ) : (
            <ol className="event-rows">
              {upcoming.map((e) => (
                <li key={e.id}>
                  <EventRow event={e} />
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
