// Applies saved preferences (theme, stamp colour, text size, motion) before
// first paint to avoid a flash. Everything stays in this browser.
(function () {
  var root = document.documentElement;
  function read(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch {
      // Storage blocked: use the default.
      return fallback;
    }
  }
  var pref = read('pakkaqr:theme', 'system');
  var dark =
    pref === 'dark' ||
    (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  root.setAttribute('data-theme-pref', pref);
  var accent = read('pakkaqr:accent', 'sindoor');
  if (accent !== 'sindoor') root.setAttribute('data-accent', accent);
  if (read('pakkaqr:size', 'normal') === 'large') root.setAttribute('data-size', 'large');
  if (read('pakkaqr:motion', 'auto') === 'reduce') root.setAttribute('data-motion', 'reduce');
})();
