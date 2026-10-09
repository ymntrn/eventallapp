import { t } from '../i18n/tr';
import { actions, useAppState } from '../lib/store';
import { navigate, paths } from '../lib/router';
import { showToast } from '../lib/toast';
import { IconHeart } from './icons';

interface Props {
  kind: 'event' | 'performer';
  id: string;
  /** Name for the accessible label. */
  name: string;
  variant?: 'icon' | 'pill';
}

/** Heart toggle. Signed-out users are sent to the login page and brought back. */
export function FavoriteButton({ kind, id, name, variant = 'icon' }: Props) {
  const state = useAppState();
  const list = kind === 'event' ? state.favoriteEvents : state.favoritePerformers;
  const on = list.includes(id);

  const onClick = () => {
    if (!state.user) {
      showToast(t.loginRequired);
      navigate(paths.login(window.location.hash || paths.map()));
      return;
    }
    if (kind === 'event') actions.toggleFavoriteEvent(id);
    else actions.toggleFavoritePerformer(id);
  };

  const label = `${name}: ${on ? t.removeFavorite : t.addFavorite}`;

  if (variant === 'pill') {
    return (
      <button type="button" className={`pill-btn${on ? ' is-on' : ''}`} aria-pressed={on} onClick={onClick}>
        <IconHeart size={18} filled={on} />
        {on ? (kind === 'performer' ? t.following : t.favorited) : kind === 'performer' ? t.follow : t.addFavorite}
      </button>
    );
  }
  return (
    <button
      type="button"
      className={`heart${on ? ' is-on' : ''}`}
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <IconHeart filled={on} />
    </button>
  );
}
