import { useEffect, useState } from 'react';
import type { Locale } from '../../lib/i18n';
import { decryptNote, extractToken } from '../../lib/secret';
import { I18nProvider, useT } from '../common/i18n';

export default function OpenNote({ locale }: { locale: Locale }) {
  return (
    <I18nProvider locale={locale}>
      <OpenApp />
    </I18nProvider>
  );
}

/** Opens a secret note: the token comes from the link's #hash, which browsers never send to a server. */
function OpenApp() {
  const t = useT();
  const [token, setToken] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => setToken(extractToken(window.location.hash)), []);
  const active = token ?? extractToken(pasted);

  const open = async () => {
    if (!active) {
      setError(t('open.noNote'));
      return;
    }
    setBusy(true);
    setError(null);
    const r = await decryptNote(active, password);
    setBusy(false);
    if (r.ok) setMessage(r.message);
    else setError(t(r.error === 'password' ? 'open.wrongPassword' : 'open.badNote'));
  };

  if (message !== null) {
    return (
      <section
        className="card flex flex-col gap-4 p-6 sm:p-8"
        aria-labelledby="note-heading"
        data-testid="note-opened"
      >
        <h2 id="note-heading" className="text-3xl">
          {t('open.unlocked')}
        </h2>
        <p
          className="rounded-[16px] bg-soft p-5 text-[1.15rem] whitespace-pre-wrap"
          data-testid="note-text"
        >
          {message}
        </p>
        <p className="hint">{t('open.privacy')}</p>
      </section>
    );
  }

  return (
    <form
      className="card flex max-w-xl flex-col gap-5 p-6 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        void open();
      }}
    >
      {!token && (
        <div>
          <label className="label" htmlFor="note-link">
            {t('open.paste')}
          </label>
          <input
            id="note-link"
            className="input font-mono"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
          />
        </div>
      )}
      {token && <p className="text-[1.1rem] font-semibold">{t('open.found')}</p>}
      <div>
        <label className="label" htmlFor="note-password">
          {t('secret.password')}
        </label>
        <input
          id="note-password"
          className="input"
          type="password"
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? 'note-error' : undefined}
          data-testid="note-password"
        />
        {error && (
          <p id="note-error" className="error-text" role="alert">
            {error}
          </p>
        )}
      </div>
      <button
        type="submit"
        className="btn btn-primary self-start"
        disabled={busy || !password}
        data-testid="note-open"
      >
        {busy ? t('open.opening') : t('open.open')}
      </button>
      <p className="hint">{t('open.privacy')}</p>
    </form>
  );
}
