import { useEffect, useMemo, useState } from 'react';
import { downloadBlob, exportRaster, exportSvg } from '../../lib/export';
import { localePath, type Locale } from '../../lib/i18n';
import { defaultDesign } from '../../lib/render/design';
import { buildGeometry, type Geometry } from '../../lib/render/geometry';
import { runScanTest } from '../../lib/scannability/scan-test';
import { encryptNote, noteLink, SECRET_MAX_CHARS, SECRET_MIN_PASSWORD } from '../../lib/secret';
import { ToastProvider, useToast } from '../common/Toast';
import { I18nProvider, useI18n } from '../common/i18n';
import { browserCanvas } from '../generator/hooks';
import { Preview } from '../generator/Preview';
import { Stamp } from '../generator/Stamp';

export default function SecretNote({ locale }: { locale: Locale }) {
  return (
    <I18nProvider locale={locale}>
      <ToastProvider>
        <SecretApp />
      </ToastProvider>
    </I18nProvider>
  );
}

const DESIGN = { ...defaultDesign, fg: '#1A1712', bg: '#FFFCF6', ecLevel: 'M' as const };

function SecretApp() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<boolean | null>(null);

  // Any change invalidates the code.
  useEffect(() => setLink(null), [message, password]);

  const geometry: Geometry | null = useMemo(
    () => (link ? buildGeometry(link, DESIGN) : null),
    [link],
  );
  useEffect(() => {
    setOk(null);
    if (!geometry || !link) return;
    let live = true;
    void runScanTest(geometry, link, browserCanvas).then((r) => live && setOk(r.ok));
    return () => {
      live = false;
    };
  }, [geometry, link]);

  const tooShort = password.length > 0 && password.length < SECRET_MIN_PASSWORD;
  const canMake = message.trim().length > 0 && password.length >= SECRET_MIN_PASSWORD && !busy;

  const make = async () => {
    setBusy(true);
    try {
      const token = await encryptNote(message.trim(), password);
      const open = new URL(
        localePath(locale, 'open', import.meta.env.BASE_URL),
        window.location.origin,
      ).href;
      setLink(noteLink(open, token));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid overflow-clip rounded-[28px] bg-surface shadow-[var(--shadow-card)] lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)]">
      <form
        className="flex flex-col gap-5 p-5 sm:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (canMake) void make();
        }}
      >
        <div>
          <label className="label" htmlFor="secret-message">
            {t('secret.message')}
          </label>
          <textarea
            id="secret-message"
            className="input min-h-32"
            maxLength={SECRET_MAX_CHARS}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            data-testid="secret-message"
          />
          <p className="hint">
            {t('secret.count', { count: message.length, max: SECRET_MAX_CHARS })}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="secret-password">
            {t('secret.password')}
          </label>
          <div className="flex gap-2">
            <input
              id="secret-password"
              className="input"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              aria-invalid={tooShort || undefined}
              aria-describedby="secret-password-hint"
              onChange={(e) => setPassword(e.target.value)}
              data-testid="secret-password"
            />
            <button
              type="button"
              className="btn btn-secondary shrink-0"
              onClick={() => setShow(!show)}
              aria-pressed={show}
            >
              {show ? t('generator.hidePassword') : t('generator.showPassword')}
            </button>
          </div>
          <p id="secret-password-hint" className={tooShort ? 'error-text' : 'hint'}>
            {tooShort
              ? t('secret.tooShort', { min: SECRET_MIN_PASSWORD })
              : t('secret.passwordHint')}
          </p>
        </div>
        <button
          type="submit"
          className="btn btn-primary self-start"
          disabled={!canMake}
          data-testid="secret-make"
        >
          {busy ? t('secret.locking') : t('secret.make')}
        </button>
        <p className="note text-[0.95rem]">{t('secret.how')}</p>
      </form>
      <div className="flex flex-col gap-5 bg-soft/70 p-5 sm:p-7">
        <div className="relative rounded-[22px] bg-surface p-6 pt-20 shadow-[var(--shadow-sheet)]">
          <Preview
            geometry={geometry}
            logo={null}
            alt={t('secret.alt')}
            transparent={false}
            message={t('secret.placeholder')}
          />
          {ok !== null && (
            <div className="absolute top-2 right-3">
              <Stamp small status={ok ? 'great' : 'fail'} stampKey={String(ok)} />
            </div>
          )}
        </div>
        {link && (
          <>
            <code
              className="block max-h-24 overflow-auto rounded-[12px] bg-surface px-3 py-2 font-mono text-[0.8rem] break-all"
              data-testid="secret-link"
            >
              {link}
            </code>
            <div className="grid grid-cols-[1fr_auto_auto] gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  geometry &&
                  void exportRaster(geometry, 'png', 1024, {
                    bg: DESIGN.bg,
                    transparent: false,
                  }).then((b) => downloadBlob(b, 'pakkaqr-secret-note.png'))
                }
                data-testid="secret-png"
              >
                {t('export.png')}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  geometry &&
                  downloadBlob(exportSvg(geometry, t('secret.alt')), 'pakkaqr-secret-note.svg')
                }
              >
                SVG
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  void navigator.clipboard.writeText(link).then(
                    () => toast({ text: t('secret.copied'), tone: 'success' }),
                    () => toast({ text: t('errors.clipboard'), tone: 'error' }),
                  )
                }
              >
                {t('payload.copy')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
