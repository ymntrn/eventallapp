import { useId, useState, type FormEvent } from 'react';
import { CITIES, type City, type DateFilter } from '../types';
import { actions, useAppState, type ThemeSetting, type User } from '../lib/store';
import { signOut, useAuthStatus } from '../lib/auth';
import { DELETE_CONFIRM_WORD, deleteAccount, downloadMyData, isDeleteConfirmation } from '../lib/account';
import { navigate } from '../lib/router';
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
  const authStatus = useAuthStatus();
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
            <>
              <ProfileForm key={user.id} user={user} />
              <button
                type="button"
                className="row row--button"
                onClick={() => {
                  void signOut().then(() => showToast(t.signedOut));
                }}
              >
                <span>{t.signOut}</span>
              </button>
            </>
          ) : authStatus === 'unavailable' ? (
            <div className="row">
              <span className="muted">{t.accountsUnavailable}</span>
            </div>
          ) : (
            <div className="row">
              <span className="muted">{t.profileGuestTitle}</span>
              <Link className="btn btn--primary btn--small" href={paths.login(paths.settings())}>
                {t.signInCta}
              </Link>
            </div>
          )}
        </section>

        {user && <AccountData />}

        <section className="group" aria-labelledby={`${id}-data`}>
          <h2 id={`${id}-data`} className="group__title">
            {t.sectionData}
          </h2>
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
                    actions.resetDevice();
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

        <section className="group" aria-labelledby={`${id}-privacy`}>
          <h2 id={`${id}-privacy`} className="group__title">
            {t.sectionPrivacy}
          </h2>
          <div className="row row--stack">
            <p className="muted small legal-placeholder">{t.legalPrivacyPlaceholder}</p>
            <p className="muted small legal-placeholder">{t.legalAnalyticsPlaceholder}</p>
          </div>
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

function ProfileForm({ user }: { user: User }) {
  const [name, setName] = useState(user.name);
  const [city, setCity] = useState<City | ''>(user.city ?? '');
  const id = useId();
  const dirty = name !== user.name || (city || null) !== user.city;
  const valid = name.trim() !== '' && name.trim().length <= 60;

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    actions.updateProfile(name, city || null);
    showToast(t.profileSaved);
  };

  return (
    <form className="row row--stack form" onSubmit={save}>
      <div className="input-group">
        <label htmlFor={`${id}-n`}>{t.nameLabel}</label>
        <input
          id={`${id}-n`}
          className="input"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </div>
      <div className="input-group">
        <label htmlFor={`${id}-c`}>{t.cityOptionalLabel}</label>
        <select id={`${id}-c`} className="select input" value={city} onChange={(e) => setCity(e.target.value as City | '')}>
          <option value="">{t.cityNone}</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {t.cities[c]}
            </option>
          ))}
        </select>
      </div>
      <div className="input-group">
        <label htmlFor={`${id}-e`}>{t.emailLabel}</label>
        <input id={`${id}-e`} className="input" type="email" value={user.email} readOnly aria-describedby={`${id}-eh`} />
        <span id={`${id}-eh`} className="row__hint">
          {t.emailHint}
        </span>
      </div>
      <button type="submit" className="btn btn--primary btn--small" disabled={!dirty || !valid}>
        {t.saveProfile}
      </button>
    </form>
  );
}

/** KVKK self-service: download my data (JSON) and delete my account. */
function AccountData() {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  const exportData = async () => {
    setExporting(true);
    const ok = await downloadMyData();
    setExporting(false);
    showToast(ok ? t.exportDone : t.exportFailed);
  };

  const remove = async (e: FormEvent) => {
    e.preventDefault();
    if (!isDeleteConfirmation(typed)) return setError(t.deleteConfirmWrong(DELETE_CONFIRM_WORD));
    setError(null);
    setDeleting(true);
    const r = await deleteAccount(typed);
    setDeleting(false);
    if (!r.ok) return setError(r.reason === 'confirmation' ? t.deleteConfirmWrong(DELETE_CONFIRM_WORD) : t.deleteFailed);
    showToast(t.deleteDone);
    navigate(paths.map(), { replace: true });
  };

  return (
    <section className="group" aria-labelledby={`${id}-acc`}>
      <h2 id={`${id}-acc`} className="group__title">
        {t.sectionAccountData}
      </h2>
      <button type="button" className="row row--button" onClick={exportData} disabled={exporting} aria-busy={exporting}>
        <span>
          {exporting ? t.pleaseWait : t.exportData}
          <span className="row__hint">{t.exportHint}</span>
        </span>
      </button>
      {confirmOpen ? (
        <form className="row row--stack form" onSubmit={remove}>
          <p>{t.deleteAccountText}</p>
          <div className="input-group">
            <label htmlFor={`${id}-confirm`}>{t.deleteConfirmLabel(DELETE_CONFIRM_WORD)}</label>
            <input
              id={`${id}-confirm`}
              className="input"
              autoComplete="off"
              autoCapitalize="characters"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
          </div>
          {error && (
            <p className="form__error" role="alert">
              {error}
            </p>
          )}
          <div className="row__actions">
            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={() => {
                setConfirmOpen(false);
                setTyped('');
                setError(null);
              }}
            >
              {t.resetNo}
            </button>
            <button type="submit" className="btn btn--danger btn--small" disabled={deleting || !isDeleteConfirmation(typed)}>
              {deleting ? t.pleaseWait : t.deleteConfirmButton}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="row row--button row--danger" onClick={() => setConfirmOpen(true)}>
          <span>{t.deleteAccount}</span>
        </button>
      )}
    </section>
  );
}
