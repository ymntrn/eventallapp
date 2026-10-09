import { CATEGORIES, type Category, type DateFilter } from '../types';
import { t } from '../i18n/tr';
import { CATEGORY_COLORS } from '../lib/categories';

const DATE_FILTERS: DateFilter[] = ['tonight', 'weekend', 'next7', 'all'];

interface Props {
  date: DateFilter;
  categories: Category[];
  onDateChange(d: DateFilter): void;
  onCategoriesChange(c: Category[]): void;
}

export function FilterBar({ date, categories, onDateChange, onCategoriesChange }: Props) {
  const toggleCategory = (c: Category) =>
    onCategoriesChange(categories.includes(c) ? categories.filter((x) => x !== c) : [...categories, c]);

  return (
    <nav className="filters" aria-label={t.filtersLabel}>
      <div className="chips" role="group" aria-label={t.dateFilterLabel}>
        {DATE_FILTERS.map((d) => (
          <button
            key={d}
            type="button"
            className="chip"
            aria-pressed={date === d}
            onClick={() => onDateChange(d)}
          >
            {t.dateFilters[d]}
          </button>
        ))}
      </div>
      <div className="chips" role="group" aria-label={t.categoryFilterLabel}>
        <button
          type="button"
          className="chip"
          aria-pressed={categories.length === 0}
          onClick={() => onCategoriesChange([])}
        >
          {t.allCategories}
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className="chip chip--cat"
            style={{ '--chip-color': CATEGORY_COLORS[c] } as React.CSSProperties}
            aria-pressed={categories.includes(c)}
            onClick={() => toggleCategory(c)}
          >
            <span className="dot" aria-hidden="true" />
            {t.categories[c]}
          </button>
        ))}
      </div>
    </nav>
  );
}
