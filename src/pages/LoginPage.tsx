import { useId, useState, type FormEvent } from 'react';
import { actions } from '../lib/store';
import { navigate, paths } from '../lib/router';
import { showToast } from '../lib/toast';
import { t } from '../i18n/tr';
import { PageHeader } from '../components/PageHeader';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * DEMO sign-in. Nothing is sent anywhere: name and e-mail are kept in
 * localStorage on this device and the password is never stored.
 */
export function LoginPage({ next }: { next?: string }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  const finish = (displayName: string, mail: string) => {
    actions.signIn(displayName, mail);
    showToast(t.signedIn(displayName));
    navigate(next && next.startsWith('#/') ? next : paths.profile(), { replace: true });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && !name.trim()) return setError(t.nameRequired);
    if (!EMAIL.test(email.trim())) return setError(t.emailInvalid);
    if (password.length < 6) return setError(t.passwordShort);
    setError(null);
    const displayName = mode === 'signup' ? name.trim() : email.trim().split('@')[0];
    finish(displayName, email);
  };

  return (
    <div className="page">
      <PageHeader title="" />
      <div className="page__body auth">
        <h1 className="auth__title">{mode === 'login' ? t.loginTitle : t.signupTitle}</h1>
        <p className="muted">{t.loginIntro}</p>

        <form className="form" onSubmit={submit} noValidate>
          {mode === 'signup' && (
            <div className="input-group">
              <label htmlFor={`${id}-name`}>{t.nameLabel}</label>
              <input
                id={`${id}-name`}
                className="input"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
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
          {error && (
            <p className="form__error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn--primary btn--block">
            {mode === 'login' ? t.loginButton : t.signupButton}
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

        <div className="divider" />
        <button type="button" className="btn btn--secondary btn--block" onClick={() => finish('Demo', 'demo@eventall.app')}>
          {t.demoLogin}
        </button>
        <p className="fineprint">{t.demoNotice}</p>
      </div>
    </div>
  );
}
