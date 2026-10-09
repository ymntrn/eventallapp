import { useEffect, useRef, useState } from 'react';
import { CATEGORIES, type Category, type DateFilter } from '../types';
import type { Preferences } from '../lib/store';
import { t } from '../i18n/tr';
import { IconCheck, IconClose } from './icons';

const DATE_FILTERS: DateFilter[] = ['tonight', 'weekend', 'next7', 'all'];

interface Props {
  initial: Preferences;
  /** Number of events the draft would show, for the apply button. */
  countFor(p: Preferences): number;
  /** First-visit variant: a friendlier title. */
  onboarding?: boolean;
  onApply(p: Preferences): void;
  onClose(): void;
}

/** Pop-up where users pick when and what they want to see. */
export function FilterSheet({ initial, countFor, onboarding, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<Preferences>(initial);
  const dialogRef = useRef<HTMLDivElement>(null);
  const count = countFor(draft);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>('[aria-pressed="true"], button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && dialogRef.current) {
        // Keep focus inside the dialog.
        const f = dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input');
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [onClose]);

  const toggle = (c: Category) =>
    setDraft((d) => ({
      ...d,
      categories: d.categories.includes(c) ? d.categories.filter((x) => x !== c) : [...d.categories, c],
    }));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__head">
          <h2 id="filter-title">{t.prefsTitle}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t.close}>
            <IconClose />
          </button>
        </header>
        {onboarding && <p className="modal__intro">{t.prefsIntro}</p>}

        <fieldset className="field">
          <legend>{t.dateFilterLabel}</legend>
          <div className="seg seg--wrap">
            {DATE_FILTERS.map((d) => (
              <button
                key={d}
                type="button"
                className="seg__opt"
                aria-pressed={draft.date === d}
                onClick={() => setDraft((x) => ({ ...x, date: d }))}
              >
                {t.dateFilters[d]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>{t.categoryFilterLabel}</legend>
          <p className="field__hint">{t.categoryHint}</p>
          <div className="choices">
            {CATEGORIES.map((c) => {
              const on = draft.categories.includes(c);
              return (
                <button key={c} type="button" className="choice" aria-pressed={on} onClick={() => toggle(c)}>
                  <span className="choice__box" aria-hidden="true">
                    {on && <IconCheck size={16} />}
                  </span>
                  {t.categories[c]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="toggle-line">
          <span>{t.showAllVenuesLabel}</span>
          <input
            type="checkbox"
            role="switch"
            className="switch"
            checked={draft.showAllVenues}
            onChange={(e) => setDraft((x) => ({ ...x, showAllVenues: e.target.checked }))}
          />
        </label>

        <footer className="modal__foot">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setDraft({ date: 'all', categories: [], showAllVenues: false })}
          >
            {t.clearFilters}
          </button>
          <button type="button" className="btn btn--primary" disabled={count === 0} onClick={() => onApply(draft)}>
            {t.showResults(count)}
          </button>
        </footer>
      </div>
    </div>
  );
}
