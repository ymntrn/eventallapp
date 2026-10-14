import { t } from '../i18n/tr';
import { actions, useAppState, type FollowKind } from '../lib/store';
import { navigate, paths } from '../lib/router';
import { showToast } from '../lib/toast';
import { IconCheck, IconPlus } from './icons';

interface Props {
  kind: FollowKind;
  id: string;
  /** Name for the accessible label. */
  name: string;
  /** pill: "Takip et" with text. icon: compact round button for lists. */
  variant?: 'pill' | 'icon';
}

/**
 * Follow / unfollow an artist (performer) or venue. Follows are private to
 * the user; there are no public follower counts. Signed-out users are sent to
 * the login page and brought back.
 */
export function FollowButton({ kind, id, name, variant = 'pill' }: Props) {
  const state = useAppState();
  const on = (kind === 'performer' ? state.followedPerformers : state.followedVenues).includes(id);

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!state.user) {
      showToast(t.followLoginRequired);
      navigate(paths.login(window.location.hash || paths.map()));
      return;
    }
    actions.toggleFollow(kind, id);
  };

  const label = t.followLabel(name, on);
  if (variant === 'icon') {
    return (
      <button
        type="button"
        className={`follow-icon${on ? ' is-on' : ''}`}
        aria-pressed={on}
        aria-label={label}
        title={label}
        onClick={onClick}
      >
        {on ? <IconCheck size={18} /> : <IconPlus size={18} />}
      </button>
    );
  }
  return (
    <button type="button" className={`pill-btn pill-btn--small${on ? ' is-on' : ''}`} aria-pressed={on} aria-label={label} onClick={onClick}>
      {on ? <IconCheck size={16} /> : <IconPlus size={16} />}
      {on ? t.following : t.follow}
    </button>
  );
}
