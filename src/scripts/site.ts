// Site-wide client behaviour: offline support, polite install prompt and
// the optional (off by default) cookieless page-view hook.
import { readLocal, writeLocal } from '../lib/storage/local';

const body = document.body;

if ('serviceWorker' in navigator && body.dataset.sw && !import.meta.env.DEV) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(body.dataset.sw!, { scope: body.dataset.base ?? '/' })
      .catch(() => {
        // Offline support is a bonus; the site works without it.
      });
  });
}

// Only a same-origin path, only the page path, no cookies or identifiers.
if (body.dataset.analytics && 'sendBeacon' in navigator) {
  navigator.sendBeacon(body.dataset.analytics, location.pathname);
}

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

const DISMISSED = 'pakkaqr:install-dismissed';
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  if (readLocal(DISMISSED)) return;
  const prompt = event as InstallPromptEvent;
  const bar = document.createElement('div');
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', body.dataset.installText ?? '');
  bar.className =
    'card fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md flex-wrap items-center gap-3 p-3 text-sm sm:bottom-6';
  const text = document.createElement('p');
  text.className = 'flex-1';
  text.textContent = body.dataset.installText ?? '';
  const yes = document.createElement('button');
  yes.type = 'button';
  yes.className = 'btn btn-primary btn-sm';
  yes.textContent = body.dataset.installYes ?? '';
  const no = document.createElement('button');
  no.type = 'button';
  no.className = 'btn btn-ghost btn-sm';
  no.textContent = body.dataset.installNo ?? '';
  const close = () => {
    writeLocal(DISMISSED, '1');
    bar.remove();
  };
  yes.addEventListener('click', () => {
    close();
    void prompt.prompt();
  });
  no.addEventListener('click', close);
  bar.append(text, yes, no);
  // Show it once, a little after the page settles, so it never gets in the way.
  setTimeout(() => body.append(bar), 4000);
});
