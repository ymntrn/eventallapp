import { useId, useState, type FormEvent } from 'react';
import { CITIES, type City, type DateFilter } from '../types';
import { actions, useAppState, type ThemeSetting } from '../lib/store';
import { paths } from '../lib/router';
import { showToast } from '../lib/toast';
import { t } from '../i18n/tr';
import { Link } from '../components/Link';
import { PageHeader } from '../components/PageHeader';
import { IconChevron } from '../components/icons';

const THEMES: [ThemeSetting, string][] = [
  ['light', t.themeLight],
  ['dark', t.themeDark],
  ['system', t.themeSystem],
];
const DATES: DateFilter[] = ['tonight', 'weekend', 'next7', 'all'];

export function SettingsPage({ onEditPrefs }: { onEditPrefs(): void }) {
  const state = useAppState();
  const { settings, user } = state;
  const [confirmReset, setConfirmReset] = useState(false);
  const id = useId();

  return (
    <div className="page">
      <PageHeader title={t.settingsTitle} back={false} />
      <div className="page__body settings">
        <section className="group" aria-labelledby={`${id}-look`}>
          <h2 id={`${id}-look`} className="group__title">
            {t.sectionAppearance}
          </h2>
          <div className="row row--stack">
            <span id={`${id}-theme`}>{t.themeLabel}</span>
            <div className="seg" role="radiogroup" aria-labelledby={`${id}-theme`}>
              {THEMES.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={settings.theme === value}
                  className="seg__opt"
                  onClick={() => actions.setSettings({ theme: value })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="group" aria-labelledby={`${id}-general`}>
          <h2 id={`${id}-general`} className="group__title">
            {t.sectionGeneral}
          </h2>
          <button type="button" className="row row--button" onClick={onEditPrefs}>
            <span>{t.editPreferences}</span>
            <IconChevron />
          </button>
          <label className="row">
            <span>{t.defaultDateLabel}</span>
            <select
              className="select"
              value={state.prefs.date}
              onChange={(e) => actions.setDate(e.target.value as DateFilter)}
            >
              {DATES.map((d) => (
                <option key={d} value={d}>
                  {t.dateFilters[d]}
                </option>
              ))}
            </select>
          </label>
          <label className="row">
            <span>{t.cityLabel}</span>
            <select className="select" value={state.prefs.city} onChange={(e) => actions.setCity(e.target.value as City)}>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {t.cities[c]}
                </option>
              ))}
            </select>
          </label>
          <div className="row">
            <span>
              {t.languageLabel}
              <span className="row__hint">{t.languageSoon}</span>
            </span>
            <span className="muted">{t.languageValue}</span>
          </div>
          <Toggle
            label={t.notificationsLabel}
            hint={t.notificationsHint}
            checked={settings.notifications}
            onChange={(v) => actions.setSettings({ notifications: v })}
          />
          <Toggle
            label={t.sampleBannerLabel}
            checked={settings.showSampleBanner}
            onChange={(v) => actions.setSettings({ showSampleBanner: v })}
          />
        </section>

        <section className="group" aria-labelledby={`${id}-profile`}>
          <h2 id={`${id}-profile`} className="group__title">
            {t.sectionProfile}
          </h2>
          {user ? (
            <ProfileForm key={user.email} name={user.name} email={user.email} />
          ) : (
            <div className="row">
              <span className="muted">{t.profileGuestTitle}</span>
              <Link className="btn btn--primary btn--small" href={paths.login(paths.settings())}>
                {t.signInCta}
              </Link>
            </div>
          )}
        </section>

        <section className="group" aria-labelledby={`${id}-data`}>
          <h2 id={`${id}-data`} className="group__title">
            {t.sectionData}
          </h2>
          {user && (
            <button
              type="button"
              className="row row--button"
              onClick={() => {
                actions.signOut();
                showToast(t.signedOut);
              }}
            >
              <span>{t.signOut}</span>
            </button>
          )}
          {confirmReset ? (
            <div className="row row--stack" role="alert">
              <span>{t.resetConfirm}</span>
              <div className="row__actions">
                <button type="button" className="btn btn--secondary btn--small" onClick={() => setConfirmReset(false)}>
                  {t.resetNo}
                </button>
                <button
                  type="button"
                  className="btn btn--danger btn--small"
                  onClick={() => {
                    actions.resetAll();
                    setConfirmReset(false);
                    showToast(t.resetDone);
                  }}
                >
                  {t.resetYes}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="row row--button row--danger" onClick={() => setConfirmReset(true)}>
              <span>{t.resetData}</span>
            </button>
          )}
        </section>

        <section className="group" aria-labelledby={`${id}-about`}>
          <h2 id={`${id}-about`} className="group__title">
            {t.sectionSources}
          </h2>
          <div className="row row--stack">
            <p>{t.aboutText}</p>
          </div>
          <div className="row row--stack">
            <span>{t.sourceVenues}</span>
            <p className="muted small">
              {t.sourceVenuesText}{' '}
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">
                openstreetmap.org/copyright
              </a>
            </p>
          </div>
          <div className="row row--stack">
            <span>{t.sourceTiles}</span>
            <p className="muted small">
              {t.sourceTilesText}{' '}
              <a href="https://openfreemap.org" target="_blank" rel="noopener">
                openfreemap.org
              </a>
            </p>
          </div>
          <div className="row row--stack">
            <span>{t.sourceEvents}</span>
            <p className="muted small">{t.sourceEventsText}</p>
            <p className="muted small">{t.version(__APP_VERSION__)}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange(v: boolean): void }) {
  return (
    <label className="row">
      <span>
        {label}
        {hint && <span className="row__hint">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function ProfileForm({ name: initialName, email: initialEmail }: { name: string; email: string }) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const id = useId();
  const dirty = name !== initialName || email !== initialEmail;
  const valid = name.trim() !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    actions.updateProfile(name, email);
    showToast(t.profileSaved);
  };

  return (
    <form className="row row--stack form" onSubmit={save}>
      <div className="input-group">
        <label htmlFor={`${id}-n`}>{t.nameLabel}</label>
        <input id={`${id}-n`} className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </div>
      <div className="input-group">
        <label htmlFor={`${id}-e`}>{t.emailLabel}</label>
        <input
          id={`${id}-e`}
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>
      <button type="submit" className="btn btn--primary btn--small" disabled={!dirty || !valid}>
        {t.saveProfile}
      </button>
    </form>
  );
}
