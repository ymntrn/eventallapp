import { t } from '../i18n/tr';
import { actions, useAppState } from '../lib/store';
import { navigate, paths } from '../lib/router';
import { showToast } from '../lib/toast';
import { IconHeart } from './icons';

interface Props {
  id: string;
  /** Name for the accessible label. */
  name: string;
}

/** Heart toggle that saves an event to the account. Signed-out users are sent to the login page and brought back. */
export function FavoriteButton({ id, name }: Props) {
  const state = useAppState();
  const on = state.savedEvents.includes(id);

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!state.user) {
      showToast(t.loginRequired);
      navigate(paths.login(window.location.hash || paths.map()));
      return;
    }
    actions.toggleSavedEvent(id);
  };

  const label = `${name}: ${on ? t.removeFavorite : t.addFavorite}`;
  return (
    <button
      type="button"
      className={`heart${on ? ' is-on' : ''}`}
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <IconHeart filled={on} />
    </button>
  );
}
