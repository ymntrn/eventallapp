import { useState } from 'react';
import { CATEGORIES } from '../types';
import { t } from '../i18n/tr';
import { CATEGORY_COLORS } from '../lib/categories';

export function Legend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="legend">
      <button
        type="button"
        className="legend__toggle"
        aria-expanded={open}
        aria-controls="legend-list"
        aria-label={t.legendToggle}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="legend__swatches" aria-hidden="true">
          {CATEGORIES.slice(0, 4).map((c) => (
            <span key={c} className="dot" style={{ background: CATEGORY_COLORS[c] }} />
          ))}
        </span>
        {t.legendTitle}
      </button>
      {open && (
        <ul id="legend-list" className="legend__list">
          {CATEGORIES.map((c) => (
            <li key={c}>
              <span className="dot" style={{ background: CATEGORY_COLORS[c] }} aria-hidden="true" />
              {t.categories[c]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
