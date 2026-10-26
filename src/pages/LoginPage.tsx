import { useId, useState, type FormEvent } from 'react';
import { CITIES, type City } from '../types';
import { getState, useAppState } from '../lib/store';
import { signIn, signUp, useAuthStatus } from '../lib/auth';
import { navigate, paths } from '../lib/router';
import { showToast } from '../lib/toast';
import { t } from '../i18n/tr';
import { PageHeader } from '../components/PageHeader';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 8;

/** E-mail + password sign-in and sign-up through Supabase Auth (lib/auth.ts). */
export function LoginPage({ next }: { next?: string }) {
  const status = useAuthStatus();
  const { prefs } = useAppState();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [city, setCity] = useState<City | ''>(prefs.city);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const id = useId();

  const done = () => navigate(next && next.startsWith('#/') ? next : paths.profile(), { replace: true });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (mode === 'signup' && !name.trim()) return setError(t.nameRequired);
    if (!EMAIL.test(email.trim())) return setError(t.emailInvalid);
    if (password.length < MIN_PASSWORD) return setError(t.passwordShort);
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        const r = await signUp({ email, password, displayName: name, city: city || null });
        if (!r.ok) return setError(r.message);
        if (r.needsConfirmation) return setSentTo(email.trim());
        showToast(t.signedIn(name.trim()));
        done();
      } else {
        const r = await signIn(email, password);
        if (!r.ok) return setError(r.message);
        showToast(t.signedIn(getState().user?.name ?? email.trim().split('@')[0]));
        done();
      }
    } finally {
      setBusy(false);
    }
  };

  if (status === 'unavailable') {
    return (
      <div className="page">
        <PageHeader title="" />
        <div className="page__body auth">
          <h1 className="auth__title">{t.loginTitle}</h1>
          <p className="muted">{t.accountsUnavailable}</p>
        </div>
      </div>
    );
  }

  if (sentTo) {
    return (
      <div className="page">
        <PageHeader title="" />
        <div className="page__body auth" role="status">
          <h1 className="auth__title">{t.checkEmailTitle}</h1>
          <p>{t.checkEmailText(sentTo)}</p>
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setSentTo(null);
              setMode('login');
            }}
          >
            {t.switchToLogin}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader title="" />
      <div className="page__body auth">
        <h1 className="auth__title">{mode === 'login' ? t.loginTitle : t.signupTitle}</h1>
        <p className="muted">{t.loginIntro}</p>

        <form className="form" onSubmit={submit} noValidate aria-busy={busy}>
          {mode === 'signup' && (
            <>
              <div className="input-group">
                <label htmlFor={`${id}-name`}>{t.nameLabel}</label>
                <input
                  id={`${id}-name`}
                  className="input"
                  autoComplete="name"
                  maxLength={60}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label htmlFor={`${id}-city`}>{t.cityOptionalLabel}</label>
                <select
                  id={`${id}-city`}
                  className="select input"
                  value={city}
                  onChange={(e) => setCity(e.target.value as City | '')}
                >
                  <option value="">{t.cityNone}</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {t.cities[c]}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className="input-group">
            <label htmlFor={`${id}-email`}>{t.emailLabel}</label>
            <input
              id={`${id}-email`}
              className="input"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor={`${id}-password`}>{t.passwordLabel}</label>
            <input
              id={`${id}-password`}
              className="input"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {mode === 'signup' && <p className="fineprint legal-placeholder">{t.legalSignupPlaceholder}</p>}
          {error && (
            <p className="form__error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn--primary btn--block" disabled={busy || status === 'loading'}>
            {busy ? t.pleaseWait : mode === 'login' ? t.loginButton : t.signupButton}
          </button>
        </form>

        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError(null);
          }}
        >
          {mode === 'login' ? t.switchToSignup : t.switchToLogin}
        </button>
      </div>
    </div>
  );
}
