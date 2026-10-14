import { useEffect, useState } from 'react';
import { fetchNotifications, type AppNotification } from '../lib/notifications';
import { useAppState } from '../lib/store';
import { paths } from '../lib/router';
import { formatDate, formatTime } from '../lib/dates';
import { t } from '../i18n/tr';
import { Link } from '../components/Link';
import { PageHeader } from '../components/PageHeader';

/** "Bildirimler": in-app list. Stage 1 sends nothing, so it is empty for everyone. */
export function NotificationsPage() {
  const { user } = useAppState();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let live = true;
    fetchNotifications()
      .then((n) => live && setItems(n))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [user]);

  return (
    <div className="page">
      <PageHeader title={t.notificationsTitle} />
      <div className="page__body">
        {!user ? (
          <div className="empty-state">
            <p className="muted">{t.notificationsGuest}</p>
            <Link className="btn btn--primary" href={paths.login(paths.notifications())}>
              {t.signInCta}
            </Link>
          </div>
        ) : failed ? (
          <p className="muted">{t.authGenericError}</p>
        ) : items === null ? (
          <div className="overlay overlay--inline" role="status">
            <span className="spinner" aria-hidden="true" />
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <h2>{t.notificationsEmpty}</h2>
            <p className="muted">{t.notificationsInfo}</p>
          </div>
        ) : (
          <ul className="notifications">
            {items.map((n) => {
              const when = Date.parse(n.createdAt);
              return (
                <li key={n.id} className={`notification${n.readAt ? '' : ' is-unread'}`}>
                  {n.eventId ? (
                    <Link href={paths.event(n.eventId)}>{n.title}</Link>
                  ) : (
                    <span>{n.title}</span>
                  )}
                  {n.body && <p className="muted small">{n.body}</p>}
                  <time className="muted small" dateTime={n.createdAt}>
                    {formatDate(when)}, {formatTime(when)}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
