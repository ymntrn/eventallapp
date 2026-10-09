import { useId, useMemo, useState } from 'react';
import type { EventWithVenue, Performer, Venue } from '../types';
import { t } from '../i18n/tr';
import { foldTurkish } from '../lib/slug';
import { formatDate } from '../lib/dates';
import { navigate, paths } from '../lib/router';
import { IconClose, IconSearch } from './icons';

const MAX_RESULTS = 8;

type Result =
  | { kind: 'venue'; key: string; venue: Venue }
  | { kind: 'event'; key: string; event: EventWithVenue }
  | { kind: 'performer'; key: string; performer: Performer };

interface Props {
  venues: Venue[];
  /** Upcoming events (not narrowed by the filters). */
  events: EventWithVenue[];
  performers: Performer[];
  /** Venue results stay on the map; events and performers open their page. */
  onPickVenue(venueId: string): void;
}

/** Accessible combobox: type, arrow keys to move, Enter to pick, Escape to clear. */
export function SearchBox({ venues, events, performers, onPickVenue }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();

  const results = useMemo<Result[]>(() => {
    const q = foldTurkish(query.trim());
    if (q.length < 2) return [];
    const out: Result[] = [];
    for (const v of venues) {
      if (foldTurkish(v.name).includes(q)) out.push({ kind: 'venue', key: `v-${v.id}`, venue: v });
    }
    for (const p of performers) {
      if (foldTurkish(p.name).includes(q)) out.push({ kind: 'performer', key: `p-${p.id}`, performer: p });
    }
    for (const e of events) {
      if (out.length >= MAX_RESULTS) break;
      const hay = foldTurkish([e.title, ...e.performers.map((p) => p.name)].join(' '));
      if (hay.includes(q)) out.push({ kind: 'event', key: `e-${e.id}`, event: e });
    }
    return out.slice(0, MAX_RESULTS);
  }, [query, venues, events, performers]);

  const pick = (r: Result) => {
    setOpen(false);
    if (r.kind === 'venue') {
      setQuery(r.venue.name);
      onPickVenue(r.venue.id);
    } else {
      setQuery('');
      navigate(r.kind === 'event' ? paths.event(r.event.id) : paths.performer(r.performer.id));
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && open && results.length > 0) {
      e.preventDefault();
      pick(results[Math.max(active, 0)]);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      if (open) setOpen(false);
      else setQuery('');
    }
  };

  const showList = open && query.trim().length >= 2;

  return (
    <div className="search" role="search">
      <span className="search__icon" aria-hidden="true">
        <IconSearch />
      </span>
      <label htmlFor={`${listId}-input`} className="visually-hidden">
        {t.searchLabel}
      </label>
      <input
        id={`${listId}-input`}
        type="search"
        className="search__input"
        placeholder={t.searchPlaceholder}
        autoComplete="off"
        enterKeyHint="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && results[active] ? `${listId}-${results[active].key}` : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      {query && (
        <button
          type="button"
          className="search__clear"
          aria-label={t.clearSearch}
          onClick={() => {
            setQuery('');
            setOpen(false);
          }}
        >
          <IconClose size={18} />
        </button>
      )}
      {showList && (
        <ul id={listId} role="listbox" className="search__results" aria-label={t.searchLabel}>
          {results.length === 0 ? (
            <li className="search__empty" role="option" aria-selected="false" aria-disabled="true">
              {t.searchNoResults}
            </li>
          ) : (
            results.map((r, i) => (
              <li
                key={r.key}
                id={`${listId}-${r.key}`}
                role="option"
                aria-selected={i === active}
                className="search__result"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r)}
              >
                <span className="search__kind">
                  {r.kind === 'venue' ? t.searchVenue : r.kind === 'event' ? t.searchEvent : t.searchPerformer}
                </span>
                <span className="search__label">
                  {r.kind === 'venue' ? r.venue.name : r.kind === 'event' ? r.event.title : r.performer.name}
                  {r.kind === 'event' && (
                    <small>
                      {r.event.venue.name}, {formatDate(r.event.startsAtMs)}
                    </small>
                  )}
                  {r.kind === 'performer' && <small>{t.performerKinds[r.performer.kind]}</small>}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
