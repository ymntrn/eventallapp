import type { ReactNode } from 'react';
import { goBack } from '../lib/router';
import { t } from '../i18n/tr';
import { IconBack } from './icons';

/** Sticky top bar for sub-pages: back button, optional title and actions. */
export function PageHeader({ title, back = true, actions }: { title: string; back?: boolean; actions?: ReactNode }) {
  return (
    <header className="page-header">
      {back ? (
        <button type="button" className="icon-btn" onClick={() => goBack()} aria-label={t.back}>
          <IconBack />
        </button>
      ) : (
        <span className="page-header__spacer" />
      )}
      {title ? <h1 className="page-header__title">{title}</h1> : <span className="page-header__title" />}
      <div className="page-header__actions">{actions}</div>
    </header>
  );
}
